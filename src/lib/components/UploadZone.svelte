<script lang="ts">
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
		<svg
			class="w-10 h-10 text-muted"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			stroke-width="1"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
			/>
		</svg>

		<div class="text-center space-y-2">
			<h2 class="text-foreground-bright font-bold text-base">$ upload --session</h2>
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
			<svg
				class="w-4 h-4"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="1.5"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776"
				/>
			</svg>
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
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
						{:else}
							<!-- GitHub icon -->
							<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
								<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
							</svg>
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
</div>

<LogsLocationModal open={showLogsModal} onClose={() => (showLogsModal = false)} />
