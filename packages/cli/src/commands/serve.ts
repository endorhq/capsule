import { createServer } from 'node:http';
import * as p from '@clack/prompts';
import pc from 'picocolors';

export interface ServeOptions {
  port?: number;
}

export default async function serve(options: ServeOptions): Promise<void> {
  const port = options.port || 3123;

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
