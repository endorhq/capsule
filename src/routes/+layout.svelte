<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { getSessionState } from '$lib/state/sessions.svelte';
	import { getTabState } from '$lib/state/tabs.svelte';
	import { onMount } from 'svelte';

	let { children } = $props();

	const sessionState = getSessionState();
	const tabState = getTabState();

	onMount(async () => {
		await sessionState.initialize();
		tabState.initialize(sessionState.sessions);
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
