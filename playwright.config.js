import { defineConfig } from '@playwright/test'

const port = process.env.PORT || 5173

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: `http://localhost:${port}`,
  },
  webServer: {
    command: 'npm run dev',
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
  },
})
