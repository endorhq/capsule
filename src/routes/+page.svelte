<script lang="ts">
	import { getSessionState } from '$lib/state/sessions.svelte';
	import { getTabState } from '$lib/state/tabs.svelte';
	import Header from '$lib/components/Header.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import MainContent from '$lib/components/MainContent.svelte';

	const sessionState = getSessionState();
	const tabState = getTabState();

	function handleSelect(id: string, openInNewTab: boolean = false) {
		const session = sessionState.getSession(id);
		if (!session) return;

		if (openInNewTab) {
			tabState.openTab(id, session.name);
		} else {
			tabState.updateTab(tabState.activeTabId, { sessionId: id, label: session.name });
		}
	}

	async function handleRemove(id: string) {
		tabState.closeTabsForSession(id);
		await sessionState.remove(id);
	}
</script>

<div class="flex flex-col h-screen bg-surface font-mono">
	<Header />
	<div class="flex flex-1 overflow-hidden">
		<Sidebar
			sessions={sessionState.sessions}
			selectedId={tabState.activeSessionId}
			count={sessionState.count}
			loading={sessionState.loading}
			onSelect={handleSelect}
			onUpload={sessionState.upload}
			onClearAll={sessionState.clearAll}
			onRemove={handleRemove}
		/>
		<MainContent
			tabs={tabState.tabs}
			activeTabId={tabState.activeTabId}
			onActivateTab={tabState.activateTab}
			onCloseTab={tabState.closeTab}
			onNewTab={() => tabState.openTab()}
			onUpload={sessionState.upload}
			onUpdateTab={tabState.updateTab}
			getSession={sessionState.getSession}
			parseSessionById={sessionState.parseSessionById}
		/>
	</div>
</div>
