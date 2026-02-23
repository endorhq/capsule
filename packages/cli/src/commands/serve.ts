import { createServer } from 'node:http';
import * as p from '@clack/prompts';
import pc from 'picocolors';

export interface ServeOptions {
  port?: string;
}

export default async function serve(options?: ServeOptions): Promise<void> {
  const port = options?.port ? Number.parseInt(options.port, 10) : 3123;
  if (Number.isNaN(port) || port <= 0 || port >= 65536) {
    console.error('Invalid port number. Must be between 1 and 65535.');
    process.exit(1);
  }

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
