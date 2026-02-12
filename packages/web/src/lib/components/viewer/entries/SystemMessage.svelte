<script lang="ts">
import ChevronIcon from 'virtual:icons/dinkie-icons/right-black-triangle';
import type { SystemEntry } from '$lib/types/timeline';

interface Props {
  entry: SystemEntry;
}

let { entry }: Props = $props();
let expanded = $state(false);
</script>

<button
  class="flex items-center gap-2 px-4 py-1.5 w-full text-left text-xs text-muted hover:text-foreground/70 transition-colors"
  onclick={() => (expanded = !expanded)}
>
  <ChevronIcon
    class="w-3 h-3 shrink-0 transition-transform {expanded ? 'rotate-90' : ''}"
  />
  <span>// system</span>
</button>

{#if expanded}
  <div class="px-4 pb-2 ml-6">
    <div
      class="bg-surface-card rounded p-3 text-xs text-muted whitespace-pre-wrap break-words"
    >
      {entry.content}
    </div>
  </div>
{/if}
