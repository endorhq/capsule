<script lang="ts">
import { getSessionState } from '$lib/state/sessions.svelte';
import { getTabState } from '$lib/state/tabs.svelte';
import Header from '$lib/components/Header.svelte';
import Footer from '$lib/components/Footer.svelte';
import Sidebar from '$lib/components/Sidebar.svelte';
import MainContent from '$lib/components/MainContent.svelte';

const sessionState = getSessionState();
const tabState = getTabState();

async function handleGistLoad(url: string) {
  const sessions = await sessionState.loadFromGist(url);
  if (sessions.length > 0) {
    // Open first loaded session in current tab
    const first = sessions[0];
    tabState.updateTab(tabState.activeTabId, {
      sessionId: first.id,
      label: first.name,
    });
  }
}

function handleSelect(id: string) {
  const session = sessionState.getSession(id);
  if (!session) return;

  // If session is already open in a tab, focus that tab
  const existingTab = tabState.findTabBySessionId(id);
  if (existingTab) {
    tabState.activateTab(existingTab.id);
    return;
  }

  // Otherwise, open in a new tab
  tabState.openTab(id, session.name);
}

async function handleSidebarUpload(file: File) {
  const meta = await sessionState.upload(file);
  // Open the uploaded session in a new tab
  tabState.openTab(meta.id, meta.name);
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
			onUpload={handleSidebarUpload}
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
			onGistLoad={handleGistLoad}
			gistLoading={sessionState.gistLoading}
			gistError={sessionState.gistError}
			onDelete={handleRemove}
		/>
	</div>
	<Footer />
</div>
