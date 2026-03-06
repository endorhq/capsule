import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';

export const FIXTURES_DIR = resolve(import.meta.dirname, 'fixtures');

export function fixturePath(name: string): string {
  return resolve(FIXTURES_DIR, name);
}

export function fixtureContent(name: string): string {
  return readFileSync(fixturePath(name), 'utf-8');
}

/**
 * Upload a fixture file via the file input in the upload zone.
 * Since we can't easily trigger the native file picker, we set files
 * on the hidden input element directly.
 */
export async function uploadFixture(
  page: Page,
  filename: string
): Promise<void> {
  const filePath = fixturePath(filename);
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(filePath);
}

/**
 * Wait for a session to appear in the sidebar list.
 */
export async function waitForSessionInSidebar(
  page: Page,
  nameSubstring?: string
): Promise<void> {
  if (nameSubstring) {
    await page
      .locator('aside')
      .getByText(nameSubstring, { exact: false })
      .first()
      .waitFor();
  } else {
    // Wait for any session item to appear (look for "steps" text which every session item has)
    await page.locator('aside button:has-text("steps")').first().waitFor();
  }
}

/**
 * Wait for the timeline to render entries.
 */
export async function waitForTimeline(page: Page): Promise<void> {
  // Wait for either a user message or agent message label to appear
  await page
    .locator('main')
    .locator('text=/user|agent/')
    .first()
    .waitFor({ timeout: 10_000 });
}

/**
 * Load a sample session by clicking the sample button.
 */
export async function loadSample(
  page: Page,
  name: 'Claude Code' | 'Codex'
): Promise<void> {
  await page.getByRole('button', { name }).click();
  await waitForSessionInSidebar(page);
  await waitForTimeline(page);
}
