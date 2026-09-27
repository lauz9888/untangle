import { vi, expect } from 'vitest'
import { within, userEvent } from 'storybook/test'
import { page } from 'vitest/browser'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { reactive, ref } from 'vue'
import NowNextLaterBoard from './NowNextLaterBoard.vue'

interface FakeTask {
  id: number
  name: string
  section: 'now' | 'next' | 'later'
  done: boolean
  createdAt: number
}

const sectionState = {
  expanded: reactive<{ now: boolean; next: boolean; later: boolean }>({
    now: true,
    next: true,
    later: true,
  }),
  toggle: vi.fn(),
}

vi.mock('../composables/useSectionCollapse', () => ({
  useSectionCollapse: () => sectionState,
  SECTION_DEFS: [
    { key: 'now', label: 'Now' },
    { key: 'next', label: 'Next' },
    { key: 'later', label: 'Later' },
  ],
}))

const tasksState = {
  tasks: ref<FakeTask[]>([]),
  toggleTaskDone: vi.fn(),
}

vi.mock('../composables/useTasks', () => ({
  useTasks: () => tasksState,
}))

const meta: Meta<typeof NowNextLaterBoard> = {
  title: 'Components/NowNextLaterBoard',
  component: NowNextLaterBoard,
}
export default meta
type Story = StoryObj<typeof NowNextLaterBoard>

function resetSectionState() {
  sectionState.expanded.now = true
  sectionState.expanded.next = true
  sectionState.expanded.later = true
  sectionState.toggle.mockReset()
}

export const EmptySections: Story = {
  beforeEach: () => {
    resetSectionState()
    tasksState.tasks.value = []
    tasksState.toggleTaskDone.mockReset()
  },
}

// Requirement 4: reproduces tests/unit/now-next-later/components.test.ts's removed
// "clicking/toggling a task's checkbox calls toggleTaskDone(id) with the correct id".
export const OneIncompleteTask: Story = {
  beforeEach: () => {
    resetSectionState()
    tasksState.tasks.value = [
      { id: 7, name: 'Buy milk', section: 'now', done: false, createdAt: 1 },
    ]
    tasksState.toggleTaskDone.mockReset()
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Buy milk' }))
    expect(tasksState.toggleTaskDone).toHaveBeenCalledWith(7)
  },
}

export const OneCompletedTask: Story = {
  beforeEach: () => {
    resetSectionState()
    tasksState.tasks.value = [{ id: 1, name: 'Buy milk', section: 'now', done: true, createdAt: 1 }]
    tasksState.toggleTaskDone.mockReset()
  },
}

// Requirement 4: reproduces tests/unit/now-next-later/components.test.ts's removed
// it.each(...)('clicking the %s toggle button calls toggle with its key', ...) covering
// Now/Next/Later. The section-toggle buttons are only visible/clickable at the <=640px
// breakpoint (CollapsibleSection.vue's desktop-first CSS) — resize the real browser
// viewport before interacting so each click lands on a rendered element.
export const MixedCollapsedExpanded: Story = {
  beforeEach: () => {
    sectionState.expanded.now = false
    sectionState.expanded.next = true
    sectionState.expanded.later = false
    sectionState.toggle.mockReset()
    tasksState.tasks.value = []
    tasksState.toggleTaskDone.mockReset()
  },
  play: async ({ canvasElement }) => {
    await page.viewport(375, 812)
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: 'Expand Now' }))
    expect(sectionState.toggle).toHaveBeenCalledWith('now')

    await userEvent.click(canvas.getByRole('button', { name: 'Collapse Next' }))
    expect(sectionState.toggle).toHaveBeenCalledWith('next')

    await userEvent.click(canvas.getByRole('button', { name: 'Expand Later' }))
    expect(sectionState.toggle).toHaveBeenCalledWith('later')
  },
}
