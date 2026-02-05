<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { getSessionState } from '$lib/state/sessions.svelte';
	import { onMount } from 'svelte';

	let { children } = $props();

	const state = getSessionState();

	onMount(() => {
		state.initialize();
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
