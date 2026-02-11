<script lang="ts">
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
    <svg
      class="w-3.5 h-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      stroke-width="1.5"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
      />
    </svg>
    delete
  </button>
  <button
    class="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs text-accent/60 border border-accent/20 rounded hover:text-accent hover:border-accent/50 transition-colors cursor-pointer"
    onclick={onShare}
    title="Share session"
  >
    <svg
      class="w-3.5 h-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      stroke-width="1.5"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z"
      />
    </svg>
    share
  </button>
</div>
