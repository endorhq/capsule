<script lang="ts">
import type { SessionMeta } from '$lib/types';

interface Props {
  session: SessionMeta;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

let { session, isSelected, onSelect, onRemove }: Props = $props();

let isHovered = $state(false);

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Truncate long names (UUIDs, hashes) to a reasonable length
const displayName = $derived.by((): string => {
  const name = session.name;
  if (name.length <= 24) return name;
  return `${name.slice(0, 21)}...`;
});

const formatLabel = $derived(
  session.agentFormat && session.agentFormat !== 'unknown'
    ? session.agentFormat
    : null
);
const isGist = $derived(session.source?.type === 'gist');

function handleRemove(e: MouseEvent) {
  e.stopPropagation();
  onRemove(session.id);
}
</script>

<button
	class="group w-full text-left px-3 py-2.5 rounded transition-colors cursor-pointer {isSelected
		? 'bg-surface-selected'
		: 'hover:bg-surface-hover'}"
	onclick={() => onSelect(session.id)}
	onmouseenter={() => (isHovered = true)}
	onmouseleave={() => (isHovered = false)}
	title={session.name}
>
	<div class="flex items-center gap-2">
		<span
			class="w-2 h-2 rounded-full shrink-0 {isSelected ? 'bg-accent' : 'bg-muted'}"
		></span>
		<span class="text-sm {isSelected ? 'text-foreground-bright' : 'text-foreground'} truncate flex-1">
			{displayName}/
		</span>
		{#if isHovered}
			<span
				role="button"
				tabindex="0"
				class="w-5 h-5 flex items-center justify-center rounded text-muted hover:text-status-error hover:bg-surface-selected transition-colors cursor-pointer"
				onclick={handleRemove}
				onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleRemove(e as unknown as MouseEvent); }}
				title="Delete session"
			>
				×
			</span>
		{/if}
	</div>
	<div class="flex items-center justify-between text-xs text-muted ml-4 mt-0.5">
		<span>{session.stepCount} steps</span>
		<span>{formatRelativeTime(session.uploadedAt)}</span>
	</div>
	{#if formatLabel || isGist}
		<div class="flex items-center gap-2 text-xs ml-4 mt-0.5">
			{#if formatLabel}
				<span class="text-accent/70">{formatLabel}</span>
			{/if}
			{#if isGist}
				<span class="flex items-center gap-1 text-muted/70">
					<svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
					</svg>
					gist
				</span>
			{/if}
		</div>
	{/if}
</button>
