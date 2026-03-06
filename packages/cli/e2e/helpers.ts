import { resolve } from 'node:path';

export const CLI_ROOT = resolve(import.meta.dirname, '..');
export const CLI_BIN = resolve(CLI_ROOT, 'dist/index.js');
export const FIXTURES_DIR = resolve(import.meta.dirname, 'fixtures');

export function fixturePath(name: string): string {
  return resolve(FIXTURES_DIR, name);
}
