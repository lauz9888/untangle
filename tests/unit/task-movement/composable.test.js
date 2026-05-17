import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('task movement — composable', () => {
  let useTasks

  beforeEach(async () => {
    localStorage.clear()
    vi.resetModules()
    ;({ useTasks } = await import('../../../src/composables/useTasks.js'))
  })

  describe('moveTask', () => {
    it('moves a task forward (now → next)', () => {
      const { addTask, moveTask, tasks } = useTasks()
      addTask('Task', 'now')
      moveTask(tasks.value[0].id, 1)
      expect(tasks.value[0].column).toBe('next')
    })

    it('moves a task backward (next → now)', () => {
      const { addTask, moveTask, tasks } = useTasks()
      addTask('Task', 'next')
      moveTask(tasks.value[0].id, -1)
      expect(tasks.value[0].column).toBe('now')
    })

    it('cannot move past "now" backward', () => {
      const { addTask, moveTask, tasks } = useTasks()
      addTask('Task', 'now')
      moveTask(tasks.value[0].id, -1)
      expect(tasks.value[0].column).toBe('now')
    })

    it('cannot move past "future" forward', () => {
      const { addTask, moveTask, tasks } = useTasks()
      addTask('Task', 'future')
      moveTask(tasks.value[0].id, 1)
      expect(tasks.value[0].column).toBe('future')
    })

    it('does nothing for a non-existent id', () => {
      const { moveTask } = useTasks()
      expect(() => moveTask('fake-id', 1)).not.toThrow()
    })
  })

  describe('moveTaskToColumn', () => {
    it('moves a task directly to a specified column', () => {
      const { addTask, moveTaskToColumn, tasks } = useTasks()
      addTask('Task', 'now')
      moveTaskToColumn(tasks.value[0].id, 'future')
      expect(tasks.value[0].column).toBe('future')
    })

    it('does nothing for an invalid column id', () => {
      const { addTask, moveTaskToColumn, tasks } = useTasks()
      addTask('Task', 'now')
      moveTaskToColumn(tasks.value[0].id, 'someday')
      expect(tasks.value[0].column).toBe('now')
    })

    it('does nothing for a non-existent task id', () => {
      const { moveTaskToColumn } = useTasks()
      expect(() => moveTaskToColumn('fake-id', 'next')).not.toThrow()
    })
  })
})
