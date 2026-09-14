import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import { axe } from 'jest-axe'
import AddTaskButton from '../../../src/components/AddTaskButton.vue'
import AddTaskModal from '../../../src/components/AddTaskModal.vue'
import CloseConfirmDialog from '../../../src/components/CloseConfirmDialog.vue'
import App from '../../../src/App.vue'

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

vi.mock('../../../src/composables/useAddTaskModal', () => ({
  useAddTaskModal: () => state,
}))

// App.vue transitively mounts NowNextLaterBoard/EnergySelector, which depend on
// these two singletons. Mocked here (matching tests/unit/now-next-later/components.test.ts's
// App block) purely so mounting App never touches the real singletons; the mocked
// SECTION_DEFS/ENERGY_LEVEL_OPTIONS values mirror the real constants exactly, so
// AddTaskModal's own (unmocked-elsewhere) consumption of those same constants for its
// Now/Next/Later and Energy level groups renders identically either way.
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
})

afterEach(() => {
  mountedWrappers.forEach((wrapper) => wrapper.unmount())
  mountedWrappers = []
})

describe('AddTaskButton', () => {
  it('has an aria-label identifying it as adding a task, with a decorative glyph', () => {
    const wrapper = mountTracked(AddTaskButton)
    const button = wrapper.find('button')

    expect(button.attributes('aria-label')).toBe('Add task')
    expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(true)
  })

  it('is a native type="button"', () => {
    const wrapper = mountTracked(AddTaskButton)
    expect(wrapper.find('button').attributes('type')).toBe('button')
  })

  it('calls openModal when clicked', async () => {
    const wrapper = mountTracked(AddTaskButton)

    await wrapper.find('button').trigger('click')

    expect(state.openModal).toHaveBeenCalledTimes(1)
  })

  it('refocuses itself when isOpen transitions from true to false', async () => {
    state.isOpen.value = true
    const wrapper = mountTracked(AddTaskButton)
    await nextTick()

    state.isOpen.value = false
    await nextTick()

    expect(document.activeElement).toBe(wrapper.find('button').element)
  })
})

describe('AddTaskModal', () => {
  it('is not rendered at all when isOpen is false', () => {
    state.isOpen.value = false
    const wrapper = mountTracked(AddTaskModal)

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('exposes role, aria-modal, and aria-labelledby pointing to the visible heading when open', () => {
    state.isOpen.value = true
    const wrapper = mountTracked(AddTaskModal)

    const dialog = wrapper.find('[role="dialog"]')
    expect(dialog.exists()).toBe(true)
    expect(dialog.attributes('aria-modal')).toBe('true')

    const labelledbyId = dialog.attributes('aria-labelledby')
    expect(labelledbyId).toBeTruthy()
    const heading = wrapper.find(`#${labelledbyId}`)
    expect(heading.text()).toBe('Add Task')
  })

  describe('field label associations', () => {
    it('associates the Task name label and input', () => {
      state.isOpen.value = true
      const wrapper = mountTracked(AddTaskModal)

      const label = wrapper.find('label[for="task-name"]')
      expect(label.exists()).toBe(true)
      expect(label.text()).toBe('Task name')
      expect(wrapper.find('#task-name').exists()).toBe(true)
      expect(wrapper.find('#task-name').attributes('required')).toBeDefined()
    })

    it('associates the Description label and textarea', () => {
      state.isOpen.value = true
      const wrapper = mountTracked(AddTaskModal)

      const label = wrapper.find('label[for="task-description"]')
      expect(label.exists()).toBe(true)
      expect(label.text()).toBe('Description')
      expect(wrapper.find('#task-description').exists()).toBe(true)
    })

    it('associates the Available from label and date input', () => {
      state.isOpen.value = true
      const wrapper = mountTracked(AddTaskModal)

      const label = wrapper.find('label[for="task-available-from"]')
      expect(label.exists()).toBe(true)
      expect(label.text()).toBe('Available from')
      const input = wrapper.find('#task-available-from')
      expect(input.attributes('type')).toBe('date')
    })

    it('associates the Due by label and date input', () => {
      state.isOpen.value = true
      const wrapper = mountTracked(AddTaskModal)

      const label = wrapper.find('label[for="task-due-by"]')
      expect(label.exists()).toBe(true)
      expect(label.text()).toBe('Due by')
      const input = wrapper.find('#task-due-by')
      expect(input.attributes('type')).toBe('date')
    })

    it('associates the sub-task draft label and input, with its own visible "New sub-task" label (#115)', () => {
      state.isOpen.value = true
      state.isSubTaskInputOpen.value = true
      const wrapper = mountTracked(AddTaskModal)

      const label = wrapper.find('label[for="sub-task-draft"]')
      expect(label.exists()).toBe(true)
      expect(label.text()).toBe('New sub-task')
      expect(wrapper.find('#sub-task-draft').exists()).toBe(true)
    })
  })

  it('Now/Next/Later group reflects the current selection and wires clicks to selectSection', async () => {
    state.isOpen.value = true
    state.nowNextLater.value = 'now'
    const wrapper = mountTracked(AddTaskModal)

    const group = findGroupByButtonTexts(wrapper, ['Now', 'Next', 'Later'])
    expect(group).toBeTruthy()
    const buttons = group!.findAll('button')
    expect(buttons.map((button) => button.attributes('aria-pressed'))).toEqual([
      'true',
      'false',
      'false',
    ])

    await buttons[1]!.trigger('click')
    expect(state.selectSection).toHaveBeenCalledWith('next')
  })

  it('Energy level group reflects the current selection and wires clicks to selectEnergyLevel', async () => {
    state.isOpen.value = true
    state.energyLevel.value = 'medium'
    const wrapper = mountTracked(AddTaskModal)

    const group = findGroupByButtonTexts(wrapper, ['Low', 'Medium', 'High'])
    expect(group).toBeTruthy()
    const buttons = group!.findAll('button')
    expect(buttons.map((button) => button.attributes('aria-pressed'))).toEqual([
      'false',
      'true',
      'false',
    ])

    await buttons[2]!.trigger('click')
    expect(state.selectEnergyLevel).toHaveBeenCalledWith('high')
  })

  it('Estimate inputs carry min="0"/step="1", reflect the mocked refs, and forward raw input to setEstimateField', async () => {
    state.isOpen.value = true
    state.estimateDays.value = '2'
    state.estimateHours.value = '3'
    state.estimateMinutes.value = '15'
    const wrapper = mountTracked(AddTaskModal)

    const group = wrapper.find('[aria-labelledby="task-estimate-label"]')
    expect(group.exists()).toBe(true)
    const inputs = group.findAll('input[type="number"]')
    expect(inputs).toHaveLength(3)

    inputs.forEach((input) => {
      expect(input.attributes('min')).toBe('0')
      expect(input.attributes('step')).toBe('1')
    })

    expect((inputs[0]!.element as HTMLInputElement).value).toBe('2')
    expect((inputs[1]!.element as HTMLInputElement).value).toBe('3')
    expect((inputs[2]!.element as HTMLInputElement).value).toBe('15')

    await inputs[0]!.setValue('-5')
    expect(state.setEstimateField).toHaveBeenCalledWith('days', '-5')

    await inputs[1]!.setValue('1.5')
    expect(state.setEstimateField).toHaveBeenCalledWith('hours', '1.5')

    await inputs[2]!.setValue('007')
    expect(state.setEstimateField).toHaveBeenCalledWith('minutes', '007')
  })

  it('shows the Due by error with aria-invalid/aria-describedby only when dueByInvalid is true', () => {
    state.isOpen.value = true
    state.dueByInvalid.value = false
    const clean = mountTracked(AddTaskModal)
    expect(clean.find('#task-due-by-error').exists()).toBe(false)

    state.dueByInvalid.value = true
    const invalid = mountTracked(AddTaskModal)
    const error = invalid.find('#task-due-by-error')
    expect(error.exists()).toBe(true)
    expect(error.attributes('role')).toBe('alert')

    const input = invalid.find('#task-due-by')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('aria-describedby')).toBe('task-due-by-error')
  })

  it('shows the Task name error with aria-invalid/aria-describedby only when taskNameInvalid is true', () => {
    state.isOpen.value = true
    state.taskNameInvalid.value = false
    const clean = mountTracked(AddTaskModal)
    expect(clean.find('#task-name-error').exists()).toBe(false)

    state.taskNameInvalid.value = true
    const invalid = mountTracked(AddTaskModal)
    const error = invalid.find('#task-name-error')
    expect(error.exists()).toBe(true)
    expect(error.attributes('role')).toBe('alert')

    const input = invalid.find('#task-name')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('aria-describedby')).toBe('task-name-error')
  })

  describe('sub-task controls', () => {
    it('Add sub-task button has a distinct accessible name and calls openSubTaskInput', async () => {
      state.isOpen.value = true
      const wrapper = mountTracked(AddTaskModal)

      const addSubTaskButton = wrapper.find('button[aria-label="Add sub-task"]')
      expect(addSubTaskButton.exists()).toBe(true)

      await addSubTaskButton.trigger('click')

      expect(state.openSubTaskInput).toHaveBeenCalledTimes(1)
    })

    it('disables the sub-task Save button while the draft is blank, enabling it once there is text', () => {
      state.isOpen.value = true
      state.isSubTaskInputOpen.value = true
      state.canSaveSubTaskDraft.value = false
      const blank = mountTracked(AddTaskModal)
      const blankSaveButtons = blank.findAll('button').filter((b) => b.text().trim() === 'Save')
      expect(blankSaveButtons[0]!.attributes('disabled')).toBeDefined()

      state.canSaveSubTaskDraft.value = true
      const filled = mountTracked(AddTaskModal)
      const filledSaveButtons = filled.findAll('button').filter((b) => b.text().trim() === 'Save')
      expect(filledSaveButtons[0]!.attributes('disabled')).toBeUndefined()
    })

    it('sub-task Save button calls saveSubTaskDraft when enabled', async () => {
      state.isOpen.value = true
      state.isSubTaskInputOpen.value = true
      state.canSaveSubTaskDraft.value = true
      const wrapper = mountTracked(AddTaskModal)

      const saveButtons = wrapper.findAll('button').filter((b) => b.text().trim() === 'Save')
      await saveButtons[0]!.trigger('click')

      expect(state.saveSubTaskDraft).toHaveBeenCalledTimes(1)
    })

    it('sub-task draft Close button calls closeSubTaskInput and is distinct from the modal X button (#115)', async () => {
      state.isOpen.value = true
      state.isSubTaskInputOpen.value = true
      const wrapper = mountTracked(AddTaskModal)

      const xButton = wrapper.find('button[aria-label="Close"]')
      expect(xButton.exists()).toBe(true)
      expect(xButton.attributes('aria-label')).toBe('Close')

      const draftCloseButton = wrapper
        .findAll('button')
        .find(
          (b) =>
            !b.attributes('aria-label') && b.text().replace(/\s+/g, ' ').trim().startsWith('Close')
        )
      expect(draftCloseButton).toBeTruthy()

      const hiddenSpan = draftCloseButton!.find('.visually-hidden')
      expect(hiddenSpan.exists()).toBe(true)

      const fullAccessibleName = draftCloseButton!.text().replace(/\s+/g, ' ').trim()
      expect(fullAccessibleName).toBe('Close sub-task text')

      await draftCloseButton!.trigger('click')

      expect(state.closeSubTaskInput).toHaveBeenCalledTimes(1)
      expect(state.requestClose).not.toHaveBeenCalled()
    })

    it('deleting a sub-task calls removeSubTask with its id, and names which task it removes', async () => {
      state.isOpen.value = true
      state.subTasks.value = [{ id: 7, text: 'Buy eggs' }]
      const wrapper = mountTracked(AddTaskModal)

      const deleteButton = wrapper.find('button[aria-label="Delete sub-task: Buy eggs"]')
      expect(deleteButton.exists()).toBe(true)

      await deleteButton.trigger('click')

      expect(state.removeSubTask).toHaveBeenCalledWith(7)
    })

    it('renders saved sub-tasks in insertion order', () => {
      state.isOpen.value = true
      state.subTasks.value = [
        { id: 1, text: 'First' },
        { id: 2, text: 'Second' },
      ]
      const wrapper = mountTracked(AddTaskModal)

      const items = wrapper.findAll('li')
      expect(items[0]!.text()).toContain('First')
      expect(items[1]!.text()).toContain('Second')
    })
  })

  describe('close wiring', () => {
    it('calls requestClose when the X button is clicked', async () => {
      state.isOpen.value = true
      const wrapper = mountTracked(AddTaskModal)

      await wrapper.find('button[aria-label="Close"]').trigger('click')

      expect(state.requestClose).toHaveBeenCalledTimes(1)
    })

    it('calls requestClose on Escape', async () => {
      state.isOpen.value = true
      const wrapper = mountTracked(AddTaskModal)

      await wrapper.find('.add-task-overlay').trigger('keydown', { key: 'Escape' })

      expect(state.requestClose).toHaveBeenCalledTimes(1)
    })

    it('calls requestClose on a backdrop click, but not on a click inside the dialog content', async () => {
      state.isOpen.value = true
      const wrapper = mountTracked(AddTaskModal)

      await wrapper.find('.add-task-content').trigger('click')
      expect(state.requestClose).not.toHaveBeenCalled()

      await wrapper.find('.add-task-overlay').trigger('click')
      expect(state.requestClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Save wiring', () => {
    it('calls save on click, and moves focus to the Task name input only when save() returns false', async () => {
      state.isOpen.value = true
      state.save.mockReturnValue(false)
      const wrapper = mountTracked(AddTaskModal)
      await flushPromises()

      const closeButton = wrapper.find('button[aria-label="Close"]')
      ;(closeButton.element as HTMLElement).focus()
      expect(document.activeElement).toBe(closeButton.element)

      const saveButtons = wrapper.findAll('button').filter((b) => b.text().trim() === 'Save')
      const mainSaveButton = saveButtons[saveButtons.length - 1]!
      await mainSaveButton.trigger('click')
      await flushPromises()

      expect(state.save).toHaveBeenCalledTimes(1)
      const taskNameInput = wrapper.find('#task-name')
      expect(document.activeElement).toBe(taskNameInput.element)
    })
  })

  describe('initial-open focus on first mount (#117)', () => {
    it('moves focus to the Task name input immediately, via onMounted rather than a watcher', async () => {
      state.isOpen.value = true
      const wrapper = mountTracked(AddTaskModal)
      await flushPromises()

      const taskNameInput = wrapper.find('#task-name')
      expect(document.activeElement).toBe(taskNameInput.element)
    })
  })

  describe('confirm-dialog close returns focus to the X button (Req 28, watcher case)', () => {
    it('moves focus to the X button when isConfirmOpen transitions from true to false on an already-mounted instance', async () => {
      state.isOpen.value = true
      state.isConfirmOpen.value = false
      const wrapper = mountTracked(AddTaskModal)
      await flushPromises()

      state.isConfirmOpen.value = true
      await nextTick()
      state.isConfirmOpen.value = false
      await nextTick()

      const closeButton = wrapper.find('button[aria-label="Close"]')
      expect(document.activeElement).toBe(closeButton.element)
    })
  })

  describe('Escape/Tab double-handling guard across nested overlays (#116)', () => {
    it('Escape inside the real (unmocked) CloseConfirmDialog calls cancelDiscard but never reaches requestClose', async () => {
      state.isOpen.value = true
      state.isConfirmOpen.value = true
      mountTracked(AddTaskModal)
      await flushPromises()

      const confirmOverlay = document.querySelector('.close-confirm-overlay')
      expect(confirmOverlay).toBeTruthy()
      const focusedInsideConfirm = document.activeElement
      expect(confirmOverlay!.contains(focusedInsideConfirm)).toBe(true)

      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      focusedInsideConfirm!.dispatchEvent(event)
      await nextTick()

      expect(state.cancelDiscard).toHaveBeenCalledTimes(1)
      expect(state.requestClose).not.toHaveBeenCalled()
    })

    it('Tab inside the real (unmocked) CloseConfirmDialog cycles only within its own focusable elements', async () => {
      state.isOpen.value = true
      state.isConfirmOpen.value = true
      mountTracked(AddTaskModal)
      await flushPromises()

      const confirmOverlay = document.querySelector('.close-confirm-overlay')!
      const focusedInsideConfirm = document.activeElement!
      expect(confirmOverlay.contains(focusedInsideConfirm)).toBe(true)

      const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
      focusedInsideConfirm.dispatchEvent(event)
      await nextTick()

      expect(confirmOverlay.contains(document.activeElement)).toBe(true)
    })
  })
})

describe('CloseConfirmDialog', () => {
  it('is not rendered when isConfirmOpen is false', () => {
    state.isConfirmOpen.value = false
    const wrapper = mountTracked(CloseConfirmDialog)

    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
  })

  it('exposes role="alertdialog", aria-modal, and aria-labelledby when open', () => {
    state.isConfirmOpen.value = true
    const wrapper = mountTracked(CloseConfirmDialog)

    const dialog = wrapper.find('[role="alertdialog"]')
    expect(dialog.exists()).toBe(true)
    expect(dialog.attributes('aria-modal')).toBe('true')

    const labelledbyId = dialog.attributes('aria-labelledby')
    expect(labelledbyId).toBeTruthy()
    expect(wrapper.find(`#${labelledbyId}`).text()).toBe('Close without saving?')
  })

  it('Yes calls confirmDiscard and No calls cancelDiscard', async () => {
    state.isConfirmOpen.value = true
    const wrapper = mountTracked(CloseConfirmDialog)
    const buttons = wrapper.findAll('button')
    const yesButton = buttons.find((b) => b.text().trim() === 'Yes')!
    const noButton = buttons.find((b) => b.text().trim() === 'No')!

    await yesButton.trigger('click')
    expect(state.confirmDiscard).toHaveBeenCalledTimes(1)

    await noButton.trigger('click')
    expect(state.cancelDiscard).toHaveBeenCalledTimes(1)
  })

  it('calls cancelDiscard on Escape', async () => {
    state.isConfirmOpen.value = true
    const wrapper = mountTracked(CloseConfirmDialog)

    await wrapper.find('.close-confirm-overlay').trigger('keydown', { key: 'Escape' })

    expect(state.cancelDiscard).toHaveBeenCalledTimes(1)
  })

  it('moves focus to the No button on first mount, via onMounted rather than a watcher (#117)', async () => {
    state.isConfirmOpen.value = true
    const wrapper = mountTracked(CloseConfirmDialog)
    await flushPromises()

    const noButton = wrapper.findAll('button').find((b) => b.text().trim() === 'No')
    expect(document.activeElement).toBe(noButton!.element)
  })
})

describe('accessibility (jest-axe)', () => {
  it('AddTaskButton has no violations', async () => {
    const wrapper = mountTracked(AddTaskButton)
    await expectNoAxeViolations(wrapper.element)
  })

  it('AddTaskModal default open state has no violations', async () => {
    state.isOpen.value = true
    const wrapper = mountTracked(AddTaskModal)
    await flushPromises()
    await expectNoAxeViolations(wrapper.element)
  })

  it('AddTaskModal with the sub-task inline input open has no violations', async () => {
    state.isOpen.value = true
    state.isSubTaskInputOpen.value = true
    const wrapper = mountTracked(AddTaskModal)
    await flushPromises()
    await expectNoAxeViolations(wrapper.element)
  })

  it('AddTaskModal with a populated sub-tasks list has no violations', async () => {
    state.isOpen.value = true
    state.subTasks.value = [
      { id: 1, text: 'First' },
      { id: 2, text: 'Second' },
    ]
    const wrapper = mountTracked(AddTaskModal)
    await flushPromises()
    await expectNoAxeViolations(wrapper.element)
  })

  it('AddTaskModal with the Task name error shown has no violations', async () => {
    state.isOpen.value = true
    state.taskNameInvalid.value = true
    const wrapper = mountTracked(AddTaskModal)
    await flushPromises()
    await expectNoAxeViolations(wrapper.element)
  })

  it('AddTaskModal with the Due by error shown has no violations', async () => {
    state.isOpen.value = true
    state.dueByInvalid.value = true
    const wrapper = mountTracked(AddTaskModal)
    await flushPromises()
    await expectNoAxeViolations(wrapper.element)
  })

  it('CloseConfirmDialog open has no violations', async () => {
    state.isConfirmOpen.value = true
    const wrapper = mountTracked(CloseConfirmDialog)
    await flushPromises()
    await expectNoAxeViolations(wrapper.element)
  })
})

describe('App', () => {
  it('renders AddTaskButton inside the header logo, immediately after the h1', () => {
    const wrapper = mountTracked(App)
    const logo = wrapper.find('.logo')
    const children = Array.from(logo.element.children)
    const h1Index = children.findIndex((el) => el.tagName.toLowerCase() === 'h1')
    const buttonIndex = children.findIndex((el) => el.getAttribute('aria-label') === 'Add task')

    expect(h1Index).toBeGreaterThanOrEqual(0)
    expect(buttonIndex).toBe(h1Index + 1)
  })

  it('renders AddTaskModal only when isOpen is true', async () => {
    state.isOpen.value = false
    const closedWrapper = mountTracked(App)
    expect(closedWrapper.find('[role="dialog"]').exists()).toBe(false)

    state.isOpen.value = true
    const openWrapper = mountTracked(App)
    await flushPromises()
    expect(openWrapper.find('[role="dialog"]').exists()).toBe(true)
  })

  describe('background content hiding (#119)', () => {
    it('has no inert/aria-hidden on .app-background while the modal is closed', () => {
      state.isOpen.value = false
      const wrapper = mountTracked(App)
      const background = wrapper.find('.app-background')

      expect(background.exists()).toBe(true)
      expect(background.attributes('inert')).toBeUndefined()
      expect(background.attributes('aria-hidden')).toBeUndefined()
    })

    it('sets inert and aria-hidden="true" on .app-background while the modal is open', async () => {
      state.isOpen.value = true
      const wrapper = mountTracked(App)
      await flushPromises()
      const background = wrapper.find('.app-background')

      expect(background.attributes('inert')).toBeDefined()
      expect(background.attributes('aria-hidden')).toBe('true')
    })

    it('removes inert/aria-hidden again once the modal closes', async () => {
      state.isOpen.value = true
      const wrapper = mountTracked(App)
      await flushPromises()

      state.isOpen.value = false
      await nextTick()

      const background = wrapper.find('.app-background')
      expect(background.attributes('inert')).toBeUndefined()
      expect(background.attributes('aria-hidden')).toBeUndefined()
    })

    it('never places AddTaskModal itself inside .app-background', async () => {
      state.isOpen.value = true
      const wrapper = mountTracked(App)
      await flushPromises()

      const background = wrapper.find('.app-background')
      expect(background.find('[role="dialog"]').exists()).toBe(false)
    })
  })

  it('has no accessibility violations with the modal closed', async () => {
    state.isOpen.value = false
    const wrapper = mountTracked(App)
    await expectNoAxeViolations(wrapper.element)
  })
})
