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

<div class="px-4 pt-3">
	<div class="flex items-center gap-2 mb-1.5">
		<span class="inline-block px-2 py-0.5 text-xs bg-[#1c1828] text-[#a78bfa] rounded font-medium">
			user
		</span>
		<span class="text-muted text-xs">{formatTime(entry.timestamp)}</span>
	</div>
	<p class="text-foreground text-sm whitespace-pre-wrap break-words">{entry.content}</p>
</div>
