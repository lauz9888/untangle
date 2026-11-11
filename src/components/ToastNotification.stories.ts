import { fn, expect, mocked, userEvent, within } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import ToastNotification from './ToastNotification.vue'
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

const meta: Meta<typeof ToastNotification> = {
  title: 'Components/ToastNotification',
  component: ToastNotification,
  beforeEach: () => {
    mocked(useEnergyLevel).mockReturnValue(state as unknown as ReturnType<typeof useEnergyLevel>)
  },
}
export default meta
type Story = StoryObj<typeof ToastNotification>

export const Hidden: Story = {
  beforeEach: () => {
    state.toastMessage.value = null
    state.toastId.value = 0
    state.dismissToast.mockReset()
  },
}

// Requirement 4: reproduces tests/unit/energy-level/components.test.ts's removed
// "calls dismissToast when the close button is clicked".
export const Visible: Story = {
  beforeEach: () => {
    state.toastMessage.value = "You're doing just fine at this pace."
    state.toastId.value = 1
    state.dismissToast.mockReset()
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Dismiss' }))
    expect(state.dismissToast).toHaveBeenCalled()
  },
}
