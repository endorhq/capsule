<script lang="ts">
	import type { ParsedSession } from '$lib/types/timeline';
	import type { SessionMeta } from '$lib/types';
	import SessionInfo from './SessionInfo.svelte';
	import TokenStats from './TokenStats.svelte';
	import FileList from './FileList.svelte';

	interface Props {
		session: ParsedSession;
		meta: SessionMeta;
	}

	let { session, meta }: Props = $props();
</script>

<aside class="w-80 shrink-0 border-l border-edge overflow-y-auto">
	<div class="px-4 py-4 space-y-6">
		<!-- Header -->
		<div class="flex items-center gap-2">
			<span class="w-2 h-2 rounded-full bg-accent shrink-0"></span>
			<span class="text-foreground-bright font-medium text-sm truncate">{meta.name}/</span>
			<span class="text-muted text-xs ml-auto shrink-0">{session.timeline.length} steps</span>
		</div>

		<SessionInfo {session} {meta} />
		<TokenStats tokens={session.totalTokens} cost={session.totalCost} />
		<FileList files={session.files} />
	</div>
</aside>
