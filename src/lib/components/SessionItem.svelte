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
		return name.slice(0, 21) + '...';
	});

	const formatLabel = $derived(session.agentFormat && session.agentFormat !== 'unknown' ? session.agentFormat : null);

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
	{#if formatLabel}
		<div class="text-xs ml-4 mt-0.5">
			<span class="text-accent/70">{formatLabel}</span>
		</div>
	{/if}
</button>
