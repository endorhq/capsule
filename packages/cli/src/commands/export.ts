import { resolve } from 'node:path';
import * as p from '@clack/prompts';
import type { AgentFormat } from '@endorhq/capsule-shared/types/timeline';
import pc from 'picocolors';
import { promptAndAnonymize } from '../flows/anonymize-prompt.js';
import { resolveSession } from '../flows/session.js';
import { saveToFile } from '../publish.js';

export interface ExportOptions {
  format?: string;
  anonymize?: string | false;
  output?: string;
}

export default async function exportCmd(
  sessionArg?: string,
  options?: ExportOptions
): Promise<void> {
  if (process.stdout.isTTY) {
    p.intro(pc.bgCyan(pc.black(' capsule export ')));
  }

  const { content, format } = await resolveSession(sessionArg, {
    format: options?.format as AgentFormat | undefined,
  });

  const noAnonymize = options?.anonymize === false;
  const anonymizeKeys =
    typeof options?.anonymize === 'string' ? options.anonymize : undefined;
  const anonymized = await promptAndAnonymize(content, format, {
    anonymize: anonymizeKeys,
    noAnonymize,
  });

  const ext = format === 'gemini' ? '.json' : '.jsonl';
  const defaultName = `${format}-session-anonymized${ext}`;

  let outputPath: string;
  if (options?.output) {
    outputPath = resolve(options.output);
  } else if (process.stdout.isTTY) {
    const choice = await p.text({
      message: 'Output file path:',
      placeholder: defaultName,
      defaultValue: defaultName,
    });
    if (p.isCancel(choice)) {
      p.cancel('Cancelled.');
      process.exit(0);
    }
    outputPath = resolve(choice);
  } else {
    outputPath = resolve(defaultName);
  }

  await saveToFile(anonymized, outputPath);

  if (process.stdout.isTTY) {
    p.log.success(`Saved to ${pc.cyan(outputPath)}`);
    p.outro(pc.green('Done!'));
  } else {
    console.log(`path: ${outputPath}`);
  }
}
