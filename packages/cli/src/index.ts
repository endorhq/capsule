import pc from 'picocolors';

const USAGE = `
${pc.bold('capsule')} — Share and view AI agent session logs

${pc.bold('Usage:')}
  capsule share  [file]       Publish a session to GitHub Gist
  capsule export [file]       Save a session to a local file
  capsule serve  [--port N]   Start a local web viewer

${pc.bold('Options:')}
  --help, -h                  Show this help message
`;

async function main() {
  const command = process.argv[2];

  if (!command || command === '--help' || command === '-h') {
    console.log(USAGE);
    process.exit(0);
  }

  const fileArg = process.argv[3];

  switch (command) {
    case 'share': {
      const { default: share } = await import('./commands/share.js');
      await share(fileArg);
      break;
    }
    case 'export': {
      const { default: exportCmd } = await import('./commands/export.js');
      await exportCmd(fileArg);
      break;
    }
    case 'serve': {
      const { default: serve } = await import('./commands/serve.js');
      await serve();
      break;
    }
    default: {
      console.error(`${pc.red('Unknown command:')} ${command}`);
      console.log(USAGE);
      process.exit(1);
    }
  }
}

main().catch(err => {
  console.error(pc.red(err instanceof Error ? err.message : String(err)));
  process.exit(1);
});
