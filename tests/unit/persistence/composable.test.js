import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('persistence — composable', () => {
  let useTasks

  beforeEach(async () => {
    localStorage.clear()
    vi.resetModules()
    ;({ useTasks } = await import('../../../src/composables/useTasks.js'))
  })

  it('persists tasks to localStorage when a task is added', async () => {
    const { addTask } = useTasks()
    addTask('Persisted task', 'now', { energy: 'small' })
    await Promise.resolve()
    const stored = JSON.parse(localStorage.getItem('untangle-tasks'))
    expect(stored).toHaveLength(1)
    expect(stored[0].title).toBe('Persisted task')
  })

  it('loads tasks from localStorage on init', async () => {
    localStorage.setItem('untangle-tasks', JSON.stringify([
      { id: 'abc', title: 'Stored task', energy: null, column: 'now', createdAt: 1000, dueDate: null, availableFrom: null, subtasks: [] }
    ]))
    vi.resetModules()
    const { useTasks: fresh } = await import('../../../src/composables/useTasks.js')
    const { tasks } = fresh()
    expect(tasks.value[0].title).toBe('Stored task')
  })

  it('migrates old tasks without new fields', async () => {
    localStorage.setItem('untangle-tasks', JSON.stringify([
      { id: 'old', title: 'Old task', energy: 'small', column: 'now', createdAt: 1000 }
    ]))
    vi.resetModules()
    const { useTasks: fresh } = await import('../../../src/composables/useTasks.js')
    const { tasks } = fresh()
    expect(tasks.value[0].dueDate).toBeNull()
    expect(tasks.value[0].availableFrom).toBeNull()
    expect(tasks.value[0].subtasks).toEqual([])
  })

  it('persists currentEnergy to localStorage', async () => {
    const { currentEnergy } = useTasks()
    currentEnergy.value = 'large'
    await Promise.resolve()
    expect(localStorage.getItem('untangle-energy')).toBe('large')
  })
})
