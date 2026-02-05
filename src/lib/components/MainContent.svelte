<script lang="ts">
	import type { SessionMeta } from '$lib/types';
	import UploadZone from './UploadZone.svelte';

	interface Props {
		selected: SessionMeta | undefined;
		onUpload: (file: File) => void;
	}

	let { selected, onUpload }: Props = $props();
</script>

<main class="flex-1 overflow-hidden">
	{#if selected}
		<div class="flex items-center justify-center h-full text-muted text-sm">
			<span>// viewing {selected.name}/ &mdash; {selected.stepCount} steps</span>
		</div>
	{:else}
		<UploadZone {onUpload} />
	{/if}
</main>
