<script lang="ts">
import DeleteIcon from 'virtual:icons/dinkie-icons/diagonal-cross';
import ShieldIcon from 'virtual:icons/dinkie-icons/shield';
import ConfirmationModal from '$lib/components/modals/ConfirmationModal.svelte';
import { isLocal } from '$lib/features';

interface Props {
  onClearAll: () => void;
}

let { onClearAll }: Props = $props();

let showClearConfirm = $state(false);

function handleClearClick() {
  showClearConfirm = true;
}

function handleConfirmClear() {
  showClearConfirm = false;
  onClearAll();
}

function handleCancelClear() {
  showClearConfirm = false;
}
</script>

<div class="border-t border-edge px-3 py-3 space-y-3">
  <div class="flex items-start gap-2 text-xs text-muted">
    <ShieldIcon class="w-4 h-4 shrink-0 mt-0.5" />
    {#if isLocal}
      <span>sessions are loaded from your local machine.</span>
    {:else}
      <span
        >all data is stored locally in your browser. nothing is sent to any
        server.</span
      >
    {/if}
  </div>
  <button
    class="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs text-muted border border-edge rounded hover:text-red-400 hover:border-red-400/50 transition-colors cursor-pointer"
    onclick={handleClearClick}
  >
    <DeleteIcon class="w-3.5 h-3.5" />
    {isLocal ? 'clear cached sessions' : 'clear local data'}
  </button>
</div>

<ConfirmationModal
  open={showClearConfirm}
  title="clear all local data"
  message="Are you sure you want to clear all local sessions? This action cannot be undone."
  confirmLabel="Clear All"
  cancelLabel="Cancel"
  variant="danger"
  onConfirm={handleConfirmClear}
  onCancel={handleCancelClear}
/>
