<script lang="ts">
	import type { UserEntry } from '$lib/types/timeline';

	interface Props {
		entry: UserEntry;
	}

	let { entry }: Props = $props();

	function formatTime(date: Date): string {
		return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
	}
</script>

<div class="flex gap-3 px-4 py-3">
	<div class="shrink-0 mt-0.5">
		<span class="inline-block px-2 py-0.5 text-xs border border-edge rounded text-muted">
			user
		</span>
	</div>
	<div class="flex-1 min-w-0">
		<p class="text-foreground text-sm whitespace-pre-wrap break-words">{entry.content}</p>
		<span class="text-muted text-xs mt-1 block">{formatTime(entry.timestamp)}</span>
	</div>
</div>
