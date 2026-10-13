import { vi, expect } from 'vitest'
import { within, userEvent } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import CompletedButton from './CompletedButton.vue'

const state = {
  isOpen: ref(false),
  completedTasks: ref<unknown[]>([]),
  completedCount: ref(0),
  open: vi.fn(),
  close: vi.fn(),
  uncomplete: vi.fn(),
  openTask: vi.fn(),
}

vi.mock('../composables/useCompletedPanel', () => ({
  useCompletedPanel: () => state,
}))

const meta: Meta<typeof CompletedButton> = {
  title: 'Components/CompletedButton',
  component: CompletedButton,
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
