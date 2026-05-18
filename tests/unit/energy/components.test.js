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

describe('energy — components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTasksForColumn.mockReturnValue([])
    mockIsOverCapacity.mockReturnValue(false)
  })

  describe('TaskCard — energy badge', () => {
    it('shows the energy badge when energy is set', () => {
      const wrapper = mount(TaskCard, { props: { task: baseTask } })
      expect(wrapper.find('.energy-badge').exists()).toBe(true)
      expect(wrapper.find('.energy-badge').text()).toBe('small')
    })

    it('hides the energy badge when energy is null', () => {
      const wrapper = mount(TaskCard, { props: { task: makeTask({ energy: null }) } })
      expect(wrapper.find('.energy-badge').exists()).toBe(false)
    })
  })

  describe('TaskCard — over-capacity', () => {
    it('applies over-capacity class when task exceeds current energy', () => {
      mockIsOverCapacity.mockReturnValue(true)
      const wrapper = mount(TaskCard, { props: { task: baseTask } })
      expect(wrapper.classes()).toContain('over-capacity')
    })

    it('does not apply over-capacity class when within energy', () => {
      const wrapper = mount(TaskCard, { props: { task: baseTask } })
      expect(wrapper.classes()).not.toContain('over-capacity')
    })
  })

  describe('TaskColumn — energy picker in add form', () => {
    it('passes null energy when None is selected', async () => {
      const wrapper = mount(TaskColumn, { props: { column: nowColumn } })
      await wrapper.find('.add-task-btn').trigger('click')
      await wrapper.find('.task-input').setValue('Task')
      // None is selected by default
      await wrapper.find('.add-task-form').trigger('submit')
      expect(mockAddTask).toHaveBeenCalledWith('Task', 'now', expect.objectContaining({ energy: null }))
    })

    it('passes the selected energy to addTask', async () => {
      const wrapper = mount(TaskColumn, { props: { column: nextColumn } })
      await wrapper.find('.add-task-btn').trigger('click')
      await wrapper.find('.task-input').setValue('Big task')
      const largeBtn = wrapper.findAll('.energy-opt').find(b => b.text().toLowerCase() === 'large')
      await largeBtn.trigger('click')
      await wrapper.find('.add-task-form').trigger('submit')
      expect(mockAddTask).toHaveBeenCalledWith('Big task', 'next', expect.objectContaining({ energy: 'large' }))
    })
  })
})
