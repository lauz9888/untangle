import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const { mockAddTask, mockTasksForColumn, mockIsOverCapacity, mockDeleteTask,
        mockUpdateTask, mockMoveTask, mockMoveTaskToColumn,
        mockAddSubtask, mockDeleteSubtask, mockToggleSubtask, mockCompleteTask,
        mockShowCelebration, mockShowMilestone } =
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
    mockShowCelebration: vi.fn(),
    mockShowMilestone: vi.fn(),
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

vi.mock('../../../src/composables/useCelebration.js', () => ({
  STREAK_MILESTONES: [1, 3, 7, 30, 90, 180, 365],
  useCelebration: () => ({
    showCelebration: mockShowCelebration,
    showMilestone: mockShowMilestone,
    dismiss: vi.fn(),
    popup: ref(null),
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

describe('task management — components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTasksForColumn.mockReturnValue([])
    mockIsOverCapacity.mockReturnValue(false)
  })

  describe('TaskColumn — column structure', () => {
    it('renders the column header', () => {
      const wrapper = mount(TaskColumn, { props: { column: nowColumn } })
      expect(wrapper.find('.column-header').text()).toBe('Now')
    })

    it('sets the data-column attribute', () => {
      const wrapper = mount(TaskColumn, { props: { column: nowColumn } })
      expect(wrapper.attributes('data-column')).toBe('now')
    })

    it('renders tasks returned by tasksForColumn', () => {
      mockTasksForColumn.mockReturnValue([
        { id: '1', title: 'Task Alpha', energy: null, column: 'now', createdAt: 1, dueDate: null, availableFrom: null, subtasks: [] },
      ])
      const wrapper = mount(TaskColumn, { props: { column: nowColumn } })
      expect(wrapper.text()).toContain('Task Alpha')
    })

    it('shows empty hint when there are no tasks', () => {
      const wrapper = mount(TaskColumn, { props: { column: nowColumn } })
      expect(wrapper.text()).toContain('No tasks yet')
    })
  })

  describe('TaskColumn — add task form', () => {
    it('shows the Add task button initially', () => {
      const wrapper = mount(TaskColumn, { props: { column: nowColumn } })
      expect(wrapper.find('[data-testid="add-task-btn"]').exists()).toBe(true)
    })

    it('hides the form initially', () => {
      const wrapper = mount(TaskColumn, { props: { column: nowColumn } })
      expect(wrapper.find('[data-testid="add-task-form"]').exists()).toBe(false)
    })

    it('shows the form when Add task is clicked', async () => {
      const wrapper = mount(TaskColumn, { props: { column: nowColumn } })
      await wrapper.find('[data-testid="add-task-btn"]').trigger('click')
      expect(wrapper.find('[data-testid="add-task-form"]').exists()).toBe(true)
    })

    it('hides the Add task button when the form is open', async () => {
      const wrapper = mount(TaskColumn, { props: { column: nowColumn } })
      await wrapper.find('[data-testid="add-task-btn"]').trigger('click')
      expect(wrapper.find('[data-testid="add-task-btn"]').exists()).toBe(false)
    })

    it('calls addTask with title and column on submit', async () => {
      const wrapper = mount(TaskColumn, { props: { column: nowColumn } })
      await wrapper.find('[data-testid="add-task-btn"]').trigger('click')
      await wrapper.find('[data-testid="task-input"]').setValue('My new task')
      await wrapper.find('[data-testid="add-task-form"]').trigger('submit')
      expect(mockAddTask).toHaveBeenCalledWith('My new task', 'now', expect.any(Object))
    })

    it('hides the form after a successful submit', async () => {
      const wrapper = mount(TaskColumn, { props: { column: nowColumn } })
      await wrapper.find('[data-testid="add-task-btn"]').trigger('click')
      await wrapper.find('[data-testid="task-input"]').setValue('Task')
      await wrapper.find('[data-testid="add-task-form"]').trigger('submit')
      expect(wrapper.find('[data-testid="add-task-form"]').exists()).toBe(false)
    })

    it('does not call addTask for an empty title', async () => {
      const wrapper = mount(TaskColumn, { props: { column: nowColumn } })
      await wrapper.find('[data-testid="add-task-btn"]').trigger('click')
      await wrapper.find('[data-testid="task-input"]').setValue('   ')
      await wrapper.find('[data-testid="add-task-form"]').trigger('submit')
      expect(mockAddTask).not.toHaveBeenCalled()
    })

    it('hides the form when Cancel is clicked', async () => {
      const wrapper = mount(TaskColumn, { props: { column: nowColumn } })
      await wrapper.find('[data-testid="add-task-btn"]').trigger('click')
      await wrapper.find('.btn-secondary').trigger('click')
      expect(wrapper.find('[data-testid="add-task-form"]').exists()).toBe(false)
    })

    it('shows the Add task button again after cancel', async () => {
      const wrapper = mount(TaskColumn, { props: { column: nowColumn } })
      await wrapper.find('[data-testid="add-task-btn"]').trigger('click')
      await wrapper.find('.btn-secondary').trigger('click')
      expect(wrapper.find('[data-testid="add-task-btn"]').exists()).toBe(true)
    })

    it('resets the title input after submit', async () => {
      const wrapper = mount(TaskColumn, { props: { column: nowColumn } })
      await wrapper.find('[data-testid="add-task-btn"]').trigger('click')
      await wrapper.find('[data-testid="task-input"]').setValue('A task')
      await wrapper.find('[data-testid="add-task-form"]').trigger('submit')
      await wrapper.find('[data-testid="add-task-btn"]').trigger('click')
      expect(wrapper.find('[data-testid="task-input"]').element.value).toBe('')
    })
  })

  describe('TaskCard — title and date display', () => {
    it('renders the task title', () => {
      const wrapper = mount(TaskCard, { props: { task: baseTask } })
      expect(wrapper.find('[data-testid="task-title"]').text()).toBe('Write unit tests')
    })

    it('shows the due date when set', () => {
      const wrapper = mount(TaskCard, { props: { task: makeTask({ dueDate: '2025-06-15' }) } })
      expect(wrapper.find('.date-chip').text()).toContain('Due')
    })

    it('hides the due date when null', () => {
      const wrapper = mount(TaskCard, { props: { task: baseTask } })
      expect(wrapper.find('.date-chip').exists()).toBe(false)
    })

    it('applies overdue class when due date is in the past', () => {
      const wrapper = mount(TaskCard, { props: { task: makeTask({ dueDate: '2020-01-01' }) } })
      expect(wrapper.find('.date-chip').classes()).toContain('overdue')
    })

    it('does not apply overdue class for future due dates', () => {
      const wrapper = mount(TaskCard, { props: { task: makeTask({ dueDate: '2099-12-31' }) } })
      expect(wrapper.find('.date-chip').classes()).not.toContain('overdue')
    })
  })

  describe('TaskCard — delete', () => {
    it('calls deleteTask when delete button is clicked', async () => {
      const wrapper = mount(TaskCard, { props: { task: baseTask } })
      await wrapper.find('[data-testid="delete-btn"]').trigger('click')
      expect(mockDeleteTask).toHaveBeenCalledWith('task-1')
    })
  })

  describe('TaskCard — complete', () => {
    it('calls completeTask when complete button is clicked', async () => {
      const wrapper = mount(TaskCard, { props: { task: baseTask } })
      await wrapper.find('[data-testid="complete-btn"]').trigger('click')
      expect(mockCompleteTask).toHaveBeenCalledWith('task-1')
    })

    it('calls showCelebration when completeTask returns null', async () => {
      mockCompleteTask.mockReturnValue(null)
      const wrapper = mount(TaskCard, { props: { task: baseTask } })
      await wrapper.find('[data-testid="complete-btn"]').trigger('click')
      expect(mockShowCelebration).toHaveBeenCalledOnce()
      expect(mockShowMilestone).not.toHaveBeenCalled()
    })

    it('calls showCelebration when completeTask returns a non-milestone streak count', async () => {
      mockCompleteTask.mockReturnValue(5)
      const wrapper = mount(TaskCard, { props: { task: baseTask } })
      await wrapper.find('[data-testid="complete-btn"]').trigger('click')
      expect(mockShowCelebration).toHaveBeenCalledOnce()
      expect(mockShowMilestone).not.toHaveBeenCalled()
    })

    it('calls showMilestone when completeTask returns a milestone streak count', async () => {
      mockCompleteTask.mockReturnValue(7)
      const wrapper = mount(TaskCard, { props: { task: baseTask } })
      await wrapper.find('[data-testid="complete-btn"]').trigger('click')
      expect(mockShowMilestone).toHaveBeenCalledWith(7)
      expect(mockShowCelebration).not.toHaveBeenCalled()
    })

    it('calls showMilestone for each defined milestone', async () => {
      for (const milestone of [1, 3, 7, 30, 90, 180, 365]) {
        vi.clearAllMocks()
        mockCompleteTask.mockReturnValue(milestone)
        const wrapper = mount(TaskCard, { props: { task: baseTask } })
        await wrapper.find('[data-testid="complete-btn"]').trigger('click')
        expect(mockShowMilestone).toHaveBeenCalledWith(milestone)
        expect(mockShowCelebration).not.toHaveBeenCalled()
      }
    })

    it('calls completeTask before the celebration', async () => {
      const callOrder = []
      mockCompleteTask.mockImplementation(() => { callOrder.push('complete'); return null })
      mockShowCelebration.mockImplementation(() => callOrder.push('celebrate'))
      const wrapper = mount(TaskCard, { props: { task: baseTask } })
      await wrapper.find('[data-testid="complete-btn"]').trigger('click')
      expect(callOrder).toEqual(['complete', 'celebrate'])
    })
  })
})
