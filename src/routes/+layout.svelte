<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { getSessionState } from '$lib/state/sessions.svelte';
	import { getTabState } from '$lib/state/tabs.svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let { children } = $props();

	const sessionState = getSessionState();
	const tabState = getTabState();

	onMount(async () => {
		await sessionState.initialize();
		tabState.initialize(sessionState.sessions);

		// Check for ?gist= query parameter
		const gistParam = $page.url.searchParams.get('gist');

		if (gistParam) {
			try {
				const sessions = await sessionState.loadFromGist(gistParam);
				if (sessions.length > 0) {
					// Open first loaded session in a tab
					const first = sessions[0];
					tabState.openTab(first.id, first.name);
				}
			} catch {
				// Error is already stored in sessionState.gistError
			}
			// Remove query param from URL
			goto('/', { replaceState: true });
		}
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
