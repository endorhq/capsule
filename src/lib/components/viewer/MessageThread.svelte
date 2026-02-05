<script lang="ts">
	import type { TimelineEntry } from '$lib/types/timeline';
	import UserMessage from './entries/UserMessage.svelte';
	import AssistantMessage from './entries/AssistantMessage.svelte';
	import ToolCallEntry from './entries/ToolCallEntry.svelte';
	import SystemMessage from './entries/SystemMessage.svelte';

	interface Props {
		timeline: TimelineEntry[];
	}

	let { timeline }: Props = $props();

	// Group consecutive tool_call and system entries together so they
	// render as a visually nested block between messages.
	interface MessageGroup {
		type: 'message';
		entry: TimelineEntry;
	}
	interface ToolGroup {
		type: 'tool_group';
		entries: TimelineEntry[];
	}
	type Group = MessageGroup | ToolGroup;

	const groups = $derived.by((): Group[] => {
		const result: Group[] = [];
		let pendingTools: TimelineEntry[] = [];

		function flushTools() {
			if (pendingTools.length > 0) {
				result.push({ type: 'tool_group', entries: [...pendingTools] });
				pendingTools = [];
			}
		}

		for (const entry of timeline) {
			if (entry.type === 'tool_call' || entry.type === 'system') {
				pendingTools.push(entry);
			} else {
				flushTools();
				result.push({ type: 'message', entry });
			}
		}
		flushTools();

		return result;
	});
</script>

<div class="flex-1 overflow-y-auto">
	<div class="flex flex-col gap-2 py-2">
		{#each groups as group, i (group.type === 'message' ? group.entry.id : group.entries[0].id)}
			{#if group.type === 'message'}
				{#if group.entry.type === 'user'}
					<UserMessage entry={group.entry} />
				{:else if group.entry.type === 'assistant'}
					<AssistantMessage entry={group.entry} />
				{/if}
			{:else}
				<!-- Tool group: indented block with left accent border -->
				<div class="mx-4 my-1 flex flex-col gap-0.5">
					{#each group.entries as entry (entry.id)}
						{#if entry.type === 'tool_call'}
							<ToolCallEntry {entry} />
						{:else if entry.type === 'system'}
							<SystemMessage {entry} />
						{/if}
					{/each}
				</div>
			{/if}
		{/each}

		<!-- End of session marker -->
		<div class="flex flex-col items-center py-8 select-none" aria-hidden="true">
			<pre class="text-xs leading-[1.3] text-muted/60 font-mono">    *  .  *
  .    __     .
      /  \  *
     | () |
      \__/   .
      /||\
  ~~~'~~~~'~~~</pre>
			<span class="text-xs text-muted/50 mt-3">// end of session</span>
		</div>
	</div>
</div>
