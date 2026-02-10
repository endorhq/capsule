<script lang="ts">
import type { DiscoveredSession } from '$lib/types/discovery';

interface Props {
  session: DiscoveredSession;
  onSelect: (session: DiscoveredSession) => void;
}

let { session, onSelect }: Props = $props();

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
</script>

<button
  class="w-full text-left px-3 py-2.5 rounded border border-transparent hover:border-edge hover:bg-surface-panel/50 transition-colors cursor-pointer group"
  onclick={() => onSelect(session)}
>
  <div class="flex items-start justify-between gap-2">
    <p
      class="text-sm text-foreground group-hover:text-foreground-bright transition-colors truncate flex-1"
    >
      {session.title}
    </p>
    <span class="text-xs text-muted shrink-0 mt-0.5">
      {formatRelativeDate(session.date)}
    </span>
  </div>
  {#if session.cwd}
    <p class="text-xs text-muted/60 truncate mt-0.5">{session.cwd}</p>
  {/if}
</button>
