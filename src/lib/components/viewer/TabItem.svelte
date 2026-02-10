<script lang="ts">
import type { Tab } from '$lib/types/tabs';

interface Props {
  tab: Tab;
  isActive: boolean;
  canClose: boolean;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
}

let { tab, isActive, canClose, onActivate, onClose }: Props = $props();

let isHovered = $state(false);

function handleClose(e: MouseEvent) {
  e.stopPropagation();
  onClose(tab.id);
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    onActivate(tab.id);
  }
}

// Truncate long labels
const displayLabel = $derived.by((): string => {
  const label = tab.label;
  if (label.length <= 18) return label;
  return `${label.slice(0, 15)}...`;
});
</script>

<button
	class="group relative flex items-center gap-2 px-3 py-2 text-sm border-r border-edge transition-colors cursor-pointer shrink-0
		{isActive
			? 'bg-surface text-foreground-bright border-b-0'
			: 'bg-surface-panel text-muted hover:text-foreground hover:bg-surface-hover'}"
	onclick={() => onActivate(tab.id)}
	onkeydown={handleKeydown}
	onmouseenter={() => (isHovered = true)}
	onmouseleave={() => (isHovered = false)}
	title={tab.label}
>
	<span class="truncate max-w-32">
		{tab.sessionId ? displayLabel + '/' : displayLabel}
	</span>

	{#if canClose && (isHovered || isActive)}
		<span
			role="button"
			tabindex="0"
			class="w-4 h-4 flex items-center justify-center rounded hover:bg-surface-selected text-muted hover:text-accent transition-colors cursor-pointer"
			onclick={handleClose}
			onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClose(e as unknown as MouseEvent); }}
			title="Close tab"
		>
			×
		</span>
	{:else}
		<span class="w-4"></span>
	{/if}

	{#if isActive}
		<span class="absolute bottom-0 left-0 right-0 h-px bg-surface"></span>
	{/if}
</button>
