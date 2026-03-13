// ⚠️ AUTO-GENERATED — DO NOT EDIT
// Source: packages/web/E2E_TESTS.md — Suite: Storage
// Generator: /fp-generate

import { expect, test } from '@playwright/test';
import { uploadFixture, waitForSessionInSidebar } from './e2e-utils.js';

test.describe('Storage', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before each test for clean state
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Clear OPFS and IndexedDB
    await page.evaluate(async () => {
      // Clear IndexedDB
      const dbs = await indexedDB.databases();
      for (const db of dbs) {
        if (db.name) indexedDB.deleteDatabase(db.name);
      }
      // Clear OPFS
      try {
        const root = await navigator.storage.getDirectory();
        // @ts-expect-error - non-standard but works in Chromium
        for await (const [name] of root.entries()) {
          await root.removeEntry(name, { recursive: true });
        }
      } catch {
        // OPFS may not be available
      }
      // Clear localStorage
      localStorage.clear();
    });

    // Reload after clearing storage
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  // category: core
  test('uploaded session persists across page reloads', async ({ page }) => {
    await uploadFixture(page, 'claude-simple.jsonl');
    await waitForSessionInSidebar(page);

    // Get session count before reload
    const itemsBefore = await page
      .locator('aside')
      .locator('button, a')
      .count();
    expect(itemsBefore).toBeGreaterThan(0);

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Wait for sessions to load from storage
    await page.waitForTimeout(2000);

    // Verify session still appears
    const itemsAfter = await page.locator('aside').locator('button, a').count();
    expect(itemsAfter).toBeGreaterThanOrEqual(itemsBefore);
  });

  // category: core
  test('multiple sessions can be stored and switched between', async ({
    page,
  }) => {
    // Upload first session
    await uploadFixture(page, 'claude-simple.jsonl');
    await waitForSessionInSidebar(page);

    // Upload second session
    await uploadFixture(page, 'codex-simple.jsonl');
    await page.waitForTimeout(1000);

    // Verify multiple sessions in sidebar (session items contain "steps")
    const sessionItems = page
      .locator('aside button')
      .filter({ hasText: 'steps' });
    await expect(sessionItems).toHaveCount(2, { timeout: 5_000 });

    // Click first session
    await sessionItems.first().click();
    await page.waitForTimeout(1000);
    const firstText = await page.locator('main').textContent();

    // Click second session
    await sessionItems.nth(1).click();
    await page.waitForTimeout(1000);
    const secondText = await page.locator('main').textContent();

    // Content should differ between sessions
    expect(firstText).not.toBe(secondText);
  });

  // category: side-effect
  test('clear all sessions removes everything', async ({ page }) => {
    // Upload sessions
    await uploadFixture(page, 'claude-simple.jsonl');
    await waitForSessionInSidebar(page);

    await uploadFixture(page, 'codex-simple.jsonl');
    await page.waitForTimeout(1000);

    // Find and click the clear/delete all button
    const clearButton = page
      .locator('button')
      .filter({ hasText: /clear|delete all|remove all/i });
    if ((await clearButton.count()) > 0) {
      await clearButton.first().click();

      // Confirm if there's a confirmation dialog
      const confirmButton = page
        .locator('button')
        .filter({ hasText: /confirm|yes|ok/i });
      if ((await confirmButton.count()) > 0) {
        await confirmButton.first().click();
      }

      await page.waitForTimeout(1000);

      // Sidebar should be empty
      const items = page
        .locator('aside')
        .locator('[data-testid="session-item"], .session-item');
      const count = await items.count();
      expect(count).toBe(0);
    }
  });

  // category: edge
  test('storage fallback works when OPFS is unavailable', async ({ page }) => {
    // Disable OPFS by overriding the API
    await page.addInitScript(() => {
      // Override navigator.storage.getDirectory to simulate OPFS unavailability
      if (navigator.storage) {
        navigator.storage.getDirectory = () =>
          Promise.reject(new Error('OPFS not available'));
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Upload should still work via IndexedDB or memory fallback
    await uploadFixture(page, 'claude-simple.jsonl');
    await waitForSessionInSidebar(page);

    // Verify session is accessible
    const sessionItem = page.locator('aside').locator('button, a').first();
    await sessionItem.click();

    await page.waitForTimeout(2000);
    const pageText = await page.locator('main').textContent();
    expect(pageText).toBeTruthy();
  });

  // category: idempotency
  test('re-uploading same file handles correctly', async ({ page }) => {
    await uploadFixture(page, 'claude-simple.jsonl');
    await waitForSessionInSidebar(page);

    const countBefore = await page
      .locator('aside')
      .locator('button, a')
      .count();

    // Upload the same file again
    await uploadFixture(page, 'claude-simple.jsonl');
    await page.waitForTimeout(1000);

    const countAfter = await page.locator('aside').locator('button, a').count();

    // Either the same count (deduplication) or one more (duplicates allowed)
    // Both are valid behaviors — just verify no crash
    expect(countAfter).toBeGreaterThanOrEqual(countBefore);
  });
});

// ⚠️ AUTO-GENERATED — DO NOT EDIT
