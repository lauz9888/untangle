import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import { axe } from 'jest-axe'
import TaskDetailModal from '../../../src/components/TaskDetailModal.vue'
import TaskDetailDiscardDialog from '../../../src/components/TaskDetailDiscardDialog.vue'
import TaskDetailDeleteDialog from '../../../src/components/TaskDetailDeleteDialog.vue'

// toHaveNoViolations matcher is registered globally in vitest.setup.ts.
// Mirrors .claude/STANDARDS.md's WCAG conformance scope.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

// jsdom has no real rendering engine to evaluate color-contrast against;
// that check is covered at the e2e layer (tests/e2e/a11y.spec.ts) instead.
async function expectNoAxeViolations(root: Element) {
  const results = await axe(root, {
    runOnly: { type: 'tag', values: WCAG_TAGS },
    rules: { 'color-contrast': { enabled: false } },
  })
  expect(results).toHaveNoViolations()
}

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
  selectedTaskId: ref<number | null>(null),
  isOpen: ref(false),
  lastOpenedTaskId: ref<number | null>(null),
  lastOpenedTaskSection: ref<'now' | 'next' | 'later' | null>(null),
  isDiscardConfirmOpen: ref(false),
  isDeleteConfirmOpen: ref(false),
  name: ref(''),
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
  storedTask: ref<StoredTask | null>(null),
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

vi.mock('../../../src/composables/useTaskDetail', () => ({
  useTaskDetail: () => state,
}))

vi.mock('../../../src/composables/useSectionCollapse', () => ({
  useSectionCollapse: () => ({ expanded: { now: true, next: true, later: true }, toggle: vi.fn() }),
  SECTION_DEFS: [
    { key: 'now', label: 'Now' },
    { key: 'next', label: 'Next' },
    { key: 'later', label: 'Later' },
  ],
}))

vi.mock('../../../src/composables/useEnergyLevel', () => ({
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

let mountedWrappers: VueWrapper[] = []

function mountTracked(component: Parameters<typeof mount>[0]) {
  const wrapper = mount(component, { attachTo: document.body })
  mountedWrappers.push(wrapper)
  return wrapper
}

function findGroupByButtonTexts(wrapper: VueWrapper, texts: string[]) {
  return wrapper.findAll('[role="group"]').find((group) => {
    const buttonTexts = group.findAll('button').map((button) => button.text().trim())
    return JSON.stringify(buttonTexts) === JSON.stringify(texts)
  })
}

beforeEach(() => {
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
})

afterEach(() => {
  mountedWrappers.forEach((wrapper) => wrapper.unmount())
  mountedWrappers = []
})

describe('TaskDetailModal', () => {
  it('exposes role=dialog, aria-modal, and aria-labelledby pointing to "Edit Task"', () => {
    const wrapper = mountTracked(TaskDetailModal)

    const dialog = wrapper.find('[role="dialog"]')
    expect(dialog.exists()).toBe(true)
    expect(dialog.attributes('aria-modal')).toBe('true')
    const labelledbyId = dialog.attributes('aria-labelledby')
    expect(labelledbyId).toBeTruthy()
    expect(wrapper.find(`#${labelledbyId}`).text()).toBe('Edit Task')
  })

  it('moves focus to the Task name input on initial mount', async () => {
    const wrapper = mountTracked(TaskDetailModal)
    await flushPromises()

    const nameInput = wrapper.find('#task-detail-name')
    expect(document.activeElement).toBe(nameInput.element)
  })

  it('clicking inside the content does not call requestClose; backdrop click, X, and Escape each do', async () => {
    const wrapper = mountTracked(TaskDetailModal)
    await flushPromises()

    await wrapper.find('.task-detail-content').trigger('click')
    expect(state.requestClose).not.toHaveBeenCalled()

    await wrapper.find('.task-detail-overlay').trigger('click')
    expect(state.requestClose).toHaveBeenCalledTimes(1)
    state.requestClose.mockClear()

    await wrapper.find('button[aria-label="Close"]').trigger('click')
    expect(state.requestClose).toHaveBeenCalledTimes(1)
    state.requestClose.mockClear()

    wrapper
      .find('.task-detail-overlay')
      .element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    expect(state.requestClose).toHaveBeenCalledTimes(1)
  })

  it('clicking each section option button calls selectSection with the right key', async () => {
    const wrapper = mountTracked(TaskDetailModal)
    const group = findGroupByButtonTexts(wrapper, ['Now', 'Next', 'Later'])
    expect(group).toBeTruthy()

    await group!.findAll('button')[1]!.trigger('click')
    expect(state.selectSection).toHaveBeenCalledWith('next')
  })

  it('clicking each energy-level option button calls selectEnergyLevel with the right value', async () => {
    const wrapper = mountTracked(TaskDetailModal)
    const group = findGroupByButtonTexts(wrapper, ['Low', 'Medium', 'High'])
    expect(group).toBeTruthy()

    await group!.findAll('button')[2]!.trigger('click')
    expect(state.selectEnergyLevel).toHaveBeenCalledWith('high')
  })

  it('typing in each estimate field calls setEstimateField with the right field/value', async () => {
    const wrapper = mountTracked(TaskDetailModal)

    await wrapper.find('#task-detail-estimate-days').setValue('2')
    expect(state.setEstimateField).toHaveBeenCalledWith('days', '2')

    await wrapper.find('#task-detail-estimate-hours').setValue('3')
    expect(state.setEstimateField).toHaveBeenCalledWith('hours', '3')

    await wrapper.find('#task-detail-estimate-minutes').setValue('15')
    expect(state.setEstimateField).toHaveBeenCalledWith('minutes', '15')
  })

  it('clicking the done checkbox calls toggleDone', async () => {
    const wrapper = mountTracked(TaskDetailModal)

    await wrapper.find('#task-detail-done').trigger('change')

    expect(state.toggleDone).toHaveBeenCalledTimes(1)
  })

  it('the done checkbox reflects storedTask.done', () => {
    state.storedTask.value = makeStoredTask({ done: true })
    const wrapper = mountTracked(TaskDetailModal)

    expect((wrapper.find('#task-detail-done').element as HTMLInputElement).checked).toBe(true)
  })

  describe('sub-task rows', () => {
    beforeEach(() => {
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
    })

    it("clicking an existing sub-task's done checkbox calls toggleSubTaskDoneInView with its id", async () => {
      const wrapper = mountTracked(TaskDetailModal)

      const checkbox = wrapper.find('[aria-label="Mark sub-task \'Buy eggs\' as done"]')
      expect(checkbox.exists()).toBe(true)
      await checkbox.trigger('change')

      expect(state.toggleSubTaskDoneInView).toHaveBeenCalledWith(1)
    })

    it('a sub-task row with isNew: true renders no done checkbox at all', () => {
      const wrapper = mountTracked(TaskDetailModal)

      expect(wrapper.find('[aria-label="Mark sub-task \'New step\' as done"]').exists()).toBe(false)
    })

    it("editing a sub-task's text input updates the bound draft value (v-model round-trip)", async () => {
      const wrapper = mountTracked(TaskDetailModal)

      const input = wrapper.find('[aria-label="Sub-task 1 text"]')
      await input.setValue('Buy free-range eggs')

      expect(state.subTasks.value[0]!.text).toBe('Buy free-range eggs')
    })

    it('with multiple sub-task rows, each text input has a distinct position-based accessible name', () => {
      const wrapper = mountTracked(TaskDetailModal)

      expect(wrapper.findAll('[aria-label="Sub-task 1 text"]')).toHaveLength(1)
      expect(wrapper.findAll('[aria-label="Sub-task 2 text"]')).toHaveLength(1)
      expect(wrapper.findAll('[aria-label="Sub-task 3 text"]')).toHaveLength(1)
    })

    it('deleting a sub-task calls removeSubTask with its id', async () => {
      const wrapper = mountTracked(TaskDetailModal)

      const deleteButton = wrapper.find('button[aria-label="Delete sub-task: Buy eggs"]')
      expect(deleteButton.exists()).toBe(true)
      await deleteButton.trigger('click')

      expect(state.removeSubTask).toHaveBeenCalledWith(1)
    })
  })

  describe('Save wiring', () => {
    it('calls save on click, and moves focus to the Task name input only when save() returns false', async () => {
      state.save.mockReturnValue(false)
      const wrapper = mountTracked(TaskDetailModal)
      await flushPromises()

      const closeButton = wrapper.find('button[aria-label="Close"]')
      ;(closeButton.element as HTMLElement).focus()

      await wrapper.find('.save-button').trigger('click')
      await flushPromises()

      expect(state.save).toHaveBeenCalledTimes(1)
      const nameInput = wrapper.find('#task-detail-name')
      expect(document.activeElement).toBe(nameInput.element)
    })
  })

  describe('Delete wiring', () => {
    it('clicking the Delete button calls requestDelete', async () => {
      const wrapper = mountTracked(TaskDetailModal)

      await wrapper.find('button[aria-label="Delete task"]').trigger('click')

      expect(state.requestDelete).toHaveBeenCalledTimes(1)
    })
  })

  describe('inline error states', () => {
    it('shows the Task name error with aria-invalid/aria-describedby only when nameInvalid is true', () => {
      state.nameInvalid.value = false
      const clean = mountTracked(TaskDetailModal)
      expect(clean.find('#task-detail-name-error').exists()).toBe(false)

      state.nameInvalid.value = true
      const invalid = mountTracked(TaskDetailModal)
      const error = invalid.find('#task-detail-name-error')
      expect(error.exists()).toBe(true)
      expect(error.attributes('role')).toBe('alert')
      const input = invalid.find('#task-detail-name')
      expect(input.attributes('aria-invalid')).toBe('true')
      expect(input.attributes('aria-describedby')).toBe('task-detail-name-error')
    })

    it('shows the Due by error with aria-invalid/aria-describedby only when dueByInvalid is true', () => {
      state.dueByInvalid.value = false
      const clean = mountTracked(TaskDetailModal)
      expect(clean.find('#task-detail-due-by-error').exists()).toBe(false)

      state.dueByInvalid.value = true
      const invalid = mountTracked(TaskDetailModal)
      const error = invalid.find('#task-detail-due-by-error')
      expect(error.exists()).toBe(true)
      expect(error.attributes('role')).toBe('alert')
      const input = invalid.find('#task-detail-due-by')
      expect(input.attributes('aria-invalid')).toBe('true')
      expect(input.attributes('aria-describedby')).toBe('task-detail-due-by-error')
    })
  })

  describe('accessibility (jest-axe)', () => {
    it('default open state has no violations', async () => {
      const wrapper = mountTracked(TaskDetailModal)
      await flushPromises()
      await expectNoAxeViolations(wrapper.element)
    })

    it('name-error state has no violations', async () => {
      state.nameInvalid.value = true
      const wrapper = mountTracked(TaskDetailModal)
      await flushPromises()
      await expectNoAxeViolations(wrapper.element)
    })

    it('due-by-error state has no violations', async () => {
      state.dueByInvalid.value = true
      const wrapper = mountTracked(TaskDetailModal)
      await flushPromises()
      await expectNoAxeViolations(wrapper.element)
    })

    it('populated sub-tasks (mix of existing-with-checkbox and new-without) has no violations', async () => {
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
      const wrapper = mountTracked(TaskDetailModal)
      await flushPromises()
      await expectNoAxeViolations(wrapper.element)
    })

    it('sub-task-input-open state has no violations', async () => {
      state.isSubTaskInputOpen.value = true
      const wrapper = mountTracked(TaskDetailModal)
      await flushPromises()
      await expectNoAxeViolations(wrapper.element)
    })
  })
})

describe('TaskDetailDiscardDialog', () => {
  beforeEach(() => {
    state.isDiscardConfirmOpen.value = true
  })

  it('exposes role=alertdialog with the "Discard changes?" heading', () => {
    const wrapper = mountTracked(TaskDetailDiscardDialog)

    const dialog = wrapper.find('[role="alertdialog"]')
    expect(dialog.exists()).toBe(true)
    const labelledbyId = dialog.attributes('aria-labelledby')
    expect(wrapper.find(`#${labelledbyId}`).text()).toBe('Discard changes?')
  })

  it('moves focus to the No button on initial mount', async () => {
    const wrapper = mountTracked(TaskDetailDiscardDialog)
    await flushPromises()

    const noButton = wrapper.findAll('button').find((b) => b.text().trim() === 'No')
    expect(document.activeElement).toBe(noButton!.element)
  })

  it('No calls cancelDiscard and Yes calls confirmDiscard', async () => {
    const wrapper = mountTracked(TaskDetailDiscardDialog)

    const noButton = wrapper.findAll('button').find((b) => b.text().trim() === 'No')!
    await noButton.trigger('click')
    expect(state.cancelDiscard).toHaveBeenCalledTimes(1)

    const yesButton = wrapper.findAll('button').find((b) => b.text().trim() === 'Yes')!
    await yesButton.trigger('click')
    expect(state.confirmDiscard).toHaveBeenCalledTimes(1)
  })

  it('has no accessibility violations', async () => {
    const wrapper = mountTracked(TaskDetailDiscardDialog)
    await flushPromises()
    await expectNoAxeViolations(wrapper.element)
  })
})

describe('TaskDetailDeleteDialog', () => {
  beforeEach(() => {
    state.isDeleteConfirmOpen.value = true
  })

  it('exposes role=alertdialog with a heading warning the deletion cannot be undone', () => {
    const wrapper = mountTracked(TaskDetailDeleteDialog)

    const dialog = wrapper.find('[role="alertdialog"]')
    expect(dialog.exists()).toBe(true)
    const labelledbyId = dialog.attributes('aria-labelledby')
    expect(wrapper.find(`#${labelledbyId}`).text()).toMatch(/^Delete this task\?/)
  })

  it('moves focus to the No button on initial mount', async () => {
    const wrapper = mountTracked(TaskDetailDeleteDialog)
    await flushPromises()

    const noButton = wrapper.findAll('button').find((b) => b.text().trim() === 'No')
    expect(document.activeElement).toBe(noButton!.element)
  })

  it('No calls cancelDelete and Yes calls confirmDelete', async () => {
    const wrapper = mountTracked(TaskDetailDeleteDialog)

    const noButton = wrapper.findAll('button').find((b) => b.text().trim() === 'No')!
    await noButton.trigger('click')
    expect(state.cancelDelete).toHaveBeenCalledTimes(1)

    const yesButton = wrapper.findAll('button').find((b) => b.text().trim() === 'Yes')!
    await yesButton.trigger('click')
    expect(state.confirmDelete).toHaveBeenCalledTimes(1)
  })

  it('has no accessibility violations', async () => {
    const wrapper = mountTracked(TaskDetailDeleteDialog)
    await flushPromises()
    await expectNoAxeViolations(wrapper.element)
  })
})
