import { defineConfig } from 'vitest/config'
import viteConfig from './vite.config'

// Vitest prefers vitest.config.* over vite.config.*, so this file is the
// single entry point for every plain `vitest` invocation in the repo.
//
// - Normal runs (`npm run test:unit`, `vitest run --coverage`): re-export
//   vite.config.ts unchanged, so the unit layer behaves exactly as before.
//   (`npm run test:storybook` passes `--config vitest.storybook.config.ts`
//   explicitly and never loads this file.)
// - @storybook/addon-vitest's sidebar "Run tests" runner (`npm run
//   storybook`): the addon sets VITEST_STORYBOOK, looks for a
//   vitest.workspace.* / vitest.config.* at the project root, and then asks
//   Vitest for a project named `storybook:<configDir>`. With no such file it
//   falls back to vite.config.ts, which defines no Storybook project, so
//   Vitest throws "Failed to start Vitest" and the dev server aborts the
//   runner. Here we hand it the Storybook project (its name is injected by
//   storybookTest() under VITEST_STORYBOOK) and nothing else.
export default process.env.VITEST_STORYBOOK
  ? defineConfig({ test: { projects: ['./vitest.storybook.config.ts'] } })
  : viteConfig
