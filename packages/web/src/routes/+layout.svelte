<script lang="ts">
import './layout.css';
import { onMount } from 'svelte';
import { goto } from '$app/navigation';
import { page } from '$app/stores';
import favicon from '$lib/assets/favicon.svg';
import { getSessionState } from '$lib/state/sessions.svelte';
import { getTabState } from '$lib/state/tabs.svelte';

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

<svelte:head>
  <title>Capsule — An interactive AI agent session inspector</title>
  <meta
    name="description"
    content="Visualize and inspect conversation logs from AI coding agents like Claude Code, Codex, Copilot, and Gemini in a unified timeline."
  />
  <meta name="theme-color" content="#0a0a0a" />
  <meta property="og:title" content="Capsule by Endor" />
  <meta
    property="og:description"
    content="Visualize and inspect conversation logs from AI coding agents like Claude Code, Codex, Copilot, and Gemini."
  />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://capsule.endor.dev" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="Capsule by Endor" />
  <meta
    name="twitter:description"
    content="Visualize and inspect conversation logs from AI coding agents like Claude Code, Codex, Copilot, and Gemini."
  />
  <link rel="icon" href={favicon} />
</svelte:head>
{@render children()}
