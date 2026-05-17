import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('subtasks — composable', () => {
  let useTasks

  beforeEach(async () => {
    localStorage.clear()
    vi.resetModules()
    ;({ useTasks } = await import('../../../src/composables/useTasks.js'))
  })

  describe('addSubtask', () => {
    it('adds a subtask with the given title', () => {
      const { addTask, addSubtask, tasks } = useTasks()
      addTask('Task', 'now')
      addSubtask(tasks.value[0].id, 'Step one')
      expect(tasks.value[0].subtasks).toHaveLength(1)
      expect(tasks.value[0].subtasks[0].title).toBe('Step one')
      expect(tasks.value[0].subtasks[0].done).toBe(false)
      expect(tasks.value[0].subtasks[0].id).toBeTruthy()
    })

    it('ignores blank subtask titles', () => {
      const { addTask, addSubtask, tasks } = useTasks()
      addTask('Task', 'now')
      addSubtask(tasks.value[0].id, '   ')
      expect(tasks.value[0].subtasks).toHaveLength(0)
    })

    it('does nothing for a non-existent task id', () => {
      const { addSubtask } = useTasks()
      expect(() => addSubtask('fake-id', 'Step')).not.toThrow()
    })

    it('trims whitespace from the subtask title', () => {
      const { addTask, addSubtask, tasks } = useTasks()
      addTask('Task', 'now')
      addSubtask(tasks.value[0].id, '  Step one  ')
      expect(tasks.value[0].subtasks[0].title).toBe('Step one')
    })
  })

  describe('deleteSubtask', () => {
    it('removes the subtask with the given id', () => {
      const { addTask, addSubtask, deleteSubtask, tasks } = useTasks()
      addTask('Task', 'now')
      addSubtask(tasks.value[0].id, 'Step')
      const subtaskId = tasks.value[0].subtasks[0].id
      deleteSubtask(tasks.value[0].id, subtaskId)
      expect(tasks.value[0].subtasks).toHaveLength(0)
    })

    it('only removes the specified subtask', () => {
      const { addTask, addSubtask, deleteSubtask, tasks } = useTasks()
      addTask('Task', 'now')
      addSubtask(tasks.value[0].id, 'Step A')
      addSubtask(tasks.value[0].id, 'Step B')
      const subtaskId = tasks.value[0].subtasks[0].id
      deleteSubtask(tasks.value[0].id, subtaskId)
      expect(tasks.value[0].subtasks).toHaveLength(1)
      expect(tasks.value[0].subtasks[0].title).toBe('Step B')
    })
  })

  describe('toggleSubtask', () => {
    it('marks a subtask as done', () => {
      const { addTask, addSubtask, toggleSubtask, tasks } = useTasks()
      addTask('Task', 'now')
      addSubtask(tasks.value[0].id, 'Step')
      const subtaskId = tasks.value[0].subtasks[0].id
      toggleSubtask(tasks.value[0].id, subtaskId)
      expect(tasks.value[0].subtasks[0].done).toBe(true)
    })

    it('marks a done subtask as undone', () => {
      const { addTask, addSubtask, toggleSubtask, tasks } = useTasks()
      addTask('Task', 'now')
      addSubtask(tasks.value[0].id, 'Step')
      const taskId = tasks.value[0].id
      const subtaskId = tasks.value[0].subtasks[0].id
      toggleSubtask(taskId, subtaskId)
      toggleSubtask(taskId, subtaskId)
      expect(tasks.value[0].subtasks[0].done).toBe(false)
    })

    it('does nothing for a non-existent subtask id', () => {
      const { addTask, toggleSubtask, tasks } = useTasks()
      addTask('Task', 'now')
      expect(() => toggleSubtask(tasks.value[0].id, 'fake-subtask')).not.toThrow()
    })
  })
})
