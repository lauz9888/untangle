import type { StorybookConfig } from '@storybook/vue3-vite'
import type { PluginOption } from 'vite'
import { mergeConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

const config: StorybookConfig = {
  stories: ['../src/components/**/*.stories.ts'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-vitest'],
  framework: { name: '@storybook/vue3-vite', options: {} },
  viteFinal: async (viteConfig) => {
    // Extension point for Requirement 1's "reuse vite.config.ts's
    // resolvable aliases/plugins". @storybook/vue3-vite's own preset does
    // NOT register @vitejs/plugin-vue itself (confirmed against the
    // installed package — it only adds docgen/template-compilation
    // plugins), so the actual .vue SFC compiler plugin has to be merged in
    // here, the same one vite.config.ts registers for the real app build.
    // vite.config.ts has no resolve.alias today, so there is nothing else
    // to merge in yet.
    //
    // `npm run storybook`/`build-storybook` go through
    // @storybook/builder-vite, which (unlike the addon-vitest/Vitest path
    // `npm run test:storybook` uses) auto-discovers and merges the
    // project's own root vite.config.ts into `viteConfig` before this
    // callback ever runs (confirmed against the installed package's
    // `commonConfig` — it calls Vite's own `loadConfigFromFile` on the
    // project root). That silently pulls in vite.config.ts's own plugins
    // too: its `vue()` (a harmless duplicate of the one this file adds
    // below, EXCEPT Vite errors on two separate `vite:vue` plugin
    // instances processing the same .vue file — so the pre-merged one is
    // stripped and replaced by exactly one instance here) and its
    // `VitePWA()` (which then fails this build trying to precache
    // Storybook's own multi-MB manager bundle — service-worker/manifest
    // generation has no bearing on an isolated component story anyway, so
    // it's stripped and never re-added). Under `test:storybook`, none of
    // this auto-merge happens, so there's nothing to strip there and this
    // is a no-op; either way exactly one `vue()` plugin and zero PWA
    // plugins end up applied. If vite.config.ts ever gains a
    // resolve.alias, no extra handling is needed — it flows through
    // unaffected by this filtering (only `vite:vue`/`vite-plugin-pwa*`
    // named plugins are removed).
    const shouldStrip = (plugin: unknown): boolean => {
      const name =
        plugin && typeof plugin === 'object' && 'name' in plugin
          ? (plugin as { name?: unknown }).name
          : undefined
      return typeof name === 'string' && (name === 'vite:vue' || name.startsWith('vite-plugin-pwa'))
    }
    const stripDuplicatedPlugins = (plugins: unknown): PluginOption[] =>
      (Array.isArray(plugins) ? plugins : [plugins])
        .filter((plugin) => plugin != null)
        .flatMap((plugin) => (Array.isArray(plugin) ? stripDuplicatedPlugins(plugin) : plugin))
        .filter((plugin) => !shouldStrip(plugin)) as PluginOption[]

    const filteredPlugins = stripDuplicatedPlugins(viteConfig.plugins ?? [])

    // Bug #141: every `.stories.ts` file imports `vi`/`expect` from 'vitest'
    // (design.md §6's canonical template) — and two files also import `page`
    // from 'vitest/browser' — so the same source works under both this
    // interactive dev/build path and `test:storybook`'s real Vitest process.
    // Under this path alone, resolving the real `vitest` package crashes
    // every story with "Cannot read properties of undefined (reading
    // 'customEqualityTesters')", and resolving the real `vitest/browser`
    // package (a stub that unconditionally throws outside real Vitest
    // browser mode) breaks the entire containing `.stories.ts` module —
    // see .storybook/vitest-interactive-stub.ts and
    // .storybook/vitest-browser-interactive-stub.ts for the full root-cause
    // traces.
    //
    // This `viteFinal` result is NOT exclusive to `npm run storybook`/
    // `npm run build-storybook`: `@storybook/addon-vitest`'s vitest-plugin
    // (used by `vitest.storybook.config.ts`) also calls it and merges the
    // ENTIRE returned config (not just `.plugins` — confirmed against the
    // installed package's `config$1 = mergeConfig(baseConfig,
    // viteConfigFromStorybook)`) into the real Vitest browser-mode config.
    // A first attempt that aliased 'vitest'/'vitest/browser' unconditionally
    // here broke `test:storybook` itself (Vitest's own runtime needs the
    // real packages) — it didn't fail loudly, it hung indefinitely
    // (reproduced: 0 progress for 45+ minutes, vs. a clean ~12s 23/23 pass
    // once this guard was added). `process.env.VITEST` is set to `'true'` by
    // Vitest's own CLI before it resolves plugin config (including this
    // `viteFinal` callback, invoked from inside addon-vitest's Vite plugin),
    // and is never set for the plain `storybook dev`/`storybook build`
    // process — so gating on it keeps `test:storybook` resolving the real
    // `vitest`/`vitest/browser` packages untouched, while still fixing the
    // interactive dev/build crash.
    const isRealVitestProcess = process.env.VITEST === 'true'

    return mergeConfig(
      { ...viteConfig, plugins: filteredPlugins },
      {
        plugins: [vue()],
        ...(isRealVitestProcess
          ? {}
          : {
              resolve: {
                // Array form with anchored regexes, not the plain
                // object-key form: Vite's object-key aliases match by
                // *prefix*, not exact string, so a bare `vitest` key also
                // matches (and, in iteration order, wins over) the
                // `vitest/browser` specifier below — confirmed by
                // reproduction (the object-key form left every
                // `import { page } from 'vitest/browser'` unresolved:
                // "Failed to resolve import 'vitest/browser'"). Anchoring
                // each pattern keeps the two stubs independent regardless
                // of key order.
                alias: [
                  {
                    find: /^vitest$/,
                    replacement: fileURLToPath(
                      new URL('./vitest-interactive-stub.ts', import.meta.url)
                    ),
                  },
                  {
                    find: /^vitest\/browser$/,
                    replacement: fileURLToPath(
                      new URL('./vitest-browser-interactive-stub.ts', import.meta.url)
                    ),
                  },
                ],
              },
            }),
      }
    )
  },
}

export default config
