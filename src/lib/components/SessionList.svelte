<script lang="ts">
import type { SessionMeta } from '$lib/types';
import SessionItem from './SessionItem.svelte';

interface Props {
  sessions: SessionMeta[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

let { sessions, selectedId, onSelect, onRemove }: Props = $props();
</script>

<div class="flex flex-col gap-0.5">
	{#each sessions as session (session.id)}
		<SessionItem {session} isSelected={session.id === selectedId} {onSelect} {onRemove} />
	{/each}
</div>
