<script lang="ts">
import { SvelteMap } from 'svelte/reactivity';
import type { SessionMeta } from '$lib/types';
import type { Tab } from '$lib/types/tabs';
import type { ParsedSession } from '$lib/types/timeline';
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
  onUpdateTab: (
    tabId: string,
    updates: Partial<Pick<Tab, 'sessionId' | 'label' | 'filterText'>>
  ) => void;
  getSession: (id: string) => SessionMeta | undefined;
  parseSessionById: (id: string) => Promise<ParsedSession>;
  onGistLoad?: (url: string) => Promise<void>;
  gistLoading?: boolean;
  gistError?: string | null;
  onDelete: (id: string) => void;
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
  gistError = null,
  onDelete,
}: Props = $props();

// Per-tab parsing state — SvelteMap makes .set()/.get()/.delete() reactive
const tabParseStates = new SvelteMap<string, TabParseState>();

const activeTab = $derived(tabs.find(t => t.id === activeTabId));
const activeSessionId = $derived(activeTab?.sessionId ?? null);
const activeMeta = $derived(
  activeSessionId ? getSession(activeSessionId) : undefined
);

const activeParseState = $derived<TabParseState>(
  tabParseStates.get(activeTabId) ?? {
    parsing: false,
    parsedSession: null,
    parseError: null,
  }
);

// Parse session when tab's session changes
$effect(() => {
  const tab = activeTab;
  if (!tab || !tab.sessionId) return;

  const sessionId = tab.sessionId;
  const existing = tabParseStates.get(tab.id);

  // Skip if already parsed, parsing, or previously failed
  if (existing?.parsedSession || existing?.parsing || existing?.parseError)
    return;

  // Start parsing
  tabParseStates.set(tab.id, {
    parsing: true,
    parsedSession: null,
    parseError: null,
  });

  parseSessionById(sessionId)
    .then(parsed => {
      tabParseStates.set(tab.id, {
        parsing: false,
        parsedSession: parsed,
        parseError: null,
      });
    })
    .catch(err => {
      tabParseStates.set(tab.id, {
        parsing: false,
        parsedSession: null,
        parseError:
          err instanceof Error ? err.message : 'Failed to parse session',
      });
    });
});

function retryParse() {
  tabParseStates.delete(activeTabId);
}

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

  <div
    class="flex-1 overflow-hidden {activeMeta && activeParseState.parsedSession ? 'flex' : ''}"
  >
    {#if activeMeta && activeParseState.parsedSession}
      <SessionViewer
        session={activeParseState.parsedSession}
        meta={activeMeta}
        {onDelete}
      />
    {:else if activeMeta && activeParseState.parsing}
      <div class="flex items-center justify-center h-full text-muted text-sm">
        <span>// parsing {activeMeta.name}/...</span>
      </div>
    {:else if activeMeta && activeParseState.parseError}
      <div class="flex items-center justify-center h-full text-sm">
        <div class="text-center space-y-4 max-w-md px-6">
          <div class="space-y-2">
            <span class="text-status-error font-medium"
              >// failed to load session</span
            >
            <p class="text-muted text-xs leading-relaxed">
              The file <span class="text-foreground/70">{activeMeta.name}</span>
              could not be parsed. It may be corrupted or in an unsupported
              format.
            </p>
          </div>
          <pre
            class="text-xs text-status-error/70 bg-status-error/5 border border-status-error/10 rounded px-3 py-2 text-left whitespace-pre-wrap break-words"
          >{activeParseState.parseError}</pre>
          <div class="flex items-center justify-center gap-3">
            <button
              class="text-xs text-accent hover:text-accent/80 transition-colors cursor-pointer"
              onclick={retryParse}
            >
              [retry]
            </button>
            <button
              class="text-xs text-muted hover:text-status-error transition-colors cursor-pointer"
              onclick={() => onDelete(activeMeta!.id)}
            >
              [delete session]
            </button>
          </div>
        </div>
      </div>
    {:else if activeSessionId && !activeMeta}
      <div class="flex items-center justify-center h-full text-muted text-sm">
        <span>// session not found</span>
      </div>
    {:else if gistLoading && !activeSessionId}
      <div class="flex items-center justify-center h-full">
        <div class="flex flex-col items-center gap-4 text-center">
          <svg
            class="w-8 h-8 text-accent animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="3"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <div class="space-y-1">
            <p class="text-foreground-bright text-sm font-medium">
              loading session from gist...
            </p>
            <p class="text-muted text-xs">fetching and parsing log file</p>
          </div>
        </div>
      </div>
    {:else}
      <UploadZone
        onUpload={handleUpload}
        {onGistLoad}
        {gistLoading}
        {gistError}
      />
    {/if}
  </div>
</main>
