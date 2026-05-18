import { defineConfig } from '@playwright/test'

// Use 5174 in worktrees to avoid conflicting with the main project's server on 5173.
const port = process.env.PORT || 5174

export default defineConfig({
  testDir: './tests/e2e',
  workers: 4,
  use: {
    baseURL: `http://localhost:${port}`,
  },
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      // All user-journey tests. Run with: playwright test --project=functional
      name: 'functional',
      testIgnore: '**/accessibility.spec.js',
    },
    {
      // Axe-core accessibility checks. Run with: playwright test --project=accessibility
      name: 'accessibility',
      testMatch: '**/accessibility.spec.js',
    },
  ],
})
