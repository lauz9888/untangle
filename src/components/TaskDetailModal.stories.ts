import { vi, expect } from 'vitest'
import { within, userEvent, waitFor } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import TaskDetailModal from './TaskDetailModal.vue'

type DraftSubTask = { id: number; text: string; isNew: boolean }
type StoredSubTask = { id: number; text: string; done: boolean }
type StoredTask = {
  id: number
  name: string
  section: 'now' | 'next' | 'later'
  description: string
  energyLevel: 'low' | 'medium' | 'high' | null
  estimate: { days: number; hours: number; minutes: number }
  availableFrom: string | null
  dueBy: string | null
  subTasks: StoredSubTask[]
  done: boolean
  createdAt: number
  updatedAt: number
}

function makeStoredTask(overrides: Partial<StoredTask> = {}): StoredTask {
  return {
    id: 1,
    name: 'Buy milk',
    section: 'now',
    description: '',
    energyLevel: null,
    estimate: { days: 0, hours: 0, minutes: 0 },
    availableFrom: null,
    dueBy: null,
    subTasks: [],
    done: false,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

const state = {
  selectedTaskId: ref<number | null>(1),
  isOpen: ref(true),
  lastOpenedTaskId: ref<number | null>(1),
  lastOpenedTaskSection: ref<'now' | 'next' | 'later' | null>('now'),
  isDiscardConfirmOpen: ref(false),
  isDeleteConfirmOpen: ref(false),
  name: ref('Buy milk'),
  section: ref<'now' | 'next' | 'later'>('now'),
  description: ref(''),
  energyLevel: ref<'low' | 'medium' | 'high' | null>(null),
  estimateDays: ref(''),
  estimateHours: ref(''),
  estimateMinutes: ref(''),
  availableFrom: ref(''),
  dueBy: ref(''),
  subTasks: ref<DraftSubTask[]>([]),
  isSubTaskInputOpen: ref(false),
  subTaskDraft: ref(''),
  nameInvalid: ref(false),
  storedTask: ref<StoredTask | null>(makeStoredTask()),
  dueByInvalid: ref(false),
  canSaveSubTaskDraft: ref(false),
  hasUnsavedChanges: ref(false),
  open: vi.fn(),
  requestClose: vi.fn(),
  close: vi.fn(),
  confirmDiscard: vi.fn(),
  cancelDiscard: vi.fn(),
  requestDelete: vi.fn(),
  confirmDelete: vi.fn(),
  cancelDelete: vi.fn(),
  toggleDone: vi.fn(),
  toggleSubTaskDoneInView: vi.fn(),
  selectSection: vi.fn(),
  selectEnergyLevel: vi.fn(),
  setEstimateField: vi.fn(),
  openSubTaskInput: vi.fn(),
  closeSubTaskInput: vi.fn(),
  removeSubTask: vi.fn(),
  saveSubTaskDraft: vi.fn(),
  save: vi.fn(),
}

vi.mock('../composables/useTaskDetail', () => ({
  useTaskDetail: () => state,
}))

// TaskDetailModal.vue imports SECTION_DEFS/ENERGY_LEVEL_OPTIONS as static constants (not via
// the composable functions), same as tests/unit/task-detail/components.test.ts's mocks and
// AddTaskModal.stories.ts's precedent.
vi.mock('../composables/useSectionCollapse', () => ({
  useSectionCollapse: () => ({ expanded: { now: true, next: true, later: true }, toggle: vi.fn() }),
  SECTION_DEFS: [
    { key: 'now', label: 'Now' },
    { key: 'next', label: 'Next' },
    { key: 'later', label: 'Later' },
  ],
}))

vi.mock('../composables/useEnergyLevel', () => ({
  useEnergyLevel: () => ({
    selectedLevel: ref(null),
    toastMessage: ref(null),
    toastId: ref(0),
    selectLevel: vi.fn(),
    dismissToast: vi.fn(),
    encourageMe: vi.fn(),
    toughLove: vi.fn(),
  }),
  ENERGY_LEVEL_OPTIONS: [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ],
}))

function resetState() {
  state.selectedTaskId.value = 1
  state.isOpen.value = true
  state.lastOpenedTaskId.value = 1
  state.lastOpenedTaskSection.value = 'now'
  state.isDiscardConfirmOpen.value = false
  state.isDeleteConfirmOpen.value = false
  state.name.value = 'Buy milk'
  state.section.value = 'now'
  state.description.value = ''
  state.energyLevel.value = null
  state.estimateDays.value = ''
  state.estimateHours.value = ''
  state.estimateMinutes.value = ''
  state.availableFrom.value = ''
  state.dueBy.value = ''
  state.subTasks.value = []
  state.isSubTaskInputOpen.value = false
  state.subTaskDraft.value = ''
  state.nameInvalid.value = false
  state.storedTask.value = makeStoredTask()
  state.dueByInvalid.value = false
  state.canSaveSubTaskDraft.value = false
  state.hasUnsavedChanges.value = false
  state.open.mockReset()
  state.requestClose.mockReset()
  state.close.mockReset()
  state.confirmDiscard.mockReset()
  state.cancelDiscard.mockReset()
  state.requestDelete.mockReset()
  state.confirmDelete.mockReset()
  state.cancelDelete.mockReset()
  state.toggleDone.mockReset()
  state.toggleSubTaskDoneInView.mockReset()
  state.selectSection.mockReset()
  state.selectEnergyLevel.mockReset()
  state.setEstimateField.mockReset()
  state.openSubTaskInput.mockReset()
  state.closeSubTaskInput.mockReset()
  state.removeSubTask.mockReset()
  state.saveSubTaskDraft.mockReset()
  state.save.mockReset()
}

const meta: Meta<typeof TaskDetailModal> = {
  title: 'Components/TaskDetailModal',
  component: TaskDetailModal,
}
export default meta
type Story = StoryObj<typeof TaskDetailModal>

// Reproduces tests/unit/task-detail/components.test.ts's close-wiring, section/energy-level,
// estimate, done-checkbox, Save, and Delete interaction cases at the same single-action grain.
export const Open: Story = {
  beforeEach: () => {
    resetState()
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const nameInput = canvas.getByLabelText('Task name')
    await waitFor(() => expect(document.activeElement).toBe(nameInput))

    // close wiring: content click does not requestClose; backdrop click does.
    await userEvent.click(canvasElement.querySelector('.task-detail-content')!)
    expect(state.requestClose).not.toHaveBeenCalled()

    await userEvent.click(canvasElement.querySelector('.task-detail-overlay')!)
    expect(state.requestClose).toHaveBeenCalledTimes(1)
    state.requestClose.mockClear()

    // close wiring: X button.
    await userEvent.click(canvas.getByRole('button', { name: 'Close' }))
    expect(state.requestClose).toHaveBeenCalledTimes(1)
    state.requestClose.mockClear()

    // close wiring: Escape.
    canvasElement
      .querySelector('.task-detail-overlay')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(state.requestClose).toHaveBeenCalledTimes(1)

    // Now/Next/Later.
    await userEvent.click(canvas.getByRole('button', { name: 'Next' }))
    expect(state.selectSection).toHaveBeenCalledWith('next')

    // Energy level.
    await userEvent.click(canvas.getByRole('button', { name: 'High' }))
    expect(state.selectEnergyLevel).toHaveBeenCalledWith('high')

    // Estimate fields.
    await userEvent.type(canvas.getByLabelText('Days'), '2')
    expect(state.setEstimateField).toHaveBeenCalledWith('days', '2')

    await userEvent.type(canvas.getByLabelText('Hrs'), '3')
    expect(state.setEstimateField).toHaveBeenCalledWith('hours', '3')

    await userEvent.type(canvas.getByLabelText('Min'), '15')
    expect(state.setEstimateField).toHaveBeenCalledWith('minutes', '15')

    // Done checkbox.
    await userEvent.click(canvas.getByLabelText('Mark as done'))
    expect(state.toggleDone).toHaveBeenCalledTimes(1)

    // Save.
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }))
    expect(state.save).toHaveBeenCalledTimes(1)

    // Delete.
    await userEvent.click(canvas.getByRole('button', { name: 'Delete task' }))
    expect(state.requestDelete).toHaveBeenCalledTimes(1)
  },
}

export const SubTaskInputOpen: Story = {
  beforeEach: () => {
    resetState()
    state.isSubTaskInputOpen.value = true
    state.canSaveSubTaskDraft.value = true
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: 'Add sub-task' }))
    expect(state.openSubTaskInput).toHaveBeenCalledTimes(1)

    const saveButtons = canvas.getAllByRole('button', { name: 'Save' })
    await userEvent.click(saveButtons[0]!)
    expect(state.saveSubTaskDraft).toHaveBeenCalledTimes(1)

    await userEvent.click(canvas.getByRole('button', { name: 'Close sub-task text' }))
    expect(state.closeSubTaskInput).toHaveBeenCalledTimes(1)
    expect(state.requestClose).not.toHaveBeenCalled()
  },
}

// Requirements 4/13: an existing sub-task's done checkbox click calls toggleSubTaskDoneInView with
// its id; a new/isNew sub-task row has no checkbox at all; with three seeded rows, each text
// input's position-based accessible name is distinct.
export const PopulatedSubTasksWithDoneToggle: Story = {
  beforeEach: () => {
    resetState()
    state.subTasks.value = [
      { id: 1, text: 'Buy eggs', isNew: false },
      { id: 2, text: 'Buy bread', isNew: false },
      { id: 3, text: 'New step', isNew: true },
    ]
    state.storedTask.value = makeStoredTask({
      subTasks: [
        { id: 1, text: 'Buy eggs', done: false },
        { id: 2, text: 'Buy bread', done: true },
      ],
    })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByLabelText("Mark sub-task 'Buy eggs' as done"))
    expect(state.toggleSubTaskDoneInView).toHaveBeenCalledWith(1)

    expect(canvas.queryByLabelText("Mark sub-task 'New step' as done")).toBeNull()

    expect(canvas.getByLabelText('Sub-task 1 text')).toBeTruthy()
    expect(canvas.getByLabelText('Sub-task 2 text')).toBeTruthy()
  },
}

// No interaction — exists purely to give the a11y scan and Storybook docs a distinct DOM state,
// matching tests/unit/task-detail/components.test.ts's jest-axe enumeration.
export const TaskNameError: Story = {
  beforeEach: () => {
    resetState()
    state.nameInvalid.value = true
  },
}

export const DueByError: Story = {
  beforeEach: () => {
    resetState()
    state.dueByInvalid.value = true
  },
}
