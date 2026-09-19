import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { useAddTaskModal } from '../../../src/composables/useAddTaskModal'

const modulePath = '../../../src/composables/useAddTaskModal'
const tasksModulePath = '../../../src/composables/useTasks'

type AddTaskModalState = ReturnType<typeof useAddTaskModal>

async function load(): Promise<AddTaskModalState> {
  const mod = await import(modulePath)
  return mod.useAddTaskModal()
}

describe('useAddTaskModal', () => {
  beforeEach(() => {
    vi.resetModules()
    // save() now has a real side effect on useTasks.ts's singleton/persisted state
    // (design.md, Risks item 7) — must start each test from a clean store.
    localStorage.clear()
  })

  describe('default state', () => {
    it('starts closed with no confirmation dialog shown', async () => {
      const { isOpen, isConfirmOpen } = await load()
      expect(isOpen.value).toBe(false)
      expect(isConfirmOpen.value).toBe(false)
    })

    it('defaults nowNextLater to "now"', async () => {
      const { nowNextLater } = await load()
      expect(nowNextLater.value).toBe('now')
    })

    it('defaults every other field to empty/null/unset', async () => {
      const state = await load()
      expect(state.taskName.value).toBe('')
      expect(state.description.value).toBe('')
      expect(state.energyLevel.value).toBe(null)
      expect(state.estimateDays.value).toBe('')
      expect(state.estimateHours.value).toBe('')
      expect(state.estimateMinutes.value).toBe('')
      expect(state.availableFrom.value).toBe('')
      expect(state.dueBy.value).toBe('')
      expect(state.subTasks.value).toEqual([])
      expect(state.isSubTaskInputOpen.value).toBe(false)
      expect(state.subTaskDraft.value).toBe('')
      expect(state.taskNameInvalid.value).toBe(false)
    })
  })

  describe('openModal', () => {
    it('sets isOpen to true', async () => {
      const { isOpen, openModal } = await load()
      openModal()
      expect(isOpen.value).toBe(true)
    })

    it('resets every field to its default, even after prior mutation', async () => {
      const state = await load()
      state.taskName.value = 'Buy milk'
      state.description.value = 'Get 2%'
      state.selectEnergyLevel('high')
      state.setEstimateField('days', '2')
      state.availableFrom.value = '2026-01-01'
      state.dueBy.value = '2026-01-05'
      state.selectSection('later')
      state.openSubTaskInput()
      state.subTaskDraft.value = 'Step 1'
      state.saveSubTaskDraft()

      state.openModal()

      expect(state.taskName.value).toBe('')
      expect(state.description.value).toBe('')
      expect(state.energyLevel.value).toBe(null)
      expect(state.estimateDays.value).toBe('')
      expect(state.availableFrom.value).toBe('')
      expect(state.dueBy.value).toBe('')
      expect(state.nowNextLater.value).toBe('now')
      expect(state.subTasks.value).toEqual([])
      expect(state.isSubTaskInputOpen.value).toBe(false)
      expect(state.subTaskDraft.value).toBe('')
    })
  })

  describe('requestClose', () => {
    it('closes immediately with no confirmation when nothing has a value', async () => {
      const { isOpen, isConfirmOpen, openModal, requestClose } = await load()
      openModal()

      requestClose()

      expect(isOpen.value).toBe(false)
      expect(isConfirmOpen.value).toBe(false)
    })

    type Case = [string, (state: AddTaskModalState) => void]

    const hasValueCases: Case[] = [
      ['Task name set', (s) => (s.taskName.value = 'Buy milk')],
      ['Description set', (s) => (s.description.value = 'Get 2% milk')],
      ['Energy level selected', (s) => s.selectEnergyLevel('medium')],
      ['Estimate days set to a positive value', (s) => s.setEstimateField('days', '2')],
      ['Estimate hours set to a positive value', (s) => s.setEstimateField('hours', '3')],
      ['Estimate minutes set to a positive value', (s) => s.setEstimateField('minutes', '15')],
      ['Available from set', (s) => (s.availableFrom.value = '2026-01-01')],
      ['Due by set', (s) => (s.dueBy.value = '2026-01-05')],
      ['Now/Next/Later changed away from Now', (s) => s.selectSection('next')],
      [
        'a sub-task has been saved',
        (s) => {
          s.openSubTaskInput()
          s.subTaskDraft.value = 'Step 1'
          s.saveSubTaskDraft()
        },
      ],
      [
        'the sub-task draft is open with non-empty text',
        (s) => {
          s.openSubTaskInput()
          s.subTaskDraft.value = 'Step 1'
        },
      ],
    ]

    it.each(hasValueCases)('opens the confirmation dialog when %s', async (_label, mutate) => {
      const state = await load()
      state.openModal()

      mutate(state)
      state.requestClose()

      expect(state.isConfirmOpen.value).toBe(true)
      expect(state.isOpen.value).toBe(true)
    })

    it('does not open the confirmation dialog when an Estimate sub-field is explicitly "0"', async () => {
      const state = await load()
      state.openModal()
      state.setEstimateField('days', '0')

      state.requestClose()

      expect(state.isConfirmOpen.value).toBe(false)
      expect(state.isOpen.value).toBe(false)
    })

    it('opens the confirmation dialog when an Estimate sub-field is a positive integer string', async () => {
      const state = await load()
      state.openModal()
      state.setEstimateField('days', '3')

      state.requestClose()

      expect(state.isConfirmOpen.value).toBe(true)
      expect(state.isOpen.value).toBe(true)
    })
  })

  describe('setEstimateField (Req 15 sanitization)', () => {
    // Second element is the expected value for the uncapped 'days' field (plain
    // sanitizeDigitsOnly output). Hours/minutes additionally clamp to 23/59 (issue #121), so
    // those two fields' expectations are derived below rather than reusing this value verbatim.
    const adversarialCases: [string, string][] = [
      ['-5', '5'],
      ['1.5', '15'],
      ['abc12', '12'],
      ['-1.5e3', '153'],
      ['', ''],
      ['42', '42'],
    ]

    const maxByField: Record<'days' | 'hours' | 'minutes', number | null> = {
      days: null,
      hours: 23,
      minutes: 59,
    }

    function expectedFor(field: 'days' | 'hours' | 'minutes', sanitized: string): string {
      const max = maxByField[field]
      if (max === null || sanitized === '') {
        return sanitized
      }
      return Number(sanitized) > max ? String(max) : sanitized
    }

    it.each(['days', 'hours', 'minutes'] as const)(
      'strips non-digit characters (and clamps hours/minutes) for the %s sub-field',
      async (field) => {
        const state = await load()
        const refByField: Record<'days' | 'hours' | 'minutes', AddTaskModalState['estimateDays']> =
          {
            days: state.estimateDays,
            hours: state.estimateHours,
            minutes: state.estimateMinutes,
          }

        adversarialCases.forEach(([raw, sanitized]) => {
          state.setEstimateField(field, raw)
          expect(refByField[field].value).toBe(expectedFor(field, sanitized))
        })
      }
    )

    it('never leaves the resulting ref value containing anything but digits', async () => {
      const state = await load()

      adversarialCases.forEach(([raw]) => {
        state.setEstimateField('days', raw)
        expect(state.estimateDays.value).toMatch(/^\d*$/)
        state.setEstimateField('hours', raw)
        expect(state.estimateHours.value).toMatch(/^\d*$/)
        state.setEstimateField('minutes', raw)
        expect(state.estimateMinutes.value).toMatch(/^\d*$/)
      })
    })

    it('never leaves hours above 23 or minutes above 59, however adversarial the input', async () => {
      const state = await load()

      adversarialCases.forEach(([raw]) => {
        state.setEstimateField('hours', raw)
        if (state.estimateHours.value !== '') {
          expect(Number(state.estimateHours.value)).toBeLessThanOrEqual(23)
        }
        state.setEstimateField('minutes', raw)
        if (state.estimateMinutes.value !== '') {
          expect(Number(state.estimateMinutes.value)).toBeLessThanOrEqual(59)
        }
      })
    })

    it('is the only path that changes the Estimate refs; resetFields clears whatever it set', async () => {
      const state = await load()
      state.setEstimateField('days', '-5')
      state.setEstimateField('hours', '1.5')
      state.setEstimateField('minutes', 'abc12')
      expect(state.estimateDays.value).toBe('5')
      expect(state.estimateHours.value).toBe('15')
      expect(state.estimateMinutes.value).toBe('12')

      state.openModal()

      expect(state.estimateDays.value).toBe('')
      expect(state.estimateHours.value).toBe('')
      expect(state.estimateMinutes.value).toBe('')
    })
  })

  describe('setEstimateField upper-bound clamping (Req 15 amendment, issue #121)', () => {
    it('clamps Hours above 23 down to 23', async () => {
      const state = await load()
      state.setEstimateField('hours', '99')
      expect(state.estimateHours.value).toBe('23')
    })

    it('clamps Minutes above 59 down to 59', async () => {
      const state = await load()
      state.setEstimateField('minutes', '60')
      expect(state.estimateMinutes.value).toBe('59')
    })

    it('preserves the Hours boundary value 23 exactly', async () => {
      const state = await load()
      state.setEstimateField('hours', '23')
      expect(state.estimateHours.value).toBe('23')
    })

    it('preserves the Minutes boundary value 59 exactly', async () => {
      const state = await load()
      state.setEstimateField('minutes', '59')
      expect(state.estimateMinutes.value).toBe('59')
    })

    it('clamps Hours just over the boundary (24) down to 23', async () => {
      const state = await load()
      state.setEstimateField('hours', '24')
      expect(state.estimateHours.value).toBe('23')
    })

    it('clamps Minutes just over the boundary (60) down to 59', async () => {
      const state = await load()
      state.setEstimateField('minutes', '60')
      expect(state.estimateMinutes.value).toBe('59')
    })

    it('clamps across a keystroke-by-keystroke sequence, the exact scenario issue #121 reported', async () => {
      const state = await load()
      state.setEstimateField('hours', '9')
      expect(state.estimateHours.value).toBe('9')

      // Simulates the second keystroke: the real <input>'s target.value is already the full
      // concatenated string ('99'), not just the newly typed character.
      state.setEstimateField('hours', '99')
      expect(state.estimateHours.value).toBe('23')
    })

    it('clamps adversarial input after sanitization: Hours', async () => {
      const state = await load()
      state.setEstimateField('hours', '-99')
      expect(state.estimateHours.value).toBe('23')
    })

    it('clamps adversarial input after sanitization: Minutes', async () => {
      const state = await load()
      state.setEstimateField('minutes', '1.5e3')
      expect(state.estimateMinutes.value).toBe('59')
    })

    it('leaves blank Hours/Minutes blank rather than clamping to "0"', async () => {
      const state = await load()
      state.setEstimateField('hours', '')
      expect(state.estimateHours.value).toBe('')
      state.setEstimateField('minutes', '')
      expect(state.estimateMinutes.value).toBe('')
    })

    it('leaves Days uncapped, even far past what Hours/Minutes would allow', async () => {
      const state = await load()
      state.setEstimateField('days', '999')
      expect(state.estimateDays.value).toBe('999')
    })
  })

  describe('confirmDiscard', () => {
    it('resets fields and closes both the modal and the confirmation dialog', async () => {
      const state = await load()
      state.openModal()
      state.taskName.value = 'Buy milk'
      state.requestClose()
      expect(state.isConfirmOpen.value).toBe(true)

      state.confirmDiscard()

      expect(state.isOpen.value).toBe(false)
      expect(state.isConfirmOpen.value).toBe(false)
      expect(state.taskName.value).toBe('')
    })
  })

  describe('cancelDiscard', () => {
    it('closes only the confirmation dialog, leaving the modal open with fields intact', async () => {
      const state = await load()
      state.openModal()
      state.taskName.value = 'Buy milk'
      state.requestClose()
      expect(state.isConfirmOpen.value).toBe(true)

      state.cancelDiscard()

      expect(state.isConfirmOpen.value).toBe(false)
      expect(state.isOpen.value).toBe(true)
      expect(state.taskName.value).toBe('Buy milk')
    })
  })

  describe('save', () => {
    it('sets taskNameInvalid and keeps the modal open when Task name is empty', async () => {
      const state = await load()
      state.openModal()

      const result = state.save()

      expect(result).toBe(false)
      expect(state.taskNameInvalid.value).toBe(true)
      expect(state.isOpen.value).toBe(true)
    })

    it('sets taskNameInvalid and keeps the modal open when Task name is whitespace-only', async () => {
      const state = await load()
      state.openModal()
      state.taskName.value = '   '

      const result = state.save()

      expect(result).toBe(false)
      expect(state.taskNameInvalid.value).toBe(true)
      expect(state.isOpen.value).toBe(true)
    })

    it('closes and returns true with a valid Task name and no due-by conflict, regardless of other fields', async () => {
      const state = await load()
      state.openModal()
      state.taskName.value = 'Buy milk'

      const result = state.save()

      expect(result).toBe(true)
      expect(state.isOpen.value).toBe(false)
    })

    it('does not open the confirmation dialog on a successful save', async () => {
      const state = await load()
      state.openModal()
      state.taskName.value = 'Buy milk'
      state.description.value = 'Get 2% milk'

      state.save()

      expect(state.isConfirmOpen.value).toBe(false)
    })

    it('blocks save and sets dueByInvalid when Due by precedes Available from', async () => {
      const state = await load()
      state.openModal()
      state.taskName.value = 'Buy milk'
      state.availableFrom.value = '2026-02-10'
      state.dueBy.value = '2026-02-01'

      const result = state.save()

      expect(result).toBe(false)
      expect(state.dueByInvalid.value).toBe(true)
      expect(state.isOpen.value).toBe(true)
    })

    it('allows save to succeed once the date conflict is fixed', async () => {
      const state = await load()
      state.openModal()
      state.taskName.value = 'Buy milk'
      state.availableFrom.value = '2026-02-10'
      state.dueBy.value = '2026-02-01'
      state.save()
      expect(state.isOpen.value).toBe(true)

      state.dueBy.value = '2026-02-15'
      const result = state.save()

      expect(result).toBe(true)
      expect(state.isOpen.value).toBe(false)
    })

    it('clears taskNameInvalid as soon as taskName is edited after a failed save', async () => {
      const state = await load()
      state.openModal()
      state.save()
      expect(state.taskNameInvalid.value).toBe(true)

      state.taskName.value = 'B'

      expect(state.taskNameInvalid.value).toBe(false)
    })
  })

  describe('dueByInvalid', () => {
    it('is false when only one of the two dates is set', async () => {
      const state = await load()
      state.availableFrom.value = '2026-02-10'
      expect(state.dueByInvalid.value).toBe(false)

      state.availableFrom.value = ''
      state.dueBy.value = '2026-02-10'
      expect(state.dueByInvalid.value).toBe(false)
    })

    it('is false when Due by is on or after Available from', async () => {
      const state = await load()
      state.availableFrom.value = '2026-02-10'
      state.dueBy.value = '2026-02-10'
      expect(state.dueByInvalid.value).toBe(false)

      state.dueBy.value = '2026-02-11'
      expect(state.dueByInvalid.value).toBe(false)
    })
  })

  describe('selectSection', () => {
    it('always lands on the given key and never toggles off', async () => {
      const { nowNextLater, selectSection } = await load()
      selectSection('next')
      expect(nowNextLater.value).toBe('next')

      selectSection('next')
      expect(nowNextLater.value).toBe('next')

      selectSection('later')
      expect(nowNextLater.value).toBe('later')
    })
  })

  describe('selectEnergyLevel', () => {
    it('selects the given level', async () => {
      const { energyLevel, selectEnergyLevel } = await load()
      selectEnergyLevel('low')
      expect(energyLevel.value).toBe('low')
    })

    it('toggles off when re-selecting the currently selected level', async () => {
      const { energyLevel, selectEnergyLevel } = await load()
      selectEnergyLevel('low')
      selectEnergyLevel('low')
      expect(energyLevel.value).toBe(null)
    })

    it('replaces the selection when switching to a different level', async () => {
      const { energyLevel, selectEnergyLevel } = await load()
      selectEnergyLevel('low')
      selectEnergyLevel('high')
      expect(energyLevel.value).toBe('high')
    })
  })

  describe('sub-tasks', () => {
    it('saveSubTaskDraft trims and appends non-empty text, then resets the draft and closes the input', async () => {
      const state = await load()
      state.openSubTaskInput()
      state.subTaskDraft.value = '  Buy eggs  '

      state.saveSubTaskDraft()

      expect(state.subTasks.value.map((t: { text: string }) => t.text)).toEqual(['Buy eggs'])
      expect(state.subTaskDraft.value).toBe('')
      expect(state.isSubTaskInputOpen.value).toBe(false)
    })

    it('saveSubTaskDraft ignores whitespace-only text and does not append', async () => {
      const state = await load()
      state.openSubTaskInput()
      state.subTaskDraft.value = '   '

      state.saveSubTaskDraft()

      expect(state.subTasks.value).toEqual([])
    })

    it('canSaveSubTaskDraft is false for blank/whitespace-only text and true for real text', async () => {
      const state = await load()
      state.openSubTaskInput()
      expect(state.canSaveSubTaskDraft.value).toBe(false)

      state.subTaskDraft.value = '   '
      expect(state.canSaveSubTaskDraft.value).toBe(false)

      state.subTaskDraft.value = 'Buy eggs'
      expect(state.canSaveSubTaskDraft.value).toBe(true)
    })

    it('closeSubTaskInput resets both isSubTaskInputOpen and subTaskDraft (#118)', async () => {
      const state = await load()
      state.openSubTaskInput()
      state.subTaskDraft.value = 'Discard me'

      state.closeSubTaskInput()

      expect(state.isSubTaskInputOpen.value).toBe(false)
      expect(state.subTaskDraft.value).toBe('')
    })

    it('reopening the draft after Close never shows the previously discarded text (#118)', async () => {
      const state = await load()
      state.openSubTaskInput()
      state.subTaskDraft.value = 'Discarded text'
      state.closeSubTaskInput()

      state.openSubTaskInput()

      expect(state.subTaskDraft.value).toBe('')
    })

    it('removeSubTask removes only the matching entry, preserving insertion order of the rest', async () => {
      const state = await load()
      state.openSubTaskInput()
      state.subTaskDraft.value = 'First'
      state.saveSubTaskDraft()
      state.openSubTaskInput()
      state.subTaskDraft.value = 'Second'
      state.saveSubTaskDraft()
      state.openSubTaskInput()
      state.subTaskDraft.value = 'Third'
      state.saveSubTaskDraft()

      const secondId = state.subTasks.value[1]!.id
      state.removeSubTask(secondId)

      expect(state.subTasks.value.map((t: { text: string }) => t.text)).toEqual(['First', 'Third'])
    })

    it('preserves insertion order across add/remove/add sequences', async () => {
      const state = await load()
      const add = (text: string) => {
        state.openSubTaskInput()
        state.subTaskDraft.value = text
        state.saveSubTaskDraft()
      }
      add('A')
      add('B')
      const idA = state.subTasks.value[0]!.id
      state.removeSubTask(idA)
      add('C')

      expect(state.subTasks.value.map((t: { text: string }) => t.text)).toEqual(['B', 'C'])
    })
  })

  describe('save() persisting to the task store', () => {
    // Both modules must be re-imported fresh after vi.resetModules(), mirroring load() above —
    // a stale reference to either module from a prior test would not reflect the instance
    // save() actually calls (design.md, Risks item 7).
    async function loadBoth() {
      const modalMod = await import(modulePath)
      const tasksMod = await import(tasksModulePath)
      return { modal: modalMod.useAddTaskModal(), tasks: tasksMod.useTasks() }
    }

    it('appends exactly one task with the expected mapped fields on a successful save', async () => {
      const { modal, tasks } = await loadBoth()
      modal.openModal()
      modal.taskName.value = 'Buy milk'
      modal.selectSection('next')
      modal.description.value = 'Get 2% milk'
      modal.selectEnergyLevel('medium')
      modal.setEstimateField('days', '2')
      modal.setEstimateField('hours', '3')
      modal.setEstimateField('minutes', '15')
      modal.availableFrom.value = '2026-01-01'
      modal.dueBy.value = '2026-01-05'
      modal.openSubTaskInput()
      modal.subTaskDraft.value = 'Step 1'
      modal.saveSubTaskDraft()

      const result = modal.save()

      expect(result).toBe(true)
      expect(tasks.tasks.value).toHaveLength(1)
      const created = tasks.tasks.value[0]!
      expect(created.name).toBe('Buy milk')
      expect(created.section).toBe('next')
      expect(created.description).toBe('Get 2% milk')
      expect(created.energyLevel).toBe('medium')
      expect(created.estimate).toEqual({ days: 2, hours: 3, minutes: 15 })
      expect(created.availableFrom).toBe('2026-01-01')
      expect(created.dueBy).toBe('2026-01-05')
      expect(created.subTasks).toEqual([{ id: expect.any(Number), text: 'Step 1', done: false }])
      expect(created.done).toBe(false)
    })

    it('defaults empty sanitized estimate strings to 0 and empty date strings to null', async () => {
      const { modal, tasks } = await loadBoth()
      modal.openModal()
      modal.taskName.value = 'Buy milk'

      modal.save()

      const created = tasks.tasks.value[0]!
      expect(created.estimate).toEqual({ days: 0, hours: 0, minutes: 0 })
      expect(created.availableFrom).toBe(null)
      expect(created.dueBy).toBe(null)
      expect(created.subTasks).toEqual([])
    })

    it('appends nothing to the store on a failed save (empty task name)', async () => {
      const { modal, tasks } = await loadBoth()
      modal.openModal()

      const result = modal.save()

      expect(result).toBe(false)
      expect(tasks.tasks.value).toHaveLength(0)
    })

    it('appends nothing to the store on a failed save (invalid due-by range)', async () => {
      const { modal, tasks } = await loadBoth()
      modal.openModal()
      modal.taskName.value = 'Buy milk'
      modal.availableFrom.value = '2026-02-10'
      modal.dueBy.value = '2026-02-01'

      const result = modal.save()

      expect(result).toBe(false)
      expect(tasks.tasks.value).toHaveLength(0)
    })
  })

  describe('singleton sharing', () => {
    it('shares state across every call as a singleton', async () => {
      const mod = await import(modulePath)
      const first = mod.useAddTaskModal()
      const second = mod.useAddTaskModal()

      first.openModal()
      first.taskName.value = 'Buy milk'

      expect(second.isOpen.value).toBe(true)
      expect(second.taskName.value).toBe('Buy milk')
    })
  })
})
