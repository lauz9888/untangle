import { vi, expect } from 'vitest'
import { within, userEvent } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import TaskDetailDeleteDialog from './TaskDetailDeleteDialog.vue'

const state = {
  isDeleteConfirmOpen: ref(false),
  confirmDelete: vi.fn(),
  cancelDelete: vi.fn(),
}

vi.mock('../composables/useTaskDetail', () => ({
  useTaskDetail: () => state,
}))

const meta: Meta<typeof TaskDetailDeleteDialog> = {
  title: 'Components/TaskDetailDeleteDialog',
  component: TaskDetailDeleteDialog,
}
export default meta
type Story = StoryObj<typeof TaskDetailDeleteDialog>

// Reproduces tests/unit/task-detail/components.test.ts's "No calls cancelDelete and Yes calls
// confirmDelete" case at the same single-action grain.
export const Open: Story = {
  beforeEach: () => {
    state.isDeleteConfirmOpen.value = true
    state.confirmDelete.mockReset()
    state.cancelDelete.mockReset()
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: 'No' }))
    expect(state.cancelDelete).toHaveBeenCalledTimes(1)

    await userEvent.click(canvas.getByRole('button', { name: 'Yes' }))
    expect(state.confirmDelete).toHaveBeenCalledTimes(1)
  },
}
