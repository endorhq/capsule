import type { Tab, PersistedTabState } from '$lib/types/tabs';
import type { SessionMeta } from '$lib/types';

const STORAGE_KEY = 'endor:tabs';

let tabs = $state<Tab[]>([]);
let activeTabId = $state<string>('');

const activeTab = $derived(tabs.find((t) => t.id === activeTabId));
const activeSessionId = $derived(activeTab?.sessionId ?? null);

function generateId(): string {
	return crypto.randomUUID();
}

function persist() {
	const state: PersistedTabState = {
		tabs: tabs.map((t) => ({ id: t.id, sessionId: t.sessionId })),
		activeTabId
	};
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch {
		// Storage full or unavailable
	}
}

function loadPersistedState(): PersistedTabState | null {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		return JSON.parse(raw) as PersistedTabState;
	} catch {
		return null;
	}
}

function initialize(sessions: SessionMeta[]) {
	const sessionIds = new Set(sessions.map((s) => s.id));
	const persisted = loadPersistedState();

	if (persisted && persisted.tabs.length > 0) {
		// Validate persisted tabs - remove those with deleted sessions
		const validTabs = persisted.tabs.filter(
			(t) => t.sessionId === null || sessionIds.has(t.sessionId)
		);

		if (validTabs.length > 0) {
			tabs = validTabs.map((t) => ({
				id: t.id,
				sessionId: t.sessionId,
				label: t.sessionId
					? sessions.find((s) => s.id === t.sessionId)?.name ?? 'Unknown'
					: 'New Tab'
			}));

			// Restore active tab or fallback to first
			const activeExists = validTabs.some((t) => t.id === persisted.activeTabId);
			activeTabId = activeExists ? persisted.activeTabId : validTabs[0].id;

			// Persist if we removed any invalid tabs
			if (validTabs.length !== persisted.tabs.length) {
				persist();
			}
			return;
		}
	}

	// No valid persisted state - create initial empty tab
	const initialTab: Tab = {
		id: generateId(),
		sessionId: null,
		label: 'New Tab'
	};
	tabs = [initialTab];
	activeTabId = initialTab.id;
	persist();
}

function openTab(sessionId?: string | null, label?: string): string {
	const newTab: Tab = {
		id: generateId(),
		sessionId: sessionId ?? null,
		label: label ?? (sessionId ? 'Loading...' : 'New Tab')
	};
	tabs = [...tabs, newTab];
	activeTabId = newTab.id;
	persist();
	return newTab.id;
}

function closeTab(tabId: string) {
	const index = tabs.findIndex((t) => t.id === tabId);
	if (index === -1) return;

	// Don't close the last tab - instead reset it to empty
	if (tabs.length === 1) {
		tabs = [{ id: tabs[0].id, sessionId: null, label: 'New Tab' }];
		persist();
		return;
	}

	// If closing the active tab, activate an adjacent one
	if (activeTabId === tabId) {
		const newIndex = index === tabs.length - 1 ? index - 1 : index + 1;
		activeTabId = tabs[newIndex].id;
	}

	tabs = tabs.filter((t) => t.id !== tabId);
	persist();
}

function activateTab(tabId: string) {
	const tab = tabs.find((t) => t.id === tabId);
	if (tab) {
		activeTabId = tabId;
		persist();
	}
}

function updateTab(tabId: string, updates: Partial<Pick<Tab, 'sessionId' | 'label' | 'filterText'>>) {
	const index = tabs.findIndex((t) => t.id === tabId);
	if (index === -1) return;

	tabs = tabs.map((t) => (t.id === tabId ? { ...t, ...updates } : t));
	persist();
}

function closeTabsForSession(sessionId: string) {
	// Close all tabs showing this session, or reset them to empty
	const affectedTabs = tabs.filter((t) => t.sessionId === sessionId);
	for (const tab of affectedTabs) {
		closeTab(tab.id);
	}
}

function findTabBySessionId(sessionId: string): Tab | undefined {
	return tabs.find((t) => t.sessionId === sessionId);
}

export function getTabState() {
	return {
		get tabs() {
			return tabs;
		},
		get activeTabId() {
			return activeTabId;
		},
		get activeTab() {
			return activeTab;
		},
		get activeSessionId() {
			return activeSessionId;
		},
		initialize,
		openTab,
		closeTab,
		activateTab,
		updateTab,
		closeTabsForSession,
		findTabBySessionId,
		persist
	};
}
