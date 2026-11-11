import { fn, expect, mocked, userEvent, within } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { reactive, ref } from 'vue'
import NowNextLaterBoard from './NowNextLaterBoard.vue'
import { useSectionCollapse } from '../composables/useSectionCollapse'
import { useTasks } from '../composables/useTasks'
import { useCelebration } from '../composables/useCelebration'
import { useTaskDetail } from '../composables/useTaskDetail'

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
  toggle: fn(),
}

const tasksState = {
  tasks: ref<FakeTask[]>([]),
  toggleTaskDone: fn(),
}

const celebrationState = {
  toggleTaskDoneWithCelebration: fn(),
  consumeCompletionFocusTarget: fn(),
}

const taskDetailState = {
  isOpen: ref(false),
  lastOpenedTaskId: ref<number | null>(null),
  lastOpenedTaskSection: ref<'now' | 'next' | 'later' | null>(null),
  openedFrom: ref<'board' | 'completed'>('board'),
  open: fn(),
}

const meta: Meta<typeof NowNextLaterBoard> = {
  title: 'Components/NowNextLaterBoard',
  component: NowNextLaterBoard,
  beforeEach: () => {
    mocked(useSectionCollapse).mockReturnValue(
      sectionState as unknown as ReturnType<typeof useSectionCollapse>
    )
    mocked(useTasks).mockReturnValue(tasksState as unknown as ReturnType<typeof useTasks>)
    mocked(useCelebration).mockReturnValue(
      celebrationState as unknown as ReturnType<typeof useCelebration>
    )
    mocked(useTaskDetail).mockReturnValue(
      taskDetailState as unknown as ReturnType<typeof useTaskDetail>
    )
  },
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
    celebrationState.toggleTaskDoneWithCelebration.mockReset()
    celebrationState.consumeCompletionFocusTarget.mockReset()
    celebrationState.consumeCompletionFocusTarget.mockReturnValue(null)
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Buy milk' }))
    expect(celebrationState.toggleTaskDoneWithCelebration).toHaveBeenCalledWith(7)
  },
}

// Requirement 1/15: reproduces tests/unit/now-next-later/components.test.ts's new
// "clicking a task's name button calls the mocked open with that task's id" case.
export const OneIncompleteTaskWithOpenAffordance: Story = {
  beforeEach: () => {
    resetSectionState()
    tasksState.tasks.value = [
      { id: 7, name: 'Buy milk', section: 'now', done: false, createdAt: 1 },
    ]
    tasksState.toggleTaskDone.mockReset()
    taskDetailState.open.mockReset()
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Buy milk' }))
    expect(taskDetailState.open).toHaveBeenCalledWith(7)
  },
}

// Completed tasks leave the board (they live in the Completed panel instead).
export const DoneTasksHidden: Story = {
  beforeEach: () => {
    resetSectionState()
    tasksState.tasks.value = [{ id: 1, name: 'Buy milk', section: 'now', done: true, createdAt: 1 }]
    tasksState.toggleTaskDone.mockReset()
  },
  play: async ({ canvasElement }) => {
    expect(canvasElement.querySelectorAll('.task-item')).toHaveLength(0)
  },
}

// Requirement 4: reproduces tests/unit/now-next-later/components.test.ts's removed
// it.each(...)('clicking the %s toggle button calls toggle with its key', ...) covering
// Now/Next/Later. The section-toggle buttons are only visible/clickable at the <=640px
// breakpoint (CollapsibleSection.vue's desktop-first CSS) — resize the real browser
// viewport before interacting so each click lands on a rendered element.
export const MixedCollapsedExpanded: Story = {
  globals: { viewport: { value: 'untangleMobile', isRotated: false } },
  beforeEach: () => {
    sectionState.expanded.now = false
    sectionState.expanded.next = true
    sectionState.expanded.later = false
    sectionState.toggle.mockReset()
    tasksState.tasks.value = []
    tasksState.toggleTaskDone.mockReset()
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: 'Expand Now' }))
    expect(sectionState.toggle).toHaveBeenCalledWith('now')

    await userEvent.click(canvas.getByRole('button', { name: 'Collapse Next' }))
    expect(sectionState.toggle).toHaveBeenCalledWith('next')

    await userEvent.click(canvas.getByRole('button', { name: 'Expand Later' }))
    expect(sectionState.toggle).toHaveBeenCalledWith('later')
  },
}
