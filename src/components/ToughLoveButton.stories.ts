import { vi, expect } from 'vitest'
import { page } from 'vitest/browser'
import { within, userEvent } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import ToughLoveButton from './ToughLoveButton.vue'

const state = {
  selectedLevel: ref<'low' | 'medium' | 'high' | null>(null),
  toastMessage: ref<string | null>(null),
  toastId: ref(0),
  selectLevel: vi.fn(),
  dismissToast: vi.fn(),
  encourageMe: vi.fn(),
  toughLove: vi.fn(),
}

vi.mock('../composables/useEnergyLevel', () => ({
  useEnergyLevel: () => state,
  ENERGY_LEVEL_OPTIONS: [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ],
}))

const meta: Meta<typeof ToughLoveButton> = {
  title: 'Components/ToughLoveButton',
  component: ToughLoveButton,
}
export default meta
type Story = StoryObj<typeof ToughLoveButton>

// Requirement 4: reproduces tests/unit/energy-level/components.test.ts's removed
// "calls toughLove when clicked".
export const Default: Story = {
  beforeEach: () => {
    state.toughLove.mockReset()
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Tough love' }))
    expect(state.toughLove).toHaveBeenCalled()
  },
}

// Mobile header single-row change, req 14: a visible 2px focus ring at <=640px.
// The rule is media-scoped, so resize the real browser viewport first.
export const MobileFocusRing: Story = {
  play: async ({ canvasElement }) => {
    await page.viewport(375, 812)
    expect(window.matchMedia('(max-width: 640px)').matches).toBe(true)
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button', { name: 'Tough love' })
    await userEvent.tab()
    expect(document.activeElement).toBe(button)
    const style = getComputedStyle(button)
    expect(style.outlineStyle).not.toBe('none')
    expect(style.outlineWidth).toBe('2px')
  },
}
