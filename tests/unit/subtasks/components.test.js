import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const { mockAddTask, mockTasksForColumn, mockIsOverCapacity, mockDeleteTask,
        mockUpdateTask, mockMoveTask, mockMoveTaskToColumn,
        mockAddSubtask, mockDeleteSubtask, mockToggleSubtask, mockCompleteTask } =
  vi.hoisted(() => ({
    mockAddTask: vi.fn(),
    mockTasksForColumn: vi.fn(() => []),
    mockIsOverCapacity: vi.fn(() => false),
    mockDeleteTask: vi.fn(),
    mockUpdateTask: vi.fn(),
    mockMoveTask: vi.fn(),
    mockMoveTaskToColumn: vi.fn(),
    mockAddSubtask: vi.fn(),
    mockDeleteSubtask: vi.fn(),
    mockToggleSubtask: vi.fn(),
    mockCompleteTask: vi.fn(),
  }))

vi.mock('../../../src/composables/useTasks.js', () => ({
  useTasks: () => ({
    addTask: mockAddTask,
    tasksForColumn: mockTasksForColumn,
    isOverCapacity: mockIsOverCapacity,
    isNotYetAvailable: vi.fn(() => false),
    today: { value: new Date().toISOString().slice(0, 10) },
    deleteTask: mockDeleteTask,
    updateTask: mockUpdateTask,
    moveTask: mockMoveTask,
    moveTaskToColumn: mockMoveTaskToColumn,
    addSubtask: mockAddSubtask,
    deleteSubtask: mockDeleteSubtask,
    toggleSubtask: mockToggleSubtask,
    completeTask: mockCompleteTask,
    tasks: ref([]),
    currentEnergy: ref('medium'),
  }),
}))

import TaskCard from '../../../src/components/TaskCard.vue'
import TaskColumn from '../../../src/components/TaskColumn.vue'

const nowColumn = { id: 'now', label: 'Now' }

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

describe('subtasks — components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTasksForColumn.mockReturnValue([])
    mockIsOverCapacity.mockReturnValue(false)
  })

  describe('TaskCard — subtask display', () => {
    it('shows the subtask progress bar when subtasks exist', () => {
      const task = makeTask({
        subtasks: [
          { id: 's1', title: 'Step one', done: true },
          { id: 's2', title: 'Step two', done: false },
        ],
      })
      const wrapper = mount(TaskCard, { props: { task } })
      expect(wrapper.find('.subtask-bar').exists()).toBe(true)
      expect(wrapper.find('.subtask-count').text()).toBe('1/2')
    })

    it('hides the subtask bar when there are no subtasks', () => {
      const wrapper = mount(TaskCard, { props: { task: baseTask } })
      expect(wrapper.find('.subtask-bar').exists()).toBe(false)
    })
  })

  describe('TaskCard — subtask management in edit mode', () => {
    it('shows existing subtasks in edit mode', async () => {
      const task = makeTask({
        subtasks: [{ id: 's1', title: 'Step one', done: false }],
      })
      const wrapper = mount(TaskCard, { props: { task } })
      await wrapper.find('.edit-btn').trigger('click')
      expect(wrapper.find('.subtask-title').text()).toBe('Step one')
    })

    it('calls addSubtask when Add subtask button is clicked', async () => {
      const wrapper = mount(TaskCard, { props: { task: baseTask } })
      await wrapper.find('.edit-btn').trigger('click')
      await wrapper.find('.subtask-input').setValue('New step')
      await wrapper.find('.btn-subtle').trigger('click')
      expect(mockAddSubtask).toHaveBeenCalledWith('task-1', 'New step')
    })

    it('calls addSubtask on Enter in the subtask input', async () => {
      const wrapper = mount(TaskCard, { props: { task: baseTask } })
      await wrapper.find('.edit-btn').trigger('click')
      await wrapper.find('.subtask-input').setValue('Enter step')
      await wrapper.find('.subtask-input').trigger('keydown.enter')
      expect(mockAddSubtask).toHaveBeenCalledWith('task-1', 'Enter step')
    })

    it('calls deleteSubtask when the subtask delete button is clicked', async () => {
      const task = makeTask({
        subtasks: [{ id: 's1', title: 'Step one', done: false }],
      })
      const wrapper = mount(TaskCard, { props: { task } })
      await wrapper.find('.edit-btn').trigger('click')
      await wrapper.find('.subtask-delete-btn').trigger('click')
      expect(mockDeleteSubtask).toHaveBeenCalledWith('task-1', 's1')
    })

    it('calls toggleSubtask when a subtask checkbox is changed', async () => {
      const task = makeTask({
        subtasks: [{ id: 's1', title: 'Step one', done: false }],
      })
      const wrapper = mount(TaskCard, { props: { task } })
      await wrapper.find('.edit-btn').trigger('click')
      await wrapper.find('input[type="checkbox"]').trigger('change')
      expect(mockToggleSubtask).toHaveBeenCalledWith('task-1', 's1')
    })

    it('applies done class to completed subtask titles', async () => {
      const task = makeTask({
        subtasks: [{ id: 's1', title: 'Done step', done: true }],
      })
      const wrapper = mount(TaskCard, { props: { task } })
      await wrapper.find('.edit-btn').trigger('click')
      expect(wrapper.find('.subtask-title').classes()).toContain('done')
    })
  })

  describe('TaskColumn — pending subtasks in add form', () => {
    it('adds a pending subtask when Add button is clicked', async () => {
      const wrapper = mount(TaskColumn, { props: { column: nowColumn } })
      await wrapper.find('.add-task-btn').trigger('click')
      await wrapper.find('.subtask-input').setValue('Subtask one')
      await wrapper.find('.btn-subtle').trigger('click')
      expect(wrapper.find('.pending-subtask-item').text()).toContain('Subtask one')
    })

    it('includes pending subtasks in the addTask call', async () => {
      const wrapper = mount(TaskColumn, { props: { column: nowColumn } })
      await wrapper.find('.add-task-btn').trigger('click')
      await wrapper.find('.task-input').setValue('Task with subs')
      await wrapper.find('.subtask-input').setValue('Step A')
      await wrapper.find('.btn-subtle').trigger('click')
      await wrapper.find('.add-task-form').trigger('submit')
      expect(mockAddTask).toHaveBeenCalledWith('Task with subs', 'now', expect.objectContaining({
        subtasks: ['Step A'],
      }))
    })

    it('removes a pending subtask when its remove button is clicked', async () => {
      const wrapper = mount(TaskColumn, { props: { column: nowColumn } })
      await wrapper.find('.add-task-btn').trigger('click')
      await wrapper.find('.subtask-input').setValue('Removable')
      await wrapper.find('.btn-subtle').trigger('click')
      expect(wrapper.find('.pending-subtask-item').exists()).toBe(true)
      await wrapper.find('.subtask-remove-btn').trigger('click')
      expect(wrapper.find('.pending-subtask-item').exists()).toBe(false)
    })
  })
})
