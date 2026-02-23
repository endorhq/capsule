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
  format?: AgentFormat;
}

const VALID_AGENTS = ['claude', 'codex', 'copilot', 'gemini'] as const;

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

/**
 * Parse an `agent:id` specifier string.
 * Returns null if the string doesn't match the pattern.
 * Uses agent-name validation instead of path-character heuristics,
 * so it works correctly on all platforms (including Windows paths with `:`).
 */
function parseAgentId(
  arg: string
): { agent: AgentFormat; sessionId: string } | null {
  const colonIdx = arg.indexOf(':');
  if (colonIdx === -1) return null;

  const agentPart = arg.slice(0, colonIdx);
  const idPart = arg.slice(colonIdx + 1);

  if (!idPart) return null;

  // Only treat as agent:id if the part before the colon is a known agent name
  if (!(VALID_AGENTS as readonly string[]).includes(agentPart)) return null;

  return { agent: agentPart as AgentFormat, sessionId: idPart };
}

async function resolveFromFile(
  fileArg: string,
  options?: ResolveSessionOptions
): Promise<ResolvedSession> {
  const resolved = resolve(fileArg);
  let fileContent: string;

  try {
    const s = await stat(resolved);
    if (!s.isFile()) {
      console.error(`Not a file: ${fileArg}`);
      process.exit(1);
    }
    fileContent = await readFile(resolved, 'utf-8');
  } catch {
    console.error(`File not found: ${fileArg}`);
    process.exit(1);
  }

  const ext = extname(resolved);
  const fileFormat = ext === '.json' ? 'json' : 'jsonl';
  let format = detectFormat(fileContent, fileFormat as 'json' | 'jsonl');

  if (format === 'unknown') {
    if (options?.format) {
      format = options.format;
    } else if (process.stdout.isTTY) {
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
      console.error(
        'Could not auto-detect session format. Use --format <format> to specify it.'
      );
      process.exit(1);
    }
  }

  if (process.stdout.isTTY) {
    p.log.info(`File: ${pc.cyan(resolved)} ${pc.dim(`(${format})`)}`);
  }

  return { content: fileContent, format };
}

async function resolveFromAgentId(
  agent: AgentFormat,
  sessionId: string
): Promise<ResolvedSession> {
  const sources = await discoverAllSessions();
  const source = sources.find(s => s.agent === agent);

  if (!source) {
    console.error(`No sessions found for agent: ${agent}`);
    process.exit(1);
  }

  const session = source.sessions.find(s => s.sessionId === sessionId);
  if (!session) {
    console.error(
      `Session "${sessionId}" not found for agent "${agent}". Found ${source.sessionCount} sessions.`
    );
    process.exit(1);
  }

  const content = await readFile(session.filePath, 'utf-8');

  if (process.stdout.isTTY) {
    p.log.info(`Session: ${pc.cyan(session.title)} ${pc.dim(`(${agent})`)}`);
  }

  return { content, format: agent };
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
  sessionArg?: string,
  options?: ResolveSessionOptions
): Promise<ResolvedSession> {
  if (sessionArg) {
    // Try agent:id specifier first
    const agentId = parseAgentId(sessionArg);
    if (agentId) {
      return resolveFromAgentId(agentId.agent, agentId.sessionId);
    }

    // Otherwise treat as file path
    return resolveFromFile(sessionArg, options);
  }

  // No argument provided
  if (process.stdout.isTTY) {
    return resolveInteractively();
  }

  console.error(
    'No session specified. In non-interactive mode, provide a file path or agent:id specifier.\n' +
      'Usage: capsule <command> <path/to/session.jsonl>\n' +
      '       capsule <command> <agent>:<sessionId>  (e.g., claude:abc123)'
  );
  process.exit(1);
}
