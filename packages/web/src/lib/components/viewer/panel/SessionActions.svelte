<script lang="ts">
import DeleteIcon from 'virtual:icons/dinkie-icons/diagonal-cross';
import ShareIcon from 'virtual:icons/dinkie-icons/share';
import type { SessionMeta } from '$lib/types';

interface Props {
  meta: SessionMeta;
  onDelete: () => void;
  onShare: () => void;
}

let { meta, onDelete, onShare }: Props = $props();
</script>

<div class="flex gap-2">
  <button
    class="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs text-red-400/60 border border-red-400/20 rounded hover:text-red-400 hover:border-red-400/50 transition-colors cursor-pointer"
    onclick={onDelete}
    title="Delete session"
  >
    <DeleteIcon class="w-3.5 h-3.5" />
    delete
  </button>
  <button
    class="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs text-accent/60 border border-accent/20 rounded hover:text-accent hover:border-accent/50 transition-colors cursor-pointer"
    onclick={onShare}
    title="Share session"
  >
    <ShareIcon class="w-3.5 h-3.5" />
    share
  </button>
</div>
