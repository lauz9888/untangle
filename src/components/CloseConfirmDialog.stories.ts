import { vi, expect } from 'vitest'
import { within, userEvent } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import CloseConfirmDialog from './CloseConfirmDialog.vue'

const state = {
  isConfirmOpen: ref(false),
  confirmDiscard: vi.fn(),
  cancelDiscard: vi.fn(),
}

vi.mock('../composables/useAddTaskModal', () => ({
  useAddTaskModal: () => state,
}))

const meta: Meta<typeof CloseConfirmDialog> = {
  title: 'Components/CloseConfirmDialog',
  component: CloseConfirmDialog,
}
export default meta
type Story = StoryObj<typeof CloseConfirmDialog>

// Requirement 4: reproduces tests/unit/add-task-modal/components.test.ts's removed
// "Yes calls confirmDiscard and No calls cancelDiscard" and "calls cancelDiscard on
// Escape" — all three assertions share this one Open story's play function per the
// design's explicit either/one-play-or-two-stories allowance.
export const Open: Story = {
  beforeEach: () => {
    state.isConfirmOpen.value = true
    state.confirmDiscard.mockReset()
    state.cancelDiscard.mockReset()
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: 'Yes' }))
    expect(state.confirmDiscard).toHaveBeenCalledTimes(1)

    await userEvent.click(canvas.getByRole('button', { name: 'No' }))
    expect(state.cancelDiscard).toHaveBeenCalledTimes(1)

    state.cancelDiscard.mockClear()
    await userEvent.keyboard('{Escape}')
    expect(state.cancelDiscard).toHaveBeenCalledTimes(1)
  },
}
