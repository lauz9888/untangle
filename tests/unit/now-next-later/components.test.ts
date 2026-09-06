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

    const main = wrapper.find('main')
    const children = Array.from(main.element.children)
    const headerIndex = children.findIndex((el) => el.tagName.toLowerCase() === 'header')
    const boardIndex = children.indexOf(board.element as Element)

    expect(headerIndex).toBeGreaterThanOrEqual(0)
    expect(boardIndex).toBeGreaterThan(headerIndex)
  })

  it('has no accessibility violations', async () => {
    const wrapper = mountTracked(App)
    await expectNoAxeViolations(wrapper.element)
  })
})
