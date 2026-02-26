<script lang="ts">
import FileIcon from 'virtual:icons/dinkie-icons/page-facing-up';
import PencilIcon from 'virtual:icons/dinkie-icons/pencil';
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
              <FileIcon class="w-3.5 h-3.5 text-muted shrink-0" />
              <span class="text-foreground truncate" title={file.path}
                >{basename(file.path)}</span
              >
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
              <PencilIcon class="w-3.5 h-3.5 text-muted shrink-0" />
              <span class="text-foreground truncate" title={file.path}
                >{basename(file.path)}</span
              >
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
