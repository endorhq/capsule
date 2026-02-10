import { readdir, readFile, stat } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { homedir } from 'node:os';
import type { AgentFormat } from '@endorhq/capsule-shared/types/timeline';

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

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Discover all agent sources and their sessions in a single pass.
 * Counts always match the session list since they come from the same data.
 */
export async function discoverAllSessions(): Promise<AgentSource[]> {
  const home = homedir();
  const sources: AgentSource[] = [];

  const checks: Array<{
    agent: AgentFormat;
    label: string;
    basePath: string;
    discover: () => Promise<DiscoveredSession[]>;
  }> = [
    {
      agent: 'claude',
      label: 'Claude Code',
      basePath: join(home, '.claude', 'projects'),
      discover: () => discoverClaudeSessions(join(home, '.claude', 'projects')),
    },
    {
      agent: 'codex',
      label: 'Codex',
      basePath: join(home, '.codex', 'sessions'),
      discover: () => discoverCodexSessions(join(home, '.codex', 'sessions')),
    },
    {
      agent: 'copilot',
      label: 'Copilot',
      basePath: join(home, '.copilot', 'session-state'),
      discover: () =>
        discoverCopilotSessions(join(home, '.copilot', 'session-state')),
    },
    {
      agent: 'gemini',
      label: 'Gemini CLI',
      basePath: join(home, '.gemini', 'tmp'),
      discover: () => discoverGeminiSessions(join(home, '.gemini', 'tmp')),
    },
  ];

  for (const check of checks) {
    if (!(await exists(check.basePath))) continue;
    const sessions = await check.discover();
    if (sessions.length > 0) {
      sessions.sort((a, b) => b.date.getTime() - a.date.getTime());
      sources.push({
        agent: check.agent,
        label: check.label,
        basePath: check.basePath,
        sessionCount: sessions.length,
        sessions,
      });
    }
  }

  return sources;
}

/**
 * Read the first N lines of a file without loading the entire file.
 */
async function peekLines(
  filePath: string,
  maxLines: number
): Promise<string[]> {
  const content = await readFile(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  return lines.slice(0, maxLines);
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '\u2026';
}

/**
 * Peek into a Claude session file and extract metadata.
 */
async function peekClaudeSession(
  filePath: string
): Promise<DiscoveredSession | null> {
  try {
    const lines = await peekLines(filePath, 20);
    if (lines.length === 0) return null;

    let date: Date | undefined;
    let cwd: string | undefined;
    let sessionId: string | undefined;
    let title = '';

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (!date && entry.timestamp) {
          date = new Date(entry.timestamp);
        }
        if (!cwd && entry.cwd) {
          cwd = entry.cwd;
        }
        if (!sessionId && entry.sessionId) {
          sessionId = entry.sessionId;
        }
        // First user message content as title (first line only)
        if (
          !title &&
          entry.type === 'user' &&
          entry.message?.content &&
          typeof entry.message.content === 'string'
        ) {
          const firstLine = entry.message.content.trim().split('\n')[0].trim();
          title = truncate(firstLine, 80);
        }
      } catch {
        continue;
      }
    }

    if (!date) return null;

    return {
      agent: 'claude',
      filePath,
      sessionId: sessionId || basename(filePath, '.jsonl'),
      title: title || basename(filePath, '.jsonl'),
      date,
      cwd,
    };
  } catch {
    return null;
  }
}

/**
 * Peek into a Codex session file and extract metadata.
 * Returns null for sessions without a user message (internal/empty sessions).
 */
async function peekCodexSession(
  filePath: string
): Promise<DiscoveredSession | null> {
  try {
    const lines = await peekLines(filePath, 30);
    if (lines.length === 0) return null;

    let date: Date | undefined;
    let cwd: string | undefined;
    let sessionId: string | undefined;
    let title = '';
    let hasUserMessage = false;

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.type === 'session_meta' && entry.payload) {
          sessionId = entry.payload.id;
          cwd = entry.payload.cwd;
          if (entry.payload.timestamp) {
            date = new Date(entry.payload.timestamp);
          }
        }
        if (entry.timestamp && !date) {
          date = new Date(entry.timestamp);
        }
        // First user message (first line only)
        if (
          entry.type === 'event_msg' &&
          entry.payload?.type === 'user_message'
        ) {
          hasUserMessage = true;
          if (!title) {
            const firstLine = ((entry.payload.message as string) || '')
              .trim()
              .split('\n')[0]
              .trim();
            title = truncate(firstLine, 80);
          }
        }
      } catch {
        continue;
      }
    }

    // Skip sessions without a date or without any user interaction
    if (!date || !hasUserMessage) return null;

    return {
      agent: 'codex',
      filePath,
      sessionId: sessionId || basename(filePath, '.jsonl'),
      title: title || basename(filePath, '.jsonl'),
      date,
      cwd,
    };
  } catch {
    return null;
  }
}

/**
 * Peek into a Copilot session file and extract metadata.
 */
async function peekCopilotSession(
  filePath: string
): Promise<DiscoveredSession | null> {
  try {
    const lines = await peekLines(filePath, 20);
    if (lines.length === 0) return null;

    let date: Date | undefined;
    let cwd: string | undefined;
    let sessionId: string | undefined;
    let title = '';

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.type === 'session.start' && entry.data) {
          sessionId = entry.data.sessionId;
          if (entry.data.startTime) {
            date = new Date(entry.data.startTime);
          }
          if (entry.data.context?.cwd) {
            cwd = entry.data.context.cwd;
          }
        }
        if (entry.timestamp && !date) {
          date = new Date(entry.timestamp);
        }
        // First user message (first line only)
        if (!title && entry.type === 'user.message' && entry.data?.content) {
          const firstLine = (entry.data.content as string)
            .trim()
            .split('\n')[0]
            .trim();
          title = truncate(firstLine, 80);
        }
      } catch {
        continue;
      }
    }

    if (!date) return null;

    return {
      agent: 'copilot',
      filePath,
      sessionId:
        sessionId || basename(filePath.replace(/\/events\.jsonl$/, '')),
      title: title || sessionId || 'Copilot session',
      date,
      cwd,
    };
  } catch {
    return null;
  }
}

/**
 * Peek into a Gemini session file and extract metadata.
 */
async function peekGeminiSession(
  filePath: string
): Promise<DiscoveredSession | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const root = JSON.parse(content);

    const date = root.startTime ? new Date(root.startTime) : null;
    if (!date) return null;

    const sessionId = root.sessionId || basename(filePath, '.json');
    const messages = root.messages as
      | Array<{ type: string; content?: string }>
      | undefined;
    let title = '';
    if (messages) {
      const firstUser = messages.find(m => m.type === 'user' && m.content);
      if (firstUser) {
        const firstLine = firstUser.content!.trim().split('\n')[0].trim();
        title = truncate(firstLine, 80);
      }
    }

    return {
      agent: 'gemini',
      filePath,
      sessionId,
      title: title || sessionId,
      date,
    };
  } catch {
    return null;
  }
}

// ─── Per-agent discovery ───────────────────────────────────────────

async function discoverClaudeSessions(
  basePath: string
): Promise<DiscoveredSession[]> {
  const sessions: DiscoveredSession[] = [];
  try {
    const projects = await readdir(basePath, { withFileTypes: true });
    for (const project of projects) {
      if (!project.isDirectory()) continue;
      const projectDir = join(basePath, project.name);
      const files = await readdir(projectDir, { withFileTypes: true });
      for (const file of files) {
        if (!file.isFile() || !file.name.endsWith('.jsonl')) continue;
        const session = await peekClaudeSession(join(projectDir, file.name));
        if (session) sessions.push(session);
      }
    }
  } catch {
    // ignore
  }
  return sessions;
}

async function discoverCodexSessions(
  basePath: string
): Promise<DiscoveredSession[]> {
  const sessions: DiscoveredSession[] = [];
  try {
    const entries = await readdir(basePath, {
      recursive: true,
      withFileTypes: true,
    });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.jsonl')) continue;
      const filePath = join(entry.parentPath || entry.path, entry.name);
      const session = await peekCodexSession(filePath);
      if (session) sessions.push(session);
    }
  } catch {
    // ignore
  }
  return sessions;
}

async function discoverCopilotSessions(
  basePath: string
): Promise<DiscoveredSession[]> {
  const sessions: DiscoveredSession[] = [];
  try {
    const dirs = await readdir(basePath, { withFileTypes: true });
    for (const dir of dirs) {
      if (!dir.isDirectory()) continue;
      const eventsFile = join(basePath, dir.name, 'events.jsonl');
      if (await exists(eventsFile)) {
        const session = await peekCopilotSession(eventsFile);
        if (session) sessions.push(session);
      }
    }
  } catch {
    // ignore
  }
  return sessions;
}

async function discoverGeminiSessions(
  basePath: string
): Promise<DiscoveredSession[]> {
  const sessions: DiscoveredSession[] = [];
  try {
    const entries = await readdir(basePath, {
      recursive: true,
      withFileTypes: true,
    });
    for (const entry of entries) {
      if (
        !entry.isFile() ||
        !entry.name.startsWith('session-') ||
        !entry.name.endsWith('.json')
      )
        continue;
      const filePath = join(entry.parentPath || entry.path, entry.name);
      const session = await peekGeminiSession(filePath);
      if (session) sessions.push(session);
    }
  } catch {
    // ignore
  }
  return sessions;
}
