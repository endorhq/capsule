import { PUBLIC_DISTRIBUTION } from '$env/static/public';

export type Distribution = 'public' | 'local';

export const distribution: Distribution =
  (PUBLIC_DISTRIBUTION as Distribution) || 'public';

export const isLocal: boolean = distribution === 'local';
