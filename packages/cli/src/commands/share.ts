import * as p from '@clack/prompts';
import type { AgentFormat } from '@endorhq/capsule-shared/types/timeline';
import pc from 'picocolors';
import { promptAndAnonymize } from '../flows/anonymize-prompt.js';
import { resolveSession } from '../flows/session.js';
import { checkGhAuth, publishGist } from '../publish.js';

export interface ShareOptions {
  format?: string;
  public?: boolean;
  secret?: boolean;
  anonymize?: string | false;
}

export default async function share(
  sessionArg?: string,
  options?: ShareOptions
): Promise<void> {
  if (process.stdout.isTTY) {
    p.intro(pc.bgCyan(pc.black(' capsule share ')));
  }

  if (options?.public && options?.secret) {
    if (process.stdout.isTTY) {
      p.log.error('Cannot use both --public and --secret');
      p.outro('Pick one visibility option.');
    } else {
      console.error('Cannot use both --public and --secret');
    }
    process.exit(1);
  }

  const authCheck = await checkGhAuth();
  if (!authCheck.ok) {
    if (process.stdout.isTTY) {
      p.log.error(authCheck.error || 'Authentication failed');
      p.outro('Cannot publish without gh authentication.');
    } else {
      console.error(authCheck.error || 'Authentication failed');
    }
    process.exit(1);
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

  let visibility: 'public' | 'secret';
  if (options?.public) {
    visibility = 'public';
  } else if (options?.secret) {
    visibility = 'secret';
  } else if (process.stdout.isTTY) {
    const choice = await p.select({
      message: 'Gist visibility:',
      options: [
        { value: 'secret', label: 'Secret', hint: 'only accessible via link' },
        { value: 'public', label: 'Public', hint: 'visible in your profile' },
      ],
    });
    if (p.isCancel(choice)) {
      p.cancel('Cancelled.');
      process.exit(0);
    }
    visibility = choice as 'public' | 'secret';
  } else {
    visibility = 'secret';
  }

  if (process.stdout.isTTY) {
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
  } else {
    try {
      const result = await publishGist(anonymized, format, {
        public: visibility === 'public',
        description: `Agent session log (${format})`,
      });

      console.log(`gist: ${result.gistUrl}`);
      console.log(`viewer: ${result.viewerUrl}`);
      console.log(`id: ${result.gistId}`);
      console.log(`format: ${format}`);
      console.log(`visibility: ${visibility}`);
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  }
}
