import { defineConfig, type ViteUserConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(async (): Promise<ViteUserConfig> => ({
  base: process.env.GITHUB_PAGES ? '/untangle/' : '/',
  plugins: [
    vue(),
    // Coverage-only (never in normal/CD builds): Istanbul-instrument src/ so
    // the e2e leg of test:coverage:merge can read window.__coverage__. See
    // docs/adr/0007-*.md. Dynamic import keeps the dev dependency out of every
    // other config load.
    ...(process.env.COVERAGE === 'true'
      ? [
          (await import('vite-plugin-istanbul')).default({
            include: 'src/*',
            exclude: ['node_modules', 'tests', '**/*.stories.ts'],
            extension: ['.ts', '.vue'],
            requireEnv: false,
            forceBuildInstrument: true,
          }),
        ]
      : []),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Untangle',
        short_name: 'Untangle',
        description: 'Energy-based task manager',
        theme_color: '#1e1e2e',
        background_color: '#1e1e2e',
        display: 'standalone',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/unit/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['json', 'text-summary', 'html'],
      reportsDirectory: 'coverage/unit',
      include: ['src/**/*.{ts,vue}'],
      // .stories.ts files are co-located under src/components/ (ADR 0004) but
      // belong to the separate Storybook test layer (vitest.storybook.config.ts),
      // not this one — no unit test ever imports them, so without this
      // exclusion v8's include-glob walk reports each one as untouched (0%),
      // needlessly diluting this layer's (and the combined) percentage.
      exclude: ['src/main.ts', 'src/**/*.stories.ts', 'src/**/__mocks__/**'],
    },
  },
}))
