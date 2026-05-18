import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

// var is fully hoisted (initialised to undefined before module body runs).
// The vi.mock factory runs after imports so ref() is available inside it.
// eslint-disable-next-line no-var
var mockTasks

vi.mock('../../../src/composables/useTasks.js', () => {
  mockTasks = ref([])
  return { useTasks: () => ({ tasks: mockTasks }) }
})

import HistoryPanel from '../../../src/components/HistoryPanel.vue'

function completedTask(daysAgo) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return { id: String(Math.random()), completedAt: d.getTime() }
}

describe('HistoryPanel — components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTasks.value = []
  })

  describe('empty state', () => {
    it('shows empty message when no tasks have been completed', () => {
      const wrapper = mount(HistoryPanel)
      expect(wrapper.text()).toContain('No tasks completed yet.')
    })

    it('does not render the bar chart when there are no completed tasks', () => {
      const wrapper = mount(HistoryPanel)
      expect(wrapper.find('.bar-chart').exists()).toBe(false)
    })

    it('does not render the best-week section when there are no completed tasks', () => {
      const wrapper = mount(HistoryPanel)
      expect(wrapper.find('.best-week').exists()).toBe(false)
    })
  })

  describe('with completed tasks', () => {
    beforeEach(() => {
      mockTasks.value = [
        completedTask(0),
        completedTask(1),
        completedTask(8),
      ]
    })

    it('renders the bar chart', () => {
      const wrapper = mount(HistoryPanel)
      expect(wrapper.find('.bar-chart').exists()).toBe(true)
    })

    it('renders four weekly columns', () => {
      const wrapper = mount(HistoryPanel)
      expect(wrapper.findAll('.bar-col').length).toBe(4)
    })

    it('renders the best-week section', () => {
      const wrapper = mount(HistoryPanel)
      expect(wrapper.find('.best-week').exists()).toBe(true)
    })

    it('bar-chart has a descriptive aria-label', () => {
      const wrapper = mount(HistoryPanel)
      const chart = wrapper.find('.bar-chart')
      expect(chart.attributes('aria-label')).toContain('tasks completed')
    })
  })

  describe('accessibility', () => {
    it('has role=dialog on the panel', () => {
      const wrapper = mount(HistoryPanel)
      expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    })

    it('has aria-modal=true on the panel', () => {
      const wrapper = mount(HistoryPanel)
      expect(wrapper.find('[aria-modal="true"]').exists()).toBe(true)
    })
  })

  describe('close interactions', () => {
    it('emits close when the close button is clicked', async () => {
      const wrapper = mount(HistoryPanel)
      await wrapper.find('.panel-close').trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('emits close when the overlay backdrop is clicked', async () => {
      const wrapper = mount(HistoryPanel)
      await wrapper.find('.history-overlay').trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('does not emit close when the panel itself is clicked', async () => {
      const wrapper = mount(HistoryPanel)
      await wrapper.find('.history-panel').trigger('click')
      // click.self on the overlay means clicking the inner panel should NOT close
      expect(wrapper.emitted('close')).toBeFalsy()
    })
  })
})
