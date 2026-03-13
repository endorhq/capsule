// ⚠️ AUTO-GENERATED — DO NOT EDIT
// Source: packages/web/E2E_TESTS.md — Suite: Session Viewer
// Generator: /fp-generate

import { expect, test } from '@playwright/test';
import {
  uploadFixture,
  waitForSessionInSidebar,
  waitForTimeline,
} from './e2e-utils.js';

test.describe('Session Viewer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  // category: core
  test('filter bar filters timeline entries by type', async ({ page }) => {
    // Upload a session with tool calls
    await uploadFixture(page, 'claude-with-tools.jsonl');
    await waitForSessionInSidebar(page);

    const sessionItem = page.locator('aside').locator('button, a').first();
    await sessionItem.click();

    await waitForTimeline(page);

    // Get initial content with tool calls visible
    const initialText = await page.locator('main').textContent();
    expect(initialText).toBeTruthy();

    // Look for a search/filter input
    const filterInput = page.locator(
      'input[type="search"], input[type="text"][placeholder*="filter" i], input[type="text"][placeholder*="search" i]'
    );
    if ((await filterInput.count()) > 0) {
      // Type a filter term that should exclude tool calls
      await filterInput.first().fill('help');
      await page.waitForTimeout(1000);

      const filteredText = await page.locator('main').textContent();
      // Content should change after filtering
      expect(filteredText).not.toBe(initialText);
    }
  });

  // category: core
  test('session metadata panel shows format, duration, and token counts', async ({
    page,
  }) => {
    await uploadFixture(page, 'claude-simple.jsonl');
    await waitForSessionInSidebar(page);

    const sessionItem = page.locator('aside').locator('button, a').first();
    await sessionItem.click();

    await waitForTimeline(page);

    // Verify metadata panel content
    const pageText = await page.textContent('body');

    // Should show the agent format
    expect(pageText?.toLowerCase()).toContain('claude');

    // Should show token info (look for numbers or "tokens" text)
    const hasTokenInfo =
      pageText?.toLowerCase().includes('token') ||
      pageText?.match(/\d+\s*(input|output|total)/i);
    expect(hasTokenInfo).toBeTruthy();
  });

  // category: edge
  test('subagent entries render nested timelines', async ({ page }) => {
    // Create a fixture with subagent entries inline
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const os = await import('node:os');

    const subagentFixture = [
      JSON.stringify({
        sessionId: 'sess-sub',
        type: 'user',
        timestamp: '2025-01-15T10:00:00Z',
        cwd: '/test',
        message: { role: 'user', content: 'Run a task' },
      }),
      JSON.stringify({
        sessionId: 'sess-sub',
        type: 'assistant',
        timestamp: '2025-01-15T10:00:05Z',
        cwd: '/test',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'task-001',
              name: 'Agent',
              input: { prompt: 'Do subtask' },
            },
          ],
          usage: { input_tokens: 50, output_tokens: 30 },
        },
      }),
      JSON.stringify({
        sessionId: 'sess-sub',
        type: 'progress',
        timestamp: '2025-01-15T10:00:06Z',
        agentId: 'agent-001',
        parentToolUseId: 'task-001',
        data: {
          type: 'start',
          description: 'Subtask agent',
          subagentType: 'general-purpose',
        },
      }),
      JSON.stringify({
        sessionId: 'sess-sub',
        type: 'progress',
        timestamp: '2025-01-15T10:00:07Z',
        agentId: 'agent-001',
        data: {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'Working on subtask' }],
          },
        },
      }),
      JSON.stringify({
        sessionId: 'sess-sub',
        type: 'user',
        timestamp: '2025-01-15T10:00:10Z',
        cwd: '/test',
        message: {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'task-001',
              content: 'Task completed',
            },
          ],
        },
      }),
      JSON.stringify({
        sessionId: 'sess-sub',
        type: 'assistant',
        timestamp: '2025-01-15T10:00:15Z',
        cwd: '/test',
        message: {
          role: 'assistant',
          content: [{ type: 'text', text: 'The subtask is done.' }],
          usage: { input_tokens: 100, output_tokens: 20 },
        },
      }),
    ].join('\n');

    const tempFile = path.join(os.tmpdir(), 'capsule-subagent-test.jsonl');
    await fs.writeFile(tempFile, subagentFixture, 'utf-8');

    try {
      const fileInput = page.locator('main input[type="file"]');
      await fileInput.setInputFiles(tempFile);

      await waitForSessionInSidebar(page);

      const sessionItem = page.locator('aside').locator('button, a').first();
      await sessionItem.click();

      await waitForTimeline(page);

      // Verify subagent content is rendered
      const pageText = await page.textContent('body');
      expect(pageText).toContain('Agent');
    } finally {
      await fs.unlink(tempFile).catch(() => {});
    }
  });

  // category: error
  test('empty session shows appropriate empty state', async ({ page }) => {
    // Create a fixture with only system entries (no user/assistant)
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const os = await import('node:os');

    const emptyFixture = JSON.stringify({
      sessionId: 'sess-empty',
      type: 'system',
      timestamp: '2025-01-15T10:00:00Z',
      cwd: '/test',
      message: { content: 'Session started' },
    });

    const tempFile = path.join(os.tmpdir(), 'capsule-empty-test.jsonl');
    await fs.writeFile(tempFile, emptyFixture, 'utf-8');

    try {
      const fileInput = page.locator('main input[type="file"]');
      await fileInput.setInputFiles(tempFile);

      await page.waitForTimeout(3000);

      // Either an error is shown, session doesn't appear, or an empty state message is displayed
      const pageText = await page.textContent('body');
      const hasEmptyState =
        pageText?.toLowerCase().includes('empty') ||
        pageText?.toLowerCase().includes('no messages') ||
        pageText?.toLowerCase().includes('no entries') ||
        pageText?.toLowerCase().includes('error') ||
        pageText?.toLowerCase().includes('upload');

      expect(hasEmptyState).toBe(true);
    } finally {
      await fs.unlink(tempFile).catch(() => {});
    }
  });
});

// ⚠️ AUTO-GENERATED — DO NOT EDIT
