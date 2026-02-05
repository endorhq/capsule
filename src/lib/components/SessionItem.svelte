<script lang="ts">
	import type { SessionMeta } from '$lib/types';

	interface Props {
		session: SessionMeta;
		isSelected: boolean;
		onSelect: (id: string) => void;
	}

	let { session, isSelected, onSelect }: Props = $props();

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
</script>

<button
	class="w-full text-left px-3 py-2.5 rounded transition-colors {isSelected
		? 'bg-surface-selected'
		: 'hover:bg-surface-hover'}"
	onclick={() => onSelect(session.id)}
>
	<div class="flex items-center gap-2">
		<span
			class="w-2 h-2 rounded-full shrink-0 {isSelected ? 'bg-accent' : 'bg-muted'}"
		></span>
		<span class="text-sm {isSelected ? 'text-foreground-bright' : 'text-foreground'} truncate">
			{session.name}/
		</span>
	</div>
	<div class="text-xs text-muted ml-4 mt-0.5">
		{session.stepCount} steps &middot; {formatRelativeTime(session.uploadedAt)}
	</div>
</button>
