import type { AgentSource } from '$lib/types/discovery';

function rehydrateDates(sources: AgentSource[]): AgentSource[] {
  for (const source of sources) {
    for (const session of source.sessions) {
      session.date = new Date(session.date);
    }
  }
  return sources;
}

export async function fetchDiscoveredSessions(): Promise<AgentSource[]> {
  const res = await fetch('/api/discovery');
  if (!res.ok) {
    throw new Error(`Discovery failed: ${res.status}`);
  }
  const data: AgentSource[] = await res.json();
  return rehydrateDates(data);
}

export async function fetchSessionContent(filePath: string): Promise<string> {
  const res = await fetch(`/api/session?path=${encodeURIComponent(filePath)}`);
  if (!res.ok) {
    throw new Error(`Failed to read session: ${res.status}`);
  }
  return res.text();
}
