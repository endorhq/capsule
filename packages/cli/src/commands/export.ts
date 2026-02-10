import { resolve } from 'node:path';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { promptAndAnonymize } from '../flows/anonymize-prompt.js';
import { resolveSession } from '../flows/session.js';
import { saveToFile } from '../publish.js';

export default async function exportCmd(fileArg?: string): Promise<void> {
  p.intro(pc.bgCyan(pc.black(' capsule export ')));

  const { content, format } = await resolveSession(fileArg);
  const anonymized = await promptAndAnonymize(content, format);

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

  p.outro(pc.green('Done!'));
}
