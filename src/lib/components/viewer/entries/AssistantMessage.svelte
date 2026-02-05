<script lang="ts">
	import type { AssistantEntry } from '$lib/types/timeline';

	interface Props {
		entry: AssistantEntry;
	}

	let { entry }: Props = $props();
	let showThinking = $state(false);

	function formatTime(date: Date): string {
		return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
	}
</script>

<div class="flex gap-3 px-4 py-3">
	<div class="shrink-0 mt-0.5">
		<span class="inline-block px-2 py-0.5 text-xs bg-accent text-surface rounded font-medium">
			agent
		</span>
	</div>
	<div class="flex-1 min-w-0">
		{#if entry.thinking}
			<button
				class="flex items-center gap-1.5 text-xs text-muted mb-2 hover:text-foreground transition-colors"
				onclick={() => (showThinking = !showThinking)}
			>
				<svg
					class="w-3 h-3 transition-transform {showThinking ? 'rotate-90' : ''}"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
				</svg>
				{entry.thinking.isEncrypted ? '// encrypted reasoning' : '// thinking'}
			</button>
			{#if showThinking && entry.thinking.text}
				<div class="bg-surface-card rounded p-3 mb-2 text-xs text-muted whitespace-pre-wrap">
					{entry.thinking.text}
				</div>
			{/if}
		{/if}
		<div class="bg-surface-card rounded-lg p-4">
			<p class="text-foreground text-sm whitespace-pre-wrap break-words">{entry.content}</p>
		</div>
		<span class="text-muted text-xs mt-1 block">{formatTime(entry.timestamp)}</span>
	</div>
</div>
