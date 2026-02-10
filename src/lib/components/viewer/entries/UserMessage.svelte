<script lang="ts">
import type { UserEntry } from '$lib/types/timeline';
import Markdown from '$lib/components/Markdown.svelte';

interface Props {
  entry: UserEntry;
  label?: string;
}

let { entry, label = 'user' }: Props = $props();

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
</script>

<div class="px-4 pt-3">
	<div class="flex items-center gap-2 mb-3">
		<span class="inline-block px-2 py-0.5 text-xs bg-[#1c1828] text-[#a78bfa] rounded font-medium">
			{label}
		</span>
		<span class="text-muted text-xs">{formatTime(entry.timestamp)}</span>
	</div>
	<Markdown content={entry.content} />
</div>
