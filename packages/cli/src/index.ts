import { Command, Option } from 'commander';

const program = new Command();

program
  .name('capsule')
  .description('Share and view AI agent session logs')
  .version('0.0.1');

program
  .command('share')
  .description('Publish a session to GitHub Gist')
  .argument('[session]', 'file path or agent:id specifier')
  .addOption(
    new Option('-f, --format <format>', 'session format').choices([
      'claude',
      'codex',
      'copilot',
      'gemini',
    ])
  )
  .option('--public', 'create a public gist')
  .option('--secret', 'create a secret gist')
  .option(
    '-a, --anonymize <options>',
    'comma-separated anonymization keys (or "all")'
  )
  .option('--no-anonymize', 'skip anonymization entirely')
  .action(
    async (session: string | undefined, options: Record<string, unknown>) => {
      const { default: share } = await import('./commands/share.js');
      await share(session, options);
    }
  );

program
  .command('export')
  .description('Save a session to a local file')
  .argument('[session]', 'file path or agent:id specifier')
  .addOption(
    new Option('-f, --format <format>', 'session format').choices([
      'claude',
      'codex',
      'copilot',
      'gemini',
    ])
  )
  .option(
    '-a, --anonymize <options>',
    'comma-separated anonymization keys (or "all")'
  )
  .option('--no-anonymize', 'skip anonymization entirely')
  .option('--output <path>', 'output file path')
  .action(
    async (session: string | undefined, options: Record<string, unknown>) => {
      const { default: exportCmd } = await import('./commands/export.js');
      await exportCmd(session, options);
    }
  );

program
  .command('serve')
  .description('Start a local web viewer')
  .option('--port <number>', 'port number', '3123')
  .action(async (options: Record<string, unknown>) => {
    const { default: serve } = await import('./commands/serve.js');
    await serve(options);
  });

program.parse();
