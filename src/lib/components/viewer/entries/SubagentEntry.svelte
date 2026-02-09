<script lang="ts">
	import type { SubagentEntry as SubagentType } from '$lib/types/timeline';

	interface Props {
		entry: SubagentType;
		onSelect?: (entry: SubagentType) => void;
		isActive?: boolean;
	}

	let { entry, onSelect, isActive = false }: Props = $props();
	let expanded = $state(false);
	let showFullResult = $state(false);

	const statusColor = $derived(
		entry.status === 'success'
			? 'text-status-success'
			: entry.status === 'error'
				? 'text-status-error'
				: entry.status === 'pending'
					? 'text-status-pending'
					: 'text-muted'
	);

	const statusDot = $derived(
		entry.status === 'success'
			? 'bg-status-success'
			: entry.status === 'error'
				? 'bg-status-error'
				: entry.status === 'pending'
					? 'bg-status-pending'
					: 'bg-muted'
	);

	const stepCount = $derived(entry.timeline.length);
	const resultText = $derived(entry.result || '');
	const resultPreview = $derived(
		resultText.length > 500 && !showFullResult
			? resultText.slice(0, 500)
			: resultText
	);

	function formatTokens(n: number): string {
		if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
		if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
		return String(n);
	}
</script>

<div class="rounded-lg bg-surface-card/60 overflow-hidden border {isActive ? 'border-accent/60 bg-accent/5' : 'border-accent/20'} transition-colors">
	<!-- Header bar -->
	<button
		class="flex items-center gap-2 w-full text-left px-3 py-2 text-xs hover:bg-surface-hover/50 transition-colors cursor-pointer {isActive ? 'opacity-100' : 'opacity-70 hover:opacity-100'}"
		onclick={() => (expanded = !expanded)}
	>
		<span class="text-muted font-medium shrink-0">[>]</span>
		<span class="text-accent font-medium">subagent</span>
		<span class="text-foreground-bright font-medium">{entry.description || entry.subagentType}</span>
		<span class="w-1.5 h-1.5 rounded-full {statusDot} shrink-0"></span>
		<span class="{statusColor}">{entry.status}</span>
		{#if !expanded}
			<span class="text-muted truncate flex-1 ml-1">// {stepCount} steps</span>
		{/if}
		<svg
			class="w-3 h-3 text-muted ml-auto shrink-0 transition-transform {expanded ? 'rotate-90' : ''}"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			stroke-width="2"
		>
			<path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
		</svg>
	</button>

	<!-- Expanded detail -->
	{#if expanded}
		<div class="border-t border-edge/30 flex text-xs">
			<!-- Left: metadata + open button -->
			<div class="w-48 shrink-0 px-3 py-2.5 border-r border-edge/30 space-y-1.5">
				<div class="flex justify-between">
					<span class="text-muted">type</span>
					<span class="text-accent">{entry.subagentType}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-muted">agentId</span>
					<span class="text-foreground font-mono">{entry.agentId}</span>
				</div>
				{#if entry.model}
					<div>
						<span class="text-muted block">model</span>
						<span class="text-foreground break-all">{entry.model.split('/').pop()}</span>
					</div>
				{/if}
				{#if entry.tokens?.total}
					<div class="flex justify-between">
						<span class="text-muted">tokens</span>
						<span class="text-foreground">{formatTokens(entry.tokens.total)}</span>
					</div>
				{/if}
				<div class="flex justify-between">
					<span class="text-muted">steps</span>
					<span class="text-foreground">{stepCount}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-muted">status</span>
					<span class="{statusColor}">{entry.status}</span>
				</div>
				{#if onSelect && entry.timeline.length > 0}
					<button
						class="w-full mt-2 px-2 py-1.5 text-xs font-medium text-[#0a0a0a] bg-accent rounded hover:bg-accent/80 transition-colors cursor-pointer"
						onclick={(e) => { e.stopPropagation(); onSelect?.(entry); }}
					>
						open conversation
					</button>
				{/if}
			</div>

			<!-- Right: result preview -->
			<div class="flex-1 px-3 py-2.5 min-w-0 overflow-hidden">
				<span class="text-muted block mb-1">result</span>
				{#if resultPreview}
					<pre class="text-foreground/80 whitespace-pre-wrap break-words text-xs leading-relaxed">{resultPreview}</pre>
					{#if resultText.length > 500 && !showFullResult}
						<button
							class="text-accent mt-1 hover:underline text-left"
							onclick={(e) => { e.stopPropagation(); showFullResult = true; }}
						>
							show more ({Math.round(resultText.length / 1000)}k chars)
						</button>
					{/if}
				{:else}
					<span class="text-muted italic">no result</span>
				{/if}
			</div>
		</div>
	{/if}
</div>
