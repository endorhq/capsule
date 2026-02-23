import { resolve } from 'node:path';
import * as p from '@clack/prompts';
import type { AgentFormat } from '@endorhq/capsule-shared/types/timeline';
import pc from 'picocolors';
import { resolveAnonymization } from '../flows/anonymize-prompt.js';
import { resolveSession } from '../flows/session.js';
import { saveToFile } from '../publish.js';

export interface ExportOptions {
  output?: string;
  anonymize?: string;
  format?: string;
}

export default async function exportCmd(
  session: string | undefined,
  options: ExportOptions
): Promise<void> {
  const interactive = Boolean(process.stdin.isTTY);

  if (interactive) {
    p.intro(pc.bgCyan(pc.black(' capsule export ')));
  }

  const { content, format } = await resolveSession({
    session,
    format: options.format as AgentFormat | undefined,
    interactive,
  });

  const anonymized = await resolveAnonymization(content, format, {
    anonymize: options.anonymize,
    interactive,
  });

  const ext = format === 'gemini' ? '.json' : '.jsonl';
  const defaultName = `${format}-session-anonymized${ext}`;

  let outputPath: string;
  if (options.output) {
    outputPath = options.output;
  } else if (interactive) {
    const pathInput = await p.text({
      message: 'Output file path:',
      placeholder: defaultName,
      defaultValue: defaultName,
    });
    if (p.isCancel(pathInput)) {
      p.cancel('Cancelled.');
      process.exit(0);
    }
    outputPath = pathInput;
  } else {
    outputPath = defaultName;
  }

  const resolved = resolve(outputPath);
  await saveToFile(anonymized, resolved);

  if (interactive) {
    p.log.success(`Saved to ${pc.cyan(resolved)}`);
    p.outro(pc.green('Done!'));
  } else {
    console.log(resolved);
  }
}
