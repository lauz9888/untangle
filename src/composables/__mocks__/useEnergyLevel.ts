// Test-only manual Storybook mock, consumed solely by the sb.mock redirects in
// .storybook/preview.ts (ADR 0008). Never imported by the app.
import { fn } from 'storybook/test'

// Path is relative to the mocked module (src/composables/), not this file.
// @ts-expect-error -- resolves only after sb.mock inlines this file into src/composables/
export { ENERGY_LEVEL_OPTIONS } from './__mocks__/constants'
export const useEnergyLevel = fn()
