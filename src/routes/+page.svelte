<script lang="ts">
	import { getSessionState } from '$lib/state/sessions.svelte';
	import Header from '$lib/components/Header.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import MainContent from '$lib/components/MainContent.svelte';

	const state = getSessionState();
</script>

<div class="flex flex-col h-screen bg-surface font-mono">
	<Header />
	<div class="flex flex-1 overflow-hidden">
		<Sidebar
			sessions={state.sessions}
			selectedId={state.selectedId}
			count={state.count}
			loading={state.loading}
			onSelect={state.select}
			onUpload={state.upload}
			onClearAll={state.clearAll}
		/>
		<MainContent
			selected={state.selected}
			parsedSession={state.parsedSession}
			parsing={state.parsing}
			parseError={state.parseError}
			onUpload={state.upload}
		/>
	</div>
</div>
