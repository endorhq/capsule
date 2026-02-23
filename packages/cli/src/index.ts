import { Command } from 'commander';
import pc from 'picocolors';

const program = new Command();

program
  .name('capsule')
  .version('0.0.1')
  .description('Share and view AI agent session logs');

program
  .command('share')
  .description('Publish a session to GitHub Gist')
  .argument('[session]', 'file path or agent:sessionId specifier')
  .option(
    '--format <format>',
    'session format (claude, codex, copilot, gemini)'
  )
  .action(async (session: string | undefined, options: { format?: string }) => {
    const { default: share } = await import('./commands/share.js');
    await share(session, options);
  });

program
  .command('export')
  .description('Save a session to a local file')
  .argument('[session]', 'file path or agent:sessionId specifier')
  .option('--output <path>', 'output file path')
  .option(
    '--anonymize <value>',
    'anonymization: all, none, or comma-separated options'
  )
  .option(
    '--format <format>',
    'session format (claude, codex, copilot, gemini)'
  )
  .action(
    async (
      session: string | undefined,
      options: { output?: string; anonymize?: string; format?: string }
    ) => {
      const { default: exportCmd } = await import('./commands/export.js');
      await exportCmd(session, options);
    }
  );

program
  .command('serve')
  .description('Start a local web viewer')
  .option('--port <number>', 'port number (default: 3123)', v => {
    const n = Number.parseInt(v, 10);
    if (Number.isNaN(n) || n <= 0 || n >= 65536) {
      throw new Error(`Invalid port number: ${v}`);
    }
    return n;
  })
  .action(async (options: { port?: number }) => {
    const { default: serve } = await import('./commands/serve.js');
    await serve(options);
  });

program.parseAsync().catch(err => {
  console.error(pc.red(err instanceof Error ? err.message : String(err)));
  process.exit(1);
});
