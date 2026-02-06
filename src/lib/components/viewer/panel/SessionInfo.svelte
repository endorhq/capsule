<script lang="ts">
	import type { ParsedSession } from '$lib/types/timeline';
	import type { SessionMeta } from '$lib/types';

	interface Props {
		session: ParsedSession;
		meta?: SessionMeta;
	}

	let { session, meta }: Props = $props();

	const gistSource = $derived(meta?.source?.type === 'gist' ? meta.source : null);

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
		<div class="flex justify-between">
			<span class="text-muted">source</span>
			{#if gistSource}
				<a
					href={gistSource.gistUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="text-accent hover:underline flex items-center gap-1"
				>
					<svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
					</svg>
					{gistSource.owner ?? 'gist'}
				</a>
			{:else}
				<span class="text-foreground">local file</span>
			{/if}
		</div>
	</div>
</div>
