<script lang="ts">
	import type { SessionMeta } from '$lib/types';
	import SessionList from './SessionList.svelte';
	import SidebarFooter from './SidebarFooter.svelte';

	interface Props {
		sessions: SessionMeta[];
		selectedId: string | null;
		count: number;
		loading?: boolean;
		onSelect: (id: string) => void;
		onUpload: (file: File) => void;
		onClearAll: () => void;
	}

	let { sessions, selectedId, count, loading = false, onSelect, onUpload, onClearAll }: Props = $props();

	let fileInput: HTMLInputElement;

	function handleFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			onUpload(file);
			input.value = '';
		}
	}
</script>

<aside
	class="w-60 shrink-0 bg-surface-panel border-r border-edge flex flex-col h-full overflow-hidden"
>
	<div class="px-3 pt-3 pb-2">
		<div class="flex items-center justify-between text-xs text-muted mb-3">
			<span>// sessions</span>
			<span>[{count}]</span>
		</div>
		<button
			class="w-full py-2 text-sm font-medium bg-accent text-surface rounded cursor-pointer hover:brightness-110 transition"
			onclick={() => fileInput.click()}
		>
			$ load --session
		</button>
		<input
			bind:this={fileInput}
			type="file"
			accept=".jsonl,.json"
			class="hidden"
			onchange={handleFileChange}
		/>
	</div>

	<div class="flex-1 overflow-y-auto px-1 py-1">
		{#if loading}
			<div class="flex flex-col items-center justify-center h-full gap-3 text-muted">
				<div class="loading-spinner"></div>
				<span class="text-xs">loading sessions...</span>
			</div>
		{:else}
			<SessionList {sessions} {selectedId} {onSelect} />
		{/if}
	</div>

	<SidebarFooter {onClearAll} />
</aside>
