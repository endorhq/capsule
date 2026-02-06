<script lang="ts">
	import type { ParsedSession, TimelineEntry } from '$lib/types/timeline';
	import type { SessionMeta } from '$lib/types';
	import FilterBar from './FilterBar.svelte';
	import MessageThread from './MessageThread.svelte';
	import SessionPanel from './panel/SessionPanel.svelte';

	interface Props {
		session: ParsedSession;
		meta: SessionMeta;
		onDelete: (id: string) => void;
	}

	let { session, meta, onDelete }: Props = $props();

	let filterText = $state('');

	const filteredTimeline = $derived.by((): TimelineEntry[] => {
		if (!filterText.trim()) return session.timeline;

		const query = filterText.toLowerCase();
		return session.timeline.filter((entry) => {
			switch (entry.type) {
				case 'user':
					return entry.content.toLowerCase().includes(query);
				case 'assistant':
					return entry.content.toLowerCase().includes(query) ||
						(entry.thinking?.text?.toLowerCase().includes(query) ?? false);
				case 'tool_call':
					return entry.name.toLowerCase().includes(query) ||
						(entry.displayName?.toLowerCase().includes(query) ?? false) ||
						(entry.result?.toLowerCase().includes(query) ?? false) ||
						(entry.summary?.toLowerCase().includes(query) ?? false);
				case 'system':
					return entry.content.toLowerCase().includes(query);
				default:
					return false;
			}
		});
	});
</script>

<div class="flex flex-1 overflow-hidden">
	<!-- Center: message thread -->
	<div class="flex flex-col flex-1 overflow-hidden">
		<FilterBar bind:value={filterText} />
		<MessageThread timeline={filteredTimeline} />
	</div>

	<!-- Right: session panel -->
	<SessionPanel {session} {meta} {onDelete} />
</div>
