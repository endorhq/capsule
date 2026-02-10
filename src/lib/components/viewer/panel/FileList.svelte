<script lang="ts">
import type { FileEntry } from '$lib/types/timeline';

interface Props {
  files: FileEntry[];
}

let { files }: Props = $props();

const readFiles = $derived(files.filter(f => f.operation === 'read'));
const editedFiles = $derived(files.filter(f => f.operation === 'edited'));

function basename(path: string): string {
  return path.split('/').pop() || path;
}
</script>

{#if files.length > 0}
	<div class="space-y-3">
		<div class="text-xs text-muted">// files</div>

		{#if readFiles.length > 0}
			<div>
				<div class="text-xs text-muted mb-1.5">read</div>
				<div class="space-y-1">
					{#each readFiles as file}
						<div class="flex items-center gap-2 text-sm">
							<svg class="w-3.5 h-3.5 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
								<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
							</svg>
							<span class="text-foreground truncate" title={file.path}>{basename(file.path)}</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		{#if editedFiles.length > 0}
			<div>
				<div class="text-xs text-muted mb-1.5">edited</div>
				<div class="space-y-1">
					{#each editedFiles as file}
						<div class="flex items-center gap-2 text-sm">
							<svg class="w-3.5 h-3.5 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
								<path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
							</svg>
							<span class="text-foreground truncate" title={file.path}>{basename(file.path)}</span>
							{#if file.isNew}
								<span class="text-xs text-accent">+new</span>
							{:else}
								<span class="text-xs text-amber-400">modified</span>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
{/if}
