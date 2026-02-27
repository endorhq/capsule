<script lang="ts">
import GithubIcon from 'virtual:icons/dinkie-icons/github';
import type { SessionMeta } from '$lib/types';
import type { ParsedSession } from '$lib/types/timeline';
import { isLocal } from '$lib/features';

interface Props {
  session: ParsedSession;
  meta?: SessionMeta;
}

let { session, meta }: Props = $props();

const gistSource = $derived(meta?.source?.type === 'gist' ? meta.source : null);
const localFilePath = $derived(
  meta?.source?.type === 'local' ? meta.source.filePath : undefined
);

let copied = $state(false);

function copyPath() {
  if (!localFilePath) return;
  navigator.clipboard.writeText(localFilePath);
  copied = true;
  setTimeout(() => {
    copied = false;
  }, 1500);
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const messageCount = $derived(
  session.timeline.filter(e => e.type === 'user' || e.type === 'assistant')
    .length
);
</script>

<div class="space-y-3">
  <div class="text-xs text-muted">// session_info</div>

  <div class="space-y-2 text-sm">
    <div class="flex justify-between">
      <span class="text-muted">agent</span>
      <span class="text-foreground">{session.context.agentName}</span>
    </div>
    {#if session.context.model}
      <div class="flex justify-between">
        <span class="text-muted">model</span>
        <span class="text-accent">{session.context.model}</span>
      </div>
    {/if}
    <div class="flex justify-between">
      <span class="text-muted">messages</span>
      <span class="text-foreground">{messageCount}</span>
    </div>
    {#if session.context.cwd}
      <div class="flex justify-between">
        <span class="text-muted">directory</span>
        <span class="text-foreground truncate ml-4" title={session.context.cwd}>
          {session.context.cwd.replace(/^\/home\/[^/]+/, '~')}
        </span>
      </div>
    {/if}
    {#if session.context.gitBranch}
      <div class="flex justify-between">
        <span class="text-muted">branch</span>
        <span class="text-accent">{session.context.gitBranch}</span>
      </div>
    {/if}
    {#if session.duration !== undefined}
      <div class="flex justify-between">
        <span class="text-muted">duration</span>
        <span class="text-foreground">{formatDuration(session.duration)}</span>
      </div>
    {/if}
    <div class="flex justify-between">
      <span class="text-muted">started</span>
      <span class="text-foreground">{formatTime(session.startTime)}</span>
    </div>
    <div class="flex justify-between">
      <span class="text-muted">source</span>
      {#if gistSource}
        <a
          href={gistSource.gistUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="text-accent hover:underline flex items-center gap-1"
        >
          <GithubIcon class="w-3 h-3" />
          {gistSource.owner ?? 'gist'}
        </a>
      {:else}
        <span class="text-foreground">local file</span>
      {/if}
    </div>
    {#if isLocal && localFilePath}
      <div>
        <div class="flex items-center justify-between">
          <span class="text-muted">file</span>
          <button
            onclick={copyPath}
            class="text-muted hover:text-accent transition-colors"
            title="Copy file path"
          >
            {#if copied}
              <svg class="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 8 7 12 13 4" />
              </svg>
            {:else}
              <svg class="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="5" y="5" width="9" height="9" rx="1" />
                <path d="M2 11V2.5A.5.5 0 0 1 2.5 2H11" />
              </svg>
            {/if}
          </button>
        </div>
        <div class="text-foreground text-xs truncate mt-0.5" title={localFilePath}>
          {localFilePath.replace(/^\/home\/[^/]+/, '~')}
        </div>
      </div>
    {/if}
  </div>
</div>
