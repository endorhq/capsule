<script lang="ts">
import InfoIcon from 'virtual:icons/dinkie-icons/circled-information-source';
import ClipboardIcon from 'virtual:icons/dinkie-icons/clipboard';
import CloseIcon from 'virtual:icons/dinkie-icons/diagonal-cross';
import LinkIcon from 'virtual:icons/dinkie-icons/link-symbol';
import ChevronIcon from 'virtual:icons/dinkie-icons/right-black-triangle';
import ShieldIcon from 'virtual:icons/dinkie-icons/shield';
import CheckIcon from 'virtual:icons/dinkie-icons/white-heavy-check-mark';
import type { SessionMeta } from '$lib/types';

interface Props {
  open: boolean;
  sessionMeta: SessionMeta;
  onClose: () => void;
}

let { open, sessionMeta, onClose }: Props = $props();

let copied = $state(false);
let copiedCmd = $state(false);
let manualExpanded = $state(false);
let manualGistInput = $state('');
let copiedManualLink = $state(false);

function extractGistId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Match gist.github.com URLs: gist.github.com/user/id or gist.github.com/id
  const urlMatch = trimmed.match(/gist\.github\.com\/(?:[^/]+\/)?([a-f0-9]+)/i);
  if (urlMatch) return urlMatch[1];
  // Match raw hex gist ID
  if (/^[a-f0-9]+$/i.test(trimmed)) return trimmed;
  return null;
}

const manualGistId = $derived(extractGistId(manualGistInput));
const manualShareUrl = $derived.by(() => {
  if (!manualGistId) return '';
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}?gist=${manualGistId}`;
});

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

async function copyText(text: string, setter: (v: boolean) => void) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
  setter(true);
  setTimeout(() => setter(false), 2000);
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
      <div
        class="flex items-center justify-between px-5 py-4 border-b border-edge"
      >
        <h2 id="modal-title" class="text-foreground-bright font-bold text-base">
          share session
        </h2>
        <button
          class="text-muted hover:text-foreground-bright transition-colors cursor-pointer p-1"
          onclick={onClose}
          aria-label="Close modal"
        >
          <CloseIcon class="w-5 h-5" />
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
            <code
              class="flex-1 text-foreground-bright overflow-x-auto whitespace-nowrap"
            >
              {shareUrl}
            </code>
            <button
              class="shrink-0 text-muted hover:text-accent transition-colors cursor-pointer p-1"
              onclick={copyUrl}
              aria-label="Copy URL"
              title="Copy URL"
            >
              {#if copied}
                <CheckIcon class="w-4 h-4 text-status-success" />
              {:else}
                <ClipboardIcon class="w-4 h-4" />
              {/if}
            </button>
          </div>

          <p class="text-xs text-muted/60 flex items-center gap-1.5">
            <InfoIcon class="w-3.5 h-3.5" />
            anyone with this link can view this session
          </p>
        {:else}
          <div class="space-y-4">
            <p class="text-muted text-sm">
              This session is stored locally and cannot be shared directly. Use
              the CLI to publish it as a GitHub Gist with a single command.
            </p>

            <div class="space-y-2">
              <p class="text-xs text-muted">// publish to gist</p>
              <div
                class="flex items-center gap-2 bg-surface border border-edge rounded px-3 py-2 font-mono text-sm"
              >
                <code
                  class="flex-1 text-foreground-bright overflow-x-auto whitespace-nowrap"
                >
                  <span class="text-muted">$</span> npx @endorhq/capsule share
                </code>
                <button
                  class="shrink-0 text-muted hover:text-accent transition-colors cursor-pointer p-1"
                  onclick={() => copyText('npx @endorhq/capsule share', (v) => (copiedCmd = v))}
                  aria-label="Copy command"
                  title="Copy command"
                >
                  {#if copiedCmd}
                    <CheckIcon class="w-4 h-4 text-status-success" />
                  {:else}
                    <ClipboardIcon class="w-4 h-4" />
                  {/if}
                </button>
              </div>
              <p class="text-xs text-muted/60 pl-1">
                Interactively select a session, anonymize sensitive data, and
                publish to GitHub Gist
              </p>
            </div>

            <div
              class="flex items-start gap-2 bg-accent/[0.04] border border-accent/15 rounded px-3 py-2.5"
            >
              <ShieldIcon class="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <p class="text-xs text-muted leading-relaxed">
                Includes built-in
                <span class="text-accent">anonymization tools</span> to strip
                file paths, environment variables, and other sensitive data
                before sharing.
              </p>
            </div>
            <!-- Manual sharing expandable -->
            <div class="border border-edge rounded overflow-hidden">
              <button
                class="w-full flex items-center justify-between px-3 py-2.5 text-sm text-muted hover:text-foreground-bright transition-colors cursor-pointer"
                onclick={() => (manualExpanded = !manualExpanded)}
              >
                <span>Sharing it manually</span>
                <ChevronIcon
                  class="w-4 h-4 transition-transform {manualExpanded ? 'rotate-180' : 'rotate-90'}"
                />
              </button>
              {#if manualExpanded}
                <div class="px-3 pb-3 space-y-4 border-t border-edge pt-3">
                  <ol
                    class="text-muted text-sm space-y-2 list-decimal list-inside"
                  >
                    <li>Export the session file</li>
                    <li>Create a GitHub Gist with the file</li>
                    <li>Paste the gist URL below to get your share link</li>
                  </ol>

                  <a
                    href="https://gist.github.com/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-2 text-accent hover:text-accent/80 text-sm transition-colors"
                  >
                    <LinkIcon class="w-4 h-4" />
                    create a new gist on github
                  </a>

                  <div class="space-y-2">
                    <p class="text-xs text-muted">// paste your gist URL</p>
                    <input
                      type="text"
                      bind:value={manualGistInput}
                      placeholder="gist.github.com/user/id or gist ID"
                      class="w-full px-3 py-2 text-sm bg-surface border border-edge rounded text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent"
                    />
                  </div>

                  {#if manualShareUrl}
                    <div class="space-y-1.5">
                      <p class="text-xs text-muted">// your share link</p>
                      <div
                        class="flex items-center gap-2 bg-surface border border-accent/30 rounded px-3 py-2 font-mono text-sm"
                      >
                        <code
                          class="flex-1 text-accent overflow-x-auto whitespace-nowrap"
                        >
                          {manualShareUrl}
                        </code>
                        <button
                          class="shrink-0 text-muted hover:text-accent transition-colors cursor-pointer p-1"
                          onclick={() => copyText(manualShareUrl, (v) => (copiedManualLink = v))}
                          aria-label="Copy share link"
                          title="Copy share link"
                        >
                          {#if copiedManualLink}
                            <CheckIcon class="w-4 h-4 text-status-success" />
                          {:else}
                            <ClipboardIcon class="w-4 h-4" />
                          {/if}
                        </button>
                      </div>
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
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
