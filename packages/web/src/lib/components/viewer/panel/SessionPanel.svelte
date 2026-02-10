<script lang="ts">
import ConfirmationModal from '$lib/components/modals/ConfirmationModal.svelte';
import ShareModal from '$lib/components/modals/ShareModal.svelte';
import type { SessionMeta } from '$lib/types';
import type { ParsedSession } from '$lib/types/timeline';
import FileList from './FileList.svelte';
import SessionActions from './SessionActions.svelte';
import SessionInfo from './SessionInfo.svelte';
import TokenStats from './TokenStats.svelte';

interface Props {
  session: ParsedSession;
  meta: SessionMeta;
  onDelete: (id: string) => void;
}

let { session, meta, onDelete }: Props = $props();

let showDeleteConfirm = $state(false);
let showShareModal = $state(false);

function handleDeleteClick() {
  showDeleteConfirm = true;
}

function handleShareClick() {
  showShareModal = true;
}

function handleConfirmDelete() {
  showDeleteConfirm = false;
  onDelete(meta.id);
}

function handleCancelDelete() {
  showDeleteConfirm = false;
}

function handleCloseShare() {
  showShareModal = false;
}
</script>

<aside class="w-80 shrink-0 border-l border-edge overflow-y-auto flex flex-col">
  <div class="px-4 py-4 space-y-6 flex-1">
    <!-- Header -->
    <div class="flex items-center gap-2">
      <span class="w-2 h-2 rounded-full bg-accent shrink-0"></span>
      <span class="text-foreground-bright font-medium text-sm truncate"
        >{meta.name}/</span
      >
      <span class="text-muted text-xs ml-auto shrink-0"
        >{session.timeline.length} steps</span
      >
    </div>

    <SessionInfo {session} {meta} />
    <TokenStats tokens={session.totalTokens} cost={session.totalCost} />
    <FileList files={session.files} />
  </div>

  <!-- Actions footer -->
  <div class="px-4 py-4 border-t border-edge">
    <SessionActions
      {meta}
      onDelete={handleDeleteClick}
      onShare={handleShareClick}
    />
  </div>
</aside>

<ConfirmationModal
  open={showDeleteConfirm}
  title="delete session"
  message="Are you sure you want to delete this session? This action cannot be undone."
  confirmLabel="Delete"
  cancelLabel="Cancel"
  variant="danger"
  onConfirm={handleConfirmDelete}
  onCancel={handleCancelDelete}
/>

<ShareModal
  open={showShareModal}
  sessionMeta={meta}
  onClose={handleCloseShare}
/>
