import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('task management — composable', () => {
  let useTasks

  beforeEach(async () => {
    localStorage.clear()
    vi.resetModules()
    ;({ useTasks } = await import('../../../src/composables/useTasks.js'))
  })

  describe('addTask', () => {
    it('adds a task with required fields', () => {
      const { addTask, tasks } = useTasks()
      addTask('Write tests', 'now')
      expect(tasks.value).toHaveLength(1)
      const task = tasks.value[0]
      expect(task.title).toBe('Write tests')
      expect(task.column).toBe('now')
      expect(task.id).toBeTruthy()
      expect(typeof task.createdAt).toBe('number')
    })

    it('defaults optional fields to null / empty', () => {
      const { addTask, tasks } = useTasks()
      addTask('Task', 'now')
      const task = tasks.value[0]
      expect(task.energy).toBeNull()
      expect(task.dueDate).toBeNull()
      expect(task.availableFrom).toBeNull()
      expect(task.subtasks).toEqual([])
    })

    it('accepts energy, dueDate, availableFrom options', () => {
      const { addTask, tasks } = useTasks()
      addTask('Task', 'now', { energy: 'large', dueDate: '2025-12-01', availableFrom: '2025-11-01' })
      const task = tasks.value[0]
      expect(task.energy).toBe('large')
      expect(task.dueDate).toBe('2025-12-01')
      expect(task.availableFrom).toBe('2025-11-01')
    })

    it('creates subtask objects from string subtask titles', () => {
      const { addTask, tasks } = useTasks()
      addTask('Task', 'now', { subtasks: ['First', 'Second'] })
      const subtasks = tasks.value[0].subtasks
      expect(subtasks).toHaveLength(2)
      expect(subtasks[0].title).toBe('First')
      expect(subtasks[0].done).toBe(false)
      expect(subtasks[0].id).toBeTruthy()
      expect(subtasks[1].title).toBe('Second')
    })

    it('ignores blank subtask strings', () => {
      const { addTask, tasks } = useTasks()
      addTask('Task', 'now', { subtasks: ['Valid', '   ', ''] })
      expect(tasks.value[0].subtasks).toHaveLength(1)
    })

    it('trims whitespace from the title', () => {
      const { addTask, tasks } = useTasks()
      addTask('  My task  ', 'now')
      expect(tasks.value[0].title).toBe('My task')
    })

    it('can add multiple tasks', () => {
      const { addTask, tasks } = useTasks()
      addTask('Task 1', 'now')
      addTask('Task 2', 'next')
      addTask('Task 3', 'future')
      expect(tasks.value).toHaveLength(3)
    })

    it('assigns unique ids to each task', () => {
      const { addTask, tasks } = useTasks()
      addTask('Task 1', 'now')
      addTask('Task 2', 'now')
      expect(tasks.value[0].id).not.toBe(tasks.value[1].id)
    })

    it('treats empty string dueDate/availableFrom as null', () => {
      const { addTask, tasks } = useTasks()
      addTask('Task', 'now', { dueDate: '', availableFrom: '' })
      expect(tasks.value[0].dueDate).toBeNull()
      expect(tasks.value[0].availableFrom).toBeNull()
    })
  })

  describe('deleteTask', () => {
    it('removes the task with the given id', () => {
      const { addTask, deleteTask, tasks } = useTasks()
      addTask('Task', 'now')
      deleteTask(tasks.value[0].id)
      expect(tasks.value).toHaveLength(0)
    })

    it('only removes the specified task', () => {
      const { addTask, deleteTask, tasks } = useTasks()
      addTask('Task 1', 'now')
      addTask('Task 2', 'now')
      deleteTask(tasks.value[0].id)
      expect(tasks.value).toHaveLength(1)
      expect(tasks.value[0].title).toBe('Task 2')
    })

    it('does nothing for a non-existent id', () => {
      const { addTask, deleteTask, tasks } = useTasks()
      addTask('Task', 'now')
      deleteTask('non-existent-id')
      expect(tasks.value).toHaveLength(1)
    })
  })

  describe('updateTask', () => {
    it('updates the task title', () => {
      const { addTask, updateTask, tasks } = useTasks()
      addTask('Old title', 'now')
      updateTask(tasks.value[0].id, { title: 'New title' })
      expect(tasks.value[0].title).toBe('New title')
    })

    it('updates energy, dueDate, and availableFrom', () => {
      const { addTask, updateTask, tasks } = useTasks()
      addTask('Task', 'now')
      updateTask(tasks.value[0].id, { energy: 'large', dueDate: '2025-12-01', availableFrom: '2025-11-01' })
      expect(tasks.value[0].energy).toBe('large')
      expect(tasks.value[0].dueDate).toBe('2025-12-01')
      expect(tasks.value[0].availableFrom).toBe('2025-11-01')
    })

    it('does nothing for a non-existent id', () => {
      const { addTask, updateTask, tasks } = useTasks()
      addTask('Task', 'now')
      updateTask('fake-id', { title: 'Changed' })
      expect(tasks.value[0].title).toBe('Task')
    })
  })

  describe('tasksForColumn', () => {
    it('returns only tasks for the given column', () => {
      const { addTask, tasksForColumn } = useTasks()
      addTask('Now task', 'now')
      addTask('Next task', 'next')
      addTask('Future task', 'future')
      expect(tasksForColumn('now')).toHaveLength(1)
      expect(tasksForColumn('now')[0].title).toBe('Now task')
    })

    it('returns an empty array when no tasks are in the column', () => {
      const { tasksForColumn } = useTasks()
      expect(tasksForColumn('now')).toHaveLength(0)
    })

    it('updates after a task is moved', () => {
      const { addTask, moveTask, tasksForColumn, tasks } = useTasks()
      addTask('Task', 'now')
      moveTask(tasks.value[0].id, 1)
      expect(tasksForColumn('now')).toHaveLength(0)
      expect(tasksForColumn('next')).toHaveLength(1)
    })

    it('excludes completed tasks', () => {
      const { addTask, completeTask, tasksForColumn, tasks } = useTasks()
      addTask('Task', 'now')
      completeTask(tasks.value[0].id)
      expect(tasksForColumn('now')).toHaveLength(0)
    })
  })

  describe('completeTask', () => {
    it('sets completedAt to a timestamp', () => {
      const { addTask, completeTask, tasks } = useTasks()
      addTask('Task', 'now')
      const before = Date.now()
      completeTask(tasks.value[0].id)
      expect(tasks.value[0].completedAt).toBeGreaterThanOrEqual(before)
    })

    it('keeps the task in the tasks array', () => {
      const { addTask, completeTask, tasks } = useTasks()
      addTask('Task', 'now')
      completeTask(tasks.value[0].id)
      expect(tasks.value).toHaveLength(1)
    })

    it('hides the completed task from tasksForColumn', () => {
      const { addTask, completeTask, tasksForColumn, tasks } = useTasks()
      addTask('Task', 'now')
      completeTask(tasks.value[0].id)
      expect(tasksForColumn('now')).toHaveLength(0)
    })

    it('does nothing for a non-existent id', () => {
      const { addTask, completeTask, tasks } = useTasks()
      addTask('Task', 'now')
      expect(() => completeTask('no-such-id')).not.toThrow()
      expect(tasks.value[0].completedAt).toBeNull()
    })
  })
})
