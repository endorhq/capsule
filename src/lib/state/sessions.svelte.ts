import type { SessionMeta } from '$lib/types';
import type { ParsedSession } from '$lib/types/timeline';
import {
	initStorage,
	loadManifest,
	storeSession,
	removeSession,
	clearAllSessions,
	readSessionFile
} from '$lib/services/storage.svelte';
import { parseSession } from '$lib/parsers';

let sessions = $state<SessionMeta[]>([]);
let selectedId = $state<string | null>(null);
let loading = $state(true);
let parsedSession = $state<ParsedSession | null>(null);
let parsing = $state(false);
let parseError = $state<string | null>(null);

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

async function upload(file: File) {
	const meta = await storeSession(file);
	sessions.push(meta);
	sortSessions();
	selectedId = meta.id;
	await parseSelected(meta);
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
		initialize,
		upload,
		select,
		deselect,
		remove,
		clearAll
	};
}
