import type { SessionMeta } from '$lib/types';
import type { ParsedSession } from '$lib/types/timeline';
import {
	initStorage,
	loadManifest,
	storeSession,
	storeSessionFromContent,
	removeSession,
	clearAllSessions,
	readSessionFile
} from '$lib/services/storage.svelte';
import { parseSession } from '$lib/parsers';
import { parseGistUrl, fetchGist, isGistError } from '$lib/services/gist';

let sessions = $state<SessionMeta[]>([]);
let selectedId = $state<string | null>(null);
let loading = $state(true);
let parsedSession = $state<ParsedSession | null>(null);
let parsing = $state(false);
let parseError = $state<string | null>(null);
let gistLoading = $state(false);
let gistError = $state<string | null>(null);

const selected = $derived(sessions.find((s) => s.id === selectedId));
const count = $derived(sessions.length);

// Non-reactive cache: sessions are immutable once stored
const parseCache = new Map<string, ParsedSession>();

function sortSessions() {
	sessions.sort((a, b) => b.uploadedAt - a.uploadedAt);
}

async function initialize() {
	loading = true;
	try {
		await initStorage();
		sessions = await loadManifest();
		sortSessions();
	} finally {
		loading = false;
	}
}

async function upload(file: File): Promise<SessionMeta> {
	const meta = await storeSession(file);
	sessions.push(meta);
	sortSessions();
	return meta;
}

function getSession(id: string): SessionMeta | undefined {
	return sessions.find((s) => s.id === id);
}

async function parseSessionById(id: string): Promise<ParsedSession> {
	// Check cache first
	const cached = parseCache.get(id);
	if (cached) {
		return cached;
	}

	const meta = sessions.find((s) => s.id === id);
	if (!meta) {
		throw new Error('Session not found');
	}

	const raw = await readSessionFile(meta.id);
	if (!raw) {
		throw new Error('Session file not found');
	}

	const result = parseSession(raw, meta.format, meta.agentFormat);
	parseCache.set(meta.id, result);

	// Update agentFormat on meta if not set
	if (!meta.agentFormat) {
		meta.agentFormat = result.format;
	}

	return result;
}

async function parseSelected(meta: SessionMeta) {
	// Check cache
	const cached = parseCache.get(meta.id);
	if (cached) {
		parsedSession = cached;
		parseError = null;
		parsing = false;
		return;
	}

	parsing = true;
	parsedSession = null;
	parseError = null;

	try {
		const raw = await readSessionFile(meta.id);
		if (!raw) {
			throw new Error('Session file not found');
		}

		const result = parseSession(raw, meta.format, meta.agentFormat);
		parseCache.set(meta.id, result);
		parsedSession = result;

		// Update agentFormat on meta if not set
		if (!meta.agentFormat) {
			meta.agentFormat = result.format;
		}
	} catch (err) {
		parseError = err instanceof Error ? err.message : 'Failed to parse session';
		parsedSession = null;
	} finally {
		parsing = false;
	}
}

async function select(id: string) {
	selectedId = id;
	const meta = sessions.find((s) => s.id === id);
	if (meta) {
		await parseSelected(meta);
	}
}

function deselect() {
	selectedId = null;
	parsedSession = null;
	parseError = null;
}

async function remove(id: string) {
	await removeSession(id);
	sessions = sessions.filter((s) => s.id !== id);
	parseCache.delete(id);
	if (selectedId === id) {
		selectedId = null;
		parsedSession = null;
		parseError = null;
	}
}

async function clearAll() {
	await clearAllSessions();
	sessions = [];
	selectedId = null;
	parsedSession = null;
	parseError = null;
	parseCache.clear();
}

async function loadFromGist(gistInput: string): Promise<SessionMeta[]> {
	gistError = null;
	gistLoading = true;

	try {
		const gistId = parseGistUrl(gistInput);
		if (!gistId) {
			throw { type: 'invalid_url', message: 'Invalid gist URL or ID' };
		}

		const result = await fetchGist(gistId);
		const loadedSessions: SessionMeta[] = [];

		for (const file of result.files) {
			const meta = await storeSessionFromContent(file.filename, file.content, {
				type: 'gist',
				gistId: result.metadata.id,
				gistUrl: result.metadata.url,
				owner: result.metadata.owner
			});
			sessions.push(meta);
			loadedSessions.push(meta);
		}

		sortSessions();
		return loadedSessions;
	} catch (err) {
		if (isGistError(err)) {
			gistError = err.message;
		} else if (err instanceof Error) {
			gistError = err.message;
		} else {
			gistError = 'Failed to load gist';
		}
		throw err;
	} finally {
		gistLoading = false;
	}
}

function setGistLoading(value: boolean) {
	gistLoading = value;
}

export function getSessionState() {
	return {
		get sessions() {
			return sessions;
		},
		get selectedId() {
			return selectedId;
		},
		get selected() {
			return selected;
		},
		get count() {
			return count;
		},
		get loading() {
			return loading;
		},
		get parsedSession() {
			return parsedSession;
		},
		get parsing() {
			return parsing;
		},
		get parseError() {
			return parseError;
		},
		get gistLoading() {
			return gistLoading;
		},
		get gistError() {
			return gistError;
		},
		initialize,
		upload,
		select,
		deselect,
		remove,
		clearAll,
		getSession,
		parseSessionById,
		loadFromGist,
		setGistLoading
	};
}
