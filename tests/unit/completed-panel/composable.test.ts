import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const modulePath = '../../../src/composables/useCompletedPanel'
const tasksModulePath = '../../../src/composables/useTasks'
const celebrationModulePath = '../../../src/composables/useCelebration'
const detailModulePath = '../../../src/composables/useTaskDetail'

async function loadAll() {
  const tasksMod = await import(tasksModulePath)
  const celebrationMod = await import(celebrationModulePath)
  const detailMod = await import(detailModulePath)
  const mod = await import(modulePath)
  return {
    panel: mod.useCompletedPanel(),
    tasks: tasksMod.useTasks(),
    celebration: celebrationMod.useCelebration(),
    detail: detailMod.useTaskDetail(),
  }
}

describe('useCompletedPanel', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('is closed by default with no completed tasks', async () => {
    const { panel } = await loadAll()
    expect(panel.isOpen.value).toBe(false)
    expect(panel.completedTasks.value).toEqual([])
    expect(panel.completedCount.value).toBe(0)
  })

  it('open and close toggle isOpen', async () => {
    const { panel } = await loadAll()
    panel.open()
    expect(panel.isOpen.value).toBe(true)
    panel.close()
    expect(panel.isOpen.value).toBe(false)
  })

  it('completedTasks contains only done tasks, most recently updated first', async () => {
    const { panel, tasks } = await loadAll()
    const now = vi.spyOn(Date, 'now')
    now.mockReturnValue(1000)
    const a = tasks.addTask({ name: 'A', section: 'now' })!
    const b = tasks.addTask({ name: 'B', section: 'next' })!
    const c = tasks.addTask({ name: 'C', section: 'later' })!
    tasks.addTask({ name: 'D', section: 'now' })
    now.mockReturnValue(2000)
    tasks.toggleTaskDone(a.id)
    now.mockReturnValue(3000)
    tasks.toggleTaskDone(c.id)
    now.mockReturnValue(2500)
    tasks.toggleTaskDone(b.id)

    expect(panel.completedTasks.value.map((t: { name: string }) => t.name)).toEqual(['C', 'B', 'A'])
  })

  it('breaks updatedAt ties by id descending', async () => {
    const { panel, tasks } = await loadAll()
    vi.spyOn(Date, 'now').mockReturnValue(5000)
    const a = tasks.addTask({ name: 'A', section: 'now' })!
    const b = tasks.addTask({ name: 'B', section: 'now' })!
    tasks.toggleTaskDone(a.id)
    tasks.toggleTaskDone(b.id)
    expect(panel.completedTasks.value.map((t: { id: number }) => t.id)).toEqual([b.id, a.id])
  })

  it('does not reorder the store array when sorting', async () => {
    const { panel, tasks } = await loadAll()
    const now = vi.spyOn(Date, 'now')
    now.mockReturnValue(1)
    const a = tasks.addTask({ name: 'A', section: 'now' })!
    const b = tasks.addTask({ name: 'B', section: 'now' })!
    now.mockReturnValue(10)
    tasks.toggleTaskDone(b.id)
    now.mockReturnValue(20)
    tasks.toggleTaskDone(a.id)
    void panel.completedTasks.value
    expect(tasks.tasks.value.map((t: { id: number }) => t.id)).toEqual([a.id, b.id])
  })

  it('completedCount tracks completions and un-completions live', async () => {
    const { panel, tasks } = await loadAll()
    const a = tasks.addTask({ name: 'A', section: 'now' })!
    const b = tasks.addTask({ name: 'B', section: 'now' })!
    expect(panel.completedCount.value).toBe(0)
    tasks.toggleTaskDone(a.id)
    expect(panel.completedCount.value).toBe(1)
    tasks.toggleTaskDone(b.id)
    expect(panel.completedCount.value).toBe(2)
    tasks.toggleTaskDone(a.id)
    expect(panel.completedCount.value).toBe(1)
  })

  describe('uncomplete', () => {
    it('flips a done task back to not done, keeps its section, and never celebrates', async () => {
      const { panel, tasks, celebration } = await loadAll()
      const t = tasks.addTask({ name: 'A', section: 'later' })!
      tasks.toggleTaskDone(t.id)

      panel.uncomplete(t.id)

      const stored = tasks.tasks.value.find((x: { id: number }) => x.id === t.id)!
      expect(stored.done).toBe(false)
      expect(stored.section).toBe('later')
      expect(celebration.celebrationMessage.value).toBeNull()
      expect(panel.completedCount.value).toBe(0)
    })

    it('does nothing for a task that is not done', async () => {
      const { panel, tasks } = await loadAll()
      const t = tasks.addTask({ name: 'A', section: 'now' })!
      const toggleSpy = vi.spyOn(tasks, 'toggleTaskDone')
      panel.uncomplete(t.id)
      expect(toggleSpy).not.toHaveBeenCalled()
      expect(tasks.tasks.value[0]!.done).toBe(false)
    })

    it('does nothing for an unknown id', async () => {
      const { panel, tasks } = await loadAll()
      const toggleSpy = vi.spyOn(tasks, 'toggleTaskDone')
      panel.uncomplete(999)
      expect(toggleSpy).not.toHaveBeenCalled()
    })
  })

  describe('openTask', () => {
    it("opens Task Detail with origin 'completed' and leaves the panel open", async () => {
      const { panel, tasks, detail } = await loadAll()
      const t = tasks.addTask({ name: 'A', section: 'now' })!
      tasks.toggleTaskDone(t.id)
      panel.open()

      panel.openTask(t.id)

      expect(detail.isOpen.value).toBe(true)
      expect(detail.selectedTaskId.value).toBe(t.id)
      expect(detail.openedFrom.value).toBe('completed')
      expect(panel.isOpen.value).toBe(true)
    })
  })
})
