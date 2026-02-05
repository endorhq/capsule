<script lang="ts">
	import type { ParsedSession } from '$lib/types/timeline';

	interface Props {
		session: ParsedSession;
	}

	let { session }: Props = $props();

	function formatDuration(seconds: number): string {
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		if (m === 0) return `${s}s`;
		return `${m}m ${s}s`;
	}

	function formatTime(date: Date): string {
		return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
	}

	const messageCount = $derived(session.timeline.filter((e) => e.type === 'user' || e.type === 'assistant').length);
</script>

<div class="space-y-3">
	<div class="text-xs text-muted">// session_info</div>

	<div class="space-y-2 text-sm">
		<div class="flex justify-between">
			<span class="text-muted">agent</span>
			<span class="text-foreground">{session.context.agentName}</span>
		</div>
		{#if session.context.model}
			<div class="flex justify-between">
				<span class="text-muted">model</span>
				<span class="text-accent">{session.context.model}</span>
			</div>
		{/if}
		<div class="flex justify-between">
			<span class="text-muted">messages</span>
			<span class="text-foreground">{messageCount}</span>
		</div>
		{#if session.context.cwd}
			<div class="flex justify-between">
				<span class="text-muted">directory</span>
				<span class="text-foreground truncate ml-4" title={session.context.cwd}>
					{session.context.cwd.replace(/^\/home\/[^/]+/, '~')}
				</span>
			</div>
		{/if}
		{#if session.context.gitBranch}
			<div class="flex justify-between">
				<span class="text-muted">branch</span>
				<span class="text-accent">{session.context.gitBranch}</span>
			</div>
		{/if}
		{#if session.duration !== undefined}
			<div class="flex justify-between">
				<span class="text-muted">duration</span>
				<span class="text-foreground">{formatDuration(session.duration)}</span>
			</div>
		{/if}
		<div class="flex justify-between">
			<span class="text-muted">started</span>
			<span class="text-foreground">{formatTime(session.startTime)}</span>
		</div>
	</div>
</div>
