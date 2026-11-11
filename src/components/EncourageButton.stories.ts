import { fn, expect, mocked, userEvent, within } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import EncourageButton from './EncourageButton.vue'
import { useEnergyLevel } from '../composables/useEnergyLevel'

const state = {
  selectedLevel: ref<'low' | 'medium' | 'high' | null>(null),
  toastMessage: ref<string | null>(null),
  toastId: ref(0),
  selectLevel: fn(),
  dismissToast: fn(),
  encourageMe: fn(),
  toughLove: fn(),
}

const meta: Meta<typeof EncourageButton> = {
  title: 'Components/EncourageButton',
  component: EncourageButton,
  beforeEach: () => {
    mocked(useEnergyLevel).mockReturnValue(state as unknown as ReturnType<typeof useEnergyLevel>)
  },
}
export default meta
type Story = StoryObj<typeof EncourageButton>

// Requirement 4: reproduces tests/unit/energy-level/components.test.ts's removed
// "calls encourageMe when clicked".
export const Default: Story = {
  beforeEach: () => {
    state.encourageMe.mockReset()
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Encourage me' }))
    expect(state.encourageMe).toHaveBeenCalled()
  },
}

// Mobile header single-row change, req 14: a visible 2px focus ring at <=640px.
// The rule is media-scoped, so resize the real browser viewport first.
export const MobileFocusRing: Story = {
  globals: { viewport: { value: 'untangleMobile', isRotated: false } },
  play: async ({ canvasElement }) => {
    expect(window.matchMedia('(max-width: 640px)').matches).toBe(true)
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button', { name: 'Encourage me' })
    await userEvent.tab()
    expect(document.activeElement).toBe(button)
    const style = getComputedStyle(button)
    expect(style.outlineStyle).not.toBe('none')
    expect(style.outlineWidth).toBe('2px')
  },
}
