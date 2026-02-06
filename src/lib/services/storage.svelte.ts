import type { SessionMeta, SessionSource } from '$lib/types';
import { detectFormat } from '$lib/parsers/detect';

type Backend = 'opfs' | 'indexeddb' | 'memory';

let backend: Backend = 'memory';
let opfsRoot: FileSystemDirectoryHandle | null = null;
let idb: IDBDatabase | null = null;
const memoryStore = new Map<string, string>();
let memoryManifest: SessionMeta[] = [];

const IDB_NAME = 'endor-sessions';
const IDB_STORE = 'files';
const MANIFEST_KEY = 'manifest.json';

function sessionsDir(): Promise<FileSystemDirectoryHandle> {
	return opfsRoot!.getDirectoryHandle('sessions', { create: true });
}

async function detectBackend(): Promise<Backend> {
	try {
		const root = await navigator.storage.getDirectory();
		const dir = await root.getDirectoryHandle('sessions', { create: true });
		// Verify write access
		const test = await dir.getFileHandle('_test', { create: true });
		const writable = await test.createWritable();
		await writable.write('ok');
		await writable.close();
		await dir.removeEntry('_test');
		opfsRoot = root;
		return 'opfs';
	} catch {
		// OPFS not available
	}

	try {
		const db = await new Promise<IDBDatabase>((resolve, reject) => {
			const req = indexedDB.open(IDB_NAME, 1);
			req.onupgradeneeded = () => {
				req.result.createObjectStore(IDB_STORE);
			};
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
		idb = db;
		return 'indexeddb';
	} catch {
		// IndexedDB not available
	}

	return 'memory';
}

// --- OPFS helpers ---

async function opfsReadFile(name: string): Promise<string | null> {
	try {
		const dir = await sessionsDir();
		const handle = await dir.getFileHandle(name);
		const file = await handle.getFile();
		return await file.text();
	} catch {
		return null;
	}
}

async function opfsWriteFile(name: string, content: string): Promise<void> {
	const dir = await sessionsDir();
	const handle = await dir.getFileHandle(name, { create: true });
	const writable = await handle.createWritable();
	await writable.write(content);
	await writable.close();
}

async function opfsDeleteFile(name: string): Promise<void> {
	try {
		const dir = await sessionsDir();
		await dir.removeEntry(name);
	} catch {
		// File may not exist
	}
}

// --- IndexedDB helpers ---

function idbGet(key: string): Promise<string | null> {
	return new Promise((resolve, reject) => {
		const tx = idb!.transaction(IDB_STORE, 'readonly');
		const req = tx.objectStore(IDB_STORE).get(key);
		req.onsuccess = () => resolve(req.result ?? null);
		req.onerror = () => reject(req.error);
	});
}

function idbPut(key: string, value: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const tx = idb!.transaction(IDB_STORE, 'readwrite');
		const req = tx.objectStore(IDB_STORE).put(value, key);
		req.onsuccess = () => resolve();
		req.onerror = () => reject(req.error);
	});
}

function idbDelete(key: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const tx = idb!.transaction(IDB_STORE, 'readwrite');
		const req = tx.objectStore(IDB_STORE).delete(key);
		req.onsuccess = () => resolve();
		req.onerror = () => reject(req.error);
	});
}

function idbClear(): Promise<void> {
	return new Promise((resolve, reject) => {
		const tx = idb!.transaction(IDB_STORE, 'readwrite');
		const req = tx.objectStore(IDB_STORE).clear();
		req.onsuccess = () => resolve();
		req.onerror = () => reject(req.error);
	});
}

// --- Unified read/write ---

async function readManifest(): Promise<SessionMeta[]> {
	if (backend === 'opfs') {
		const raw = await opfsReadFile(MANIFEST_KEY);
		return raw ? JSON.parse(raw) : [];
	}
	if (backend === 'indexeddb') {
		const raw = await idbGet(MANIFEST_KEY);
		return raw ? JSON.parse(raw) : [];
	}
	return [...memoryManifest];
}

async function writeManifest(sessions: SessionMeta[]): Promise<void> {
	const json = JSON.stringify(sessions);
	if (backend === 'opfs') {
		await opfsWriteFile(MANIFEST_KEY, json);
	} else if (backend === 'indexeddb') {
		await idbPut(MANIFEST_KEY, json);
	} else {
		memoryManifest = sessions;
	}
}

async function writeSessionFile(id: string, content: string): Promise<void> {
	const key = `${id}.session`;
	if (backend === 'opfs') {
		await opfsWriteFile(key, content);
	} else if (backend === 'indexeddb') {
		await idbPut(key, content);
	} else {
		memoryStore.set(key, content);
	}
}

async function deleteSessionFile(id: string): Promise<void> {
	const key = `${id}.session`;
	if (backend === 'opfs') {
		await opfsDeleteFile(key);
	} else if (backend === 'indexeddb') {
		await idbDelete(key);
	} else {
		memoryStore.delete(key);
	}
}

// --- Step count computation ---

function computeStepCount(content: string, format: 'jsonl' | 'json'): number {
	if (format === 'jsonl') {
		return content.split('\n').filter((line) => line.trim().length > 0).length;
	}
	try {
		const parsed = JSON.parse(content);
		if (Array.isArray(parsed)) return parsed.length;
		if (parsed.messages && Array.isArray(parsed.messages)) return parsed.messages.length;
		return 1;
	} catch {
		return 1;
	}
}

// --- Public API ---

export async function initStorage(): Promise<void> {
	backend = await detectBackend();
}

export async function loadManifest(): Promise<SessionMeta[]> {
	return readManifest();
}

export async function storeSession(file: File): Promise<SessionMeta> {
	const content = await file.text();
	const ext = file.name.endsWith('.jsonl') ? 'jsonl' : 'json';
	const baseName = file.name.replace(/\.(jsonl|json)$/, '');
	const name = baseName.replace(/-/g, '_');

	// Auto-detect agent format
	let agentFormat: import('$lib/types/timeline').AgentFormat | undefined;
	try {
		agentFormat = detectFormat(content, ext);
	} catch {
		// Detection not critical
	}

	const meta: SessionMeta = {
		id: crypto.randomUUID(),
		name,
		filename: file.name,
		format: ext,
		size: file.size,
		uploadedAt: Date.now(),
		stepCount: computeStepCount(content, ext),
		agentFormat
	};

	await writeSessionFile(meta.id, content);

	const manifest = await readManifest();
	manifest.push(meta);
	await writeManifest(manifest);

	return meta;
}

export async function removeSession(id: string): Promise<void> {
	await deleteSessionFile(id);
	const manifest = await readManifest();
	await writeManifest(manifest.filter((s) => s.id !== id));
}

export async function clearAllSessions(): Promise<void> {
	if (backend === 'opfs') {
		const dir = await sessionsDir();
		const manifest = await readManifest();
		for (const s of manifest) {
			try {
				await dir.removeEntry(`${s.id}.session`);
			} catch {
				// ignore
			}
		}
		try {
			await dir.removeEntry(MANIFEST_KEY);
		} catch {
			// ignore
		}
	} else if (backend === 'indexeddb') {
		await idbClear();
	} else {
		memoryStore.clear();
		memoryManifest = [];
	}
}

export async function readSessionFile(id: string): Promise<string | null> {
	const key = `${id}.session`;
	if (backend === 'opfs') {
		return opfsReadFile(key);
	}
	if (backend === 'indexeddb') {
		return idbGet(key);
	}
	return memoryStore.get(key) ?? null;
}

export async function storeSessionFromContent(
	filename: string,
	content: string,
	source?: SessionSource
): Promise<SessionMeta> {
	const ext = filename.endsWith('.jsonl') ? 'jsonl' : 'json';
	const baseName = filename.replace(/\.(jsonl|json)$/, '');
	const name = baseName.replace(/-/g, '_');

	// Auto-detect agent format
	let agentFormat: import('$lib/types/timeline').AgentFormat | undefined;
	try {
		agentFormat = detectFormat(content, ext);
	} catch {
		// Detection not critical
	}

	const meta: SessionMeta = {
		id: crypto.randomUUID(),
		name,
		filename,
		format: ext,
		size: new Blob([content]).size,
		uploadedAt: Date.now(),
		stepCount: computeStepCount(content, ext),
		agentFormat,
		source
	};

	await writeSessionFile(meta.id, content);

	const manifest = await readManifest();
	manifest.push(meta);
	await writeManifest(manifest);

	return meta;
}
