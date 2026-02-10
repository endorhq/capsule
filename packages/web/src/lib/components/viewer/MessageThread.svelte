<script lang="ts">
import type {
  SubagentEntry as SubagentType,
  TimelineEntry,
} from '$lib/types/timeline';
import AssistantMessage from './entries/AssistantMessage.svelte';
import SubagentEntry from './entries/SubagentEntry.svelte';
import SystemMessage from './entries/SystemMessage.svelte';
import ToolCallEntry from './entries/ToolCallEntry.svelte';
import UserMessage from './entries/UserMessage.svelte';

interface Props {
  timeline: TimelineEntry[];
  onSubagentSelect?: (entry: SubagentType) => void;
  activeSubagentId?: string | null;
  userLabel?: string;
  endMessage?: string;
}

let {
  timeline,
  onSubagentSelect,
  activeSubagentId = null,
  userLabel,
  endMessage,
}: Props = $props();

let showFullEnd = $state(false);
const endPreview = $derived(
  endMessage && endMessage.length > 800 && !showFullEnd
    ? endMessage.slice(0, 800)
    : endMessage
);

// Group consecutive tool_call, subagent, and system entries together so they
// render as a visually nested block between messages.
interface MessageGroup {
  type: 'message';
  entry: TimelineEntry;
}
interface ToolGroup {
  type: 'tool_group';
  entries: TimelineEntry[];
}
type Group = MessageGroup | ToolGroup;

const groups = $derived.by((): Group[] => {
  const result: Group[] = [];
  let pendingTools: TimelineEntry[] = [];

  function flushTools() {
    if (pendingTools.length > 0) {
      result.push({ type: 'tool_group', entries: [...pendingTools] });
      pendingTools = [];
    }
  }

  for (const entry of timeline) {
    if (
      entry.type === 'tool_call' ||
      entry.type === 'system' ||
      entry.type === 'subagent'
    ) {
      pendingTools.push(entry);
    } else {
      flushTools();
      result.push({ type: 'message', entry });
    }
  }
  flushTools();

  return result;
});
</script>

<div class="flex-1 overflow-y-auto">
  <div class="flex flex-col gap-2 py-2">
    {#each groups as group, i (group.type === 'message' ? group.entry.id : group.entries[0].id)}
      {#if group.type === 'message'}
        {#if group.entry.type === 'user'}
          <UserMessage entry={group.entry} label={userLabel || 'user'} />
        {:else if group.entry.type === 'assistant'}
          <AssistantMessage entry={group.entry} />
        {/if}
      {:else}
        <!-- Tool group: indented block with left accent border -->
        <div class="mx-4 my-1 flex flex-col gap-0.5">
          {#each group.entries as entry (entry.id)}
            {#if entry.type === 'tool_call'}
              <ToolCallEntry {entry} />
            {:else if entry.type === 'subagent'}
              <SubagentEntry
                {entry}
                onSelect={onSubagentSelect}
                isActive={activeSubagentId === entry.id}
              />
            {:else if entry.type === 'system'}
              <SystemMessage {entry} />
            {/if}
          {/each}
        </div>
      {/if}
    {/each}

    {#if endMessage}
      <!-- Subagent result message -->
      <div class="px-4 pt-3">
        <div class="flex items-center gap-2 mb-3">
          <span
            class="inline-block px-2 py-0.5 text-xs bg-accent/15 text-accent rounded font-medium"
          >
            subagent result
          </span>
        </div>
        <pre
          class="text-sm text-foreground/80 whitespace-pre-wrap break-words leading-relaxed"
        >{endPreview}</pre>
        {#if endMessage.length > 800 && !showFullEnd}
          <button
            class="text-accent text-xs mt-1 hover:underline"
            onclick={() => (showFullEnd = true)}
          >
            show more ({Math.round(endMessage.length / 1000)}k chars)
          </button>
        {/if}
      </div>
    {/if}

    <!-- End of session marker -->
    <div class="flex flex-col items-center py-8 select-none" aria-hidden="true">
      <pre class="text-xs leading-[1.3] text-muted/60 font-mono">    *  .  *
  .    __     .
      /  \  *
     | () |
      \__/   .
      /||\
  ~~~'~~~~'~~~</pre>
      <span class="text-xs text-muted/50 mt-3"
        >// end of {endMessage ? 'subagent' : 'session'}</span
      >
    </div>
  </div>
</div>
