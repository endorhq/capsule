export interface Tab {
	id: string;
	sessionId: string | null; // null = upload zone
	label: string;
	filterText?: string;
}

export interface PersistedTabState {
	tabs: Array<{ id: string; sessionId: string | null }>;
	activeTabId: string;
}
