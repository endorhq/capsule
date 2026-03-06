import { execSync } from 'node:child_process';
import { defineConfig } from '@playwright/test';

function findChromium(): string | undefined {
  const envPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  if (envPath) return envPath;
  try {
    return execSync('which chromium', { encoding: 'utf-8' }).trim();
  } catch {
    return undefined;
  }
}

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.test.ts',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:4173',
    headless: true,
  },
  webServer: {
    command:
      'PUBLIC_DISTRIBUTION=public npx vite build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        launchOptions: {
          executablePath: findChromium(),
          args: ['--no-sandbox'],
        },
      },
    },
  ],
});
