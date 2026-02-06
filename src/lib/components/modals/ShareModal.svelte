<script lang="ts">
	import type { SessionMeta } from '$lib/types';

	interface Props {
		open: boolean;
		sessionMeta: SessionMeta;
		onClose: () => void;
	}

	let { open, sessionMeta, onClose }: Props = $props();

	let copied = $state(false);

	const isGist = $derived(sessionMeta.source?.type === 'gist');
	const gistId = $derived(
		sessionMeta.source?.type === 'gist' ? sessionMeta.source.gistId : null
	);

	const shareUrl = $derived.by(() => {
		if (!isGist || !gistId) return '';
		if (typeof window === 'undefined') return '';
		return `${window.location.origin}?gist=${gistId}`;
	});

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	async function copyUrl() {
		try {
			await navigator.clipboard.writeText(shareUrl);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch {
			const textArea = document.createElement('textarea');
			textArea.value = shareUrl;
			document.body.appendChild(textArea);
			textArea.select();
			document.execCommand('copy');
			document.body.removeChild(textArea);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
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
			class="bg-surface-panel border border-edge rounded-lg shadow-2xl max-w-lg w-full mx-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title"
		>
			<!-- Header -->
			<div class="flex items-center justify-between px-5 py-4 border-b border-edge">
				<h2 id="modal-title" class="text-foreground-bright font-bold text-base">
					share session
				</h2>
				<button
					class="text-muted hover:text-foreground-bright transition-colors cursor-pointer p-1"
					onclick={onClose}
					aria-label="Close modal"
				>
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Content -->
			<div class="px-5 py-5 space-y-4">
				{#if isGist}
					<p class="text-muted text-sm">
						Share this URL with others to let them view this session.
					</p>

					<!-- URL display -->
					<div
						class="flex items-center gap-2 bg-surface border border-edge rounded px-3 py-2 font-mono text-sm"
					>
						<code class="flex-1 text-foreground-bright overflow-x-auto whitespace-nowrap">
							{shareUrl}
						</code>
						<button
							class="shrink-0 text-muted hover:text-accent transition-colors cursor-pointer p-1"
							onclick={copyUrl}
							aria-label="Copy URL"
							title="Copy URL"
						>
							{#if copied}
								<svg class="w-4 h-4 text-status-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
								</svg>
							{:else}
								<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
									/>
								</svg>
							{/if}
						</button>
					</div>

					<p class="text-xs text-muted/60 flex items-center gap-1.5">
						<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
						</svg>
						anyone with this link can view this session
					</p>
				{:else}
					<div class="space-y-4">
						<p class="text-muted text-sm">
							This session is stored locally and cannot be shared directly.
						</p>

						<div class="bg-surface border border-edge rounded p-4 space-y-3">
							<p class="text-foreground-bright text-sm font-medium">
								// to share this session:
							</p>
							<ol class="text-muted text-sm space-y-2 list-decimal list-inside">
								<li>Export the session file</li>
								<li>Create a GitHub Gist with the file</li>
								<li>Share the gist URL</li>
							</ol>
						</div>

						<a
							href="https://gist.github.com/new"
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-2 text-accent hover:text-accent/80 text-sm transition-colors"
						>
							<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
							</svg>
							create a new gist on github
						</a>
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="flex justify-end px-5 py-4 border-t border-edge">
				<button
					class="px-4 py-2 text-sm text-muted border border-edge rounded hover:text-foreground-bright hover:border-foreground/30 transition-colors cursor-pointer"
					onclick={onClose}
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}
