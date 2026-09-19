import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { reactive, ref } from 'vue'
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

vi.mock('../../../src/composables/useTasks', () => ({
  useTasks: () => tasksState,
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

  it.each([
    ['Now', 'now'],
    ['Next', 'next'],
    ['Later', 'later'],
  ])('clicking the %s toggle button calls toggle with its key', async (_label, key) => {
    const wrapper = mountTracked(NowNextLaterBoard)
    const sections = wrapper.findAllComponents(CollapsibleSection)
    const target = sections.find((section) => section.props('sectionKey') === key)!

    await target.find('button').trigger('click')

    expect(sectionState.toggle).toHaveBeenCalledWith(key)
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

    it("a task's checkbox reflects task.done (checked/unchecked)", () => {
      tasksState.tasks.value = [
        { id: 1, name: 'Buy milk', section: 'now', done: false, createdAt: 1 },
        { id: 2, name: 'Bring bins', section: 'now', done: true, createdAt: 2 },
      ]
      const wrapper = mountTracked(NowNextLaterBoard)
      const checkboxes = wrapper.findAll('input[type="checkbox"]')

      const incomplete = checkboxes.find(
        (c) => (c.element as HTMLInputElement).id === 'task-1-done'
      )!
      const complete = checkboxes.find((c) => (c.element as HTMLInputElement).id === 'task-2-done')!

      expect((incomplete.element as HTMLInputElement).checked).toBe(false)
      expect((complete.element as HTMLInputElement).checked).toBe(true)
    })

    it("clicking/toggling a task's checkbox calls toggleTaskDone(id) with the correct id", async () => {
      tasksState.tasks.value = [
        { id: 7, name: 'Buy milk', section: 'now', done: false, createdAt: 1 },
      ]
      const wrapper = mountTracked(NowNextLaterBoard)

      await wrapper.find('#task-7-done').setValue(true)

      expect(tasksState.toggleTaskDone).toHaveBeenCalledWith(7)
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

    it('has no accessibility violations with a section rendering one completed task', async () => {
      tasksState.tasks.value = [
        { id: 1, name: 'Buy milk', section: 'now', done: true, createdAt: 1 },
      ]
      const wrapper = mountTracked(NowNextLaterBoard)
      await expectNoAxeViolations(wrapper.element)
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

  it('emits toggle when the button is clicked', async () => {
    const wrapper = mountTracked(CollapsibleSection, baseProps)

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('toggle')).toHaveLength(1)
  })

  it('has no accessibility violations when expanded', async () => {
    const wrapper = mountTracked(CollapsibleSection, { ...baseProps, expanded: true })
    await expectNoAxeViolations(wrapper.element)
  })

  it('has no accessibility violations when collapsed', async () => {
    const wrapper = mountTracked(CollapsibleSection, { ...baseProps, expanded: false })
    await expectNoAxeViolations(wrapper.element)
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
