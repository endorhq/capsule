// ⚠️ AUTO-GENERATED — DO NOT EDIT
// Source: packages/web/E2E_TESTS.md
// Generator: /fp-generate

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export const FIXTURES_DIR = join(__dirname, 'fixtures');

export function fixturePath(name: string): string {
  return join(FIXTURES_DIR, name);
}

export async function readFixture(name: string): Promise<string> {
  return readFile(fixturePath(name), 'utf-8');
}

/**
 * Upload a fixture file via the file input on the page.
 * Looks for the file input element and sets the file.
 */
export async function uploadFixture(
  page: Page,
  fixtureName: string
): Promise<void> {
  const filePath = fixturePath(fixtureName);

  // Try main content area first (UploadZone), fall back to sidebar input
  const mainInput = page.locator('main input[type="file"]');
  const sidebarInput = page.locator('aside input[type="file"]');

  if ((await mainInput.count()) > 0) {
    await mainInput.setInputFiles(filePath);
  } else {
    await sidebarInput.setInputFiles(filePath);
  }
}

/**
 * Wait for a session to appear in the sidebar session list after upload.
 * Looks for the session count indicator changing from [0] to [1+].
 */
export async function waitForSessionInSidebar(page: Page): Promise<void> {
  // Wait for at least one session to appear in the sidebar list
  // The sidebar shows a count like [1] next to "// sessions"
  await page
    .locator('aside')
    .getByRole('button')
    .filter({ hasNotText: /load|clear|open|where|\+|logs/ })
    .first()
    .waitFor({
      state: 'visible',
      timeout: 10_000,
    });
}

/**
 * Wait for the timeline to render entries.
 * Looks for the "// end of session" marker which appears after all entries render.
 */
export async function waitForTimeline(page: Page): Promise<void> {
  await page.locator('main').getByText('// end of session').waitFor({
    state: 'visible',
    timeout: 10_000,
  });
}

// ⚠️ AUTO-GENERATED — DO NOT EDIT
