// Drift guard for the Storybook manual mocks (design.md section 9 / ADR 0007).
// Composable-style only: there is no component in this feature, so there is no
// components.test.ts counterpart. Imports ONLY the storybook-free constants
// file (never the __mocks__/useX.ts redirect files, which load `storybook/test`).
import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockConstantsPath = '../../../src/composables/__mocks__/constants'

describe('Storybook __mocks__ constants stay in sync with the real composables', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('ENERGY_LEVEL_OPTIONS matches the real useEnergyLevel export', async () => {
    const mocked = await import(mockConstantsPath)
    const real = await import('../../../src/composables/useEnergyLevel')
    expect(mocked.ENERGY_LEVEL_OPTIONS).toEqual(real.ENERGY_LEVEL_OPTIONS)
  })

  it('SECTION_DEFS matches the real useSectionCollapse export', async () => {
    const mocked = await import(mockConstantsPath)
    const real = await import('../../../src/composables/useSectionCollapse')
    expect(mocked.SECTION_DEFS).toEqual(real.SECTION_DEFS)
  })
})
