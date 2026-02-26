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

export async function resolveSession(
  fileArg?: string
): Promise<ResolvedSession> {
  let fileContent: string | undefined;
  let format: AgentFormat | undefined;

  if (fileArg) {
    const resolved = resolve(fileArg);
    try {
      const s = await stat(resolved);
      if (s.isFile()) {
        fileContent = await readFile(resolved, 'utf-8');
        const ext = extname(resolved);
        const fileFormat = ext === '.json' ? 'json' : 'jsonl';
        format = detectFormat(fileContent, fileFormat as 'json' | 'jsonl');
        if (format === 'unknown') {
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
        }
        p.log.info(`File: ${pc.cyan(resolved)} ${pc.dim(`(${format})`)}`);
      }
    } catch {
      p.log.error(`File not found: ${fileArg}`);
      process.exit(1);
    }
  }

  if (!fileContent) {
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

    const sessionChoice = await p.select<
      DiscoveredSession[],
      DiscoveredSession
    >({
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
    format = selected.agent;
    fileContent = await readFile(selected.filePath, 'utf-8');
    p.log.info(`Session: ${pc.cyan(selected.title)} ${pc.dim(`(${format})`)}`);
  }

  if (!fileContent || !format) {
    p.cancel('No session loaded.');
    process.exit(1);
  }

  return { content: fileContent, format };
}
