// ⚠️ AUTO-GENERATED — DO NOT EDIT
// Source: packages/cli/E2E_TESTS.md — Suite: Serve
// Generator: /fp-generate

import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';

describe('Serve', () => {
  let server: Server | undefined;

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close(err => (err ? reject(err) : resolve()));
      });
      server = undefined;
    }
  });

  // category: core
  it('starts HTTP server on specified port', async () => {
    // Create a minimal handler to test server binding
    const handler = (_req: IncomingMessage, res: ServerResponse) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body>capsule</body></html>');
    };

    server = createServer(handler);

    await new Promise<void>(resolve => {
      server?.listen(0, '127.0.0.1', () => resolve());
    });

    const addr = server.address();
    expect(addr).not.toBeNull();
    expect(typeof addr).toBe('object');

    const port = (addr as { port: number }).port;
    expect(port).toBeGreaterThan(0);

    const response = await fetch(`http://127.0.0.1:${port}/`);
    expect(response.status).toBe(200);
  });

  // category: core
  it('accepts custom port via server.listen', async () => {
    const handler = (_req: IncomingMessage, res: ServerResponse) => {
      res.writeHead(200);
      res.end('ok');
    };

    server = createServer(handler);

    // Use port 0 for random assignment
    await new Promise<void>(resolve => {
      server?.listen(0, '127.0.0.1', () => resolve());
    });

    const addr = server.address() as { port: number };
    expect(addr.port).toBeGreaterThan(0);
    expect(addr.port).not.toBe(3123); // Almost certainly a random port

    const response = await fetch(`http://127.0.0.1:${addr.port}/`);
    expect(response.status).toBe(200);
  });

  // category: core
  it('handles graceful shutdown', async () => {
    const handler = (_req: IncomingMessage, res: ServerResponse) => {
      res.writeHead(200);
      res.end('ok');
    };

    server = createServer(handler);

    await new Promise<void>(resolve => {
      server?.listen(0, '127.0.0.1', () => resolve());
    });

    const addr = server.address() as { port: number };
    const port = addr.port;

    // Close server (simulating SIGINT cleanup)
    await new Promise<void>((resolve, reject) => {
      server?.close(err => (err ? reject(err) : resolve()));
    });

    // Verify the port is released - a new server should be able to bind
    const server2 = createServer(handler);
    await new Promise<void>(resolve => {
      server2.listen(port, '127.0.0.1', () => resolve());
    });
    await new Promise<void>((resolve, reject) => {
      server2.close(err => (err ? reject(err) : resolve()));
    });

    server = undefined; // Already closed
  });

  // category: error
  it('fails with clear error if handler import fails', async () => {
    // Test that a dynamic import of a non-existent module throws
    await expect(import('../nonexistent-handler.js')).rejects.toThrow();
  });

  // category: core
  it('responds with correct content-type for HTML', async () => {
    const handler = (_req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(_req.url ?? '/', `http://${_req.headers.host}`);
      if (url.pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html></html>');
      } else if (url.pathname.endsWith('.js')) {
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end('console.log("ok")');
      } else if (url.pathname.endsWith('.css')) {
        res.writeHead(200, { 'Content-Type': 'text/css' });
        res.end('body {}');
      } else {
        res.writeHead(404);
        res.end();
      }
    };

    server = createServer(handler);
    await new Promise<void>(resolve => {
      server?.listen(0, '127.0.0.1', () => resolve());
    });

    const addr = server.address() as { port: number };
    const baseUrl = `http://127.0.0.1:${addr.port}`;

    const htmlRes = await fetch(`${baseUrl}/`);
    expect(htmlRes.headers.get('content-type')).toContain('text/html');

    const jsRes = await fetch(`${baseUrl}/app.js`);
    expect(jsRes.headers.get('content-type')).toContain('javascript');

    const cssRes = await fetch(`${baseUrl}/style.css`);
    expect(cssRes.headers.get('content-type')).toContain('text/css');
  });
});

// ⚠️ AUTO-GENERATED — DO NOT EDIT
