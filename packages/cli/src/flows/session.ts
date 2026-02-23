import { readFile, stat } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import * as p from '@clack/prompts';
import { detectFormat } from '@endorhq/capsule-shared/parsers/detect';
import type { AgentFormat } from '@endorhq/capsule-shared/types/timeline';
import pc from 'picocolors';
import type { AgentSource, DiscoveredSession } from '../discovery.js';
import { discoverAllSessions } from '../discovery.js';

export interface ResolvedSession {
  content: string;
  format: AgentFormat;
}

export interface ResolveSessionOptions {
  session?: string;
  format?: AgentFormat;
  interactive?: boolean;
}

const KNOWN_AGENTS: AgentFormat[] = ['claude', 'codex', 'copilot', 'gemini'];

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  const time = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  if (days === 0) return `today ${time}`;
  if (days === 1) return `yesterday ${time}`;
  if (days < 7) return `${days}d ago ${time}`;

  return (
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ` ${time}`
  );
}

function parseSessionSpecifier(
  session: string
): { agent: AgentFormat; sessionId: string } | null {
  const colonIdx = session.indexOf(':');
  if (colonIdx === -1) return null;

  const prefix = session.slice(0, colonIdx) as AgentFormat;
  const id = session.slice(colonIdx + 1);

  if (!KNOWN_AGENTS.includes(prefix) || !id) return null;
  return { agent: prefix, sessionId: id };
}

async function resolveBySpecifier(
  agent: AgentFormat,
  sessionId: string
): Promise<ResolvedSession> {
  const sources = await discoverAllSessions();
  const allSessions = sources.flatMap(s => s.sessions);
  const match = allSessions.find(
    s => s.agent === agent && s.sessionId.startsWith(sessionId)
  );

  if (!match) {
    throw new Error(`No ${agent} session found matching ID '${sessionId}'`);
  }

  const content = await readFile(match.filePath, 'utf-8');
  return { content, format: match.agent };
}

async function resolveByFile(
  filePath: string,
  formatOverride: AgentFormat | undefined,
  interactive: boolean
): Promise<ResolvedSession> {
  const resolved = resolve(filePath);
  let s: Awaited<ReturnType<typeof stat>>;
  try {
    s = await stat(resolved);
  } catch {
    throw new Error(`File not found: ${filePath}`);
  }

  if (!s.isFile()) {
    throw new Error(`Not a file: ${filePath}`);
  }

  const content = await readFile(resolved, 'utf-8');
  const ext = extname(resolved);
  const fileFormat = ext === '.json' ? 'json' : 'jsonl';
  let format = detectFormat(content, fileFormat as 'json' | 'jsonl');

  if (format === 'unknown') {
    if (formatOverride) {
      format = formatOverride;
    } else if (interactive) {
      p.log.warn(`Could not auto-detect format for ${pc.dim(resolved)}`);
      const formatChoice = await p.select({
        message: 'Select the session format:',
        options: [
          { value: 'claude', label: 'Claude Code' },
          { value: 'codex', label: 'Codex' },
          { value: 'copilot', label: 'Copilot' },
          { value: 'gemini', label: 'Gemini CLI' },
        ],
      });
      if (p.isCancel(formatChoice)) {
        p.cancel('Cancelled.');
        process.exit(0);
      }
      format = formatChoice as AgentFormat;
    } else {
      throw new Error(
        'Format could not be auto-detected. Use --format to specify.'
      );
    }
  }

  if (interactive) {
    p.log.info(`File: ${pc.cyan(resolved)} ${pc.dim(`(${format})`)}`);
  }

  return { content, format };
}

async function resolveInteractively(): Promise<ResolvedSession> {
  const spinner = p.spinner();
  spinner.start('Discovering agent sessions');
  const sources = await discoverAllSessions();
  spinner.stop('Discovery complete');

  if (sources.length === 0) {
    p.log.error('No agent sessions found on this machine.');
    p.log.info(pc.dim('Checked: ~/.claude, ~/.codex, ~/.copilot, ~/.gemini'));
    p.outro('Nothing to do.');
    process.exit(0);
  }

  let selectedSource: AgentSource;
  if (sources.length === 1) {
    selectedSource = sources[0];
    p.log.info(
      `Found ${pc.cyan(String(selectedSource.sessionCount))} ${selectedSource.label} sessions`
    );
  } else {
    const sourceChoice = await p.select({
      message: 'Select an agent:',
      options: sources.map(s => ({
        value: s,
        label: `${s.label}`,
        hint: `${s.sessionCount} sessions`,
      })),
    });
    if (p.isCancel(sourceChoice)) {
      p.cancel('Cancelled.');
      process.exit(0);
    }
    selectedSource = sourceChoice;
  }

  const sessions = selectedSource.sessions;

  const sessionChoice = await p.select<DiscoveredSession[], DiscoveredSession>({
    message: 'Select a session:',
    options: sessions.slice(0, 50).map(s => ({
      value: s,
      label: s.title,
      hint: `${formatDate(s.date)}${s.cwd ? ` \u2022 ${pc.dim(s.cwd)}` : ''}`,
    })),
  });
  if (p.isCancel(sessionChoice)) {
    p.cancel('Cancelled.');
    process.exit(0);
  }

  const selected = sessionChoice;
  const format = selected.agent;
  const content = await readFile(selected.filePath, 'utf-8');
  p.log.info(`Session: ${pc.cyan(selected.title)} ${pc.dim(`(${format})`)}`);

  return { content, format };
}

export async function resolveSession(
  options: ResolveSessionOptions = {}
): Promise<ResolvedSession> {
  const { session, format, interactive = true } = options;

  if (session) {
    const specifier = parseSessionSpecifier(session);
    if (specifier) {
      return resolveBySpecifier(specifier.agent, specifier.sessionId);
    }
    return resolveByFile(session, format, interactive);
  }

  if (!interactive) {
    throw new Error('Session argument required in non-interactive mode');
  }

  return resolveInteractively();
}
