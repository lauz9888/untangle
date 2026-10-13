import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { axe } from 'jest-axe'
import CompletedButton from '../../../src/components/CompletedButton.vue'
import CompletedTasksPanel from '../../../src/components/CompletedTasksPanel.vue'

// toHaveNoViolations matcher is registered globally in vitest.setup.ts.
// Mirrors .claude/STANDARDS.md's WCAG conformance scope.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

// jsdom has no real rendering engine to evaluate color-contrast against;
// that check is covered at the e2e/Storybook layers instead.
async function expectNoAxeViolations(root: Element) {
  const results = await axe(root, {
    runOnly: { type: 'tag', values: WCAG_TAGS },
    rules: { 'color-contrast': { enabled: false } },
  })
  expect(results).toHaveNoViolations()
}

interface FakeTask {
  id: number
  name: string
  section: 'now' | 'next' | 'later'
  done: boolean
  createdAt: number
  updatedAt: number
}

function makeDone(id: number, name: string): FakeTask {
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

vi.mock('../../../src/composables/useCompletedPanel', () => ({
  useCompletedPanel: () => panelState,
}))

const detailState = {
  isOpen: ref(false),
  openedFrom: ref<'board' | 'completed'>('board'),
  lastOpenedTaskId: ref<number | null>(null),
  lastOpenedTaskSection: ref<'now' | 'next' | 'later' | null>(null),
  open: vi.fn(),
}

vi.mock('../../../src/composables/useTaskDetail', () => ({
  useTaskDetail: () => detailState,
}))

let mountedWrappers: VueWrapper[] = []

function mountTracked(component: Parameters<typeof mount>[0]) {
  const wrapper = mount(component, { attachTo: document.body })
  mountedWrappers.push(wrapper)
  return wrapper
}

function setTasks(tasks: FakeTask[]) {
  panelState.completedTasks.value = tasks
  panelState.completedCount.value = tasks.length
}

function keydown(el: Element, init: KeyboardEventInit) {
  el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }))
}

beforeEach(() => {
  panelState.isOpen.value = true
  setTasks([])
  panelState.open.mockReset()
  panelState.close.mockReset()
  panelState.uncomplete.mockReset()
  panelState.openTask.mockReset()
  detailState.isOpen.value = false
  detailState.openedFrom.value = 'board'
  detailState.lastOpenedTaskId.value = null
})

afterEach(() => {
  mountedWrappers.forEach((w) => w.unmount())
  mountedWrappers = []
})

describe('CompletedButton', () => {
  it.each([0, 3])('shows "Completed (%i)" as both visible text and accessible name', (count) => {
    panelState.completedCount.value = count
    const wrapper = mountTracked(CompletedButton)
    const button = wrapper.find('button')
    expect(button.text()).toBe(`Completed (${count})`)
    expect(button.attributes('type')).toBe('button')
    expect(button.attributes('aria-label')).toBeUndefined()
  })

  it('declares aria-haspopup="dialog"', () => {
    const wrapper = mountTracked(CompletedButton)
    expect(wrapper.find('button').attributes('aria-haspopup')).toBe('dialog')
  })

  it('updates its text when the count changes', async () => {
    const wrapper = mountTracked(CompletedButton)
    panelState.completedCount.value = 2
    await nextTick()
    expect(wrapper.find('button').text()).toBe('Completed (2)')
  })

  it('clicking calls open', async () => {
    const wrapper = mountTracked(CompletedButton)
    await wrapper.find('button').trigger('click')
    expect(panelState.open).toHaveBeenCalled()
  })

  it('takes focus when the panel closes (isOpen true -> false)', async () => {
    panelState.isOpen.value = true
    const wrapper = mountTracked(CompletedButton)
    panelState.isOpen.value = false
    await nextTick()
    await nextTick()
    expect(document.activeElement).toBe(wrapper.find('button').element)
  })

  it('does not steal focus when the panel opens', async () => {
    panelState.isOpen.value = false
    const wrapper = mountTracked(CompletedButton)
    panelState.isOpen.value = true
    await nextTick()
    await nextTick()
    expect(document.activeElement).not.toBe(wrapper.find('button').element)
  })

  it('has no accessibility violations with count 0', async () => {
    panelState.completedCount.value = 0
    const wrapper = mountTracked(CompletedButton)
    await expectNoAxeViolations(wrapper.element)
  })

  it('has no accessibility violations with count > 0', async () => {
    panelState.completedCount.value = 3
    const wrapper = mountTracked(CompletedButton)
    await expectNoAxeViolations(wrapper.element)
  })

  it('has no accessibility violations with a 3-digit count (999)', async () => {
    panelState.completedCount.value = 999
    const wrapper = mountTracked(CompletedButton)
    expect(wrapper.find('button').text()).toBe('Completed (999)')
    await expectNoAxeViolations(wrapper.element)
  })
})

describe('CompletedTasksPanel', () => {
  it('renders a labelled modal dialog whose name is "Completed tasks"', () => {
    const wrapper = mountTracked(CompletedTasksPanel)
    const dialog = wrapper.find('[role="dialog"]')
    expect(dialog.exists()).toBe(true)
    expect(dialog.attributes('aria-modal')).toBe('true')
    const labelId = dialog.attributes('aria-labelledby')!
    expect(labelId).toBeTruthy()
    expect(document.getElementById(labelId)!.textContent?.trim()).toBe('Completed tasks')
  })

  it('focuses the close (X) button on mount', async () => {
    const wrapper = mountTracked(CompletedTasksPanel)
    await nextTick()
    await nextTick()
    const close = wrapper.find('button.close-button')
    expect(close.attributes('aria-label')).toBe('Close')
    expect(document.activeElement).toBe(close.element)
  })

  it('shows the empty-state text and no list when there are no completed tasks', () => {
    const wrapper = mountTracked(CompletedTasksPanel)
    expect(wrapper.find('.completed-empty').text()).toBe('No completed tasks yet')
    expect(wrapper.find('ul').exists()).toBe(false)
  })

  it('renders each completed task as an li in a ul, in the given order', () => {
    setTasks([makeDone(2, 'Second'), makeDone(1, 'First')])
    const wrapper = mountTracked(CompletedTasksPanel)
    expect(wrapper.find('.completed-empty').exists()).toBe(false)
    const items = wrapper.findAll('ul > li')
    expect(items).toHaveLength(2)
    expect(items[0]!.text()).toContain('Second')
    expect(items[1]!.text()).toContain('First')
  })

  it('renders a checked checkbox labelled with the task name and a line-through name button', () => {
    setTasks([makeDone(1, 'First')])
    const wrapper = mountTracked(CompletedTasksPanel)
    const checkbox = wrapper.find('input[type="checkbox"]')
    expect((checkbox.element as HTMLInputElement).checked).toBe(true)
    expect(checkbox.attributes('aria-label')).toBe('First')
    const button = wrapper.find('button.completed-open-button')
    expect(button.text()).toBe('First')
    expect(button.classes()).toContain('task-name--done')
  })

  it('clicking a row button calls openTask(id)', async () => {
    setTasks([makeDone(4, 'First')])
    const wrapper = mountTracked(CompletedTasksPanel)
    await wrapper.find('button.completed-open-button').trigger('click')
    expect(panelState.openTask).toHaveBeenCalledWith(4)
  })

  it('X click, Escape, and backdrop click each call close', async () => {
    const wrapper = mountTracked(CompletedTasksPanel)
    await wrapper.find('button.close-button').trigger('click')
    expect(panelState.close).toHaveBeenCalledTimes(1)

    keydown(wrapper.find('.completed-content').element, { key: 'Escape' })
    expect(panelState.close).toHaveBeenCalledTimes(2)

    await wrapper.find('.completed-overlay').trigger('click')
    expect(panelState.close).toHaveBeenCalledTimes(3)
  })

  it('a click inside the content does not close', async () => {
    const wrapper = mountTracked(CompletedTasksPanel)
    await wrapper.find('.completed-content').trigger('click')
    expect(panelState.close).not.toHaveBeenCalled()
  })

  it('Tab cycles focus within the dialog (last -> first, Shift+Tab first -> last)', async () => {
    setTasks([makeDone(1, 'First')])
    const wrapper = mountTracked(CompletedTasksPanel)
    await nextTick()
    await nextTick()
    const content = wrapper.find('.completed-content').element
    const focusables = Array.from(content.querySelectorAll<HTMLElement>('button, input')).filter(
      (el) => !el.hasAttribute('disabled')
    )
    const first = focusables[0]!
    const last = focusables[focusables.length - 1]!

    last.focus()
    keydown(content, { key: 'Tab' })
    expect(document.activeElement).toBe(first)

    first.focus()
    keydown(content, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)
  })

  describe('uncheck', () => {
    async function uncheck(wrapper: VueWrapper, index: number) {
      const boxes = wrapper.findAll('input[type="checkbox"]')
      await boxes[index]!.trigger('change')
      await nextTick()
      await nextTick()
    }

    it('calls uncomplete(id)', async () => {
      setTasks([makeDone(1, 'A'), makeDone(2, 'B')])
      const wrapper = mountTracked(CompletedTasksPanel)
      await uncheck(wrapper, 1)
      expect(panelState.uncomplete).toHaveBeenCalledWith(2)
    })

    it('focuses the next row checkbox after removal', async () => {
      setTasks([makeDone(1, 'A'), makeDone(2, 'B'), makeDone(3, 'C')])
      const wrapper = mountTracked(CompletedTasksPanel)
      panelState.uncomplete.mockImplementation((id: number) =>
        setTasks(panelState.completedTasks.value.filter((t) => t.id !== id))
      )
      await uncheck(wrapper, 1)
      expect(document.activeElement).toBe(wrapper.find('input[aria-label="C"]').element)
    })

    it('focuses the previous row checkbox when the last row is removed', async () => {
      setTasks([makeDone(1, 'A'), makeDone(2, 'B')])
      const wrapper = mountTracked(CompletedTasksPanel)
      panelState.uncomplete.mockImplementation((id: number) =>
        setTasks(panelState.completedTasks.value.filter((t) => t.id !== id))
      )
      await uncheck(wrapper, 1)
      expect(document.activeElement).toBe(wrapper.find('input[aria-label="A"]').element)
    })

    it('focuses the X button when the only row is removed', async () => {
      setTasks([makeDone(1, 'A')])
      const wrapper = mountTracked(CompletedTasksPanel)
      panelState.uncomplete.mockImplementation((id: number) =>
        setTasks(panelState.completedTasks.value.filter((t) => t.id !== id))
      )
      await uncheck(wrapper, 0)
      expect(document.activeElement).toBe(wrapper.find('button.close-button').element)
    })
  })

  describe('stacked under Task Detail', () => {
    it('is inert and aria-hidden while Task Detail is open, and ignores Escape', async () => {
      const wrapper = mountTracked(CompletedTasksPanel)
      detailState.isOpen.value = true
      await nextTick()
      const overlay = wrapper.find('.completed-overlay')
      expect(overlay.attributes('inert')).toBeDefined()
      expect(overlay.attributes('aria-hidden')).toBe('true')

      keydown(wrapper.find('.completed-content').element, { key: 'Escape' })
      expect(panelState.close).not.toHaveBeenCalled()
    })

    it('is not inert or aria-hidden when Task Detail is closed', () => {
      const wrapper = mountTracked(CompletedTasksPanel)
      const overlay = wrapper.find('.completed-overlay')
      expect(overlay.attributes('inert')).toBeUndefined()
      expect(overlay.attributes('aria-hidden')).toBeUndefined()
    })

    it("returns focus to the row button when Task Detail closes (origin 'completed', task still listed)", async () => {
      setTasks([makeDone(1, 'A'), makeDone(2, 'B')])
      const wrapper = mountTracked(CompletedTasksPanel)
      detailState.openedFrom.value = 'completed'
      detailState.lastOpenedTaskId.value = 2
      detailState.isOpen.value = true
      await nextTick()
      detailState.isOpen.value = false
      await nextTick()
      await nextTick()
      const rows = wrapper.findAll('button.completed-open-button')
      expect(document.activeElement).toBe(rows[1]!.element)
    })

    it("returns focus to the X button when the task is no longer listed (origin 'completed')", async () => {
      setTasks([makeDone(1, 'A')])
      const wrapper = mountTracked(CompletedTasksPanel)
      detailState.openedFrom.value = 'completed'
      detailState.lastOpenedTaskId.value = 99
      detailState.isOpen.value = true
      await nextTick()
      detailState.isOpen.value = false
      await nextTick()
      await nextTick()
      expect(document.activeElement).toBe(wrapper.find('button.close-button').element)
    })

    it("does not move focus when Task Detail closes with origin 'board'", async () => {
      setTasks([makeDone(1, 'A')])
      const outside = document.createElement('button')
      document.body.appendChild(outside)
      const wrapper = mountTracked(CompletedTasksPanel)
      await nextTick()
      outside.focus()
      detailState.openedFrom.value = 'board'
      detailState.lastOpenedTaskId.value = 1
      detailState.isOpen.value = true
      await nextTick()
      detailState.isOpen.value = false
      await nextTick()
      await nextTick()
      expect(wrapper.exists()).toBe(true)
      expect(document.activeElement).toBe(outside)
      outside.remove()
    })
  })

  describe('accessibility', () => {
    it('has no violations when empty', async () => {
      const wrapper = mountTracked(CompletedTasksPanel)
      await expectNoAxeViolations(wrapper.element)
    })

    it('has no violations when populated', async () => {
      setTasks([makeDone(1, 'First'), makeDone(2, 'Second')])
      const wrapper = mountTracked(CompletedTasksPanel)
      await expectNoAxeViolations(wrapper.element)
    })

    it('has no violations while stacked under Task Detail (inert)', async () => {
      setTasks([makeDone(1, 'First')])
      detailState.isOpen.value = true
      const wrapper = mountTracked(CompletedTasksPanel)
      await nextTick()
      await expectNoAxeViolations(wrapper.element)
    })
  })
})
