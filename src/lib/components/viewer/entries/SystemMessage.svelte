<script lang="ts">
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
	<svg
		class="w-3 h-3 shrink-0 transition-transform {expanded ? 'rotate-90' : ''}"
		fill="none"
		viewBox="0 0 24 24"
		stroke="currentColor"
		stroke-width="2"
	>
		<path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
	</svg>
	<span>// system</span>
</button>

{#if expanded}
	<div class="px-4 pb-2 ml-6">
		<div class="bg-surface-card rounded p-3 text-xs text-muted whitespace-pre-wrap break-words">
			{entry.content}
		</div>
	</div>
{/if}
