// ⚠️ AUTO-GENERATED — DO NOT EDIT
// Source: packages/cli/E2E_TESTS.md — Suite: Share
// Generator: /fp-generate

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { checkGhAuth } from '../../src/publish.js';
import { createMockGh } from './e2e-utils.js';

describe('Share', () => {
  let originalPath: string | undefined;
  let mockCleanup: (() => Promise<void>) | undefined;

  beforeEach(() => {
    originalPath = process.env.PATH;
  });

  afterEach(async () => {
    if (originalPath !== undefined) {
      process.env.PATH = originalPath;
    }
    if (mockCleanup) {
      await mockCleanup();
      mockCleanup = undefined;
    }
  });

  // category: core
  // skip: requires-real-gist
  it.skip('publishes session and returns viewer URL', () => {
    // Skip reason: requires-real-gist
    // This test would run `capsule share <fixture>` with a mocked `gh` CLI,
    // verify it calls `gh gist create`, captures the gist ID, and prints
    // a viewer URL matching https://capsule.endor.dev?gist=<id>.
  });

  // category: core
  it('checks gh auth before proceeding and fails on auth error', async () => {
    const mock = await createMockGh('auth-fail');
    mockCleanup = mock.cleanup;

    process.env.PATH = `${mock.dir}:${process.env.PATH}`;

    const result = await checkGhAuth();
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('auth');
  });

  // category: error
  it('fails when gh is not installed', async () => {
    // Set PATH to empty directory so gh cannot be found
    const emptyMock = await createMockGh('auth-fail');
    mockCleanup = emptyMock.cleanup;

    // Point PATH to a directory with no gh binary
    process.env.PATH = '/nonexistent/bin';

    const result = await checkGhAuth();
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });

  // category: core
  // skip: requires-gh-auth
  it.skip('applies anonymization transforms before publishing', () => {
    // Skip reason: requires-gh-auth
    // This test would run share with path masking enabled, capture the
    // temp file written for gist creation, and verify file paths are
    // masked in the content.
  });
});

// ⚠️ AUTO-GENERATED — DO NOT EDIT
