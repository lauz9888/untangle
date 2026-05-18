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
    reuseExistingServer: false,
  },
})
