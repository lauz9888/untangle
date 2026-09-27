import type { StorybookConfig } from '@storybook/vue3-vite'

const config: StorybookConfig = {
  stories: ['../src/components/**/*.stories.ts'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-vitest'],
  framework: { name: '@storybook/vue3-vite', options: {} },
  viteFinal: async (viteConfig) => {
    // Extension point for Requirement 1's "reuse vite.config.ts's
    // resolvable aliases/plugins" — vite.config.ts has no resolve.alias
    // today, so there is nothing to merge in yet. Deliberately does NOT
    // pull in VitePWA() (service-worker/manifest generation has no
    // bearing on an isolated component story and would just add
    // build/runtime noise); if vite.config.ts ever gains a resolve.alias
    // or non-PWA plugin, merge it into viteConfig.resolve/plugins here.
    return viteConfig
  },
}

export default config
