<script lang="ts">
import DownloadIcon from 'virtual:icons/dinkie-icons/download';
import FolderIcon from 'virtual:icons/dinkie-icons/file-folder';
import GithubIcon from 'virtual:icons/dinkie-icons/github';
import LogsLocationModal from './LogsLocationModal.svelte';

interface Props {
  onUpload: (file: File) => void;
  onGistLoad?: (url: string) => Promise<void>;
  gistLoading?: boolean;
  gistError?: string | null;
}

let {
  onUpload,
  onGistLoad,
  gistLoading = false,
  gistError = null,
}: Props = $props();

let dragCounter = $state(0);
let fileInput: HTMLInputElement;
let showLogsModal = $state(false);
let gistInput = $state('');
let sampleLoading = $state<string | null>(null);

async function loadSample(name: string, filename: string) {
  if (sampleLoading) return;
  sampleLoading = name;
  try {
    const res = await fetch(`/samples/${filename}`);
    const text = await res.text();
    const file = new File([text], filename, { type: 'application/jsonl' });
    onUpload(file);
  } finally {
    sampleLoading = null;
  }
}

const isDragging = $derived(dragCounter > 0);

async function handleGistSubmit() {
  if (!gistInput.trim() || !onGistLoad) return;
  await onGistLoad(gistInput.trim());
  gistInput = '';
}

function handleGistKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    handleGistSubmit();
  }
}

function handleDragEnter(e: DragEvent) {
  e.preventDefault();
  dragCounter++;
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault();
  dragCounter--;
}

function handleDragOver(e: DragEvent) {
  e.preventDefault();
}

function handleDrop(e: DragEvent) {
  e.preventDefault();
  dragCounter = 0;
  const file = e.dataTransfer?.files[0];
  if (file && (file.name.endsWith('.jsonl') || file.name.endsWith('.json'))) {
    onUpload(file);
  }
}

function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    onUpload(file);
    input.value = '';
  }
}
</script>

<div class="flex flex-col items-center justify-center h-full">
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="border border-dashed rounded-lg px-16 py-14 flex flex-col items-center gap-4 max-w-lg w-full transition-colors {isDragging
			? 'border-accent bg-accent/5'
			: 'border-edge-dashed'}"
    ondragenter={handleDragEnter}
    ondragleave={handleDragLeave}
    ondragover={handleDragOver}
    ondrop={handleDrop}
  >
    <DownloadIcon class="w-10 h-10 text-muted rotate-180" />

    <div class="text-center space-y-2">
      <h2 class="text-foreground-bright font-bold text-base">
        $ upload --session
      </h2>
      <p class="text-muted text-sm">drag and drop your session log file here</p>
      <p class="text-muted/60 text-xs">supports .json, .jsonl</p>
    </div>

    <div class="flex items-center gap-3 w-full my-1">
      <div class="flex-1 border-t border-edge"></div>
      <span class="text-xs text-muted">or</span>
      <div class="flex-1 border-t border-edge"></div>
    </div>

    <button
      class="flex items-center gap-2 px-6 py-2 text-sm border border-edge rounded hover:border-foreground/30 hover:text-foreground-bright transition-colors cursor-pointer text-foreground"
      onclick={() => fileInput.click()}
    >
      <FolderIcon class="w-4 h-4" />
      browse files
    </button>
    <input
      bind:this={fileInput}
      type="file"
      accept=".jsonl,.json"
      class="hidden"
      onchange={handleFileChange}
    />

    {#if onGistLoad}
      <div class="flex items-center gap-3 w-full my-1">
        <div class="flex-1 border-t border-edge"></div>
        <span class="text-xs text-muted">or</span>
        <div class="flex-1 border-t border-edge"></div>
      </div>

      <div class="w-full space-y-2">
        <div class="flex gap-2">
          <input
            type="text"
            bind:value={gistInput}
            onkeydown={handleGistKeydown}
            placeholder="gist.github.com/user/id or gist ID"
            disabled={gistLoading}
            class="flex-1 px-3 py-2 text-sm bg-surface border border-edge rounded text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent disabled:opacity-50"
          />
          <button
            onclick={handleGistSubmit}
            disabled={gistLoading || !gistInput.trim()}
            class="flex items-center gap-2 px-4 py-2 text-sm border border-edge rounded hover:border-foreground/30 hover:text-foreground-bright transition-colors cursor-pointer text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {#if gistLoading}
              <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            {:else}
              <GithubIcon class="w-4 h-4" />
            {/if}
            load gist
          </button>
        </div>
        {#if gistError}
          <p class="text-xs text-status-error">{gistError}</p>
        {/if}
      </div>
    {/if}
  </div>
  <button
    class="text-xs text-muted hover:text-accent transition-colors cursor-pointer mt-3"
    onclick={() => (showLogsModal = true)}
  >
    ? where can I find my session logs?
  </button>
  {#if onGistLoad}
    <div
      class="max-w-lg w-full mt-12 rounded-lg border border-accent/20 bg-accent/[0.03] p-5"
    >
      <div class="text-center mb-3">
        <h3 class="text-sm font-semibold text-accent">Just curious?</h3>
        <p class="text-xs text-muted mt-0.5">
          Try a sample file to see how it looks
        </p>
      </div>
      <div class="flex gap-2 w-full">
        <button
          onclick={() => loadSample('claude', 'claude-sample.jsonl')}
          disabled={!!sampleLoading}
          class="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm border border-accent/20 rounded hover:border-accent/50 hover:bg-accent/5 hover:text-foreground-bright transition-colors cursor-pointer text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Claude Code
        </button>
        <button
          onclick={() => loadSample('codex', 'codex-sample.jsonl')}
          disabled={!!sampleLoading}
          class="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm border border-accent/20 rounded hover:border-accent/50 hover:bg-accent/5 hover:text-foreground-bright transition-colors cursor-pointer text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Codex
        </button>
      </div>
    </div>
  {/if}
</div>

<LogsLocationModal
  open={showLogsModal}
  onClose={() => (showLogsModal = false)}
/>
