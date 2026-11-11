import { fn, expect, mocked, userEvent, within } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import CompletedButton from './CompletedButton.vue'
import { useCompletedPanel } from '../composables/useCompletedPanel'

const state = {
  isOpen: ref(false),
  completedTasks: ref<unknown[]>([]),
  completedCount: ref(0),
  open: fn(),
  close: fn(),
  uncomplete: fn(),
  openTask: fn(),
}

const meta: Meta<typeof CompletedButton> = {
  title: 'Components/CompletedButton',
  component: CompletedButton,
  beforeEach: () => {
    mocked(useCompletedPanel).mockReturnValue(
      state as unknown as ReturnType<typeof useCompletedPanel>
    )
  },
}
export default meta
type Story = StoryObj<typeof CompletedButton>

export const ZeroCount: Story = {
  beforeEach: () => {
    state.isOpen.value = false
    state.completedCount.value = 0
    state.open.mockReset()
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    expect(canvas.getByRole('button', { name: 'Completed (0)' })).toBeTruthy()
  },
}

// Reproduces tests/unit/completed-panel/components.test.ts's "clicking calls open".
export const WithCount: Story = {
  beforeEach: () => {
    state.isOpen.value = false
    state.completedCount.value = 3
    state.open.mockReset()
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Completed (3)' }))
    expect(state.open).toHaveBeenCalledTimes(1)
  },
}

// Mobile header single-row change, req 3/17: widest label ("Completed (999)").
export const LargeCount: Story = {
  beforeEach: () => {
    state.isOpen.value = false
    state.completedCount.value = 999
    state.open.mockReset()
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    expect(canvas.getByRole('button', { name: 'Completed (999)' })).toBeTruthy()
  },
}
