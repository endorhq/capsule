<script lang="ts">
import type { AgentSource, DiscoveredSession } from '$lib/types/discovery';
import LocalSessionItem from './LocalSessionItem.svelte';

const MAX_VISIBLE_SESSIONS = 50;

interface Props {
  sources: AgentSource[];
  loading: boolean;
  error: string | null;
  selectedAgent: string | null;
  onSelectAgent: (agent: string | null) => void;
  onSelectSession: (session: DiscoveredSession) => void;
  onRefresh: () => void;
}

let {
  sources,
  loading,
  error,
  selectedAgent,
  onSelectAgent,
  onSelectSession,
  onRefresh,
}: Props = $props();

const activeSource = $derived(
  sources.find(s => s.agent === selectedAgent) ?? null
);
const visibleSessions = $derived(
  (activeSource?.sessions ?? []).slice(0, MAX_VISIBLE_SESSIONS)
);
const totalForAgent = $derived(activeSource?.sessionCount ?? 0);
const totalSessionCount = $derived(
  sources.reduce((sum, s) => sum + s.sessionCount, 0)
);

const knownPaths = [
  '~/.claude/projects/',
  '~/.codex/sessions/',
  '~/.copilot/session-state/',
  '~/.gemini/tmp/',
];
</script>

<div class="flex items-center justify-center h-full p-6">
  <div class="w-full max-w-2xl">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <h2 class="text-foreground-bright font-medium text-sm">
          $ discover --sessions
        </h2>
        {#if !loading && sources.length > 0}
          <span class="text-xs text-muted">[{totalSessionCount}]</span>
        {/if}
      </div>
      <button
        class="text-xs text-muted hover:text-accent transition-colors cursor-pointer disabled:opacity-50"
        onclick={onRefresh}
        disabled={loading}
      >
        {#if loading}
          scanning...
        {:else}
          [refresh]
        {/if}
      </button>
    </div>

    <!-- Loading state -->
    {#if loading}
      <div
        class="flex flex-col items-center justify-center py-16 text-muted gap-3"
      >
        <div class="loading-spinner"></div>
        <span class="text-sm">scanning for sessions...</span>
      </div>
    <!-- Error state -->
    {:else if error}
      <div class="flex flex-col items-center justify-center py-16 gap-4">
        <span class="text-sm text-status-error">// {error}</span>
        <button
          class="text-xs text-accent hover:text-accent/80 transition-colors cursor-pointer"
          onclick={onRefresh}
        >
          [retry]
        </button>
      </div>
    <!-- Empty state -->
    {:else if sources.length === 0}
      <div
        class="flex flex-col items-center justify-center py-16 gap-4 text-center"
      >
        <span class="text-sm text-muted">// no sessions found</span>
        <div class="text-xs text-muted/60 space-y-1">
          <p>checked the following paths:</p>
          {#each knownPaths as path}
            <p class="font-mono">{path}</p>
          {/each}
        </div>
        <button
          class="text-xs text-accent hover:text-accent/80 transition-colors cursor-pointer mt-2"
          onclick={onRefresh}
        >
          [scan again]
        </button>
      </div>
    <!-- Normal state: two-column layout -->
    {:else}
      <div
        class="flex border border-edge rounded-lg overflow-hidden bg-surface-panel"
        style="height: 420px;"
      >
        <!-- Left column: Agent list -->
        <div
          class="w-44 shrink-0 border-r border-edge p-3 space-y-1.5 overflow-y-auto"
        >
          <p class="text-xs text-muted mb-2">// agents</p>
          {#each sources as source}
            <button
              class="w-full text-left px-3 py-2 rounded text-sm transition-colors cursor-pointer {selectedAgent ===
							source.agent
								? 'bg-accent-dim border border-accent text-accent'
								: 'border border-edge text-foreground hover:border-foreground/30 hover:text-foreground-bright'}"
              onclick={() => onSelectAgent(source.agent)}
            >
              <div class="flex items-center justify-between">
                <span>
                  <span class="text-muted text-xs">$</span>
                  {source.label}
                </span>
                <span
                  class="text-xs {selectedAgent === source.agent
										? 'text-accent/70'
										: 'text-muted'}"
                >
                  {source.sessionCount}
                </span>
              </div>
            </button>
          {/each}
        </div>

        <!-- Right column: Session list -->
        <div class="flex-1 flex flex-col overflow-hidden">
          {#if activeSource}
            <div
              class="flex items-center justify-between px-3 py-2 border-b border-edge"
            >
              <span class="text-xs text-muted">
                // {activeSource.label} sessions
              </span>
              {#if totalForAgent > MAX_VISIBLE_SESSIONS}
                <span class="text-xs text-muted/60">
                  showing {MAX_VISIBLE_SESSIONS} of {totalForAgent}
                </span>
              {/if}
            </div>
            <div class="flex-1 overflow-y-auto p-2 space-y-0.5">
              {#each visibleSessions as session (session.filePath)}
                <LocalSessionItem {session} onSelect={onSelectSession} />
              {/each}
            </div>
          {:else}
            <div
              class="flex items-center justify-center h-full text-muted text-sm"
            >
              <span>// select an agent</span>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>
