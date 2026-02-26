<script lang="ts">
import ChevronIcon from 'virtual:icons/dinkie-icons/right-black-triangle';
import Markdown from '$lib/components/Markdown.svelte';
import type { AssistantEntry } from '$lib/types/timeline';

interface Props {
  entry: AssistantEntry;
}

let { entry }: Props = $props();
let showThinking = $state(false);

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
</script>

<div class="px-4 pt-3">
  <div class="flex items-center gap-2 mb-3">
    <span
      class="inline-block px-2 py-0.5 text-xs bg-[#201a10] text-[#e0b44c] rounded font-medium"
    >
      agent
    </span>
    <span class="text-muted text-xs">{formatTime(entry.timestamp)}</span>
  </div>
  {#if entry.thinking}
    <button
      class="flex items-center gap-1.5 text-xs text-muted mb-2 hover:text-foreground transition-colors"
      onclick={() => (showThinking = !showThinking)}
    >
      <ChevronIcon
        class="w-3 h-3 transition-transform {showThinking ? 'rotate-90' : ''}"
      />
      {entry.thinking.isEncrypted ? '// encrypted reasoning' : '// thinking'}
    </button>
    {#if showThinking && entry.thinking.text}
      <div
        class="bg-surface-card rounded p-3 mb-2 text-xs text-muted whitespace-pre-wrap"
      >
        {entry.thinking.text}
      </div>
    {/if}
  {/if}
  <Markdown content={entry.content} />
</div>
