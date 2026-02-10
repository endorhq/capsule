<script lang="ts">
import type { ToolCallEntry as ToolCallType } from '$lib/types/timeline';

interface Props {
  entry: ToolCallType;
}

let { entry }: Props = $props();
let expanded = $state(false);
let showFullOutput = $state(false);

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

const meta = $derived(entry.resultMeta);
const outputText = $derived(meta?.output || entry.result || '');
const outputPreview = $derived(
  outputText.length > 500 && !showFullOutput
    ? outputText.slice(0, 500)
    : outputText
);

// Build the inline summary shown in the collapsed header
const headerSummary = $derived.by((): string => {
  if (entry.name === 'exec_command' && entry.arguments.cmd) {
    const cmd = String(entry.arguments.cmd);
    return cmd.length > 60 ? `${cmd.slice(0, 60)}...` : cmd;
  }
  if (entry.name === 'apply_patch' && meta?.files?.length) {
    return meta.files.join(', ');
  }
  if (entry.summary) return entry.summary;
  return '';
});
</script>

<div class="rounded-lg bg-surface-card/60 overflow-hidden opacity-70 hover:opacity-100 transition-opacity">
	<!-- Header bar — always visible -->
	<button
		class="flex items-center gap-2 w-full text-left px-3 py-2 text-xs hover:bg-surface-hover/50 transition-colors cursor-pointer"
		onclick={() => (expanded = !expanded)}
	>
		<span class="text-muted font-medium shrink-0">{'>_'}</span>
		<span class="text-accent font-medium">tool_call</span>
		<span class="text-foreground-bright font-medium">{entry.displayName || entry.name}</span>
		<span class="w-1.5 h-1.5 rounded-full {statusDot} shrink-0"></span>
		<span class="{statusColor}">{entry.status}</span>
		{#if headerSummary && !expanded}
			<span class="text-muted truncate flex-1 ml-1">// {headerSummary}</span>
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

	<!-- Expanded detail: two-column layout -->
	{#if expanded}
		<div class="border-t border-edge/30 flex text-xs">
			<!-- Left: metadata -->
			<div class="w-48 shrink-0 px-3 py-2.5 border-r border-edge/30 space-y-1.5">
				{#if meta?.command}
					<div>
						<span class="text-muted block">command</span>
						<span class="text-foreground font-mono break-all">{meta.command}</span>
					</div>
				{/if}
				{#if entry.name === 'apply_patch' && meta?.files?.length}
					<div>
						<span class="text-muted block">files</span>
						{#each meta.files as f}
							<span class="text-foreground block">{f}</span>
						{/each}
					</div>
				{/if}
				{#if meta?.exitCode !== undefined}
					<div class="flex justify-between">
						<span class="text-muted">exit code</span>
						<span class="{meta.exitCode === 0 ? 'text-status-success' : 'text-status-error'}">{meta.exitCode}</span>
					</div>
				{/if}
				{#if meta?.duration}
					<div class="flex justify-between">
						<span class="text-muted">duration</span>
						<span class="text-foreground">{meta.duration}</span>
					</div>
				{/if}
				{#if meta?.linesAdded !== undefined || meta?.linesRemoved !== undefined}
					<div class="flex justify-between">
						<span class="text-muted">lines</span>
						<span class="text-foreground">
							<span class="text-status-success">+{meta?.linesAdded ?? 0}</span>
							<span class="text-status-error"> -{meta?.linesRemoved ?? 0}</span>
						</span>
					</div>
				{/if}
				<div class="flex justify-between">
					<span class="text-muted">status</span>
					<span class="{statusColor}">{entry.status}</span>
				</div>
			</div>

			<!-- Right: output -->
			<div class="flex-1 px-3 py-2.5 min-w-0 overflow-hidden">
				<span class="text-muted block mb-1">output</span>
				{#if outputPreview}
					<pre class="text-foreground/80 whitespace-pre-wrap break-words text-xs leading-relaxed">{outputPreview}</pre>
					{#if outputText.length > 500 && !showFullOutput}
						<button
							class="text-accent mt-1 hover:underline"
							onclick={(e) => { e.stopPropagation(); showFullOutput = true; }}
						>
							show more ({Math.round(outputText.length / 1000)}k chars)
						</button>
					{/if}
				{:else}
					<span class="text-muted italic">no output</span>
				{/if}
			</div>
		</div>
	{/if}
</div>
