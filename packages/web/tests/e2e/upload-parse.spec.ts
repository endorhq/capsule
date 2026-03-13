// ⚠️ AUTO-GENERATED — DO NOT EDIT
// Source: packages/web/E2E_TESTS.md — Suite: Upload & Parse
// Generator: /fp-generate

import { expect, test } from '@playwright/test';
import {
  uploadFixture,
  waitForSessionInSidebar,
  waitForTimeline,
} from './e2e-utils.js';

test.describe('Upload & Parse', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  // category: core
  test('upload Claude JSONL file and render timeline', async ({ page }) => {
    await uploadFixture(page, 'claude-simple.jsonl');
    await waitForSessionInSidebar(page);

    // Click the session in the sidebar to select it
    const sessionItem = page.locator('aside').locator('button, a').first();
    await sessionItem.click();

    await waitForTimeline(page);

    // Verify timeline has content (user and assistant messages)
    const timelineContent = await page.locator('main').textContent();
    expect(timelineContent).toBeTruthy();

    // Verify format indicator shows Claude
    const pageText = await page.textContent('body');
    expect(pageText?.toLowerCase()).toContain('claude');
  });

  // category: core
  test('upload Codex JSONL file and render timeline', async ({ page }) => {
    await uploadFixture(page, 'codex-simple.jsonl');
    await waitForSessionInSidebar(page);

    const sessionItem = page.locator('aside').locator('button, a').first();
    await sessionItem.click();

    await waitForTimeline(page);

    const pageText = await page.textContent('body');
    expect(pageText?.toLowerCase()).toContain('codex');
  });

  // category: core
  test('upload Copilot JSONL file and render timeline', async ({ page }) => {
    await uploadFixture(page, 'copilot-simple.jsonl');
    await waitForSessionInSidebar(page);

    const sessionItem = page.locator('aside').locator('button, a').first();
    await sessionItem.click();

    await waitForTimeline(page);

    const pageText = await page.textContent('body');
    expect(pageText?.toLowerCase()).toContain('copilot');
  });

  // category: core
  test('upload Gemini JSON file and render timeline', async ({ page }) => {
    await uploadFixture(page, 'gemini-simple.json');
    await waitForSessionInSidebar(page);

    const sessionItem = page.locator('aside').locator('button, a').first();
    await sessionItem.click();

    await waitForTimeline(page);

    const pageText = await page.textContent('body');
    expect(pageText?.toLowerCase()).toContain('gemini');
  });

  // category: core
  test('format auto-detection identifies correct agent', async ({ page }) => {
    // Upload each format and verify detection
    const fixtures = [
      { file: 'claude-simple.jsonl', format: 'claude' },
      { file: 'codex-simple.jsonl', format: 'codex' },
      { file: 'copilot-simple.jsonl', format: 'copilot' },
      { file: 'gemini-simple.json', format: 'gemini' },
    ];

    for (const { file, format } of fixtures) {
      // Reload page for clean state
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await uploadFixture(page, file);
      await waitForSessionInSidebar(page);

      // Select the session
      const sessionItem = page.locator('aside').locator('button, a').first();
      await sessionItem.click();

      await waitForTimeline(page);

      // Verify the format is displayed somewhere on the page
      const pageText = await page.textContent('body');
      expect(pageText?.toLowerCase()).toContain(format);
    }
  });

  // category: core
  test('upload file with tool calls renders nested tool blocks', async ({
    page,
  }) => {
    await uploadFixture(page, 'claude-with-tools.jsonl');
    await waitForSessionInSidebar(page);

    const sessionItem = page.locator('aside').locator('button, a').first();
    await sessionItem.click();

    await waitForTimeline(page);

    // Verify tool call is rendered (look for tool name "Read")
    const pageText = await page.textContent('body');
    expect(pageText).toContain('Read');
  });

  // category: core
  test('upload file with thinking blocks renders thinking sections', async ({
    page,
  }) => {
    await uploadFixture(page, 'claude-with-thinking.jsonl');
    await waitForSessionInSidebar(page);

    const sessionItem = page.locator('aside').locator('button, a').first();
    await sessionItem.click();

    await waitForTimeline(page);

    // Verify thinking content or indicator is present
    const pageText = await page.textContent('body');
    // The thinking block should be rendered (either expanded or collapsed)
    expect(pageText?.toLowerCase()).toMatch(/think|reason/);
  });

  // category: error
  test('upload invalid file shows error', async ({ page }) => {
    await uploadFixture(page, 'invalid-file.txt');

    // Wait a moment for error to display
    await page.waitForTimeout(2000);

    // The session should NOT appear in the sidebar, or an error should be shown
    // Check for error indication
    const pageText = await page.textContent('body');
    // Either an error message is shown, or the sidebar remains empty
    const hasError =
      pageText?.toLowerCase().includes('error') ||
      pageText?.toLowerCase().includes('invalid') ||
      pageText?.toLowerCase().includes('failed');
    const sidebarEmpty =
      (await page.locator('aside').locator('button, a').count()) === 0;

    expect(hasError || sidebarEmpty).toBe(true);
  });

  // category: edge
  test('upload very large file does not hang', async ({ page }) => {
    // Generate a large JSONL fixture inline
    const lines: string[] = [];
    for (let i = 0; i < 1000; i++) {
      lines.push(
        JSON.stringify({
          sessionId: 'sess-large',
          type: i % 2 === 0 ? 'user' : 'assistant',
          timestamp: new Date(Date.now() + i * 1000).toISOString(),
          cwd: '/home/user/projects/myapp',
          message:
            i % 2 === 0
              ? { role: 'user', content: `Message ${i}` }
              : {
                  role: 'assistant',
                  content: [{ type: 'text', text: `Response ${i}` }],
                  usage: { input_tokens: 10, output_tokens: 10 },
                },
        })
      );
    }
    const largeContent = lines.join('\n');

    // Write the large file to a temp location and upload
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const os = await import('node:os');
    const tempFile = path.join(os.tmpdir(), 'capsule-large-test.jsonl');
    await fs.writeFile(tempFile, largeContent, 'utf-8');

    try {
      const fileInput = page.locator('main input[type="file"]');
      await fileInput.setInputFiles(tempFile);

      // Should complete within the test timeout (30s)
      await waitForSessionInSidebar(page);

      const sessionItem = page.locator('aside').locator('button, a').first();
      await sessionItem.click();

      await waitForTimeline(page);
    } finally {
      await fs.unlink(tempFile).catch(() => {});
    }
  });
});

// ⚠️ AUTO-GENERATED — DO NOT EDIT
