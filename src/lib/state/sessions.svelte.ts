import type { SessionMeta } from '$lib/types';
import {
	initStorage,
	loadManifest,
	storeSession,
	removeSession,
	clearAllSessions
} from '$lib/services/storage.svelte';

let sessions = $state<SessionMeta[]>([]);
let selectedId = $state<string | null>(null);
let loading = $state(true);

const selected = $derived(sessions.find((s) => s.id === selectedId));
const count = $derived(sessions.length);

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
}

function select(id: string) {
	selectedId = id;
}

function deselect() {
	selectedId = null;
}

async function remove(id: string) {
	await removeSession(id);
	sessions = sessions.filter((s) => s.id !== id);
	if (selectedId === id) {
		selectedId = null;
	}
}

async function clearAll() {
	await clearAllSessions();
	sessions = [];
	selectedId = null;
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
		initialize,
		upload,
		select,
		deselect,
		remove,
		clearAll
	};
}
