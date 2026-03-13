// ⚠️ AUTO-GENERATED — DO NOT EDIT
// Source: packages/cli/E2E_TESTS.md
// Generator: /fp-generate

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export const FIXTURES_DIR = join(__dirname, 'fixtures');

export async function readFixture(name: string): Promise<string> {
  return readFile(join(FIXTURES_DIR, name), 'utf-8');
}

export async function createTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'capsule-test-'));
}

export async function safeCleanup(dir: string): Promise<void> {
  try {
    await rm(dir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
}

/**
 * Create a mock `gh` CLI script in a temp directory.
 * Returns the directory to prepend to $PATH.
 */
export async function createMockGh(
  behavior: 'auth-ok' | 'auth-fail' | 'gist-create'
): Promise<{ dir: string; cleanup: () => Promise<void> }> {
  const dir = await createTempDir();
  const script = join(dir, 'gh');

  let content: string;
  switch (behavior) {
    case 'auth-ok':
      content =
        '#!/bin/sh\nif [ "$1" = "auth" ] && [ "$2" = "status" ]; then\n  echo "Logged in"\n  exit 0\nfi\nexit 1\n';
      break;
    case 'auth-fail':
      content =
        '#!/bin/sh\nif [ "$1" = "auth" ] && [ "$2" = "status" ]; then\n  echo "Not logged in" >&2\n  exit 1\nfi\nexit 1\n';
      break;
    case 'gist-create':
      content =
        '#!/bin/sh\nif [ "$1" = "auth" ] && [ "$2" = "status" ]; then\n  echo "Logged in"\n  exit 0\nfi\nif [ "$1" = "gist" ] && [ "$2" = "create" ]; then\n  echo "https://gist.github.com/abc123def456"\n  exit 0\nfi\nexit 1\n';
      break;
  }

  await writeFile(script, content, { mode: 0o755 });
  return { dir, cleanup: () => safeCleanup(dir) };
}

/**
 * Create a fake $HOME with agent session directories for discovery testing.
 */
export async function createMockHome(): Promise<{
  home: string;
  cleanup: () => Promise<void>;
}> {
  const home = await createTempDir();
  return { home, cleanup: () => safeCleanup(home) };
}

/**
 * Create a Claude session file in the mock home directory.
 */
export async function createClaudeSession(
  home: string,
  project: string,
  filename: string,
  content: string
): Promise<string> {
  const dir = join(home, '.claude', 'projects', project);
  await mkdir(dir, { recursive: true });
  const filePath = join(dir, filename);
  await writeFile(filePath, content, 'utf-8');
  return filePath;
}

/**
 * Create a Codex session file in the mock home directory.
 */
export async function createCodexSession(
  home: string,
  filename: string,
  content: string
): Promise<string> {
  const dir = join(home, '.codex', 'sessions');
  await mkdir(dir, { recursive: true });
  const filePath = join(dir, filename);
  await writeFile(filePath, content, 'utf-8');
  return filePath;
}

/**
 * Create a Copilot session file in the mock home directory.
 */
export async function createCopilotSession(
  home: string,
  sessionId: string,
  content: string
): Promise<string> {
  const dir = join(home, '.copilot', 'session-state', sessionId);
  await mkdir(dir, { recursive: true });
  const filePath = join(dir, 'events.jsonl');
  await writeFile(filePath, content, 'utf-8');
  return filePath;
}

/**
 * Create a Gemini session file in the mock home directory.
 */
export async function createGeminiSession(
  home: string,
  filename: string,
  content: string
): Promise<string> {
  const dir = join(home, '.gemini', 'tmp');
  await mkdir(dir, { recursive: true });
  const filePath = join(dir, filename);
  await writeFile(filePath, content, 'utf-8');
  return filePath;
}

// ⚠️ AUTO-GENERATED — DO NOT EDIT
