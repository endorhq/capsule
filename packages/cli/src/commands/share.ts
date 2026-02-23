import * as p from '@clack/prompts';
import type { AgentFormat } from '@endorhq/capsule-shared/types/timeline';
import pc from 'picocolors';
import { resolveAnonymization } from '../flows/anonymize-prompt.js';
import { resolveSession } from '../flows/session.js';
import { checkGhAuth, publishGist } from '../publish.js';

export interface ShareOptions {
  format?: string;
}

export default async function share(
  session: string | undefined,
  options: ShareOptions
): Promise<void> {
  const interactive = Boolean(process.stdin.isTTY);

  if (interactive) {
    p.intro(pc.bgCyan(pc.black(' capsule share ')));
  }

  const authCheck = await checkGhAuth();
  if (!authCheck.ok) {
    if (interactive) {
      p.log.error(authCheck.error || 'Authentication failed');
      p.outro('Cannot publish without gh authentication.');
    } else {
      console.error(authCheck.error || 'Authentication failed');
    }
    process.exit(1);
  }

  const { content, format } = await resolveSession({
    session,
    format: options.format as AgentFormat | undefined,
    interactive,
  });

  const anonymized = await resolveAnonymization(content, format, {
    interactive,
  });

  let visibility: string;
  if (interactive) {
    const visibilityChoice = await p.select({
      message: 'Gist visibility:',
      options: [
        { value: 'secret', label: 'Secret', hint: 'only accessible via link' },
        { value: 'public', label: 'Public', hint: 'visible in your profile' },
      ],
    });
    if (p.isCancel(visibilityChoice)) {
      p.cancel('Cancelled.');
      process.exit(0);
    }
    visibility = visibilityChoice;
  } else {
    visibility = 'secret';
  }

  if (interactive) {
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
  } else {
    try {
      const result = await publishGist(anonymized, format, {
        public: visibility === 'public',
        description: `Agent session log (${format})`,
      });
      console.log(result.gistUrl);
      console.log(result.viewerUrl);
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  }

  if (interactive) {
    p.outro(pc.green('Done!'));
  }
}
