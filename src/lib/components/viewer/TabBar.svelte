<script lang="ts">
import type { Tab } from '$lib/types/tabs';
import TabItem from './TabItem.svelte';

interface Props {
  tabs: Tab[];
  activeTabId: string;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
}

let { tabs, activeTabId, onActivate, onClose, onNew }: Props = $props();

const canClose = $derived(tabs.length > 1 || tabs[0]?.sessionId !== null);
</script>

<div
  class="flex items-stretch bg-surface-panel border-b border-edge overflow-x-auto scrollbar-thin"
>
  {#each tabs as tab (tab.id)}
    <TabItem
      {tab}
      isActive={tab.id === activeTabId}
      {canClose}
      {onActivate}
      {onClose}
    />
  {/each}

  <button
    class="px-3 py-2 text-muted hover:text-accent hover:bg-surface-hover transition-colors cursor-pointer shrink-0"
    onclick={onNew}
    title="New tab"
  >
    +
  </button>

  <div class="flex-1 border-b border-edge"></div>
</div>
