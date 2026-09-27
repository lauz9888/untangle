import { vi, expect } from 'vitest'
import { within, userEvent } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import AddTaskButton from './AddTaskButton.vue'

const state = {
  isOpen: ref(false),
  openModal: vi.fn(),
}

vi.mock('../composables/useAddTaskModal', () => ({
  useAddTaskModal: () => state,
}))

const meta: Meta<typeof AddTaskButton> = {
  title: 'Components/AddTaskButton',
  component: AddTaskButton,
}
export default meta
type Story = StoryObj<typeof AddTaskButton>

// Requirement 4: reproduces tests/unit/add-task-modal/components.test.ts's removed
// "calls openModal when clicked".
export const Default: Story = {
  beforeEach: () => {
    state.isOpen.value = false
    state.openModal.mockReset()
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Add task' }))
    expect(state.openModal).toHaveBeenCalledTimes(1)
  },
}
