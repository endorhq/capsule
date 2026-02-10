import { json } from '@sveltejs/kit';
import { isLocal } from '$lib/features';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  if (!isLocal) {
    return json({ error: 'Not available in public mode' }, { status: 403 });
  }

  const filePath = url.searchParams.get('path');
  if (!filePath) {
    return json({ error: 'Missing path parameter' }, { status: 400 });
  }

  const { isKnownAgentPath } = await import(
    '@endorhq/capsule-shared/discovery'
  );
  if (!isKnownAgentPath(filePath)) {
    return json(
      { error: 'Path is not under a known agent directory' },
      { status: 403 }
    );
  }

  try {
    const { readFile } = await import('node:fs/promises');
    const content = await readFile(filePath, 'utf-8');
    return new Response(content, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch {
    return json({ error: 'File not found' }, { status: 404 });
  }
};
