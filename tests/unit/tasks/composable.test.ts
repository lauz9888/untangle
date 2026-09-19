import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type * as UseTasksModule from '../../../src/composables/useTasks'

const modulePath = '../../../src/composables/useTasks'

type TasksStore = ReturnType<typeof UseTasksModule.useTasks>

// jsdom persists localStorage across module re-imports within the same test file
// (dynamic import() re-evaluates the module, but window.localStorage is a single
// shared jsdom instance), so every test must start from a clean slate.
beforeEach(() => {
  vi.resetModules()
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

async function load(): Promise<{ mod: typeof UseTasksModule; store: TasksStore }> {
  const mod: typeof UseTasksModule = await import(modulePath)
  return { mod, store: mod.useTasks() }
}

function baseSubTaskInput(text: string) {
  return { text }
}

describe('useTasks', () => {
  describe('initial state', () => {
    it('starts with an empty tasks list when localStorage is empty', async () => {
      const { store } = await load()
      expect(store.tasks.value).toEqual([])
    })
  })

  describe('addTask', () => {
    it('appends a task with done:false, a positive integer id, and createdAt === updatedAt', async () => {
      vi.spyOn(Date, 'now').mockReturnValue(1000)
      const { store } = await load()

      const created = store.addTask({ name: 'Buy milk', section: 'now' })

      expect(created).toBeTruthy()
      expect(store.tasks.value).toHaveLength(1)
      const task = store.tasks.value[0]!
      expect(task.done).toBe(false)
      expect(Number.isInteger(task.id)).toBe(true)
      expect(task.id).toBeGreaterThan(0)
      expect(task.createdAt).toBe(1000)
      expect(task.updatedAt).toBe(1000)
    })

    it('trims the name before storing it and before the empty-check', async () => {
      const { store } = await load()

      const rejected = store.addTask({ name: '   ', section: 'now' })
      expect(rejected).toBe(null)
      expect(store.tasks.value).toHaveLength(0)

      const created = store.addTask({ name: ' Buy milk ', section: 'now' })
      expect(created).toBeTruthy()
      expect(store.tasks.value[0]!.name).toBe('Buy milk')
    })

    it('rejects an empty/whitespace-only name and does not append or persist', async () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
      const { store } = await load()
      setItemSpy.mockClear()

      const result = store.addTask({ name: '', section: 'now' })

      expect(result).toBe(null)
      expect(store.tasks.value).toEqual([])
      expect(setItemSpy).not.toHaveBeenCalled()
    })

    it('rejects when dueBy precedes availableFrom and does not append or persist', async () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
      const { store } = await load()
      setItemSpy.mockClear()

      const result = store.addTask({
        name: 'Buy milk',
        section: 'now',
        availableFrom: '2026-02-10',
        dueBy: '2026-02-01',
      })

      expect(result).toBe(null)
      expect(store.tasks.value).toEqual([])
      expect(setItemSpy).not.toHaveBeenCalled()
    })

    it('defaults estimate fields to 0 and description/availableFrom/dueBy/subTasks to their empty defaults when omitted', async () => {
      const { store } = await load()

      const created = store.addTask({ name: 'Buy milk', section: 'now' })

      expect(created!.estimate).toEqual({ days: 0, hours: 0, minutes: 0 })
      expect(created!.description).toBe('')
      expect(created!.availableFrom).toBe(null)
      expect(created!.dueBy).toBe(null)
      expect(created!.subTasks).toEqual([])
    })

    it('maps each { text } sub-task input to { id, text, done: false } with sequential per-task ids starting at 1', async () => {
      const { store } = await load()

      const created = store.addTask({
        name: 'Buy milk',
        section: 'now',
        subTasks: [baseSubTaskInput('Step 1'), baseSubTaskInput('Step 2')],
      })

      expect(created!.subTasks).toEqual([
        { id: 1, text: 'Step 1', done: false },
        { id: 2, text: 'Step 2', done: false },
      ])
    })

    it('assigns strictly increasing ids across sequential calls', async () => {
      const { store } = await load()

      const first = store.addTask({ name: 'First', section: 'now' })
      const second = store.addTask({ name: 'Second', section: 'now' })
      const third = store.addTask({ name: 'Third', section: 'now' })

      expect(second!.id).toBeGreaterThan(first!.id)
      expect(third!.id).toBeGreaterThan(second!.id)
    })
  })

  describe('updateTask', () => {
    it('merges partial changes and refreshes updatedAt while createdAt stays fixed', async () => {
      vi.spyOn(Date, 'now').mockReturnValue(1000)
      const { store } = await load()
      const created = store.addTask({ name: 'Buy milk', section: 'now' })!

      vi.spyOn(Date, 'now').mockReturnValue(2000)
      const result = store.updateTask(created.id, { name: 'Buy oat milk', section: 'next' })

      expect(result).toBe(true)
      const updated = store.tasks.value.find((t) => t.id === created.id)!
      expect(updated.name).toBe('Buy oat milk')
      expect(updated.section).toBe('next')
      expect(updated.createdAt).toBe(1000)
      expect(updated.updatedAt).toBe(2000)
    })

    it('returns false and makes no change for an unknown id', async () => {
      const { store } = await load()
      store.addTask({ name: 'Buy milk', section: 'now' })
      const before = JSON.parse(JSON.stringify(store.tasks.value))

      const result = store.updateTask(999999, { name: 'Nope' })

      expect(result).toBe(false)
      expect(store.tasks.value).toEqual(before)
    })

    it('returns false and applies nothing when the resulting name would be empty', async () => {
      const { store } = await load()
      const created = store.addTask({ name: 'Buy milk', section: 'now' })!

      const result = store.updateTask(created.id, { name: '   ' })

      expect(result).toBe(false)
      expect(store.tasks.value.find((t) => t.id === created.id)!.name).toBe('Buy milk')
    })

    it('returns false and applies nothing when the resulting date range would be invalid', async () => {
      const { store } = await load()
      const created = store.addTask({
        name: 'Buy milk',
        section: 'now',
        availableFrom: '2026-02-10',
      })!

      const result = store.updateTask(created.id, { dueBy: '2026-02-01' })

      expect(result).toBe(false)
      expect(store.tasks.value.find((t) => t.id === created.id)!.dueBy).toBe(null)
    })
  })

  describe('removeTask', () => {
    it('deletes the matching task and returns true', async () => {
      const { store } = await load()
      const created = store.addTask({ name: 'Buy milk', section: 'now' })!

      const result = store.removeTask(created.id)

      expect(result).toBe(true)
      expect(store.tasks.value).toEqual([])
    })

    it('returns false and changes nothing for an unknown id', async () => {
      const { store } = await load()
      store.addTask({ name: 'Buy milk', section: 'now' })

      const result = store.removeTask(999999)

      expect(result).toBe(false)
      expect(store.tasks.value).toHaveLength(1)
    })
  })

  describe('toggleTaskDone', () => {
    it('flips done and refreshes updatedAt', async () => {
      vi.spyOn(Date, 'now').mockReturnValue(1000)
      const { store } = await load()
      const created = store.addTask({ name: 'Buy milk', section: 'now' })!
      expect(created.done).toBe(false)

      vi.spyOn(Date, 'now').mockReturnValue(2000)
      const result = store.toggleTaskDone(created.id)

      expect(result).toBe(true)
      const task = store.tasks.value.find((t) => t.id === created.id)!
      expect(task.done).toBe(true)
      expect(task.updatedAt).toBe(2000)
    })

    it('returns false for an unknown id', async () => {
      const { store } = await load()

      const result = store.toggleTaskDone(999999)

      expect(result).toBe(false)
    })
  })

  describe('toggleSubTaskDone', () => {
    it("flips only the targeted sub-task's done and refreshes the parent task's updatedAt", async () => {
      vi.spyOn(Date, 'now').mockReturnValue(1000)
      const { store } = await load()
      const created = store.addTask({
        name: 'Buy milk',
        section: 'now',
        subTasks: [baseSubTaskInput('Step 1'), baseSubTaskInput('Step 2')],
      })!
      const [first, second] = created.subTasks

      vi.spyOn(Date, 'now').mockReturnValue(2000)
      const result = store.toggleSubTaskDone(created.id, first!.id)

      expect(result).toBe(true)
      const task = store.tasks.value.find((t) => t.id === created.id)!
      expect(task.subTasks.find((s) => s.id === first!.id)!.done).toBe(true)
      expect(task.subTasks.find((s) => s.id === second!.id)!.done).toBe(false)
      expect(task.updatedAt).toBe(2000)
    })

    it('returns false for an unknown taskId', async () => {
      const { store } = await load()
      const created = store.addTask({
        name: 'Buy milk',
        section: 'now',
        subTasks: [baseSubTaskInput('Step 1')],
      })!

      const result = store.toggleSubTaskDone(999999, created.subTasks[0]!.id)

      expect(result).toBe(false)
    })

    it('returns false for an unknown subTaskId', async () => {
      const { store } = await load()
      const created = store.addTask({
        name: 'Buy milk',
        section: 'now',
        subTasks: [baseSubTaskInput('Step 1')],
      })!

      const result = store.toggleSubTaskDone(created.id, 999999)

      expect(result).toBe(false)
    })
  })

  describe('localStorage persistence', () => {
    it('every mutator calls localStorage.setItem with TASKS_STORAGE_KEY and the current in-memory list', async () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
      const { mod, store } = await load()

      const created = store.addTask({ name: 'Buy milk', section: 'now' })!
      expect(setItemSpy).toHaveBeenLastCalledWith(
        mod.TASKS_STORAGE_KEY,
        JSON.stringify(store.tasks.value)
      )

      store.updateTask(created.id, { name: 'Buy oat milk' })
      expect(setItemSpy).toHaveBeenLastCalledWith(
        mod.TASKS_STORAGE_KEY,
        JSON.stringify(store.tasks.value)
      )

      store.toggleTaskDone(created.id)
      expect(setItemSpy).toHaveBeenLastCalledWith(
        mod.TASKS_STORAGE_KEY,
        JSON.stringify(store.tasks.value)
      )

      const withSub = store.addTask({
        name: 'Bring bins',
        section: 'now',
        subTasks: [baseSubTaskInput('Step 1')],
      })!
      store.toggleSubTaskDone(withSub.id, withSub.subTasks[0]!.id)
      expect(setItemSpy).toHaveBeenLastCalledWith(
        mod.TASKS_STORAGE_KEY,
        JSON.stringify(store.tasks.value)
      )

      store.removeTask(created.id)
      expect(setItemSpy).toHaveBeenLastCalledWith(
        mod.TASKS_STORAGE_KEY,
        JSON.stringify(store.tasks.value)
      )
    })

    it('hydrates tasks.value from a previously-stored valid JSON array on module load', async () => {
      const mod = await import(modulePath)
      const stored = [
        {
          id: 5,
          name: 'Existing task',
          section: 'later',
          description: '',
          energyLevel: null,
          estimate: { days: 0, hours: 0, minutes: 0 },
          availableFrom: null,
          dueBy: null,
          subTasks: [],
          done: false,
          createdAt: 500,
          updatedAt: 500,
        },
      ]
      localStorage.setItem(mod.TASKS_STORAGE_KEY, JSON.stringify(stored))

      vi.resetModules()
      const { store } = await load()

      expect(store.tasks.value).toEqual(stored)
    })

    it('falls back to an empty list when stored JSON is corrupted, without throwing', async () => {
      const mod = await import(modulePath)
      localStorage.setItem(mod.TASKS_STORAGE_KEY, '{not json')

      vi.resetModules()
      await expect(load()).resolves.toBeTruthy()
      const { store } = await load()

      expect(store.tasks.value).toEqual([])
    })

    it('falls back to an empty list when stored JSON is valid but not an array', async () => {
      const mod = await import(modulePath)
      localStorage.setItem(mod.TASKS_STORAGE_KEY, JSON.stringify({}))

      vi.resetModules()
      const { store } = await load()

      expect(store.tasks.value).toEqual([])
    })

    it('assigns the next id past a hydrated max id, avoiding collisions (id: 5 hydrated -> next addTask gets id: 6)', async () => {
      const mod = await import(modulePath)
      const stored = [
        {
          id: 5,
          name: 'Existing task',
          section: 'later',
          description: '',
          energyLevel: null,
          estimate: { days: 0, hours: 0, minutes: 0 },
          availableFrom: null,
          dueBy: null,
          subTasks: [],
          done: false,
          createdAt: 500,
          updatedAt: 500,
        },
      ]
      localStorage.setItem(mod.TASKS_STORAGE_KEY, JSON.stringify(stored))

      vi.resetModules()
      const { store } = await load()
      const created = store.addTask({ name: 'New task', section: 'now' })!

      expect(created.id).toBe(6)
    })
  })
})
