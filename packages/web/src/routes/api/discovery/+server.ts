import { json } from '@sveltejs/kit';
import { isLocal } from '$lib/features';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  if (!isLocal) {
    return json({ error: 'Not available in public mode' }, { status: 403 });
  }

  const { discoverAllSessions } = await import(
    '@endorhq/capsule-shared/discovery'
  );
  const sources = await discoverAllSessions();

  return json(sources);
};
