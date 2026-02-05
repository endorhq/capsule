<script lang="ts">
	interface Props {
		onUpload: (file: File) => void;
	}

	let { onUpload }: Props = $props();

	let dragCounter = $state(0);
	let fileInput: HTMLInputElement;

	const isDragging = $derived(dragCounter > 0);

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
	</div>

	<p class="text-muted/50 text-xs mt-6">waiting for input...</p>
</div>
