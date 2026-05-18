import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const { mockDeleteTask, mockUpdateTask, mockMoveTask, mockIsOverCapacity,
        mockAddSubtask, mockDeleteSubtask, mockToggleSubtask, mockCompleteTask } =
  vi.hoisted(() => ({
    mockDeleteTask: vi.fn(),
    mockUpdateTask: vi.fn(),
    mockMoveTask: vi.fn(),
    mockIsOverCapacity: vi.fn(() => false),
    mockAddSubtask: vi.fn(),
    mockDeleteSubtask: vi.fn(),
    mockToggleSubtask: vi.fn(),
    mockCompleteTask: vi.fn(),
  }))

vi.mock('../../../src/composables/useTasks.js', () => ({
  useTasks: () => ({
    deleteTask: mockDeleteTask,
    updateTask: mockUpdateTask,
    moveTask: mockMoveTask,
    isOverCapacity: mockIsOverCapacity,
    isNotYetAvailable: vi.fn(() => false),
    today: { value: new Date().toISOString().slice(0, 10) },
    moveTaskToColumn: vi.fn(),
    addSubtask: mockAddSubtask,
    deleteSubtask: mockDeleteSubtask,
    toggleSubtask: mockToggleSubtask,
    completeTask: mockCompleteTask,
  }),
}))

import TaskCard from '../../../src/components/TaskCard.vue'

const baseTask = {
  id: 'task-1',
  title: 'Write unit tests',
  energy: 'small',
  column: 'now',
  createdAt: 1000,
  dueDate: null,
  availableFrom: null,
  subtasks: [],
}

function makeTask(overrides = {}) {
  return { ...baseTask, ...overrides }
}

describe('task editing — components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsOverCapacity.mockReturnValue(false)
  })

  describe('entering edit mode', () => {
    it('shows the edit form when the edit button is clicked', async () => {
      const wrapper = mount(TaskCard, { props: { task: baseTask } })
      await wrapper.find('.edit-btn').trigger('click')
      expect(wrapper.find('.edit-form').exists()).toBe(true)
    })

    it('hides the display elements when editing', async () => {
      const wrapper = mount(TaskCard, { props: { task: baseTask } })
      await wrapper.find('.edit-btn').trigger('click')
      expect(wrapper.find('.task-title').exists()).toBe(false)
    })

    it('pre-fills the title input with the current title', async () => {
      const wrapper = mount(TaskCard, { props: { task: baseTask } })
      await wrapper.find('.edit-btn').trigger('click')
      expect(wrapper.find('.edit-title-input').element.value).toBe('Write unit tests')
    })

    it('pre-selects the current energy level', async () => {
      const wrapper = mount(TaskCard, { props: { task: baseTask } })
      await wrapper.find('.edit-btn').trigger('click')
      const smallBtn = wrapper.findAll('.energy-opt').find(b => b.text().toLowerCase() === 'small')
      expect(smallBtn.classes()).toContain('active')
    })

    it('pre-selects None when task has no energy', async () => {
      const wrapper = mount(TaskCard, { props: { task: makeTask({ energy: null }) } })
      await wrapper.find('.edit-btn').trigger('click')
      const noneBtn = wrapper.findAll('.energy-opt').find(b => b.text().toLowerCase() === 'none')
      expect(noneBtn.classes()).toContain('active')
    })
  })

  describe('saving edits', () => {
    it('calls updateTask with the new title on Save', async () => {
      const wrapper = mount(TaskCard, { props: { task: baseTask } })
      await wrapper.find('.edit-btn').trigger('click')
      await wrapper.find('.edit-title-input').setValue('Updated title')
      await wrapper.find('.edit-form').trigger('submit')
      expect(mockUpdateTask).toHaveBeenCalledWith('task-1', expect.objectContaining({ title: 'Updated title' }))
    })

    it('calls updateTask with the selected energy', async () => {
      const wrapper = mount(TaskCard, { props: { task: baseTask } })
      await wrapper.find('.edit-btn').trigger('click')
      const largeBtn = wrapper.findAll('.energy-opt').find(b => b.text().toLowerCase() === 'large')
      await largeBtn.trigger('click')
      await wrapper.find('.edit-form').trigger('submit')
      expect(mockUpdateTask).toHaveBeenCalledWith('task-1', expect.objectContaining({ energy: 'large' }))
    })

    it('calls updateTask with null energy when None is selected', async () => {
      const wrapper = mount(TaskCard, { props: { task: baseTask } })
      await wrapper.find('.edit-btn').trigger('click')
      const noneBtn = wrapper.findAll('.energy-opt').find(b => b.text().toLowerCase() === 'none')
      await noneBtn.trigger('click')
      await wrapper.find('.edit-form').trigger('submit')
      expect(mockUpdateTask).toHaveBeenCalledWith('task-1', expect.objectContaining({ energy: null }))
    })

    it('calls updateTask with the due date', async () => {
      const wrapper = mount(TaskCard, { props: { task: baseTask } })
      await wrapper.find('.edit-btn').trigger('click')
      await wrapper.find('[data-testid="due-date-input"]').setValue('2025-12-01')
      await wrapper.find('.edit-form').trigger('submit')
      expect(mockUpdateTask).toHaveBeenCalledWith('task-1', expect.objectContaining({ dueDate: '2025-12-01' }))
    })

    it('calls updateTask with the available-from date', async () => {
      const wrapper = mount(TaskCard, { props: { task: baseTask } })
      await wrapper.find('.edit-btn').trigger('click')
      await wrapper.find('[data-testid="available-from-input"]').setValue('2025-11-01')
      await wrapper.find('.edit-form').trigger('submit')
      expect(mockUpdateTask).toHaveBeenCalledWith('task-1', expect.objectContaining({ availableFrom: '2025-11-01' }))
    })

    it('does not call updateTask for a blank title', async () => {
      const wrapper = mount(TaskCard, { props: { task: baseTask } })
      await wrapper.find('.edit-btn').trigger('click')
      await wrapper.find('.edit-title-input').setValue('   ')
      await wrapper.find('.edit-form').trigger('submit')
      expect(mockUpdateTask).not.toHaveBeenCalled()
    })

    it('exits edit mode after a successful save', async () => {
      const wrapper = mount(TaskCard, { props: { task: baseTask } })
      await wrapper.find('.edit-btn').trigger('click')
      await wrapper.find('.edit-form').trigger('submit')
      expect(wrapper.find('.edit-form').exists()).toBe(false)
    })
  })

  describe('cancelling edits', () => {
    it('closes edit mode on Cancel without calling updateTask', async () => {
      const wrapper = mount(TaskCard, { props: { task: baseTask } })
      await wrapper.find('.edit-btn').trigger('click')
      await wrapper.find('.edit-title-input').setValue('Should not save')
      await wrapper.find('.btn-secondary').trigger('click')
      expect(mockUpdateTask).not.toHaveBeenCalled()
      expect(wrapper.find('.edit-form').exists()).toBe(false)
    })
  })

  describe('overdue alert icon', () => {
    const overdueTask = makeTask({ dueDate: '2020-01-01' })
    const futureTask = makeTask({ dueDate: '2099-12-31' })

    it('shows the alert icon when the task due date is in the past', () => {
      const wrapper = mount(TaskCard, { props: { task: overdueTask } })
      expect(wrapper.find('[data-testid="overdue-alert-btn"]').exists()).toBe(true)
    })

    it('does not show the alert icon when the task has no due date', () => {
      const wrapper = mount(TaskCard, { props: { task: baseTask } })
      expect(wrapper.find('[data-testid="overdue-alert-btn"]').exists()).toBe(false)
    })

    it('does not show the alert icon when the due date is in the future', () => {
      const wrapper = mount(TaskCard, { props: { task: futureTask } })
      expect(wrapper.find('[data-testid="overdue-alert-btn"]').exists()).toBe(false)
    })

    it('clicking the alert icon opens edit mode', async () => {
      const wrapper = mount(TaskCard, { props: { task: overdueTask } })
      await wrapper.find('[data-testid="overdue-alert-btn"]').trigger('click')
      expect(wrapper.find('.edit-form').exists()).toBe(true)
    })
  })

  describe('overdue message in edit mode', () => {
    const overdueTask = makeTask({ dueDate: '2020-01-01' })
    const futureTask = makeTask({ dueDate: '2099-12-31' })

    it('shows the overdue message when edit is opened on an overdue task via the alert icon', async () => {
      const wrapper = mount(TaskCard, { props: { task: overdueTask } })
      await wrapper.find('[data-testid="overdue-alert-btn"]').trigger('click')
      const msg = wrapper.find('.overdue-message')
      expect(msg.exists()).toBe(true)
      expect(msg.text().length).toBeGreaterThan(0)
    })

    it('shows the overdue message when edit is opened on an overdue task via the edit button', async () => {
      const wrapper = mount(TaskCard, { props: { task: overdueTask } })
      await wrapper.find('.edit-btn').trigger('click')
      expect(wrapper.find('.overdue-message').exists()).toBe(true)
    })

    it('does not show the overdue message when editing a task with no due date', async () => {
      const wrapper = mount(TaskCard, { props: { task: baseTask } })
      await wrapper.find('.edit-btn').trigger('click')
      expect(wrapper.find('.overdue-message').exists()).toBe(false)
    })

    it('does not show the overdue message when editing a task with a future due date', async () => {
      const wrapper = mount(TaskCard, { props: { task: futureTask } })
      await wrapper.find('.edit-btn').trigger('click')
      expect(wrapper.find('.overdue-message').exists()).toBe(false)
    })

    it('overdue message disappears after saving the edit', async () => {
      const wrapper = mount(TaskCard, { props: { task: overdueTask } })
      await wrapper.find('[data-testid="overdue-alert-btn"]').trigger('click')
      expect(wrapper.find('.overdue-message').exists()).toBe(true)
      await wrapper.find('.edit-form').trigger('submit')
      expect(wrapper.find('.overdue-message').exists()).toBe(false)
    })

    it('overdue message disappears after cancelling the edit', async () => {
      const wrapper = mount(TaskCard, { props: { task: overdueTask } })
      await wrapper.find('[data-testid="overdue-alert-btn"]').trigger('click')
      expect(wrapper.find('.overdue-message').exists()).toBe(true)
      await wrapper.find('.btn-secondary').trigger('click')
      expect(wrapper.find('.overdue-message').exists()).toBe(false)
    })
  })
})
