import type { AgentFormat } from './timeline.js';

export interface AgentSource {
  agent: AgentFormat;
  label: string;
  basePath: string;
  sessionCount: number;
  /** Pre-discovered sessions, populated during discoverAllSessions. */
  sessions: DiscoveredSession[];
}

export interface DiscoveredSession {
  agent: AgentFormat;
  filePath: string;
  sessionId: string;
  title: string;
  date: Date;
  cwd?: string;
}
