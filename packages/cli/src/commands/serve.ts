import { createServer } from 'node:http';
import * as p from '@clack/prompts';
import pc from 'picocolors';

function parsePortArg(): number | undefined {
  const args = process.argv.slice(3);
  const portIdx = args.indexOf('--port');
  if (portIdx !== -1 && args[portIdx + 1]) {
    const port = Number.parseInt(args[portIdx + 1], 10);
    if (!Number.isNaN(port) && port > 0 && port < 65536) return port;
  }
}

export default async function serve(): Promise<void> {
  const port = parsePortArg() || 3000;

  p.intro(pc.bgCyan(pc.black(' capsule serve ')));

  // Use embedded web build (production) or workspace dependency (development)
  const { handler } = await import(
    new URL('../web/handler.js', import.meta.url).href
  ).catch(() => import('@endorhq/capsule-web/handler'));

  const server = createServer(handler);

  server.listen(port, '127.0.0.1', () => {
    p.log.success(
      `Capsule running at ${pc.underline(pc.cyan(`http://localhost:${port}`))}`
    );
    p.log.info(pc.dim('Press Ctrl+C to stop'));
  });

  const cleanup = () => {
    server.close();
    process.exit(0);
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Keep process alive
  await new Promise(() => {});
}
