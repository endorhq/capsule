// ⚠️ AUTO-GENERATED — DO NOT EDIT
// Source: packages/cli/E2E_TESTS.md — Suite: Discovery
// Generator: /fp-generate

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createClaudeSession,
  createCodexSession,
  createCopilotSession,
  createGeminiSession,
  createMockHome,
} from './e2e-utils.js';

// We need to mock homedir() to point to our temp directory
// The discovery module uses homedir() from 'node:os'
vi.mock('node:os', async importOriginal => {
  const original = await importOriginal<typeof import('node:os')>();
  return {
    ...original,
    homedir: () => mockHomeDir,
  };
});

let mockHomeDir: string;
let cleanupHome: (() => Promise<void>) | undefined;

// Re-import after mock is set up
async function getDiscovery() {
  // Clear the module cache to pick up the new mock
  const mod = await import('@endorhq/capsule-shared/discovery');
  return mod;
}

describe('Discovery', () => {
  beforeEach(async () => {
    const { home, cleanup } = await createMockHome();
    mockHomeDir = home;
    cleanupHome = cleanup;
  });

  afterEach(async () => {
    if (cleanupHome) {
      await cleanupHome();
      cleanupHome = undefined;
    }
    vi.restoreAllMocks();
  });

  // category: core
  it('discovers Claude sessions from ~/.claude/projects/', async () => {
    const claudeContent = [
      JSON.stringify({
        sessionId: 'claude-test-001',
        type: 'user',
        timestamp: '2025-01-15T10:00:00Z',
        cwd: '/home/user/projects/test',
        message: { role: 'user', content: 'Hello Claude' },
      }),
      JSON.stringify({
        sessionId: 'claude-test-001',
        type: 'assistant',
        timestamp: '2025-01-15T10:00:05Z',
        message: {
          role: 'assistant',
          content: [{ type: 'text', text: 'Hi!' }],
        },
      }),
    ].join('\n');

    await createClaudeSession(
      mockHomeDir,
      'my-project',
      'session.jsonl',
      claudeContent
    );

    const { discoverAllSessions } = await getDiscovery();
    const sources = await discoverAllSessions();

    const claudeSource = sources.find(s => s.agent === 'claude');
    expect(claudeSource).toBeDefined();
    expect(claudeSource!.sessions.length).toBeGreaterThanOrEqual(1);

    const session = claudeSource!.sessions[0];
    expect(session.agent).toBe('claude');
    expect(session.title).toContain('Hello Claude');
    expect(session.date).toBeInstanceOf(Date);
    expect(session.cwd).toBe('/home/user/projects/test');
  });

  // category: core
  it('discovers Codex sessions from ~/.codex/sessions/', async () => {
    const codexContent = [
      JSON.stringify({
        type: 'session_meta',
        timestamp: '2025-01-15T10:00:00Z',
        payload: {
          id: 'codex-test-001',
          originator: 'codex-cli',
          cwd: '/home/user/projects/test',
        },
      }),
      JSON.stringify({
        type: 'event_msg',
        timestamp: '2025-01-15T10:00:01Z',
        payload: { type: 'user_message', message: 'Fix the bug' },
      }),
    ].join('\n');

    await createCodexSession(mockHomeDir, 'session.jsonl', codexContent);

    const { discoverAllSessions } = await getDiscovery();
    const sources = await discoverAllSessions();

    const codexSource = sources.find(s => s.agent === 'codex');
    expect(codexSource).toBeDefined();
    expect(codexSource!.sessions.length).toBeGreaterThanOrEqual(1);

    const session = codexSource!.sessions[0];
    expect(session.agent).toBe('codex');
    expect(session.title).toContain('Fix the bug');
  });

  // category: core
  it('discovers Copilot sessions from ~/.copilot/session-state/', async () => {
    const copilotContent = [
      JSON.stringify({
        type: 'session.start',
        timestamp: '2025-01-15T10:00:00Z',
        data: {
          sessionId: 'copilot-test-001',
          startTime: '2025-01-15T10:00:00Z',
          context: { cwd: '/home/user/projects/test' },
        },
      }),
      JSON.stringify({
        type: 'user.message',
        timestamp: '2025-01-15T10:00:01Z',
        data: { content: 'Refactor auth' },
      }),
    ].join('\n');

    await createCopilotSession(mockHomeDir, 'copilot-test-001', copilotContent);

    const { discoverAllSessions } = await getDiscovery();
    const sources = await discoverAllSessions();

    const copilotSource = sources.find(s => s.agent === 'copilot');
    expect(copilotSource).toBeDefined();
    expect(copilotSource!.sessions.length).toBeGreaterThanOrEqual(1);

    const session = copilotSource!.sessions[0];
    expect(session.agent).toBe('copilot');
    expect(session.sessionId).toBe('copilot-test-001');
  });

  // category: core
  it('discovers Gemini sessions from ~/.gemini/tmp/', async () => {
    const geminiContent = JSON.stringify({
      startTime: '2025-01-15T10:00:00Z',
      sessionId: 'gemini-test-001',
      projectHash: 'test123',
      messages: [
        {
          type: 'user',
          timestamp: '2025-01-15T10:00:00Z',
          content: 'Create component',
        },
      ],
    });

    await createGeminiSession(mockHomeDir, 'session-test.json', geminiContent);

    const { discoverAllSessions } = await getDiscovery();
    const sources = await discoverAllSessions();

    const geminiSource = sources.find(s => s.agent === 'gemini');
    expect(geminiSource).toBeDefined();
    expect(geminiSource!.sessions.length).toBeGreaterThanOrEqual(1);

    const session = geminiSource!.sessions[0];
    expect(session.agent).toBe('gemini');
    expect(session.title).toContain('Create component');
  });

  // category: edge
  it('returns empty list for missing directories', async () => {
    // mockHomeDir is empty — no agent directories exist
    const { discoverAllSessions } = await getDiscovery();
    const sources = await discoverAllSessions();

    expect(sources).toEqual([]);
  });

  // category: error
  it('skips malformed session files', async () => {
    // Create a Claude project dir with a corrupted file
    const dir = join(mockHomeDir, '.claude', 'projects', 'broken');
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, 'bad.jsonl'),
      'not valid json at all\n{broken',
      'utf-8'
    );

    // Also create a valid session
    const validContent = [
      JSON.stringify({
        sessionId: 'valid-001',
        type: 'user',
        timestamp: '2025-01-15T10:00:00Z',
        cwd: '/test',
        message: { role: 'user', content: 'Valid session' },
      }),
    ].join('\n');
    await createClaudeSession(
      mockHomeDir,
      'good-project',
      'session.jsonl',
      validContent
    );

    const { discoverAllSessions } = await getDiscovery();
    const sources = await discoverAllSessions();

    const claudeSource = sources.find(s => s.agent === 'claude');
    // Should have at least the valid session; bad one should be skipped
    if (claudeSource) {
      for (const session of claudeSource.sessions) {
        expect(session.date).toBeInstanceOf(Date);
        expect(session.title).toBeDefined();
      }
    }
  });

  // category: side-effect
  it('sorts sessions by date descending', async () => {
    const older = [
      JSON.stringify({
        sessionId: 'older',
        type: 'user',
        timestamp: '2025-01-10T10:00:00Z',
        cwd: '/test',
        message: { role: 'user', content: 'Older session' },
      }),
    ].join('\n');

    const newer = [
      JSON.stringify({
        sessionId: 'newer',
        type: 'user',
        timestamp: '2025-01-20T10:00:00Z',
        cwd: '/test',
        message: { role: 'user', content: 'Newer session' },
      }),
    ].join('\n');

    await createClaudeSession(mockHomeDir, 'proj-old', 'old.jsonl', older);
    await createClaudeSession(mockHomeDir, 'proj-new', 'new.jsonl', newer);

    const { discoverAllSessions } = await getDiscovery();
    const sources = await discoverAllSessions();

    const claudeSource = sources.find(s => s.agent === 'claude');
    expect(claudeSource).toBeDefined();
    expect(claudeSource!.sessions.length).toBe(2);

    // First session should be newer
    const [first, second] = claudeSource!.sessions;
    expect(first.date.getTime()).toBeGreaterThan(second.date.getTime());
  });
});

// ⚠️ AUTO-GENERATED — DO NOT EDIT
