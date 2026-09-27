import { defineConfig } from 'vitest/config'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  plugins: [storybookTest({ configDir: '.storybook' })],
  test: {
    name: 'storybook',
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
    setupFiles: ['./.storybook/vitest.setup.ts'],
    // Story discovery is delegated entirely to .storybook/main.ts's `stories`
    // glob (identical pattern) — Storybook 9's addon-vitest plugin ignores
    // (and warns on) a `test.include` override here, so it's intentionally
    // not set to avoid dead, misleading config.
    coverage: {
      provider: 'v8',
      reporter: ['json', 'text-summary'],
      reportsDirectory: 'coverage/storybook',
      include: ['src/**/*.{ts,vue}'],
      // Unlike the unit layer (whose test files live under tests/unit/, never
      // overlapping this include glob), ADR 0004 co-locates .stories.ts next
      // to the component it documents, inside src/components/ — so without
      // this exclusion, each story file's own module-body statements (mock
      // setup, story objects) get swept in as "source" and instrumented, but
      // no test ever covers a story file's own code, so they report as 0%
      // and needlessly dilute the combined percentage.
      exclude: ['src/main.ts', 'src/**/*.stories.ts'],
    },
  },
})
