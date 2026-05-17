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
      await wrapper.findAll('input[type="date"]')[1].setValue('2025-12-01')
      await wrapper.find('.edit-form').trigger('submit')
      expect(mockUpdateTask).toHaveBeenCalledWith('task-1', expect.objectContaining({ dueDate: '2025-12-01' }))
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
})
