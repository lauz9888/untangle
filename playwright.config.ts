import { defineConfig, devices } from '@playwright/test'

// Drives both `npm run test:e2e` and, via `globalTeardown` below, the e2e leg
// of `npm run test:coverage:merge` — see scripts/merge-coverage.mjs.
// `globalTeardown` no-ops unless COVERAGE=true, so normal test:e2e runs are
// unaffected. When BASE_URL is set (the CD `e2e-live` job, or the pipeline's
// Step 13 base-path smoke check), the suite runs against that URL instead of
// spinning up a local build+preview server.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'npm run build && npm run preview -- --port 4173',
        url: 'http://localhost:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
  globalTeardown: './tests/e2e/global-teardown.ts',
})
