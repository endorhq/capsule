<script lang="ts">
import type { SessionMeta } from '$lib/types';
import type {
  ParsedSession,
  SubagentEntry as SubagentType,
  TimelineEntry,
} from '$lib/types/timeline';
import FilterBar from './FilterBar.svelte';
import MessageThread from './MessageThread.svelte';
import SessionPanel from './panel/SessionPanel.svelte';

interface Props {
  session: ParsedSession;
  meta: SessionMeta;
  onDelete: (id: string) => void;
}

let { session, meta, onDelete }: Props = $props();

let filterText = $state('');
let selectedSubagent = $state<SubagentType | null>(null);

const filteredTimeline = $derived.by((): TimelineEntry[] => {
  if (!filterText.trim()) return session.timeline;

  const query = filterText.toLowerCase();
  return session.timeline.filter(entry => {
    switch (entry.type) {
      case 'user':
        return entry.content.toLowerCase().includes(query);
      case 'assistant':
        return (
          entry.content.toLowerCase().includes(query) ||
          (entry.thinking?.text?.toLowerCase().includes(query) ?? false)
        );
      case 'tool_call':
        return (
          entry.name.toLowerCase().includes(query) ||
          (entry.displayName?.toLowerCase().includes(query) ?? false) ||
          (entry.result?.toLowerCase().includes(query) ?? false) ||
          (entry.summary?.toLowerCase().includes(query) ?? false)
        );
      case 'subagent':
        return (
          entry.description.toLowerCase().includes(query) ||
          entry.agentId.toLowerCase().includes(query) ||
          entry.subagentType.toLowerCase().includes(query) ||
          entry.prompt.toLowerCase().includes(query) ||
          (entry.result?.toLowerCase().includes(query) ?? false)
        );
      case 'system':
        return entry.content.toLowerCase().includes(query);
      default:
        return false;
    }
  });
});

function handleSubagentSelect(entry: SubagentType) {
  selectedSubagent = entry;
}

function closeSubagent() {
  selectedSubagent = null;
}

const agentName = $derived(session.context.agentName.replace('-code', ''));
</script>

<div class="flex flex-1 overflow-hidden">
  <!-- Center: message thread -->
  <div class="flex flex-col flex-1 overflow-hidden">
    <FilterBar bind:value={filterText} />

    <div class="flex flex-col flex-1 overflow-hidden">
      <!-- Main conversation — always rendered, dimmed when subagent is open -->
      <div
        class="flex flex-col flex-1 overflow-hidden min-h-0 transition-opacity {selectedSubagent ? 'opacity-80' : ''}"
      >
        <MessageThread
          timeline={filteredTimeline}
          onSubagentSelect={handleSubagentSelect}
          activeSubagentId={selectedSubagent?.id ?? null}
        />
      </div>

      {#if selectedSubagent}
        <!-- Subagent block with teal glow -->
        <div
          class="flex flex-col flex-1 overflow-hidden min-h-0 shadow-[0_-4px_20px_rgba(45,212,191,0.15),0_0_40px_rgba(45,212,191,0.08)]"
        >
          <!-- Divider bar with subagent info -->
          <div
            class="flex items-center gap-2 px-4 py-2 border-y border-accent/30 bg-accent/5 shrink-0"
          >
            <span class="text-accent text-xs font-medium">[>]</span>
            <span class="text-accent text-xs font-medium">subagent</span>
            <span class="text-foreground-bright text-xs font-medium"
              >{selectedSubagent.description || selectedSubagent.subagentType}</span
            >
            {#if selectedSubagent.model}
              <span class="text-muted text-xs"
                >// {selectedSubagent.model.split('/').pop()}</span
              >
            {/if}
            <button
              class="ml-auto text-xs text-muted hover:text-foreground transition-colors cursor-pointer"
              onclick={closeSubagent}
            >
              [close]
            </button>
          </div>

          <!-- Bottom: subagent conversation -->
          <div class="flex flex-col flex-1 overflow-hidden min-h-0">
            <MessageThread
              timeline={selectedSubagent.timeline}
              userLabel={agentName}
              endMessage={selectedSubagent.result}
            />
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- Right: session panel -->
  <SessionPanel {session} {meta} {onDelete} />
</div>
