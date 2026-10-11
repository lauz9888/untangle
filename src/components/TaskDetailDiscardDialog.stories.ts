import { vi, expect } from 'vitest'
import { within, userEvent } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import TaskDetailDiscardDialog from './TaskDetailDiscardDialog.vue'

const state = {
  isDiscardConfirmOpen: ref(false),
  confirmDiscard: vi.fn(),
  cancelDiscard: vi.fn(),
}

vi.mock('../composables/useTaskDetail', () => ({
  useTaskDetail: () => state,
}))

const meta: Meta<typeof TaskDetailDiscardDialog> = {
  title: 'Components/TaskDetailDiscardDialog',
  component: TaskDetailDiscardDialog,
}
export default meta
type Story = StoryObj<typeof TaskDetailDiscardDialog>

// Reproduces tests/unit/task-detail/components.test.ts's "No calls cancelDiscard and Yes calls
// confirmDiscard" case at the same single-action grain, same either/one-play-or-two-stories
// allowance as CloseConfirmDialog.stories.ts.
export const Open: Story = {
  beforeEach: () => {
    state.isDiscardConfirmOpen.value = true
    state.confirmDiscard.mockReset()
    state.cancelDiscard.mockReset()
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: 'No' }))
    expect(state.cancelDiscard).toHaveBeenCalledTimes(1)

    await userEvent.click(canvas.getByRole('button', { name: 'Yes' }))
    expect(state.confirmDiscard).toHaveBeenCalledTimes(1)
  },
}
