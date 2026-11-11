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

// ---------------------------------------------------------------------------------------------
// Hydration of invalid stored data (task-store-hydration-validation, tracking issue #201)
// ---------------------------------------------------------------------------------------------

const KEY = 'untangle:tasks'

function validTask(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 1,
    name: 'Task',
    section: 'now',
    description: '',
    energyLevel: null,
    estimate: { days: 0, hours: 0, minutes: 0 },
    availableFrom: null,
    dueBy: null,
    subTasks: [],
    done: false,
    createdAt: 100,
    updatedAt: 100,
    ...overrides,
  }
}

async function loadSeeded(stored: unknown): Promise<{
  mod: typeof UseTasksModule
  store: TasksStore
}> {
  localStorage.setItem(KEY, typeof stored === 'string' ? stored : JSON.stringify(stored))
  vi.resetModules()
  return load()
}

async function hydrate(...records: unknown[]) {
  const { store } = await loadSeeded(records)
  return store.tasks.value
}

async function hydrateOne(overrides: Record<string, unknown>) {
  const tasks = await hydrate(validTask(overrides))
  return tasks[0]!
}

// A valid record with one key removed (JSON cannot carry undefined).
function without(...keys: string[]): Record<string, unknown> {
  const t = validTask()
  for (const key of keys) delete t[key]
  return t
}

describe('hydration of invalid stored data', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('unrecoverable elements are dropped', () => {
    it.each([
      ['null', null],
      ['a number', 42],
      ['a string', 'x'],
      ['a boolean', true],
      ['a nested array', [validTask()]],
    ])('drops %s elements', async (_label, el) => {
      expect(await hydrate(el)).toEqual([])
    })

    it.each([
      ['missing', without('name')],
      ['a number', validTask({ name: 5 })],
      ['empty', validTask({ name: '' })],
      ['whitespace-only', validTask({ name: '   ' })],
    ])('drops a task whose name is %s', async (_label, el) => {
      expect(await hydrate(el)).toEqual([])
    })

    it('trims the name', async () => {
      expect((await hydrateOne({ name: '  Padded  ' })).name).toBe('Padded')
    })
  })

  describe('field repair', () => {
    it.each([
      ['an unknown string', 'someday'],
      ['a number', 3],
    ])('repairs section %s to now', async (_label, section) => {
      expect((await hydrateOne({ section })).section).toBe('now')
    })

    it('repairs a missing section to now', async () => {
      const tasks = await hydrate(without('section'))
      expect(tasks[0]!.section).toBe('now')
    })

    it.each(['now', 'next', 'later'])('preserves valid section %s', async (section) => {
      expect((await hydrateOne({ section })).section).toBe(section)
    })

    it('repairs a non-string description to an empty string', async () => {
      expect((await hydrateOne({ description: 7 })).description).toBe('')
    })

    it('repairs an invalid energyLevel to null', async () => {
      expect((await hydrateOne({ energyLevel: 'extreme' })).energyLevel).toBe(null)
    })

    it.each(['low', 'medium', 'high'])('retains valid energyLevel %s', async (energyLevel) => {
      expect((await hydrateOne({ energyLevel })).energyLevel).toBe(energyLevel)
    })

    it('repairs non-string availableFrom to null', async () => {
      expect((await hydrateOne({ availableFrom: 20260101 })).availableFrom).toBe(null)
    })

    it('repairs non-string dueBy to null', async () => {
      expect((await hydrateOne({ dueBy: {} })).dueBy).toBe(null)
    })

    it('keeps dueBy before availableFrom exactly as stored, without throwing', async () => {
      const task = await hydrateOne({ availableFrom: '2026-02-10', dueBy: '2026-02-01' })
      expect([task.availableFrom, task.dueBy]).toEqual(['2026-02-10', '2026-02-01'])
    })

    it.each([
      ['a string', 'true'],
      ['a number', 1],
    ])('repairs done as %s to false', async (_label, done) => {
      expect((await hydrateOne({ done })).done).toBe(false)
    })

    it('keeps done: true', async () => {
      expect((await hydrateOne({ done: true })).done).toBe(true)
    })
  })

  describe('estimate', () => {
    const zeros = { days: 0, hours: 0, minutes: 0 }

    it('repairs a missing estimate to zeros', async () => {
      expect((await hydrate(without('estimate')))[0]!.estimate).toEqual(zeros)
    })

    it.each([
      ['a string', 'soon'],
      ['an array', [1, 2, 3]],
      ['null', null],
    ])('repairs an estimate that is %s to zeros', async (_label, estimate) => {
      expect((await hydrateOne({ estimate })).estimate).toEqual(zeros)
    })

    it.each([
      ['negative', -5],
      ['null (a serialised NaN)', null],
      ['a string', '5'],
      ['a boolean', true],
    ])('repairs a %s estimate field to 0', async (_label, value) => {
      const task = await hydrateOne({ estimate: { days: value, hours: value, minutes: value } })
      expect(task.estimate).toEqual(zeros)
    })

    it('repairs Infinity (hand-written as 1e999) to 0', async () => {
      const raw = JSON.stringify([validTask()]).replace(
        '"estimate":{"days":0,"hours":0,"minutes":0}',
        '"estimate":{"days":1e999,"hours":0,"minutes":0}'
      )
      const { store } = await loadSeeded(raw)
      expect(store.tasks.value[0]!.estimate.days).toBe(0)
    })

    it('floors fractional values (2.9 -> 2)', async () => {
      const task = await hydrateOne({ estimate: { days: 2.9, hours: 1.5, minutes: 3.99 } })
      expect(task.estimate).toEqual({ days: 2, hours: 1, minutes: 3 })
    })

    it('clamps hours to 23 and minutes to 59', async () => {
      const task = await hydrateOne({ estimate: { days: 0, hours: 99, minutes: 99 } })
      expect(task.estimate).toEqual({ days: 0, hours: 23, minutes: 59 })
    })

    it('keeps boundary hours 23 / minutes 59 and a large days value', async () => {
      const task = await hydrateOne({ estimate: { days: 100000, hours: 23, minutes: 59 } })
      expect(task.estimate).toEqual({ days: 100000, hours: 23, minutes: 59 })
    })
  })

  describe('subTasks', () => {
    const sub = (over: Record<string, unknown> = {}) => ({
      id: 1,
      text: 'step',
      done: false,
      ...over,
    })

    it('repairs a missing subTasks to an empty array', async () => {
      expect((await hydrate(without('subTasks')))[0]!.subTasks).toEqual([])
    })

    it('repairs non-array subTasks to an empty array', async () => {
      expect((await hydrateOne({ subTasks: 'x' })).subTasks).toEqual([])
    })

    it.each([
      ['null', null],
      ['a number', 5],
      ['a string', 'x'],
      ['an array', [sub()]],
      ['text missing', { id: 1, done: false }],
      ['text a number', sub({ text: 9 })],
      ['text empty', sub({ text: '' })],
      ['text whitespace-only', sub({ text: '  ' })],
    ])('drops a sub-task that is %s', async (_label, el) => {
      expect((await hydrateOne({ subTasks: [el] })).subTasks).toEqual([])
    })

    it('trims sub-task text', async () => {
      const task = await hydrateOne({ subTasks: [sub({ text: '  padded ' })] })
      expect(task.subTasks[0]!.text).toBe('padded')
    })

    it('repairs a non-boolean sub-task done to false', async () => {
      const task = await hydrateOne({ subTasks: [sub({ done: 'yes' })] })
      expect(task.subTasks[0]!.done).toBe(false)
    })

    it('keeps sub-task order and done: true', async () => {
      const task = await hydrateOne({
        subTasks: [sub({ id: 2, text: 'b', done: true }), sub({ id: 1, text: 'a' })],
      })
      expect(task.subTasks).toEqual([
        { id: 2, text: 'b', done: true },
        { id: 1, text: 'a', done: false },
      ])
    })

    it('reassigns duplicate sub-task ids uniquely within the task (first holder keeps)', async () => {
      const task = await hydrateOne({
        subTasks: [sub({ id: 1, text: 'a' }), sub({ id: 1, text: 'b' }), sub({ id: 1, text: 'c' })],
      })
      expect(task.subTasks.map((s) => s.id)).toEqual([1, 2, 3])
    })

    it.each([
      ['missing', undefined],
      ['a non-integer', 1.5],
      ['zero', 0],
      ['negative', -2],
      ['a string', '4'],
    ])('reassigns a sub-task id that is %s to a fresh unique positive integer', async (_l, id) => {
      const raw = { text: 'x', done: false, ...(id === undefined ? {} : { id }) }
      const task = await hydrateOne({ subTasks: [sub({ id: 7, text: 'keep' }), raw] })
      expect(task.subTasks.map((s) => s.id)).toEqual([7, 8])
    })

    it('allows the same sub-task id across two different tasks', async () => {
      const tasks = await hydrate(
        validTask({ id: 1, subTasks: [sub({ id: 1 })] }),
        validTask({ id: 2, subTasks: [sub({ id: 1 })] })
      )
      expect(tasks.map((t) => t.subTasks[0]!.id)).toEqual([1, 1])
    })
  })

  describe('timestamps', () => {
    it('uses updatedAt for a missing createdAt', async () => {
      const task = (await hydrate({ ...without('createdAt'), updatedAt: 777 }))[0]!
      expect(task.createdAt).toBe(777)
    })

    it('uses the hydration time for both when both are missing', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(5000)
      const task = (await hydrate(without('createdAt', 'updatedAt')))[0]!
      expect([task.createdAt, task.updatedAt]).toEqual([5000, 5000])
    })

    it('uses createdAt for a missing updatedAt', async () => {
      const t = { ...without('updatedAt'), createdAt: 321 }
      expect((await hydrate(t))[0]!.updatedAt).toBe(321)
    })

    it('treats string timestamps as missing', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(9000)
      const task = await hydrateOne({ createdAt: '100', updatedAt: '200' })
      expect([task.createdAt, task.updatedAt]).toEqual([9000, 9000])
    })

    it('keeps valid distinct timestamps untouched', async () => {
      const task = await hydrateOne({ createdAt: 10, updatedAt: 20 })
      expect([task.createdAt, task.updatedAt]).toEqual([10, 20])
    })
  })

  describe('ids', () => {
    it('gives later duplicate ids fresh ids above the max (first keeps, later get max+1, +2)', async () => {
      const tasks = await hydrate(
        validTask({ id: 4, name: 'a' }),
        validTask({ id: 4, name: 'b' }),
        validTask({ id: 4, name: 'c' })
      )
      expect(tasks.map((t) => t.id)).toEqual([4, 5, 6])
    })

    it.each([
      ['missing', undefined],
      ['a string', '3'],
      ['zero', 0],
      ['negative', -1],
      ['non-integer', 1.5],
    ])('keeps a task whose id is %s and gives it a fresh id', async (_l, id) => {
      const bad = id === undefined ? without('id') : validTask({ id })
      const tasks = await hydrate(validTask({ id: 2, name: 'ok' }), { ...bad, name: 'bad' })
      expect(tasks.map((t) => [t.name, t.id])).toEqual([
        ['ok', 2],
        ['bad', 3],
      ])
    })

    it('ignores the id of a dropped element when choosing fresh ids', async () => {
      const tasks = await hydrate(
        validTask({ id: 1, name: 'a' }),
        validTask({ id: 99, name: '' }),
        validTask({ id: 1, name: 'b' })
      )
      expect(tasks.map((t) => t.id)).toEqual([1, 2])
    })

    it('addTask after hydrating bad ids gets a finite id above every existing id', async () => {
      const { store } = await loadSeeded([
        without('id'),
        validTask({ id: 'x', name: 'two' }),
        validTask({ id: 8, name: 'eight' }),
      ])
      const created = store.addTask({ name: 'New', section: 'now' })!
      const ids = store.tasks.value.map((t) => t.id)
      expect(
        Number.isFinite(created.id) &&
          new Set(ids).size === ids.length &&
          created.id === Math.max(...ids)
      ).toBe(true)
    })
  })

  describe('unknown properties and identity', () => {
    it('strips extra properties from tasks', async () => {
      const task = await hydrateOne({ evil: 1, other: {} })
      expect(Object.keys(task).sort()).toEqual(
        [
          'availableFrom',
          'createdAt',
          'description',
          'done',
          'dueBy',
          'energyLevel',
          'estimate',
          'id',
          'name',
          'section',
          'subTasks',
          'updatedAt',
        ].sort()
      )
    })

    it('strips extra properties from sub-tasks and estimates', async () => {
      const task = await hydrateOne({
        subTasks: [{ id: 1, text: 'a', done: false, junk: 1 }],
        estimate: { days: 1, hours: 2, minutes: 3, junk: 1 },
      })
      expect([Object.keys(task.subTasks[0]!).sort(), Object.keys(task.estimate).sort()]).toEqual([
        ['done', 'id', 'text'],
        ['days', 'hours', 'minutes'],
      ])
    })

    it('round-trips a fully valid list deep-equal and in the same order', async () => {
      const stored = [
        validTask({
          id: 3,
          name: 'A',
          section: 'later',
          description: 'd',
          energyLevel: 'high',
          estimate: { days: 2, hours: 23, minutes: 59 },
          availableFrom: '2026-01-01',
          dueBy: '2026-02-01',
          subTasks: [{ id: 2, text: 's', done: true }],
          done: true,
          createdAt: 5,
          updatedAt: 9,
        }),
        validTask({ id: 1, name: 'B', section: 'next' }),
      ]
      expect(await hydrate(...stored)).toEqual(stored)
    })

    it('hydrates 1,000 valid tasks without loss', async () => {
      const many = Array.from({ length: 1000 }, (_v, i) => validTask({ id: i + 1, name: `T${i}` }))
      expect(await hydrate(...many)).toEqual(many)
    })

    it('keeps survivors of a mixed list in original order', async () => {
      const tasks = await hydrate(
        validTask({ id: 1, name: 'first' }),
        null,
        validTask({ id: 2, name: 'bad section', section: 'zzz' }),
        validTask({ id: 2, name: 'dup id' }),
        validTask({ id: 5, name: '' })
      )
      expect(tasks.map((t) => t.name)).toEqual(['first', 'bad section', 'dup id'])
    })

    it('turns the request example into one complete well-typed task', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(4242)
      const tasks = await hydrate({ id: 1, name: 'Example task', section: 'now' })
      expect(tasks).toEqual([
        {
          id: 1,
          name: 'Example task',
          section: 'now',
          description: '',
          energyLevel: null,
          estimate: { days: 0, hours: 0, minutes: 0 },
          availableFrom: null,
          dueBy: null,
          subTasks: [],
          done: false,
          createdAt: 4242,
          updatedAt: 4242,
        },
      ])
    })
  })

  // Git history shows a single shipped stored shape; these are synthetic and exercise the
  // repair rules only, they do not describe real older formats.
  describe('synthetic older-schema shapes (not shipped formats)', () => {
    it('repairs a task lacking estimate, subTasks, done and timestamps', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(1234)
      const tasks = await hydrate({ id: 1, name: 'Old', section: 'next' })
      expect(tasks[0]).toMatchObject({
        estimate: { days: 0, hours: 0, minutes: 0 },
        subTasks: [],
        done: false,
        createdAt: 1234,
        updatedAt: 1234,
      })
    })

    it('strips flat estimateDays/estimateHours/estimateMinutes fields and zeroes the estimate', async () => {
      const t = {
        ...without('estimate'),
        estimateDays: 3,
        estimateHours: 4,
        estimateMinutes: 5,
      }
      const task = (await hydrate(t))[0]!
      expect([task.estimate, 'estimateDays' in task]).toEqual([
        { days: 0, hours: 0, minutes: 0 },
        false,
      ])
    })
  })

  describe('existing fallbacks still yield an empty list', () => {
    it('falls back to empty for an empty stored string', async () => {
      const { store } = await loadSeeded('')
      expect(store.tasks.value).toEqual([])
    })

    it('falls back to empty for JSON null', async () => {
      const { store } = await loadSeeded('null')
      expect(store.tasks.value).toEqual([])
    })
  })

  describe('no write-back at load', () => {
    it('never calls setItem while hydrating repairable data, leaving the raw string unchanged', async () => {
      const raw = JSON.stringify([validTask({ section: 'zzz' }), null, validTask({ id: 1 })])
      localStorage.setItem(KEY, raw)
      vi.resetModules()
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
      await load()
      expect([setItemSpy.mock.calls.length, localStorage.getItem(KEY)]).toEqual([0, raw])
    })

    it('persists the normalised list on the next mutation', async () => {
      const raw = JSON.stringify([validTask({ id: 1, section: 'zzz' }), null])
      const { store } = await loadSeeded(raw)
      store.addTask({ name: 'New', section: 'now' })
      const persisted = JSON.parse(localStorage.getItem(KEY)!)
      expect(persisted).toEqual(JSON.parse(JSON.stringify(store.tasks.value)))
    })
  })
})

describe('consumers over hydrated malformed data', () => {
  const malformed = () => [
    validTask({ id: 1, name: 'bad section', section: 'someday' }),
    { ...without('subTasks'), id: 2, name: 'no subtasks' },
    { ...without('estimate'), id: 3, name: 'no estimate' },
    { ...without('id'), name: 'no id' },
    validTask({ id: 5, name: 'string done', done: 'true' }),
  ]

  it('loading the module with a null element in the stored array does not throw', async () => {
    await expect(loadSeeded([null, validTask()])).resolves.toBeTruthy()
  })

  it('groupActiveTasksBySection does not throw and places the bad-section task in now', async () => {
    const { store } = await loadSeeded(malformed())
    const ordering = await import('../../../src/composables/useBoardOrdering')
    const grouped = ordering.groupActiveTasksBySection(store.tasks.value)
    expect(grouped.now.map((t) => t.name)).toContain('bad section')
  })

  it('treats a string done flag as not done (stays on the board, not completed)', async () => {
    const { store } = await loadSeeded(malformed())
    const panel = (await import('../../../src/composables/useCompletedPanel')).useCompletedPanel()
    expect([
      store.tasks.value.find((t) => t.name === 'string done')?.done,
      panel.completedCount.value,
    ]).toEqual([false, 0])
  })

  it('useTaskDetail.open does not throw for a task missing estimate and seeds zeros', async () => {
    const { store } = await loadSeeded(malformed())
    const detail = (await import('../../../src/composables/useTaskDetail')).useTaskDetail()
    const id = store.tasks.value.find((t) => t.name === 'no estimate')!.id
    detail.open(id)
    expect([
      detail.estimateDays.value,
      detail.estimateHours.value,
      detail.estimateMinutes.value,
    ]).toEqual(['0', '0', '0'])
  })

  it('useTaskDetail.open does not throw for a task missing subTasks and seeds none', async () => {
    const { store } = await loadSeeded(malformed())
    const detail = (await import('../../../src/composables/useTaskDetail')).useTaskDetail()
    const id = store.tasks.value.find((t) => t.name === 'no subtasks')!.id
    detail.open(id)
    expect(detail.subTasks.value).toEqual([])
  })

  it('toggleSubTaskDone on a task missing subTasks returns false without throwing', async () => {
    const { store } = await loadSeeded(malformed())
    const id = store.tasks.value.find((t) => t.name === 'no subtasks')!.id
    expect(store.toggleSubTaskDone(id, 1)).toBe(false)
  })

  it('toggleTaskDone, updateTask and removeTask work on every hydrated task by its id', async () => {
    const { store } = await loadSeeded(malformed())
    const ids = store.tasks.value.map((t) => t.id)
    const results = ids.map((id) => [
      store.toggleTaskDone(id),
      store.updateTask(id, { description: 'x' }),
      store.removeTask(id),
    ])
    expect(results.every((r) => r.every(Boolean)) && store.tasks.value.length === 0).toBe(true)
  })

  it('every hydrated task has a unique finite id so lookup by id reaches the intended task', async () => {
    const { store } = await loadSeeded(malformed())
    const ids = store.tasks.value.map((t) => t.id)
    expect(ids.every(Number.isFinite) && new Set(ids).size === ids.length).toBe(true)
  })

  it('completed tasks with missing timestamps hydrate finite timestamps for panel ordering', async () => {
    const { store } = await loadSeeded([
      { ...without('createdAt'), id: 1, name: 'a', done: true, updatedAt: 'x' },
      { ...without('updatedAt'), id: 2, name: 'b', done: true },
    ])
    const panel = (await import('../../../src/composables/useCompletedPanel')).useCompletedPanel()
    expect(
      store.tasks.value.every(
        (t) => Number.isFinite(t.createdAt) && Number.isFinite(t.updatedAt)
      ) && panel.completedCount.value === 2
    ).toBe(true)
  })
})
