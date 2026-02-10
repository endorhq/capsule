import * as p from '@clack/prompts';
import pc from 'picocolors';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { detectFormat } from '@endorhq/capsule-shared/parsers/detect';
import { discoverAllSessions } from './discovery.js';
import {
  anonymize,
  ANONYMIZE_OPTION_LABELS,
  DEFAULT_OPTIONS,
  type AnonymizeOptions,
} from './anonymize.js';
import { checkGhAuth, publishGist, saveToFile } from './publish.js';
import type { AgentFormat } from '@endorhq/capsule-shared/types/timeline';
import type { AgentSource, DiscoveredSession } from './discovery.js';

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

async function main() {
  p.intro(pc.bgCyan(pc.black(' capsule ')));

  let fileContent: string | undefined;
  let format: AgentFormat | undefined;

  // Check for CLI argument (direct file path)
  const arg = process.argv[2];
  if (arg) {
    const resolved = resolve(arg);
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
      p.log.error(`File not found: ${arg}`);
      process.exit(1);
    }
  }

  // If no file argument, discover sessions
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

    // Select agent source (skip if only one)
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

    // Select session
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

  // Anonymization options
  const anonChoices = await p.multiselect({
    message: 'Select anonymization options:',
    options: (
      Object.keys(ANONYMIZE_OPTION_LABELS) as Array<keyof AnonymizeOptions>
    ).map(key => ({
      value: key,
      label: ANONYMIZE_OPTION_LABELS[key],
    })),
    required: false,
  });
  if (p.isCancel(anonChoices)) {
    p.cancel('Cancelled.');
    process.exit(0);
  }

  const options: AnonymizeOptions = { ...DEFAULT_OPTIONS };
  for (const key of anonChoices) {
    options[key] = true;
  }

  // Apply anonymization
  const hasOptions = anonChoices.length > 0;
  let anonymized: string;
  if (hasOptions) {
    const spinner = p.spinner();
    spinner.start('Anonymizing session');
    anonymized = anonymize(fileContent, format, options);
    spinner.stop('Session anonymized');
  } else {
    anonymized = fileContent;
    p.log.info('No anonymization applied');
  }

  // Output choice
  const outputChoice = await p.select({
    message: 'How would you like to share?',
    options: [
      {
        value: 'gist',
        label: 'Publish to GitHub Gist',
        hint: 'creates a shareable link',
      },
      { value: 'file', label: 'Save to file' },
      { value: 'stdout', label: 'Print to stdout' },
    ],
  });
  if (p.isCancel(outputChoice)) {
    p.cancel('Cancelled.');
    process.exit(0);
  }

  if (outputChoice === 'gist') {
    // Check gh auth
    const authCheck = await checkGhAuth();
    if (!authCheck.ok) {
      p.log.error(authCheck.error || 'Authentication failed');
      p.outro('Cannot publish without gh authentication.');
      process.exit(1);
    }

    const visibility = await p.select({
      message: 'Gist visibility:',
      options: [
        { value: 'secret', label: 'Secret', hint: 'only accessible via link' },
        { value: 'public', label: 'Public', hint: 'visible in your profile' },
      ],
    });
    if (p.isCancel(visibility)) {
      p.cancel('Cancelled.');
      process.exit(0);
    }

    const spinner = p.spinner();
    spinner.start('Creating gist');
    try {
      const result = await publishGist(anonymized, format, {
        public: visibility === 'public',
        description: `Agent session log (${format})`,
      });
      spinner.stop('Gist created');

      p.log.success(`Gist: ${pc.underline(pc.cyan(result.gistUrl))}`);
      p.log.success(`View: ${pc.underline(pc.green(result.viewerUrl))}`);
    } catch (err) {
      spinner.stop('Failed to create gist');
      p.log.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  } else if (outputChoice === 'file') {
    const ext = format === 'gemini' ? '.json' : '.jsonl';
    const defaultName = `${format}-session-anonymized${ext}`;

    const outputPath = await p.text({
      message: 'Output file path:',
      placeholder: defaultName,
      defaultValue: defaultName,
    });
    if (p.isCancel(outputPath)) {
      p.cancel('Cancelled.');
      process.exit(0);
    }

    const resolved = resolve(outputPath);
    await saveToFile(anonymized, resolved);
    p.log.success(`Saved to ${pc.cyan(resolved)}`);
  } else {
    // stdout
    console.log(anonymized);
  }

  p.outro(pc.green('Done!'));
}

main().catch(err => {
  p.log.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
