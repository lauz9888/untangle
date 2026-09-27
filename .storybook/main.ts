import type { StorybookConfig } from '@storybook/vue3-vite'
import type { PluginOption } from 'vite'
import { mergeConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

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

    return mergeConfig({ ...viteConfig, plugins: filteredPlugins }, { plugins: [vue()] })
  },
}

export default config
