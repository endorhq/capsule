import * as p from '@clack/prompts';
import pc from 'picocolors';
import { promptAndAnonymize } from '../flows/anonymize-prompt.js';
import { resolveSession } from '../flows/session.js';
import { checkGhAuth, publishGist } from '../publish.js';

export default async function share(fileArg?: string): Promise<void> {
  p.intro(pc.bgCyan(pc.black(' capsule share ')));

  const authCheck = await checkGhAuth();
  if (!authCheck.ok) {
    p.log.error(authCheck.error || 'Authentication failed');
    p.outro('Cannot publish without gh authentication.');
    process.exit(1);
  }

  const { content, format } = await resolveSession(fileArg);
  const anonymized = await promptAndAnonymize(content, format);

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

  p.outro(pc.green('Done!'));
}
