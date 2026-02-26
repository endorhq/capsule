import { fetchDiscoveredSessions } from '$lib/services/discovery';
import type { AgentSource } from '$lib/types/discovery';

let sources = $state<AgentSource[]>([]);
let loading = $state(false);
let error = $state<string | null>(null);
let selectedAgent = $state<string | null>(null);

const activeAgent = $derived(
  sources.find(s => s.agent === selectedAgent) ?? null
);

const activeSessions = $derived(activeAgent?.sessions ?? []);

const totalSessionCount = $derived(
  sources.reduce((sum, s) => sum + s.sessionCount, 0)
);

async function discover() {
  loading = true;
  error = null;
  try {
    sources = await fetchDiscoveredSessions();
    // Auto-select first agent if none selected or previous selection gone
    if (
      sources.length > 0 &&
      (!selectedAgent || !sources.some(s => s.agent === selectedAgent))
    ) {
      selectedAgent = sources[0].agent;
    }
    if (sources.length === 0) {
      selectedAgent = null;
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Discovery failed';
    sources = [];
    selectedAgent = null;
  } finally {
    loading = false;
  }
}

function selectAgent(agent: string | null) {
  selectedAgent = agent;
}

export function getDiscoveryState() {
  return {
    get sources() {
      return sources;
    },
    get loading() {
      return loading;
    },
    get error() {
      return error;
    },
    get selectedAgent() {
      return selectedAgent;
    },
    get activeAgent() {
      return activeAgent;
    },
    get activeSessions() {
      return activeSessions;
    },
    get totalSessionCount() {
      return totalSessionCount;
    },
    discover,
    selectAgent,
  };
}
