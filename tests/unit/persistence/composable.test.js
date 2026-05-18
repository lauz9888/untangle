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

  it('recovers from garbled JSON in tasks', async () => {
    localStorage.setItem('untangle-tasks', 'not-valid-json{{')
    vi.resetModules()
    const { useTasks: fresh } = await import('../../../src/composables/useTasks.js')
    const { tasks } = fresh()
    expect(tasks.value).toEqual([])
  })

  it('recovers from valid JSON that is not an array', async () => {
    localStorage.setItem('untangle-tasks', JSON.stringify({ title: 'stray object' }))
    vi.resetModules()
    const { useTasks: fresh } = await import('../../../src/composables/useTasks.js')
    const { tasks } = fresh()
    expect(tasks.value).toEqual([])
  })

  it('can add tasks after recovering from corrupted storage', async () => {
    localStorage.setItem('untangle-tasks', 'not-valid-json{{')
    vi.resetModules()
    const { useTasks: fresh } = await import('../../../src/composables/useTasks.js')
    const { tasks, addTask } = fresh()
    addTask('Recovery task', 'now')
    expect(tasks.value).toHaveLength(1)
    expect(tasks.value[0].title).toBe('Recovery task')
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
    expect(tasks.value[0].completedAt).toBeNull()
  })

  it('persists currentEnergy to localStorage', async () => {
    const { currentEnergy } = useTasks()
    currentEnergy.value = 'large'
    await Promise.resolve()
    expect(localStorage.getItem('untangle-energy')).toBe('large')
  })

  it('loads currentEnergy from localStorage on init', async () => {
    localStorage.setItem('untangle-energy', 'medium')
    vi.resetModules()
    const { useTasks: fresh } = await import('../../../src/composables/useTasks.js')
    const { currentEnergy } = fresh()
    expect(currentEnergy.value).toBe('medium')
  })

  it('restores currentEnergy as null when no energy is stored', async () => {
    vi.resetModules()
    const { useTasks: fresh } = await import('../../../src/composables/useTasks.js')
    const { currentEnergy } = fresh()
    expect(currentEnergy.value).toBeNull()
  })

  it('persists completedAt when a task is completed', async () => {
    const { addTask, completeTask, tasks } = useTasks()
    addTask('Task', 'now')
    completeTask(tasks.value[0].id)
    await Promise.resolve()
    const stored = JSON.parse(localStorage.getItem('untangle-tasks'))
    expect(stored[0].completedAt).toBeGreaterThan(0)
  })

  it('completed tasks are restored on reload and excluded from columns', async () => {
    const { addTask, completeTask, tasks } = useTasks()
    addTask('Done task', 'now')
    completeTask(tasks.value[0].id)
    await Promise.resolve()

    vi.resetModules()
    const { useTasks: fresh } = await import('../../../src/composables/useTasks.js')
    const { tasks: reloaded, tasksForColumn } = fresh()
    expect(reloaded.value).toHaveLength(1)
    expect(reloaded.value[0].completedAt).toBeGreaterThan(0)
    expect(tasksForColumn('now')).toHaveLength(0)
  })
})
