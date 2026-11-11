import { fn, expect, mocked, userEvent, within } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import AddTaskButton from './AddTaskButton.vue'
import { useAddTaskModal } from '../composables/useAddTaskModal'

const state = {
  isOpen: ref(false),
  openModal: fn(),
}

const meta: Meta<typeof AddTaskButton> = {
  title: 'Components/AddTaskButton',
  component: AddTaskButton,
  beforeEach: () => {
    mocked(useAddTaskModal).mockReturnValue(state as unknown as ReturnType<typeof useAddTaskModal>)
  },
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
