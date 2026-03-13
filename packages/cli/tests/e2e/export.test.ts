// ⚠️ AUTO-GENERATED — DO NOT EDIT
// Source: packages/cli/E2E_TESTS.md — Suite: Export
// Generator: /fp-generate

import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type AnonymizeOptions, anonymize } from '../../src/anonymize.js';
import { saveToFile } from '../../src/publish.js';
import { createTempDir, readFixture, safeCleanup } from './e2e-utils.js';

describe('Export', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await safeCleanup(tempDir);
  });

  // category: core
  it('exports session to specified path without anonymization', async () => {
    const content = await readFixture('claude-simple.jsonl');
    const outputPath = join(tempDir, 'output.jsonl');

    await saveToFile(content, outputPath);

    const written = await readFile(outputPath, 'utf-8');
    expect(written).toBe(content);

    const fileStat = await stat(outputPath);
    expect(fileStat.isFile()).toBe(true);
  });

  // category: core
  it('exports with all anonymization options producing sanitized output', async () => {
    const content = await readFixture('claude-simple.jsonl');
    const options: AnonymizeOptions = {
      removeToolOutputs: true,
      maskFilePaths: true,
      removeFileContents: true,
      removeThinking: true,
      removeSystemMessages: true,
      removeTokenUsage: true,
      maskGitInfo: true,
    };

    const anonymized = anonymize(content, 'claude', options);
    const outputPath = join(tempDir, 'anonymized.jsonl');
    await saveToFile(anonymized, outputPath);

    const written = await readFile(outputPath, 'utf-8');

    // Verify no original paths remain
    expect(written).not.toContain('/home/user/projects/myapp');

    // Verify masked paths are present
    expect(written).toContain('/project/src/');

    // Verify tool outputs are removed
    expect(written).toContain('[removed]');

    // Verify token usage is removed from messages
    const lines = written.split('\n').filter(l => l.trim());
    for (const line of lines) {
      const entry = JSON.parse(line);
      if (entry.message?.usage) {
        expect(entry.message.usage).toBeUndefined();
      }
    }
  });

  // category: core
  it('preserves JSONL format integrity for JSONL formats', async () => {
    const formats = [
      { file: 'claude-simple.jsonl', format: 'claude' as const },
      { file: 'codex-simple.jsonl', format: 'codex' as const },
      { file: 'copilot-simple.jsonl', format: 'copilot' as const },
    ];

    for (const { file, format } of formats) {
      const content = await readFixture(file);
      const anonymized = anonymize(content, format, {
        removeToolOutputs: false,
        maskFilePaths: true,
        removeFileContents: false,
        removeThinking: false,
        removeSystemMessages: false,
        removeTokenUsage: false,
        maskGitInfo: false,
      });

      const lines = anonymized.split('\n').filter(l => l.trim());
      for (const line of lines) {
        expect(() => JSON.parse(line)).not.toThrow();
      }
    }
  });

  // category: core
  it('preserves JSON format integrity for Gemini', async () => {
    const content = await readFixture('gemini-simple.json');
    const anonymized = anonymize(content, 'gemini', {
      removeToolOutputs: false,
      maskFilePaths: true,
      removeFileContents: false,
      removeThinking: false,
      removeSystemMessages: false,
      removeTokenUsage: false,
      maskGitInfo: false,
    });

    expect(() => JSON.parse(anonymized)).not.toThrow();
    const parsed = JSON.parse(anonymized);
    expect(parsed.messages).toBeDefined();
    expect(Array.isArray(parsed.messages)).toBe(true);
  });

  // category: edge
  it('exports minimal session without corruption', async () => {
    const content = await readFixture('claude-minimal.jsonl');
    const outputPath = join(tempDir, 'minimal.jsonl');

    await saveToFile(content, outputPath);

    const written = await readFile(outputPath, 'utf-8');
    expect(written.trim().length).toBeGreaterThan(0);

    const lines = written.split('\n').filter(l => l.trim());
    expect(lines.length).toBeGreaterThanOrEqual(1);
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });

  // category: error
  it('fails gracefully when writing to non-existent directory', async () => {
    const content = await readFixture('claude-simple.jsonl');
    const badPath = '/nonexistent/path/output.jsonl';

    await expect(saveToFile(content, badPath)).rejects.toThrow();
  });

  // category: idempotency
  it('produces identical output for the same input', async () => {
    const content = await readFixture('claude-simple.jsonl');
    const options: AnonymizeOptions = {
      removeToolOutputs: true,
      maskFilePaths: true,
      removeFileContents: false,
      removeThinking: false,
      removeSystemMessages: false,
      removeTokenUsage: false,
      maskGitInfo: false,
    };

    const output1 = anonymize(content, 'claude', options);
    const output2 = anonymize(content, 'claude', options);

    expect(output1).toBe(output2);
  });
});

// ⚠️ AUTO-GENERATED — DO NOT EDIT
