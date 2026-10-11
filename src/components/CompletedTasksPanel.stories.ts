import { vi, expect } from 'vitest'
import { page } from 'vitest/browser'
import { within, userEvent, waitFor } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import CompletedTasksPanel from './CompletedTasksPanel.vue'

interface FakeTask {
  id: number
  name: string
  section: 'now' | 'next' | 'later'
  done: boolean
  createdAt: number
  updatedAt: number
}

function done(id: number, name: string): FakeTask {
  return { id, name, section: 'now', done: true, createdAt: id, updatedAt: id }
}

const panelState = {
  isOpen: ref(true),
  completedTasks: ref<FakeTask[]>([]),
  completedCount: ref(0),
  open: vi.fn(),
  close: vi.fn(),
  uncomplete: vi.fn(),
  openTask: vi.fn(),
}

vi.mock('../composables/useCompletedPanel', () => ({
  useCompletedPanel: () => panelState,
}))

const detailState = {
  isOpen: ref(false),
  openedFrom: ref<'board' | 'completed'>('board'),
  lastOpenedTaskId: ref<number | null>(null),
  lastOpenedTaskSection: ref<'now' | 'next' | 'later' | null>(null),
  open: vi.fn(),
}

vi.mock('../composables/useTaskDetail', () => ({
  useTaskDetail: () => detailState,
}))

function seed(tasks: FakeTask[], taskDetailOpen = false) {
  panelState.isOpen.value = true
  panelState.completedTasks.value = tasks
  panelState.completedCount.value = tasks.length
  panelState.open.mockReset()
  panelState.close.mockReset()
  panelState.uncomplete.mockReset()
  panelState.openTask.mockReset()
  detailState.isOpen.value = taskDetailOpen
  detailState.openedFrom.value = 'board'
  detailState.lastOpenedTaskId.value = null
}

const meta: Meta<typeof CompletedTasksPanel> = {
  title: 'Components/CompletedTasksPanel',
  component: CompletedTasksPanel,
}
export default meta
type Story = StoryObj<typeof CompletedTasksPanel>

export const Empty: Story = {
  beforeEach: () => seed([]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    expect(canvas.getByText('No completed tasks yet')).toBeTruthy()
    const close = canvas.getByRole('button', { name: 'Close' })
    await waitFor(() => expect(document.activeElement).toBe(close))
  },
}

// Reproduces tests/unit/completed-panel/components.test.ts's row-button, checkbox, X, Escape, and
// backdrop interaction cases at the same single-action grain.
export const Populated: Story = {
  beforeEach: () => seed([done(3, 'Third'), done(2, 'Second'), done(1, 'First')]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    expect(canvasElement.querySelectorAll('ul > li')).toHaveLength(3)

    await userEvent.click(canvas.getByRole('button', { name: 'Second' }))
    expect(panelState.openTask).toHaveBeenCalledWith(2)

    await userEvent.click(canvas.getByRole('checkbox', { name: 'First' }))
    expect(panelState.uncomplete).toHaveBeenCalledWith(1)

    await userEvent.click(canvas.getByRole('button', { name: 'Close' }))
    expect(panelState.close).toHaveBeenCalledTimes(1)
    panelState.close.mockClear()

    canvasElement
      .querySelector('.completed-content')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(panelState.close).toHaveBeenCalledTimes(1)
    panelState.close.mockClear()

    await userEvent.click(canvasElement.querySelector('.completed-overlay')!)
    expect(panelState.close).toHaveBeenCalledTimes(1)
  },
}

export const StackedUnderTaskDetail: Story = {
  beforeEach: () => seed([done(2, 'Second'), done(1, 'First')], true),
  play: async ({ canvasElement }) => {
    const overlay = canvasElement.querySelector('.completed-overlay')!
    expect(overlay.hasAttribute('inert')).toBe(true)
    expect(overlay.getAttribute('aria-hidden')).toBe('true')
  },
}

export const MobileLong: Story = {
  beforeEach: () =>
    seed(Array.from({ length: 30 }, (_, i) => done(30 - i, `Completed task number ${30 - i}`))),
  play: async ({ canvasElement }) => {
    await page.viewport(390, 844)
    const content = canvasElement.querySelector('.completed-content') as HTMLElement
    const rect = content.getBoundingClientRect()
    expect(rect.right).toBeLessThanOrEqual(window.innerWidth)
    expect(rect.bottom).toBeLessThanOrEqual(window.innerHeight)
    const close = canvasElement.querySelector('.close-button') as HTMLElement
    expect(close.getBoundingClientRect().height).toBeGreaterThanOrEqual(44)
  },
}
