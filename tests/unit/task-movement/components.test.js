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
const nextColumn = { id: 'next', label: 'Next' }
const futureColumn = { id: 'future', label: 'Future' }

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

describe('task movement — components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTasksForColumn.mockReturnValue([])
    mockIsOverCapacity.mockReturnValue(false)
  })

  describe('TaskCard — move buttons', () => {
    it('calls moveTask(-1) when move-prev button is clicked', async () => {
      const wrapper = mount(TaskCard, { props: { task: baseTask } })
      await wrapper.find('.move-prev-btn').trigger('click')
      expect(mockMoveTask).toHaveBeenCalledWith('task-1', -1)
    })

    it('calls moveTask(+1) when move-next button is clicked', async () => {
      const wrapper = mount(TaskCard, { props: { task: baseTask } })
      await wrapper.find('.move-next-btn').trigger('click')
      expect(mockMoveTask).toHaveBeenCalledWith('task-1', 1)
    })

    it('disables move-prev when isFirst is true', () => {
      const wrapper = mount(TaskCard, { props: { task: baseTask, isFirst: true } })
      expect(wrapper.find('.move-prev-btn').element.disabled).toBe(true)
    })

    it('disables move-next when isLast is true', () => {
      const wrapper = mount(TaskCard, { props: { task: baseTask, isLast: true } })
      expect(wrapper.find('.move-next-btn').element.disabled).toBe(true)
    })
  })

  describe('TaskColumn — isFirst / isLast props', () => {
    it('passes isFirst=true to TaskCards in the Now column', () => {
      mockTasksForColumn.mockReturnValue([
        { id: '1', title: 'Task', energy: null, column: 'now', createdAt: 1, dueDate: null, availableFrom: null, subtasks: [] },
      ])
      const wrapper = mount(TaskColumn, { props: { column: nowColumn } })
      expect(wrapper.findComponent({ name: 'TaskCard' }).props('isFirst')).toBe(true)
      expect(wrapper.findComponent({ name: 'TaskCard' }).props('isLast')).toBe(false)
    })

    it('passes isLast=true to TaskCards in the Future column', () => {
      mockTasksForColumn.mockReturnValue([
        { id: '1', title: 'Task', energy: null, column: 'future', createdAt: 1, dueDate: null, availableFrom: null, subtasks: [] },
      ])
      const wrapper = mount(TaskColumn, { props: { column: futureColumn } })
      expect(wrapper.findComponent({ name: 'TaskCard' }).props('isFirst')).toBe(false)
      expect(wrapper.findComponent({ name: 'TaskCard' }).props('isLast')).toBe(true)
    })

    it('passes isFirst=false and isLast=false to TaskCards in the Next column', () => {
      mockTasksForColumn.mockReturnValue([
        { id: '1', title: 'Task', energy: null, column: 'next', createdAt: 1, dueDate: null, availableFrom: null, subtasks: [] },
      ])
      const wrapper = mount(TaskColumn, { props: { column: nextColumn } })
      expect(wrapper.findComponent({ name: 'TaskCard' }).props('isFirst')).toBe(false)
      expect(wrapper.findComponent({ name: 'TaskCard' }).props('isLast')).toBe(false)
    })
  })
})
