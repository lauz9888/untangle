import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { useTaskDetail } from '../../../src/composables/useTaskDetail'
import type { useTasks } from '../../../src/composables/useTasks'

const modulePath = '../../../src/composables/useTaskDetail'
const tasksModulePath = '../../../src/composables/useTasks'
const celebrationModulePath = '../../../src/composables/useCelebration'

type TaskDetailState = ReturnType<typeof useTaskDetail>
type TasksState = ReturnType<typeof useTasks>

async function loadBoth(): Promise<{ detail: TaskDetailState; tasks: TasksState }> {
  const tasksMod = await import(tasksModulePath)
  const detailMod = await import(modulePath)
  return { detail: detailMod.useTaskDetail(), tasks: tasksMod.useTasks() }
}

function seedFullTask(tasks: TasksState) {
  const created = tasks.addTask({
    name: 'Buy milk',
    section: 'now',
    description: 'Get 2% milk',
    energyLevel: 'medium',
    estimate: { days: 1, hours: 2, minutes: 30 },
    availableFrom: '2026-01-01',
    dueBy: '2026-01-05',
    subTasks: [{ text: 'Step 1' }, { text: 'Step 2' }],
  })
  return created!
}

describe('useTaskDetail', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
  })

  describe('open', () => {
    it('seeds every draft field from the stored task, including null dates -> "" and subTasks -> {id, text, isNew:false}[] in stored order', async () => {
      const { detail, tasks } = await loadBoth()
      const created = tasks.addTask({ name: 'Bare task', section: 'next' })!

      detail.open(created.id)

      expect(detail.isOpen.value).toBe(true)
      expect(detail.selectedTaskId.value).toBe(created.id)
      expect(detail.name.value).toBe('Bare task')
      expect(detail.section.value).toBe('next')
      expect(detail.description.value).toBe('')
      expect(detail.energyLevel.value).toBe(null)
      expect(detail.estimateDays.value).toBe('0')
      expect(detail.estimateHours.value).toBe('0')
      expect(detail.estimateMinutes.value).toBe('0')
      expect(detail.availableFrom.value).toBe('')
      expect(detail.dueBy.value).toBe('')
      expect(detail.subTasks.value).toEqual([])
    })

    it('seeds a fully populated task, including sub-tasks in stored order with isNew: false', async () => {
      const { detail, tasks } = await loadBoth()
      const created = seedFullTask(tasks)

      detail.open(created.id)

      expect(detail.name.value).toBe('Buy milk')
      expect(detail.section.value).toBe('now')
      expect(detail.description.value).toBe('Get 2% milk')
      expect(detail.energyLevel.value).toBe('medium')
      expect(detail.estimateDays.value).toBe('1')
      expect(detail.estimateHours.value).toBe('2')
      expect(detail.estimateMinutes.value).toBe('30')
      expect(detail.availableFrom.value).toBe('2026-01-01')
      expect(detail.dueBy.value).toBe('2026-01-05')
      expect(detail.subTasks.value).toEqual([
        { id: expect.any(Number), text: 'Step 1', isNew: false },
        { id: expect.any(Number), text: 'Step 2', isNew: false },
      ])
    })

    it('opening a second, different task fully replaces the previous draft (no leftover field)', async () => {
      const { detail, tasks } = await loadBoth()
      const first = seedFullTask(tasks)
      const second = tasks.addTask({ name: 'Walk dog', section: 'later' })!

      detail.open(first.id)
      expect(detail.name.value).toBe('Buy milk')

      detail.open(second.id)

      expect(detail.name.value).toBe('Walk dog')
      expect(detail.section.value).toBe('later')
      expect(detail.description.value).toBe('')
      expect(detail.energyLevel.value).toBe(null)
      expect(detail.estimateDays.value).toBe('0')
      expect(detail.availableFrom.value).toBe('')
      expect(detail.dueBy.value).toBe('')
      expect(detail.subTasks.value).toEqual([])
    })

    it('is a no-op for a nonexistent task id; isOpen stays false', async () => {
      const { detail } = await loadBoth()

      detail.open(999999)

      expect(detail.isOpen.value).toBe(false)
      expect(detail.selectedTaskId.value).toBe(null)
    })
  })

  describe('hasUnsavedChanges', () => {
    it('is false immediately after open() with no edits', async () => {
      const { detail, tasks } = await loadBoth()
      const created = seedFullTask(tasks)

      detail.open(created.id)

      expect(detail.hasUnsavedChanges.value).toBe(false)
    })

    type Case = [string, (d: TaskDetailState) => void]

    const editCases: Case[] = [
      ['name edited', (d) => (d.name.value = 'Buy oat milk')],
      ['section changed', (d) => d.selectSection('later')],
      ['description edited', (d) => (d.description.value = 'Different description')],
      ['energyLevel changed', (d) => d.selectEnergyLevel('high')],
      ['estimate days changed', (d) => d.setEstimateField('days', '3')],
      ['estimate hours changed', (d) => d.setEstimateField('hours', '5')],
      ['estimate minutes changed', (d) => d.setEstimateField('minutes', '45')],
      ['availableFrom changed', (d) => (d.availableFrom.value = '2026-02-01')],
      ['dueBy changed', (d) => (d.dueBy.value = '2026-02-10')],
      [
        'a sub-task is added',
        (d) => {
          d.openSubTaskInput()
          d.subTaskDraft.value = 'New step'
          d.saveSubTaskDraft()
        },
      ],
      [
        'a sub-task is removed',
        (d) => {
          d.removeSubTask(d.subTasks.value[0]!.id)
        },
      ],
      [
        "an existing sub-task's text is edited",
        (d) => {
          d.subTasks.value[0]!.text = 'Edited step'
        },
      ],
    ]

    it.each(editCases)('is true after %s', async (_label, mutate) => {
      const { detail, tasks } = await loadBoth()
      const created = seedFullTask(tasks)
      detail.open(created.id)

      mutate(detail)

      expect(detail.hasUnsavedChanges.value).toBe(true)
    })

    it('stays false after calling toggleDone() with no other draft edit', async () => {
      const { detail, tasks } = await loadBoth()
      const created = seedFullTask(tasks)
      detail.open(created.id)

      detail.toggleDone()

      expect(detail.hasUnsavedChanges.value).toBe(false)
    })

    it('stays false after calling toggleSubTaskDoneInView(id) with no other draft edit', async () => {
      const { detail, tasks } = await loadBoth()
      const created = seedFullTask(tasks)
      detail.open(created.id)
      const subTaskId = detail.subTasks.value[0]!.id

      detail.toggleSubTaskDoneInView(subTaskId)

      expect(detail.hasUnsavedChanges.value).toBe(false)
    })
  })

  describe('requestClose', () => {
    it('opens the discard confirmation when hasUnsavedChanges is true', async () => {
      const { detail, tasks } = await loadBoth()
      const created = seedFullTask(tasks)
      detail.open(created.id)
      detail.name.value = 'Edited name'

      detail.requestClose()

      expect(detail.isDiscardConfirmOpen.value).toBe(true)
      expect(detail.isOpen.value).toBe(true)
    })

    it('closes immediately with no confirmation when there are no unsaved changes', async () => {
      const { detail, tasks } = await loadBoth()
      const created = seedFullTask(tasks)
      detail.open(created.id)

      detail.requestClose()

      expect(detail.isDiscardConfirmOpen.value).toBe(false)
      expect(detail.isOpen.value).toBe(false)
    })
  })

  describe('confirmDiscard', () => {
    it('closes without calling updateTask; reopening the same task shows its original stored values', async () => {
      const { detail, tasks } = await loadBoth()
      const updateSpy = vi.spyOn(tasks, 'updateTask')
      const created = seedFullTask(tasks)
      detail.open(created.id)
      detail.name.value = 'Edited name'
      detail.requestClose()
      expect(detail.isDiscardConfirmOpen.value).toBe(true)

      detail.confirmDiscard()

      expect(updateSpy).not.toHaveBeenCalled()
      expect(detail.isOpen.value).toBe(false)

      detail.open(created.id)
      expect(detail.name.value).toBe('Buy milk')
    })
  })

  describe('cancelDiscard', () => {
    it('closes only the discard confirmation, leaving the detail view open with the draft intact', async () => {
      const { detail, tasks } = await loadBoth()
      const created = seedFullTask(tasks)
      detail.open(created.id)
      detail.name.value = 'Edited name'
      detail.requestClose()

      detail.cancelDiscard()

      expect(detail.isDiscardConfirmOpen.value).toBe(false)
      expect(detail.isOpen.value).toBe(true)
      expect(detail.name.value).toBe('Edited name')
    })
  })

  describe('save', () => {
    it('sets nameInvalid and does not call updateTask when name is empty-after-trim', async () => {
      const { detail, tasks } = await loadBoth()
      const updateSpy = vi.spyOn(tasks, 'updateTask')
      const created = seedFullTask(tasks)
      detail.open(created.id)
      detail.name.value = '   '

      const result = detail.save()

      expect(result).toBe(false)
      expect(detail.nameInvalid.value).toBe(true)
      expect(updateSpy).not.toHaveBeenCalled()
    })

    it('does not call updateTask when dueBy is before availableFrom', async () => {
      const { detail, tasks } = await loadBoth()
      const updateSpy = vi.spyOn(tasks, 'updateTask')
      const created = seedFullTask(tasks)
      detail.open(created.id)
      detail.availableFrom.value = '2026-03-10'
      detail.dueBy.value = '2026-03-01'

      const result = detail.save()

      expect(result).toBe(false)
      expect(detail.dueByInvalid.value).toBe(true)
      expect(updateSpy).not.toHaveBeenCalled()
    })

    it('calls updateTask with the full expected UpdateTaskChanges shape and closes on success', async () => {
      const { detail, tasks } = await loadBoth()
      const updateSpy = vi.spyOn(tasks, 'updateTask')
      const created = seedFullTask(tasks)
      detail.open(created.id)
      detail.name.value = 'Buy oat milk'
      detail.selectSection('later')
      detail.description.value = 'Oat milk please'
      detail.selectEnergyLevel('low')
      detail.setEstimateField('days', '2')
      detail.setEstimateField('hours', '4')
      detail.setEstimateField('minutes', '10')
      detail.availableFrom.value = '2026-04-01'
      detail.dueBy.value = '2026-04-10'

      const result = detail.save()

      expect(result).toBe(true)
      expect(detail.isOpen.value).toBe(false)
      expect(updateSpy).toHaveBeenCalledWith(created.id, {
        name: 'Buy oat milk',
        section: 'later',
        description: 'Oat milk please',
        energyLevel: 'low',
        estimate: { days: 2, hours: 4, minutes: 10 },
        availableFrom: '2026-04-01',
        dueBy: '2026-04-10',
        subTasks: [
          { id: expect.any(Number), text: 'Step 1', done: false },
          { id: expect.any(Number), text: 'Step 2', done: false },
        ],
      })
    })

    it("an existing sub-task's saved done state reflects a toggleSubTaskDoneInView call made earlier in the session, not the value captured at open() time", async () => {
      const { detail, tasks } = await loadBoth()
      const created = seedFullTask(tasks)
      detail.open(created.id)
      const subTaskId = detail.subTasks.value[0]!.id

      detail.toggleSubTaskDoneInView(subTaskId)
      detail.name.value = 'Buy oat milk'
      const result = detail.save()

      expect(result).toBe(true)
      const savedTask = tasks.tasks.value.find((t) => t.id === created.id)!
      const savedSubTask = savedTask.subTasks.find((s) => s.id === subTaskId)!
      expect(savedSubTask.done).toBe(true)
    })

    it('assigns a new (isNew) sub-task an id that does not collide with any existing sub-task id', async () => {
      const { detail, tasks } = await loadBoth()
      const created = seedFullTask(tasks)
      detail.open(created.id)
      const existingIds = detail.subTasks.value.map((s) => s.id)

      detail.openSubTaskInput()
      detail.subTaskDraft.value = 'New step'
      detail.saveSubTaskDraft()
      detail.save()

      const savedTask = tasks.tasks.value.find((t) => t.id === created.id)!
      const newSubTask = savedTask.subTasks.find((s) => s.text === 'New step')!
      expect(existingIds).not.toContain(newSubTask.id)
    })
  })

  describe('delete flow', () => {
    it('confirmDelete calls removeTask with the right id and closes', async () => {
      const { detail, tasks } = await loadBoth()
      const removeSpy = vi.spyOn(tasks, 'removeTask')
      const created = seedFullTask(tasks)
      detail.open(created.id)

      detail.requestDelete()
      expect(detail.isDeleteConfirmOpen.value).toBe(true)

      detail.confirmDelete()

      expect(removeSpy).toHaveBeenCalledWith(created.id)
      expect(detail.isOpen.value).toBe(false)
      expect(tasks.tasks.value.find((t) => t.id === created.id)).toBeUndefined()
    })

    it('cancelDelete calls neither removeTask nor close', async () => {
      const { detail, tasks } = await loadBoth()
      const removeSpy = vi.spyOn(tasks, 'removeTask')
      const created = seedFullTask(tasks)
      detail.open(created.id)
      detail.requestDelete()

      detail.cancelDelete()

      expect(removeSpy).not.toHaveBeenCalled()
      expect(detail.isDeleteConfirmOpen.value).toBe(false)
      expect(detail.isOpen.value).toBe(true)
    })
  })

  describe('toggleDone / toggleSubTaskDoneInView call the real, unmodified store functions', () => {
    it('toggleDone calls the real toggleTaskDone from useTasks.ts', async () => {
      const { detail, tasks } = await loadBoth()
      const toggleSpy = vi.spyOn(tasks, 'toggleTaskDone')
      const created = seedFullTask(tasks)
      detail.open(created.id)

      detail.toggleDone()

      expect(toggleSpy).toHaveBeenCalledWith(created.id)
      expect(tasks.tasks.value.find((t) => t.id === created.id)!.done).toBe(true)
    })

    it('toggleSubTaskDoneInView calls the real toggleSubTaskDone from useTasks.ts', async () => {
      const { detail, tasks } = await loadBoth()
      const toggleSpy = vi.spyOn(tasks, 'toggleSubTaskDone')
      const created = seedFullTask(tasks)
      detail.open(created.id)
      const subTaskId = detail.subTasks.value[0]!.id

      detail.toggleSubTaskDoneInView(subTaskId)

      expect(toggleSpy).toHaveBeenCalledWith(created.id, subTaskId)
      const savedTask = tasks.tasks.value.find((t) => t.id === created.id)!
      expect(savedTask.subTasks.find((s) => s.id === subTaskId)!.done).toBe(true)
    })
  })
  describe('completion behaviour (task-completion-celebration)', () => {
    async function loadWithCelebration() {
      const { detail, tasks } = await loadBoth()
      const celebrationMod = await import(celebrationModulePath)
      return { detail, tasks, celebration: celebrationMod.useCelebration() }
    }

    it("open(id) defaults openedFrom to 'board'; open(id, 'completed') sets it", async () => {
      const { detail, tasks } = await loadBoth()
      const created = seedFullTask(tasks)

      detail.open(created.id)
      expect(detail.openedFrom.value).toBe('board')

      detail.close()
      detail.open(created.id, 'completed')
      expect(detail.openedFrom.value).toBe('completed')
    })

    it('openedFrom survives close()', async () => {
      const { detail, tasks } = await loadBoth()
      const created = seedFullTask(tasks)
      detail.open(created.id, 'completed')

      detail.close()

      expect(detail.isOpen.value).toBe(false)
      expect(detail.openedFrom.value).toBe('completed')
    })

    it('completing closes immediately with no discard confirmation, even with a dirty draft, and persists no draft edits', async () => {
      const { detail, tasks, celebration } = await loadWithCelebration()
      const updateSpy = vi.spyOn(tasks, 'updateTask')
      const created = seedFullTask(tasks)
      detail.open(created.id)
      detail.name.value = 'Edited but never saved'
      expect(detail.hasUnsavedChanges.value).toBe(true)

      detail.toggleDone()

      expect(detail.isOpen.value).toBe(false)
      expect(detail.isDiscardConfirmOpen.value).toBe(false)
      expect(updateSpy).not.toHaveBeenCalled()
      const stored = tasks.tasks.value.find((t) => t.id === created.id)!
      expect(stored.done).toBe(true)
      expect(stored.name).toBe('Buy milk')
      expect(celebration.celebrationMessage.value).not.toBeNull()
    })

    it('completing celebrates exactly once', async () => {
      const { detail, tasks, celebration } = await loadWithCelebration()
      const created = seedFullTask(tasks)
      detail.open(created.id)
      const before = celebration.celebrationId.value

      detail.toggleDone()

      expect(celebration.celebrationId.value).toBe(before + 1)
    })

    it('un-ticking a done task keeps the modal open and does not celebrate', async () => {
      const { detail, tasks, celebration } = await loadWithCelebration()
      const created = seedFullTask(tasks)
      tasks.toggleTaskDone(created.id)
      detail.open(created.id, 'completed')
      const before = celebration.celebrationId.value

      detail.toggleDone()

      expect(detail.isOpen.value).toBe(true)
      expect(tasks.tasks.value.find((t) => t.id === created.id)!.done).toBe(false)
      expect(celebration.celebrationId.value).toBe(before)
      expect(celebration.celebrationMessage.value).toBeNull()
    })

    it('completing from a board-origin modal leaves a completionFocusTarget', async () => {
      const { detail, tasks, celebration } = await loadWithCelebration()
      const created = seedFullTask(tasks)
      const other = tasks.addTask({ name: 'Other', section: 'now' })!
      detail.open(created.id)

      detail.toggleDone()

      expect(celebration.completionFocusTarget.value).toEqual({ kind: 'task', id: other.id })
    })

    it("completing from a 'completed'-origin modal leaves completionFocusTarget null", async () => {
      const { detail, tasks, celebration } = await loadWithCelebration()
      const created = seedFullTask(tasks)
      tasks.addTask({ name: 'Other', section: 'now' })
      tasks.toggleTaskDone(created.id)
      detail.open(created.id, 'completed')
      detail.toggleDone() // un-tick
      expect(detail.isOpen.value).toBe(true)

      detail.toggleDone() // re-tick

      expect(detail.isOpen.value).toBe(false)
      expect(celebration.completionFocusTarget.value).toBeNull()
    })

    it('sub-task toggles do not celebrate or close the modal', async () => {
      const { detail, tasks, celebration } = await loadWithCelebration()
      const created = seedFullTask(tasks)
      detail.open(created.id)

      detail.toggleSubTaskDoneInView(detail.subTasks.value[0]!.id)

      expect(detail.isOpen.value).toBe(true)
      expect(celebration.celebrationMessage.value).toBeNull()
    })
  })
})
