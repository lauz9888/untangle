import { vi, expect } from 'vitest'
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
