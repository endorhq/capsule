// ⚠️ AUTO-GENERATED — DO NOT EDIT
// Source: packages/web/E2E_TESTS.md — Suite: Gist Loading
// Generator: /fp-generate

import { expect, test } from '@playwright/test';
import { readFixture } from './e2e-utils.js';

test.describe('Gist Loading', () => {
  // category: core
  test('load session from gist ID via URL parameter', async ({ page }) => {
    const claudeContent = await readFixture('claude-simple.jsonl');

    // Mock the GitHub Gist API
    await page.route('**/api.github.com/gists/*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'mock-gist-123',
          html_url: 'https://gist.github.com/user/mock-gist-123',
          owner: { login: 'testuser' },
          description: 'Test gist',
          files: {
            'claude-session.jsonl': {
              filename: 'claude-session.jsonl',
              size: claudeContent.length,
              truncated: false,
              raw_url: 'https://gist.githubusercontent.com/raw/mock',
              content: claudeContent,
            },
          },
        }),
      });
    });

    // Navigate with gist parameter
    await page.goto('/?gist=mock-gist-123');
    await page.waitForLoadState('networkidle');

    // Wait for the gist to load and session to appear
    // The app should fetch, parse, and display the gist content
    await page.waitForTimeout(3000);

    // Verify the session was loaded (content should be visible)
    const pageText = await page.textContent('body');
    expect(pageText?.toLowerCase()).toContain('claude');
  });

  // category: error
  test('gist loading shows error for invalid gist ID', async ({ page }) => {
    // Mock the GitHub API to return 404
    await page.route('**/api.github.com/gists/*', async route => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Not Found' }),
      });
    });

    await page.goto('/?gist=nonexistent');
    await page.waitForLoadState('networkidle');

    // Wait for error to display
    await page.waitForTimeout(3000);

    // Verify an error message is displayed
    const pageText = await page.textContent('body');
    const hasError =
      pageText?.toLowerCase().includes('error') ||
      pageText?.toLowerCase().includes('not found') ||
      pageText?.toLowerCase().includes('failed');
    expect(hasError).toBe(true);
  });

  // category: core
  // skip: requires-real-gist
  test.skip('gist loading with real GitHub API', async ({ page: _page }) => {
    // Skip reason: requires-real-gist
    // This test would load a known public gist and verify
    // content renders correctly. Requires network access.
  });
});

// ⚠️ AUTO-GENERATED — DO NOT EDIT
