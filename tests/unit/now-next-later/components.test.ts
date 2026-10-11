import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, reactive, ref } from 'vue'
import { axe } from 'jest-axe'
import CollapsibleSection from '../../../src/components/CollapsibleSection.vue'
import NowNextLaterBoard from '../../../src/components/NowNextLaterBoard.vue'
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

const sectionState = {
  expanded: reactive({ now: true, next: true, later: true }),
  toggle: vi.fn(),
}

vi.mock('../../../src/composables/useSectionCollapse', () => ({
  useSectionCollapse: () => sectionState,
  SECTION_DEFS: [
    { key: 'now', label: 'Now' },
    { key: 'next', label: 'Next' },
    { key: 'later', label: 'Later' },
  ],
}))

const energyState = {
  selectedLevel: ref<'low' | 'medium' | 'high' | null>(null),
  toastMessage: ref<string | null>(null),
  toastId: ref(0),
  selectLevel: vi.fn(),
  dismissToast: vi.fn(),
  encourageMe: vi.fn(),
  toughLove: vi.fn(),
}

vi.mock('../../../src/composables/useEnergyLevel', () => ({
  useEnergyLevel: () => energyState,
  ENERGY_LEVEL_OPTIONS: [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ],
}))

interface FakeTask {
  id: number
  name: string
  section: 'now' | 'next' | 'later'
  done: boolean
  createdAt: number
}

const tasksState = {
  tasks: ref<FakeTask[]>([]),
  toggleTaskDone: vi.fn(),
}

// The board now completes tasks through useCelebration().toggleTaskDoneWithCelebration and
// consumes the data-computed completion focus target - mocked here so the board is isolated.
// It also carries the notification/confetti refs because the App test below mounts the whole tree
// (App.vue renders CelebrationNotification and ConfettiLayer).
const celebrationState = {
  celebrationMessage: ref<string | null>(null),
  celebrationId: ref(0),
  confettiPieces: ref<unknown[]>([]),
  confettiBurstId: ref(0),
  completionFocusTarget: ref(null),
  celebrate: vi.fn(),
  dismissCelebration: vi.fn(),
  pauseDismiss: vi.fn(),
  resumeDismiss: vi.fn(),
  toggleTaskDoneWithCelebration: vi.fn(),
  consumeCompletionFocusTarget: vi.fn(),
}

// App.vue also renders CompletedButton / CompletedTasksPanel.
const completedPanelState = {
  isOpen: ref(false),
  completedTasks: ref<unknown[]>([]),
  completedCount: ref(0),
  open: vi.fn(),
  close: vi.fn(),
  uncomplete: vi.fn(),
  openTask: vi.fn(),
}

vi.mock('../../../src/composables/useCompletedPanel', () => ({
  useCompletedPanel: () => completedPanelState,
}))

vi.mock('../../../src/composables/useCelebration', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useCelebration: () => celebrationState,
}))

vi.mock('../../../src/composables/useTasks', () => ({
  useTasks: () => tasksState,
}))

// App.vue now also calls useTaskDetail (to render <TaskDetailModal v-if="isTaskDetailOpen" />
// and extend .app-background's inert condition), and NowNextLaterBoard.vue calls it to open the
// detail view from each task's new open-button — mocked here with the same shape as
// tests/unit/task-detail/components.test.ts so both describe blocks below can mount freely.
const taskDetailState = {
  isOpen: ref(false),
  lastOpenedTaskId: ref<number | null>(null),
  lastOpenedTaskSection: ref<'now' | 'next' | 'later' | null>(null),
  openedFrom: ref<'board' | 'completed'>('board'),
  open: vi.fn(),
}

vi.mock('../../../src/composables/useTaskDetail', () => ({
  useTaskDetail: () => taskDetailState,
}))

let mountedWrappers: VueWrapper[] = []

function mountTracked(component: Parameters<typeof mount>[0], props?: Record<string, unknown>) {
  const wrapper = mount(component, { attachTo: document.body, props })
  mountedWrappers.push(wrapper)
  return wrapper
}

beforeEach(() => {
  sectionState.expanded.now = true
  sectionState.expanded.next = true
  sectionState.expanded.later = true
  sectionState.toggle.mockReset()

  energyState.selectedLevel.value = null
  energyState.toastMessage.value = null
  energyState.toastId.value = 0
  energyState.selectLevel.mockReset()
  energyState.dismissToast.mockReset()
  energyState.encourageMe.mockReset()
  energyState.toughLove.mockReset()

  tasksState.tasks.value = []
  tasksState.toggleTaskDone.mockReset()

  celebrationState.toggleTaskDoneWithCelebration.mockReset()
  celebrationState.consumeCompletionFocusTarget.mockReset()
  celebrationState.consumeCompletionFocusTarget.mockReturnValue(null)

  celebrationState.celebrationMessage.value = null
  completedPanelState.isOpen.value = false
  completedPanelState.completedCount.value = 0

  taskDetailState.openedFrom.value = 'board'
  taskDetailState.isOpen.value = false
  taskDetailState.lastOpenedTaskId.value = null
  taskDetailState.lastOpenedTaskSection.value = null
  taskDetailState.open.mockReset()
})

afterEach(() => {
  mountedWrappers.forEach((wrapper) => wrapper.unmount())
  mountedWrappers = []
})

describe('NowNextLaterBoard', () => {
  it('renders exactly three CollapsibleSection instances in Now/Next/Later order', () => {
    const wrapper = mountTracked(NowNextLaterBoard)
    const sections = wrapper.findAllComponents(CollapsibleSection)

    expect(sections).toHaveLength(3)
    expect(sections.map((section) => section.props('label'))).toEqual(['Now', 'Next', 'Later'])
  })

  it('has no accessibility violations in the default all-expanded state', async () => {
    const wrapper = mountTracked(NowNextLaterBoard)
    await expectNoAxeViolations(wrapper.element)
  })

  it('has no accessibility violations in a mixed collapsed/expanded state', async () => {
    sectionState.expanded.now = false
    const wrapper = mountTracked(NowNextLaterBoard)
    await expectNoAxeViolations(wrapper.element)
  })

  describe('rendering real tasks', () => {
    it("renders a task's name as visible text inside its section", () => {
      tasksState.tasks.value = [
        { id: 1, name: 'Buy milk', section: 'now', done: false, createdAt: 1 },
      ]
      const wrapper = mountTracked(NowNextLaterBoard)

      expect(wrapper.text()).toContain('Buy milk')
    })

    it('renders a <ul>/<li> structure for a section with tasks, and nothing extra for a section with none', () => {
      tasksState.tasks.value = [
        { id: 1, name: 'Buy milk', section: 'now', done: false, createdAt: 1 },
      ]
      const wrapper = mountTracked(NowNextLaterBoard)
      const sections = wrapper.findAllComponents(CollapsibleSection)

      const nowSection = sections.find((section) => section.props('sectionKey') === 'now')!
      expect(nowSection.find('ul').exists()).toBe(true)
      expect(nowSection.findAll('li')).toHaveLength(1)

      const nextSection = sections.find((section) => section.props('sectionKey') === 'next')!
      expect(nextSection.find('ul').exists()).toBe(false)
    })

    it('a done task renders no .task-item', () => {
      tasksState.tasks.value = [
        { id: 1, name: 'Buy milk', section: 'now', done: false, createdAt: 1 },
        { id: 2, name: 'Bring bins', section: 'now', done: true, createdAt: 2 },
      ]
      const wrapper = mountTracked(NowNextLaterBoard)

      const items = wrapper.findAll('.task-item')
      expect(items).toHaveLength(1)
      expect(items[0]!.text()).toContain('Buy milk')
      expect(wrapper.text()).not.toContain('Bring bins')
      expect(wrapper.find('#task-2-done').exists()).toBe(false)
    })

    it('a section whose tasks are all done shows no list', () => {
      tasksState.tasks.value = [
        { id: 1, name: 'Bring bins', section: 'now', done: true, createdAt: 1 },
      ]
      const wrapper = mountTracked(NowNextLaterBoard)
      const sections = wrapper.findAllComponents(CollapsibleSection)
      const now = sections.find((section) => section.props('sectionKey') === 'now')!

      expect(now.find('ul').exists()).toBe(false)
      expect(now.findAll('li')).toHaveLength(0)
    })

    it('an incomplete task checkbox is unchecked and not struck through', () => {
      tasksState.tasks.value = [
        { id: 1, name: 'Buy milk', section: 'now', done: false, createdAt: 1 },
      ]
      const wrapper = mountTracked(NowNextLaterBoard)
      expect((wrapper.find('#task-1-done').element as HTMLInputElement).checked).toBe(false)
      expect(wrapper.find('.task-name--done').exists()).toBe(false)
    })

    it("renders tasks sorted by ascending createdAt regardless of the mocked array's input order", () => {
      tasksState.tasks.value = [
        { id: 1, name: 'Third', section: 'now', done: false, createdAt: 300 },
        { id: 2, name: 'First', section: 'now', done: false, createdAt: 100 },
        { id: 3, name: 'Second', section: 'now', done: false, createdAt: 200 },
      ]
      const wrapper = mountTracked(NowNextLaterBoard)
      const sections = wrapper.findAllComponents(CollapsibleSection)
      const nowSection = sections.find((section) => section.props('sectionKey') === 'now')!

      const names = nowSection.findAll('li').map((li) => li.text())
      expect(names[0]).toContain('First')
      expect(names[1]).toContain('Second')
      expect(names[2]).toContain('Third')
    })

    it("a task assigned to section: 'next' renders only under the Next section, not Now/Later", () => {
      tasksState.tasks.value = [
        { id: 1, name: 'Plan trip', section: 'next', done: false, createdAt: 1 },
      ]
      const wrapper = mountTracked(NowNextLaterBoard)
      const sections = wrapper.findAllComponents(CollapsibleSection)

      const now = sections.find((section) => section.props('sectionKey') === 'now')!
      const next = sections.find((section) => section.props('sectionKey') === 'next')!
      const later = sections.find((section) => section.props('sectionKey') === 'later')!

      expect(now.text()).not.toContain('Plan trip')
      expect(next.text()).toContain('Plan trip')
      expect(later.text()).not.toContain('Plan trip')
    })

    it('has no accessibility violations with a section rendering one incomplete task', async () => {
      tasksState.tasks.value = [
        { id: 1, name: 'Buy milk', section: 'now', done: false, createdAt: 1 },
      ]
      const wrapper = mountTracked(NowNextLaterBoard)
      await expectNoAxeViolations(wrapper.element)
    })

    it('has no accessibility violations with a board containing only done tasks (empty)', async () => {
      tasksState.tasks.value = [
        { id: 1, name: 'Buy milk', section: 'now', done: true, createdAt: 1 },
      ]
      const wrapper = mountTracked(NowNextLaterBoard)
      await expectNoAxeViolations(wrapper.element)
    })

    describe('task selection (open detail view)', () => {
      it("clicking a task's name button calls the mocked open with that task's id", async () => {
        tasksState.tasks.value = [
          { id: 7, name: 'Buy milk', section: 'now', done: false, createdAt: 1 },
        ]
        const wrapper = mountTracked(NowNextLaterBoard)

        const openButton = wrapper.find('button.task-open-button')
        expect(openButton.exists()).toBe(true)
        expect(openButton.text()).toBe('Buy milk')
        await openButton.trigger('click')

        expect(taskDetailState.open).toHaveBeenCalledWith(7)
      })

      it("the done checkbox's accessible name still equals the task name", () => {
        tasksState.tasks.value = [
          { id: 7, name: 'Buy milk', section: 'now', done: false, createdAt: 1 },
        ]
        const wrapper = mountTracked(NowNextLaterBoard)

        const checkbox = wrapper.find('#task-7-done')
        expect(checkbox.attributes('aria-label')).toBe('Buy milk')
      })

      it('clicking the done checkbox itself does not call open', async () => {
        tasksState.tasks.value = [
          { id: 7, name: 'Buy milk', section: 'now', done: false, createdAt: 1 },
        ]
        const wrapper = mountTracked(NowNextLaterBoard)

        await wrapper.find('#task-7-done').trigger('change')

        expect(taskDetailState.open).not.toHaveBeenCalled()
        expect(celebrationState.toggleTaskDoneWithCelebration).toHaveBeenCalledWith(7)
        expect(tasksState.toggleTaskDone).not.toHaveBeenCalled()
      })
    })

    describe('focus after completing from the board checkbox', () => {
      it('focuses the open-button of the consumed task target', async () => {
        tasksState.tasks.value = [
          { id: 1, name: 'First', section: 'now', done: false, createdAt: 1 },
          { id: 2, name: 'Second', section: 'now', done: false, createdAt: 2 },
        ]
        celebrationState.consumeCompletionFocusTarget.mockReturnValue({ kind: 'task', id: 2 })
        const wrapper = mountTracked(NowNextLaterBoard)

        await wrapper.find('#task-1-done').trigger('change')
        await nextTick()
        await nextTick()

        const buttons = wrapper.findAll('button.task-open-button')
        const second = buttons.find((b) => b.text() === 'Second')!
        expect(document.activeElement).toBe(second.element)
      })

      it('focuses the section heading when the consumed target is a section', async () => {
        tasksState.tasks.value = [
          { id: 1, name: 'Only', section: 'next', done: false, createdAt: 1 },
        ]
        celebrationState.consumeCompletionFocusTarget.mockReturnValue({
          kind: 'section',
          key: 'next',
        })
        const wrapper = mountTracked(NowNextLaterBoard)

        await wrapper.find('#task-1-done').trigger('change')
        await nextTick()
        await nextTick()

        expect(document.activeElement).toBe(document.getElementById('section-next-heading'))
      })
    })

    describe('focus after the Task Detail modal closes', () => {
      async function closeDetail(origin: 'board' | 'completed') {
        taskDetailState.openedFrom.value = origin
        taskDetailState.isOpen.value = true
        await nextTick()
        taskDetailState.isOpen.value = false
        await nextTick()
        await nextTick()
      }

      it("origin 'completed': does not consume the target or move focus", async () => {
        tasksState.tasks.value = [
          { id: 1, name: 'First', section: 'now', done: false, createdAt: 1 },
        ]
        taskDetailState.lastOpenedTaskId.value = 1
        const outside = document.createElement('button')
        document.body.appendChild(outside)
        mountTracked(NowNextLaterBoard)
        outside.focus()

        await closeDetail('completed')

        expect(celebrationState.consumeCompletionFocusTarget).not.toHaveBeenCalled()
        expect(document.activeElement).toBe(outside)
        outside.remove()
      })

      it("origin 'board' with a completion target: focuses the neighbor open-button", async () => {
        tasksState.tasks.value = [
          { id: 2, name: 'Second', section: 'now', done: false, createdAt: 2 },
        ]
        taskDetailState.lastOpenedTaskId.value = 1
        celebrationState.consumeCompletionFocusTarget.mockReturnValue({ kind: 'task', id: 2 })
        const wrapper = mountTracked(NowNextLaterBoard)

        await closeDetail('board')

        expect(celebrationState.consumeCompletionFocusTarget).toHaveBeenCalled()
        expect(document.activeElement).toBe(wrapper.find('button.task-open-button').element)
      })

      it("origin 'board' with a section completion target: focuses that section heading", async () => {
        tasksState.tasks.value = []
        taskDetailState.lastOpenedTaskId.value = 1
        celebrationState.consumeCompletionFocusTarget.mockReturnValue({
          kind: 'section',
          key: 'later',
        })
        mountTracked(NowNextLaterBoard)

        await closeDetail('board')

        expect(document.activeElement).toBe(document.getElementById('section-later-heading'))
      })

      it("origin 'board' with no target (cancel/save): focuses the task's own open-button", async () => {
        tasksState.tasks.value = [
          { id: 1, name: 'First', section: 'now', done: false, createdAt: 1 },
        ]
        taskDetailState.lastOpenedTaskId.value = 1
        celebrationState.consumeCompletionFocusTarget.mockReturnValue(null)
        const wrapper = mountTracked(NowNextLaterBoard)

        await closeDetail('board')

        expect(document.activeElement).toBe(wrapper.find('button.task-open-button').element)
      })

      it("origin 'board' with no target and a deleted task: focuses its last section heading", async () => {
        tasksState.tasks.value = []
        taskDetailState.lastOpenedTaskId.value = 1
        taskDetailState.lastOpenedTaskSection.value = 'next'
        celebrationState.consumeCompletionFocusTarget.mockReturnValue(null)
        mountTracked(NowNextLaterBoard)

        await closeDetail('board')

        expect(document.activeElement).toBe(document.getElementById('section-next-heading'))
      })
    })
  })
})

describe('CollapsibleSection', () => {
  const baseProps = { sectionKey: 'now', label: 'Now', expanded: true }

  it('renders a section labelled by its heading', () => {
    const wrapper = mountTracked(CollapsibleSection, baseProps)
    const section = wrapper.find('section')
    const heading = wrapper.find('h2')

    expect(heading.text()).toBe('Now')
    expect(section.attributes('aria-labelledby')).toBe(heading.attributes('id'))
  })

  it('sets the button\'s aria-label to "Collapse {label}" when expanded', () => {
    const wrapper = mountTracked(CollapsibleSection, { ...baseProps, expanded: true })
    expect(wrapper.find('.section-toggle').attributes('aria-label')).toBe('Collapse Now')
  })

  it('sets the button\'s aria-label to "Expand {label}" when collapsed', () => {
    const wrapper = mountTracked(CollapsibleSection, { ...baseProps, expanded: false })
    expect(wrapper.find('.section-toggle').attributes('aria-label')).toBe('Expand Now')
  })

  it('sets aria-expanded to match the expanded prop', () => {
    const expandedWrapper = mountTracked(CollapsibleSection, { ...baseProps, expanded: true })
    expect(expandedWrapper.find('button').attributes('aria-expanded')).toBe('true')

    const collapsedWrapper = mountTracked(CollapsibleSection, { ...baseProps, expanded: false })
    expect(collapsedWrapper.find('button').attributes('aria-expanded')).toBe('false')
  })

  it('sets aria-controls on the button to the content region id', () => {
    const wrapper = mountTracked(CollapsibleSection, baseProps)
    const button = wrapper.find('button')
    const content = wrapper.find('.section-content')

    expect(button.attributes('aria-controls')).toBe(content.attributes('id'))
  })

  it('hides the content region when collapsed and shows it when expanded', () => {
    const expandedWrapper = mountTracked(CollapsibleSection, { ...baseProps, expanded: true })
    expect(expandedWrapper.find('.section-content').attributes('hidden')).toBeUndefined()

    const collapsedWrapper = mountTracked(CollapsibleSection, { ...baseProps, expanded: false })
    expect(collapsedWrapper.find('.section-content').attributes('hidden')).toBeDefined()
  })

  it('has no accessibility violations when expanded', async () => {
    const wrapper = mountTracked(CollapsibleSection, { ...baseProps, expanded: true })
    await expectNoAxeViolations(wrapper.element)
  })

  it('has no accessibility violations when collapsed', async () => {
    const wrapper = mountTracked(CollapsibleSection, { ...baseProps, expanded: false })
    await expectNoAxeViolations(wrapper.element)
  })

  it('gives the heading tabindex="-1" so it is a valid focus-return fallback target, expanded or collapsed', () => {
    const expandedWrapper = mountTracked(CollapsibleSection, { ...baseProps, expanded: true })
    expect(expandedWrapper.find('h2').attributes('tabindex')).toBe('-1')

    const collapsedWrapper = mountTracked(CollapsibleSection, { ...baseProps, expanded: false })
    expect(collapsedWrapper.find('h2').attributes('tabindex')).toBe('-1')
  })
})

describe('App', () => {
  it('renders a NowNextLaterBoard after the header', () => {
    const wrapper = mountTracked(App)
    const board = wrapper.findComponent(NowNextLaterBoard)

    expect(board.exists()).toBe(true)

    // Uses document order (not direct-children indices) since the Add Task modal's
    // background-hiding wrapper (App.vue's `.app-background`, a non-visual `display: contents`
    // grouping element) now sits between <main> and <header> — an incidental nesting-depth change,
    // not a change to the header/board's relative order this test actually cares about.
    const header = wrapper.find('header')
    expect(header.exists()).toBe(true)
    const position = header.element.compareDocumentPosition(board.element as Element)

    expect(Boolean(position & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)
  })

  it('has no accessibility violations', async () => {
    const wrapper = mountTracked(App)
    await expectNoAxeViolations(wrapper.element)
  })
})
