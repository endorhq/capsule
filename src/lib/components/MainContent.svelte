<script lang="ts">
	import type { SessionMeta } from '$lib/types';
	import type { ParsedSession } from '$lib/types/timeline';
	import UploadZone from './UploadZone.svelte';
	import SessionViewer from './viewer/SessionViewer.svelte';

	interface Props {
		selected: SessionMeta | undefined;
		parsedSession: ParsedSession | null;
		parsing: boolean;
		parseError: string | null;
		onUpload: (file: File) => void;
	}

	let { selected, parsedSession, parsing, parseError, onUpload }: Props = $props();
</script>

<main class="flex-1 overflow-hidden {selected && parsedSession ? 'flex' : ''}">
	{#if selected && parsedSession}
		<SessionViewer session={parsedSession} meta={selected} />
	{:else if selected && parsing}
		<div class="flex items-center justify-center h-full text-muted text-sm">
			<span>// parsing {selected.name}/...</span>
		</div>
	{:else if selected && parseError}
		<div class="flex items-center justify-center h-full text-sm">
			<div class="text-center space-y-2">
				<span class="text-status-error">// parse error</span>
				<p class="text-muted text-xs">{parseError}</p>
			</div>
		</div>
	{:else if selected}
		<div class="flex items-center justify-center h-full text-muted text-sm">
			<span>// viewing {selected.name}/ &mdash; {selected.stepCount} steps</span>
		</div>
	{:else}
		<UploadZone {onUpload} />
	{/if}
</main>
