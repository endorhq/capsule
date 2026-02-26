<script lang="ts">
interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

let {
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: Props = $props();

function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    onCancel();
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    onCancel();
  }
}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
    onclick={handleBackdropClick}
  >
    <div
      class="bg-surface-panel border border-edge rounded-lg shadow-2xl max-w-md w-full mx-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <!-- Header -->
      <div class="px-5 py-4 border-b border-edge">
        <h2 id="modal-title" class="text-foreground-bright font-bold text-base">
          {title}
        </h2>
      </div>

      <!-- Content -->
      <div class="px-5 py-4">
        <p class="text-muted text-sm leading-relaxed">{message}</p>
      </div>

      <!-- Footer -->
      <div class="flex justify-end gap-3 px-5 py-4 border-t border-edge">
        <button
          class="px-4 py-2 text-sm text-muted border border-edge rounded hover:text-foreground-bright hover:border-foreground/30 transition-colors cursor-pointer"
          onclick={onCancel}
        >
          {cancelLabel}
        </button>
        <button
          class="px-4 py-2 text-sm rounded transition-colors cursor-pointer {variant === 'danger'
						? 'bg-red-600 text-white hover:bg-red-500'
						: 'bg-accent text-surface hover:bg-accent/90'}"
          onclick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
{/if}
