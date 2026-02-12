<script lang="ts">
import ClipboardIcon from 'virtual:icons/dinkie-icons/clipboard';
import CloseIcon from 'virtual:icons/dinkie-icons/diagonal-cross';
import CheckIcon from 'virtual:icons/dinkie-icons/white-heavy-check-mark';

interface Props {
  open: boolean;
  onClose: () => void;
}

let { open, onClose }: Props = $props();

type Agent = 'claude' | 'codex' | 'copilot' | 'gemini';
type OS = 'windows' | 'macos' | 'linux';

let selectedAgent = $state<Agent>('claude');
let selectedOS = $state<OS>(detectOS());
let copied = $state(false);
let copiedExport = $state(false);
let copiedServe = $state(false);

const agents: { id: Agent; name: string; label: string }[] = [
  { id: 'claude', name: 'Claude Code', label: 'claude' },
  { id: 'codex', name: 'Codex', label: 'codex' },
  { id: 'copilot', name: 'Copilot', label: 'copilot' },
  { id: 'gemini', name: 'Gemini CLI', label: 'gemini' },
];

const osOptions: { id: OS; name: string }[] = [
  { id: 'windows', name: 'Windows' },
  { id: 'macos', name: 'macOS' },
  { id: 'linux', name: 'Linux' },
];

const logPaths: Record<
  Agent,
  Record<OS, { path: string; expanded: string }>
> = {
  claude: {
    windows: {
      path: '%USERPROFILE%\\.claude\\projects\\<project-hash>\\',
      expanded: 'C:\\Users\\<username>\\.claude\\projects\\<project-hash>\\',
    },
    macos: {
      path: '~/.claude/projects/<project-hash>/',
      expanded: '/Users/<username>/.claude/projects/<project-hash>/',
    },
    linux: {
      path: '~/.claude/projects/<project-hash>/',
      expanded: '/home/<username>/.claude/projects/<project-hash>/',
    },
  },
  codex: {
    windows: {
      path: '%USERPROFILE%\\.codex\\sessions\\<year>\\<month>\\<day>\\',
      expanded: 'C:\\Users\\<username>\\.codex\\sessions\\2026\\02\\05\\',
    },
    macos: {
      path: '~/.codex/sessions/<year>/<month>/<day>/',
      expanded: '/Users/<username>/.codex/sessions/2026/02/05/',
    },
    linux: {
      path: '~/.codex/sessions/<year>/<month>/<day>/',
      expanded: '/home/<username>/.codex/sessions/2026/02/05/',
    },
  },
  copilot: {
    windows: {
      path: '%USERPROFILE%\\.copilot\\session-state\\<session-id>\\',
      expanded:
        'C:\\Users\\<username>\\.copilot\\session-state\\<session-id>\\',
    },
    macos: {
      path: '~/.copilot/session-state/<session-id>/',
      expanded: '/Users/<username>/.copilot/session-state/<session-id>/',
    },
    linux: {
      path: '~/.copilot/session-state/<session-id>/',
      expanded: '/home/<username>/.copilot/session-state/<session-id>/',
    },
  },
  gemini: {
    windows: {
      path: '%USERPROFILE%\\.gemini\\tmp\\<project-hash>\\chats\\',
      expanded: 'C:\\Users\\<username>\\.gemini\\tmp\\<project-hash>\\chats\\',
    },
    macos: {
      path: '~/.gemini/tmp/<project-hash>/chats/',
      expanded: '/Users/<username>/.gemini/tmp/<project-hash>/chats/',
    },
    linux: {
      path: '~/.gemini/tmp/<project-hash>/chats/',
      expanded: '/home/<username>/.gemini/tmp/<project-hash>/chats/',
    },
  },
};

const instructions: Record<Agent, string> = {
  claude:
    'Claude Code stores session logs in the .claude/projects directory. Each project has its own subdirectory (named with a path hash) containing JSONL session files with UUID names.',
  codex:
    'Codex CLI stores session logs in the .codex/sessions directory, organized by date (year/month/day). Each session is saved as a JSONL file with a timestamp and UUID.',
  copilot:
    'GitHub Copilot stores session logs in the .copilot/session-state directory. Each session has its own subdirectory containing an events.jsonl file.',
  gemini:
    'Gemini CLI stores session logs in the .gemini/tmp directory. Each project has a subdirectory (named with a hash) containing a chats folder with JSON session files.',
};

function detectOS(): OS {
  if (typeof navigator === 'undefined') return 'linux';
  const platform = navigator.platform?.toLowerCase() || '';
  const userAgent = navigator.userAgent?.toLowerCase() || '';

  if (platform.includes('win') || userAgent.includes('windows'))
    return 'windows';
  if (platform.includes('mac') || userAgent.includes('mac')) return 'macos';
  return 'linux';
}

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

async function copyPath() {
  const path = logPaths[selectedAgent][selectedOS].path;
  try {
    await navigator.clipboard.writeText(path);
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 2000);
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = path;
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

const currentPath = $derived(logPaths[selectedAgent][selectedOS]);
const currentInstructions = $derived(instructions[selectedAgent]);
const currentAgentName = $derived(
  agents.find(a => a.id === selectedAgent)?.name || ''
);
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
      class="bg-surface-panel border border-edge rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between px-5 py-4 border-b border-edge"
      >
        <h2 id="modal-title" class="text-foreground-bright font-bold text-base">
          ? where can I find my session logs?
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
      <div class="flex-1 overflow-y-auto">
        <div class="flex overflow-hidden">
          <!-- Left column: Agent selector -->
          <div class="w-48 shrink-0 border-r border-edge p-4 space-y-2">
            <p class="text-xs text-muted mb-3">// select agent</p>
            {#each agents as agent}
              <button
                class="w-full text-left px-3 py-2 rounded text-sm transition-colors cursor-pointer {selectedAgent ===
							agent.id
								? 'bg-accent-dim border border-accent text-accent'
								: 'border border-edge text-foreground hover:border-foreground/30 hover:text-foreground-bright'}"
                onclick={() => (selectedAgent = agent.id)}
              >
                <span class="text-muted text-xs">$</span>
                {agent.label}
              </button>
            {/each}
          </div>

          <!-- Right column: OS selector and instructions -->
          <div class="flex-1 p-5 overflow-y-auto">
            <!-- OS selector -->
            <div class="flex gap-1 mb-5 border-b border-edge">
              {#each osOptions as os}
                <button
                  class="px-4 py-2 text-sm transition-colors cursor-pointer -mb-px {selectedOS === os.id
									? 'text-accent border-b-2 border-accent'
									: 'text-muted hover:text-foreground-bright'}"
                  onclick={() => (selectedOS = os.id)}
                >
                  {os.name}
                </button>
              {/each}
            </div>

            <!-- Instructions -->
            <div class="space-y-4">
              <div>
                <h3 class="text-foreground-bright font-medium text-sm mb-2">
                  {currentAgentName}
                </h3>
                <p class="text-muted text-sm leading-relaxed">
                  {currentInstructions}
                </p>
              </div>

              <!-- Path display -->
              <div class="space-y-2">
                <p class="text-xs text-muted">// default path</p>
                <div
                  class="flex items-center gap-2 bg-surface border border-edge rounded px-3 py-2 font-mono text-sm"
                >
                  <code
                    class="flex-1 text-foreground-bright overflow-x-auto whitespace-nowrap"
                  >
                    {currentPath.path}
                  </code>
                  <button
                    class="shrink-0 text-muted hover:text-accent transition-colors cursor-pointer p-1"
                    onclick={copyPath}
                    aria-label="Copy path"
                    title="Copy path"
                  >
                    {#if copied}
                      <CheckIcon class="w-4 h-4 text-status-success" />
                    {:else}
                      <ClipboardIcon class="w-4 h-4" />
                    {/if}
                  </button>
                </div>
                <p class="text-xs text-muted/60">{currentPath.expanded}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- CLI section -->
        <div class="border-t border-edge px-5 py-4 space-y-3">
          <div>
            <p class="text-foreground-bright font-medium text-sm">
              Or use the CLI
            </p>
            <p class="text-xs text-muted mt-0.5">
              Works with all agents — auto-discovers your sessions
            </p>
          </div>
          <div class="space-y-2">
            <div
              class="flex items-center gap-2 bg-surface border border-edge rounded px-3 py-2 font-mono text-sm"
            >
              <code
                class="flex-1 text-foreground-bright overflow-x-auto whitespace-nowrap"
              >
                <span class="text-muted">$</span> npx @endorhq/capsule export
              </code>
              <button
                class="shrink-0 text-muted hover:text-accent transition-colors cursor-pointer p-1"
                onclick={() => copyText('npx @endorhq/capsule export', (v) => (copiedExport = v))}
                aria-label="Copy export command"
                title="Copy command"
              >
                {#if copiedExport}
                  <CheckIcon class="w-4 h-4 text-status-success" />
                {:else}
                  <ClipboardIcon class="w-4 h-4" />
                {/if}
              </button>
            </div>
            <p class="text-xs text-muted/60 pl-1">
              Export a session file to upload here
            </p>

            <div
              class="flex items-center gap-2 bg-surface border border-edge rounded px-3 py-2 font-mono text-sm"
            >
              <code
                class="flex-1 text-foreground-bright overflow-x-auto whitespace-nowrap"
              >
                <span class="text-muted">$</span> npx @endorhq/capsule serve
              </code>
              <button
                class="shrink-0 text-muted hover:text-accent transition-colors cursor-pointer p-1"
                onclick={() => copyText('npx @endorhq/capsule serve', (v) => (copiedServe = v))}
                aria-label="Copy serve command"
                title="Copy command"
              >
                {#if copiedServe}
                  <CheckIcon class="w-4 h-4 text-status-success" />
                {:else}
                  <ClipboardIcon class="w-4 h-4" />
                {/if}
              </button>
            </div>
            <p class="text-xs text-muted/60 pl-1">
              Start a local viewer with auto-discovery
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
