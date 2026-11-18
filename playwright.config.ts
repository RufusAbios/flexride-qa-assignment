import { defineConfig } from '@playwright/test';

/**
 * API-only suite: no browser is launched, so no `playwright install` is needed.
 *
 * The target is a shared public demo system, so the suite is deliberately gentle:
 * a single worker, no retries (retries would hide real API defects), ~25 requests per run.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL ?? 'https://restful-booker.herokuapp.com',
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  },
});
