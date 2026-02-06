<script lang="ts">
	import type { SessionMeta } from '$lib/types';
	import type { ParsedSession } from '$lib/types/timeline';
	import type { Tab } from '$lib/types/tabs';
	import UploadZone from './UploadZone.svelte';
	import SessionViewer from './viewer/SessionViewer.svelte';
	import TabBar from './viewer/TabBar.svelte';

	interface TabParseState {
		parsing: boolean;
		parsedSession: ParsedSession | null;
		parseError: string | null;
	}

	interface Props {
		tabs: Tab[];
		activeTabId: string;
		onActivateTab: (id: string) => void;
		onCloseTab: (id: string) => void;
		onNewTab: () => void;
		onUpload: (file: File) => Promise<SessionMeta>;
		onUpdateTab: (tabId: string, updates: Partial<Pick<Tab, 'sessionId' | 'label' | 'filterText'>>) => void;
		getSession: (id: string) => SessionMeta | undefined;
		parseSessionById: (id: string) => Promise<ParsedSession>;
		onGistLoad?: (url: string) => Promise<void>;
		gistLoading?: boolean;
		gistError?: string | null;
	}

	let {
		tabs,
		activeTabId,
		onActivateTab,
		onCloseTab,
		onNewTab,
		onUpload,
		onUpdateTab,
		getSession,
		parseSessionById,
		onGistLoad,
		gistLoading = false,
		gistError = null
	}: Props = $props();

	// Per-tab parsing state
	let tabParseStates = $state<Map<string, TabParseState>>(new Map());

	const activeTab = $derived(tabs.find((t) => t.id === activeTabId));
	const activeSessionId = $derived(activeTab?.sessionId ?? null);
	const activeMeta = $derived(activeSessionId ? getSession(activeSessionId) : undefined);

	const activeParseState = $derived<TabParseState>(
		tabParseStates.get(activeTabId) ?? { parsing: false, parsedSession: null, parseError: null }
	);

	// Parse session when tab's session changes
	$effect(() => {
		const tab = activeTab;
		if (!tab || !tab.sessionId) return;

		const sessionId = tab.sessionId;
		const existing = tabParseStates.get(tab.id);

		// Skip if already parsed or parsing
		if (existing?.parsedSession || existing?.parsing) return;

		// Start parsing
		tabParseStates.set(tab.id, { parsing: true, parsedSession: null, parseError: null });
		tabParseStates = new Map(tabParseStates);

		parseSessionById(sessionId)
			.then((parsed) => {
				tabParseStates.set(tab.id, { parsing: false, parsedSession: parsed, parseError: null });
				tabParseStates = new Map(tabParseStates);
			})
			.catch((err) => {
				tabParseStates.set(tab.id, {
					parsing: false,
					parsedSession: null,
					parseError: err instanceof Error ? err.message : 'Failed to parse session'
				});
				tabParseStates = new Map(tabParseStates);
			});
	});

	async function handleUpload(file: File) {
		const meta = await onUpload(file);
		// Update current tab with the new session
		onUpdateTab(activeTabId, { sessionId: meta.id, label: meta.name });
	}
</script>

<main class="flex-1 flex flex-col overflow-hidden">
	<TabBar
		{tabs}
		{activeTabId}
		onActivate={onActivateTab}
		onClose={onCloseTab}
		onNew={onNewTab}
	/>

	<div class="flex-1 overflow-hidden {activeMeta && activeParseState.parsedSession ? 'flex' : ''}">
		{#if activeMeta && activeParseState.parsedSession}
			<SessionViewer session={activeParseState.parsedSession} meta={activeMeta} />
		{:else if activeMeta && activeParseState.parsing}
			<div class="flex items-center justify-center h-full text-muted text-sm">
				<span>// parsing {activeMeta.name}/...</span>
			</div>
		{:else if activeMeta && activeParseState.parseError}
			<div class="flex items-center justify-center h-full text-sm">
				<div class="text-center space-y-2">
					<span class="text-status-error">// parse error</span>
					<p class="text-muted text-xs">{activeParseState.parseError}</p>
				</div>
			</div>
		{:else if activeSessionId && !activeMeta}
			<div class="flex items-center justify-center h-full text-muted text-sm">
				<span>// session not found</span>
			</div>
		{:else}
			<UploadZone onUpload={handleUpload} {onGistLoad} {gistLoading} {gistError} />
		{/if}
	</div>
</main>
