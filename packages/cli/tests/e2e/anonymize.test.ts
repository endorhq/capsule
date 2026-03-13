// ⚠️ AUTO-GENERATED — DO NOT EDIT
// Source: packages/cli/E2E_TESTS.md — Suite: Anonymization
// Generator: /fp-generate

import { describe, expect, it } from 'vitest';
import {
  type AnonymizeOptions,
  anonymize,
  DEFAULT_OPTIONS,
} from '../../src/anonymize.js';
import { readFixture } from './e2e-utils.js';

describe('Anonymization', () => {
  // category: core
  it('Claude: mask file paths replaces real paths with generic ones', async () => {
    const content = await readFixture('claude-simple.jsonl');
    const options: AnonymizeOptions = {
      ...DEFAULT_OPTIONS,
      maskFilePaths: true,
    };

    const result = anonymize(content, 'claude', options);

    // Original paths should be replaced
    expect(result).not.toContain('/home/user/projects/myapp');

    // Masked paths should follow /project/src/file{N}{ext} pattern
    expect(result).toMatch(/\/project\/src\/file\d+/);

    // Verify the cwd field is masked
    const lines = result.split('\n').filter(l => l.trim());
    for (const line of lines) {
      const entry = JSON.parse(line);
      if (entry.cwd) {
        expect(entry.cwd).toMatch(/^\/project\/src\//);
      }
    }
  });

  // category: core
  it('Claude: remove thinking blocks strips thinking content', async () => {
    const content = await readFixture('claude-with-thinking.jsonl');
    const options: AnonymizeOptions = {
      ...DEFAULT_OPTIONS,
      removeThinking: true,
    };

    const result = anonymize(content, 'claude', options);

    // Parse each line and check no thinking blocks remain
    const lines = result.split('\n').filter(l => l.trim());
    for (const line of lines) {
      const entry = JSON.parse(line);
      if (entry.type === 'assistant' && entry.message?.content) {
        const blocks = entry.message.content as Array<{ type: string }>;
        for (const block of blocks) {
          expect(block.type).not.toBe('thinking');
        }
      }
    }
  });

  // category: core
  it('Claude: remove tool outputs strips tool_result content', async () => {
    const content = await readFixture('claude-simple.jsonl');
    const options: AnonymizeOptions = {
      ...DEFAULT_OPTIONS,
      removeToolOutputs: true,
    };

    const result = anonymize(content, 'claude', options);

    const lines = result.split('\n').filter(l => l.trim());
    for (const line of lines) {
      const entry = JSON.parse(line);
      if (entry.type === 'user' && Array.isArray(entry.message?.content)) {
        for (const block of entry.message.content) {
          if (block.type === 'tool_result') {
            expect(block.content).toBe('[removed]');
          }
        }
      }
      // toolUseResult should be removed
      if (entry.type === 'user') {
        expect(entry.toolUseResult).toBeUndefined();
      }
    }
  });

  // category: core
  it('Codex: remove reasoning items filters reasoning entries', async () => {
    const content = await readFixture('codex-simple.jsonl');
    const options: AnonymizeOptions = {
      ...DEFAULT_OPTIONS,
      removeThinking: true,
    };

    const result = anonymize(content, 'codex', options);

    const lines = result.split('\n').filter(l => l.trim());
    for (const line of lines) {
      const entry = JSON.parse(line);
      if (entry.type === 'response_item' && entry.payload) {
        expect(entry.payload.type).not.toBe('reasoning');
      }
    }
  });

  // category: core
  it('Copilot: mask session context sanitizes cwd, branch, repository', async () => {
    const content = await readFixture('copilot-simple.jsonl');
    const options: AnonymizeOptions = {
      ...DEFAULT_OPTIONS,
      maskFilePaths: true,
      maskGitInfo: true,
    };

    const result = anonymize(content, 'copilot', options);

    const lines = result.split('\n').filter(l => l.trim());
    for (const line of lines) {
      const entry = JSON.parse(line);
      if (entry.type === 'session.start' && entry.data?.context) {
        const ctx = entry.data.context;
        // cwd should be masked
        if (ctx.cwd) {
          expect(ctx.cwd).not.toContain('/home/user');
          expect(ctx.cwd).toMatch(/^\/project\/src\//);
        }
        // branch should be masked
        if (ctx.branch) {
          expect(ctx.branch).toMatch(/^branch-\d+$/);
        }
        // repository should be masked
        if (ctx.repository) {
          expect(ctx.repository).toMatch(
            /^https:\/\/github\.com\/user\/repo-\d+\.git$/
          );
        }
      }
    }
  });

  // category: core
  it('Gemini: anonymization produces valid JSON', async () => {
    const content = await readFixture('gemini-simple.json');
    const options: AnonymizeOptions = {
      ...DEFAULT_OPTIONS,
      removeToolOutputs: true,
      maskFilePaths: true,
      removeThinking: true,
      removeTokenUsage: true,
    };

    const result = anonymize(content, 'gemini', options);

    // Must be valid JSON
    expect(() => JSON.parse(result)).not.toThrow();

    const parsed = JSON.parse(result);
    expect(parsed.messages).toBeDefined();
    expect(Array.isArray(parsed.messages)).toBe(true);

    // Verify no original paths
    expect(result).not.toContain('/home/user/projects/myapp');

    // Verify no token data
    for (const msg of parsed.messages) {
      expect(msg.tokens).toBeUndefined();
      expect(msg.thoughts).toBeUndefined();
    }

    // Pretty-printed (2-space indent)
    expect(result).toContain('  ');
  });

  // category: edge
  it('path masker produces consistent mappings across occurrences', async () => {
    const content = await readFixture('claude-simple.jsonl');
    const options: AnonymizeOptions = {
      ...DEFAULT_OPTIONS,
      maskFilePaths: true,
    };

    const result = anonymize(content, 'claude', options);

    // The path /home/user/projects/myapp appears in multiple lines
    // All occurrences should map to the same masked path
    const lines = result.split('\n').filter(l => l.trim());
    const maskedPaths = new Set<string>();

    for (const line of lines) {
      const entry = JSON.parse(line);
      if (entry.cwd) {
        maskedPaths.add(entry.cwd);
      }
    }

    // All cwd entries should be the same masked value
    expect(maskedPaths.size).toBe(1);
  });

  // category: edge
  it('git masker handles branch names and repo URLs', async () => {
    const content = await readFixture('codex-simple.jsonl');
    const options: AnonymizeOptions = {
      ...DEFAULT_OPTIONS,
      maskGitInfo: true,
    };

    const result = anonymize(content, 'codex', options);

    const lines = result.split('\n').filter(l => l.trim());
    for (const line of lines) {
      const entry = JSON.parse(line);
      if (entry.type === 'session_meta' && entry.payload?.git) {
        const git = entry.payload.git;
        if (git.branch) {
          expect(git.branch).toMatch(/^branch-\d+$/);
        }
        if (git.repository_url) {
          expect(git.repository_url).toMatch(
            /^https:\/\/github\.com\/user\/repo-\d+\.git$/
          );
        }
      }
    }

    // Original values should not appear
    expect(result).not.toContain('develop');
    expect(result).not.toContain('github.com/user/myapp.git');
  });
});

// ⚠️ AUTO-GENERATED — DO NOT EDIT
