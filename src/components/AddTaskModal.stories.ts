import { vi, expect } from 'vitest'
import { within, userEvent, waitFor } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import AddTaskModal from './AddTaskModal.vue'

type SubTask = { id: number; text: string }

const state = {
  isOpen: ref(false),
  isConfirmOpen: ref(false),
  taskName: ref(''),
  nowNextLater: ref<'now' | 'next' | 'later'>('now'),
  description: ref(''),
  energyLevel: ref<'low' | 'medium' | 'high' | null>(null),
  estimateDays: ref(''),
  estimateHours: ref(''),
  estimateMinutes: ref(''),
  availableFrom: ref(''),
  dueBy: ref(''),
  subTasks: ref<SubTask[]>([]),
  isSubTaskInputOpen: ref(false),
  subTaskDraft: ref(''),
  taskNameInvalid: ref(false),
  dueByInvalid: ref(false),
  canSaveSubTaskDraft: ref(false),
  openModal: vi.fn(),
  requestClose: vi.fn(),
  confirmDiscard: vi.fn(),
  cancelDiscard: vi.fn(),
  selectSection: vi.fn(),
  selectEnergyLevel: vi.fn(),
  openSubTaskInput: vi.fn(),
  closeSubTaskInput: vi.fn(),
  saveSubTaskDraft: vi.fn(),
  removeSubTask: vi.fn(),
  setEstimateField: vi.fn(),
  save: vi.fn(),
}

vi.mock('../composables/useAddTaskModal', () => ({
  useAddTaskModal: () => state,
}))

// AddTaskModal.vue imports SECTION_DEFS/ENERGY_LEVEL_OPTIONS as static constants (not via
// the composable functions), same as tests/unit/add-task-modal/components.test.ts's mocks.
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
  state.isOpen.value = false
  state.isConfirmOpen.value = false
  state.taskName.value = ''
  state.nowNextLater.value = 'now'
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
  state.taskNameInvalid.value = false
  state.dueByInvalid.value = false
  state.canSaveSubTaskDraft.value = false
  state.openModal.mockReset()
  state.requestClose.mockReset()
  state.confirmDiscard.mockReset()
  state.cancelDiscard.mockReset()
  state.selectSection.mockReset()
  state.selectEnergyLevel.mockReset()
  state.openSubTaskInput.mockReset()
  state.closeSubTaskInput.mockReset()
  state.saveSubTaskDraft.mockReset()
  state.removeSubTask.mockReset()
  state.setEstimateField.mockReset()
  state.save.mockReset()
}

const meta: Meta<typeof AddTaskModal> = {
  title: 'Components/AddTaskModal',
  component: AddTaskModal,
}
export default meta
type Story = StoryObj<typeof AddTaskModal>

// §6.1: the Open story carries every close-wiring, section/energy-level-selection, estimate-field,
// and Save interaction, reproducing tests/unit/add-task-modal/components.test.ts's removed
// "calls requestClose when the X button is clicked", "calls requestClose on Escape", and
// "calls requestClose on a backdrop click, but not on a click inside the dialog content".
export const Open: Story = {
  beforeEach: () => {
    resetState()
    state.isOpen.value = true
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Bonus (§6.1): initial-open focus on first mount, extra confidence only — does not
    // replace tests/unit/add-task-modal/components.test.ts's own "initial-open focus" case.
    const taskNameInput = canvas.getByLabelText('Task name')
    await waitFor(() => expect(document.activeElement).toBe(taskNameInput))

    // close wiring: content click does not requestClose; backdrop click does.
    await userEvent.click(canvasElement.querySelector('.add-task-content')!)
    expect(state.requestClose).not.toHaveBeenCalled()

    await userEvent.click(canvasElement.querySelector('.add-task-overlay')!)
    expect(state.requestClose).toHaveBeenCalledTimes(1)
    state.requestClose.mockClear()

    // close wiring: X button.
    await userEvent.click(canvas.getByRole('button', { name: 'Close' }))
    expect(state.requestClose).toHaveBeenCalledTimes(1)
    state.requestClose.mockClear()

    // close wiring: Escape.
    canvasElement
      .querySelector('.add-task-overlay')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(state.requestClose).toHaveBeenCalledTimes(1)

    // Now/Next/Later.
    await userEvent.click(canvas.getByRole('button', { name: 'Next' }))
    expect(state.selectSection).toHaveBeenCalledWith('next')

    // Energy level.
    await userEvent.click(canvas.getByRole('button', { name: 'High' }))
    expect(state.selectEnergyLevel).toHaveBeenCalledWith('high')

    // Estimate fields.
    await userEvent.type(canvas.getByLabelText('Days'), '5')
    expect(state.setEstimateField).toHaveBeenCalledWith('days', '5')

    await userEvent.type(canvas.getByLabelText('Hrs'), '3')
    expect(state.setEstimateField).toHaveBeenCalledWith('hours', '3')

    await userEvent.type(canvas.getByLabelText('Min'), '9')
    expect(state.setEstimateField).toHaveBeenCalledWith('minutes', '9')

    // Save.
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }))
    expect(state.save).toHaveBeenCalledTimes(1)
  },
}

// Requirement 4: reproduces tests/unit/add-task-modal/components.test.ts's removed
// "sub-task Save button calls saveSubTaskDraft when enabled".
export const SubTaskInputOpen: Story = {
  beforeEach: () => {
    resetState()
    state.isOpen.value = true
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

// Requirement 4: reproduces tests/unit/add-task-modal/components.test.ts's removed
// "deleting a sub-task calls removeSubTask with its id, and names which task it removes"
// (the interaction portion — the accessible-naming assertion itself is kept unit-side, §8).
export const PopulatedSubTasks: Story = {
  beforeEach: () => {
    resetState()
    state.isOpen.value = true
    state.subTasks.value = [{ id: 7, text: 'Buy eggs' }]
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Delete sub-task: Buy eggs' }))
    expect(state.removeSubTask).toHaveBeenCalledWith(7)
  },
}

// No new interaction (§6.1) — exists purely to give the a11y scan (Req 5) and Storybook docs a
// distinct DOM state, matching tests/unit/add-task-modal/components.test.ts's jest-axe enumeration.
export const TaskNameError: Story = {
  beforeEach: () => {
    resetState()
    state.isOpen.value = true
    state.taskNameInvalid.value = true
  },
}

export const DueByError: Story = {
  beforeEach: () => {
    resetState()
    state.isOpen.value = true
    state.dueByInvalid.value = true
  },
}
