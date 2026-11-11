import { defineConfig, devices } from '@playwright/test'

// Interactive-view health check for Storybook (ADR 0008): loads every story of
// the static build (storybook-static/) in a real browser and fails on any
// render/play error. Set STORYBOOK_URL (e.g. http://localhost:6006) to point it
// at a running `npm run storybook` instead; that skips the local static server.
const PORT = 6017

export default defineConfig({
  testDir: './tests/storybook-interactive',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.STORYBOOK_URL ?? `http://localhost:${PORT}`,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.STORYBOOK_URL
    ? undefined
    : {
        command: `node scripts/serve-static.mjs storybook-static ${PORT}`,
        url: `http://localhost:${PORT}/index.json`,
        reuseExistingServer: false, // never silently adopt a foreign server on the port
        timeout: 30000,
      },
})
