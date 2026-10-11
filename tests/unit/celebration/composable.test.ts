import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const modulePath = '../../../src/composables/useCelebration'
const tasksModulePath = '../../../src/composables/useTasks'
const energyModulePath = '../../../src/composables/useEnergyLevel'

async function loadAll() {
  const tasksMod = await import(tasksModulePath)
  const mod = await import(modulePath)
  return { mod, celebration: mod.useCelebration(), tasks: tasksMod.useTasks() }
}

type Tasks = Awaited<ReturnType<typeof loadAll>>['tasks']

function seed(tasks: Tasks, name = 'A', section: 'now' | 'next' | 'later' = 'now') {
  return tasks.addTask({ name, section })!
}

describe('useCelebration', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    delete (window as unknown as { matchMedia?: unknown }).matchMedia
  })

  describe('message pool', () => {
    it('exposes exactly 50 distinct, trimmed, non-empty messages', async () => {
      const { CELEBRATION_MESSAGES } = await import(modulePath)
      expect(CELEBRATION_MESSAGES).toHaveLength(50)
      expect(new Set(CELEBRATION_MESSAGES).size).toBe(50)
      for (const m of CELEBRATION_MESSAGES) {
        expect(typeof m).toBe('string')
        expect(m.length).toBeGreaterThan(0)
        expect(m).toBe(m.trim())
      }
    })

    it('Math.random = 0 picks the first message', async () => {
      const { CELEBRATION_MESSAGES, pickCelebrationMessage } = await import(modulePath)
      vi.spyOn(Math, 'random').mockReturnValue(0)
      expect(pickCelebrationMessage()).toBe(CELEBRATION_MESSAGES[0])
    })

    it.each([0.999999, 1])('Math.random = %s picks the 50th message (clamped)', async (value) => {
      const { CELEBRATION_MESSAGES, pickCelebrationMessage } = await import(modulePath)
      vi.spyOn(Math, 'random').mockReturnValue(value)
      expect(pickCelebrationMessage()).toBe(CELEBRATION_MESSAGES[49])
    })
  })

  describe('celebrate', () => {
    it('has no message by default', async () => {
      const { celebration } = await loadAll()
      expect(celebration.celebrationMessage.value).toBeNull()
      expect(celebration.confettiPieces.value).toEqual([])
    })

    it('sets a message from the pool and bumps celebrationId', async () => {
      const { mod, celebration } = await loadAll()
      const before = celebration.celebrationId.value
      celebration.celebrate()
      expect(mod.CELEBRATION_MESSAGES).toContain(celebration.celebrationMessage.value)
      expect(celebration.celebrationId.value).toBe(before + 1)
    })

    it('a second celebrate replaces the message and restarts the timer', async () => {
      const { mod, celebration } = await loadAll()
      const random = vi.spyOn(Math, 'random').mockReturnValue(0)
      celebration.celebrate()
      vi.advanceTimersByTime(4000)
      random.mockReturnValue(0.999999)
      celebration.celebrate()
      expect(celebration.celebrationMessage.value).toBe(mod.CELEBRATION_MESSAGES[49])
      vi.advanceTimersByTime(mod.CELEBRATION_AUTO_DISMISS_MS - 1)
      expect(celebration.celebrationMessage.value).not.toBeNull()
      vi.advanceTimersByTime(2)
      expect(celebration.celebrationMessage.value).toBeNull()
    })

    it('auto-dismisses after CELEBRATION_AUTO_DISMISS_MS (>= 5000)', async () => {
      const { mod, celebration } = await loadAll()
      expect(mod.CELEBRATION_AUTO_DISMISS_MS).toBeGreaterThanOrEqual(5000)
      celebration.celebrate()
      vi.advanceTimersByTime(mod.CELEBRATION_AUTO_DISMISS_MS - 1)
      expect(celebration.celebrationMessage.value).not.toBeNull()
      vi.advanceTimersByTime(1)
      expect(celebration.celebrationMessage.value).toBeNull()
    })

    it('dismissCelebration clears the message and cancels the timer', async () => {
      const { mod, celebration } = await loadAll()
      celebration.celebrate()
      celebration.dismissCelebration()
      expect(celebration.celebrationMessage.value).toBeNull()
      celebration.celebrate()
      vi.advanceTimersByTime(mod.CELEBRATION_AUTO_DISMISS_MS)
      expect(celebration.celebrationMessage.value).toBeNull()
    })

    it('does not touch the energy-level toast', async () => {
      const { celebration } = await loadAll()
      const energy = (await import(energyModulePath)).useEnergyLevel()
      celebration.celebrate()
      expect(energy.toastMessage.value).toBeNull()
    })
  })

  describe('pause / resume', () => {
    it('pauseDismiss stops auto-dismiss', async () => {
      const { celebration } = await loadAll()
      celebration.celebrate()
      celebration.pauseDismiss()
      vi.advanceTimersByTime(10000)
      expect(celebration.celebrationMessage.value).not.toBeNull()
    })

    it('resumeDismiss restarts a full auto-dismiss timer', async () => {
      const { mod, celebration } = await loadAll()
      celebration.celebrate()
      celebration.pauseDismiss()
      vi.advanceTimersByTime(10000)
      celebration.resumeDismiss()
      vi.advanceTimersByTime(mod.CELEBRATION_AUTO_DISMISS_MS - 1)
      expect(celebration.celebrationMessage.value).not.toBeNull()
      vi.advanceTimersByTime(1)
      expect(celebration.celebrationMessage.value).toBeNull()
    })

    it('resumeDismiss with no message is a no-op', async () => {
      const { mod, celebration } = await loadAll()
      celebration.resumeDismiss()
      vi.advanceTimersByTime(mod.CELEBRATION_AUTO_DISMISS_MS * 2)
      expect(celebration.celebrationMessage.value).toBeNull()
    })

    it('a pause can never outlive the card: dismiss while paused, then celebrate auto-dismisses', async () => {
      const { mod, celebration } = await loadAll()
      celebration.celebrate()
      celebration.pauseDismiss()
      celebration.dismissCelebration()
      celebration.celebrate()
      vi.advanceTimersByTime(mod.CELEBRATION_AUTO_DISMISS_MS)
      expect(celebration.celebrationMessage.value).toBeNull()
    })
  })

  describe('confetti', () => {
    it('celebrate creates CONFETTI_PIECE_COUNT pieces and bumps confettiBurstId', async () => {
      const { mod, celebration } = await loadAll()
      const before = celebration.confettiBurstId.value
      celebration.celebrate()
      expect(celebration.confettiPieces.value).toHaveLength(mod.CONFETTI_PIECE_COUNT)
      expect(celebration.confettiBurstId.value).toBe(before + 1)
    })

    it('clears pieces after CONFETTI_TOTAL_MS (<= 5000)', async () => {
      const { mod, celebration } = await loadAll()
      expect(mod.CONFETTI_TOTAL_MS).toBeLessThanOrEqual(5000)
      celebration.celebrate()
      vi.advanceTimersByTime(mod.CONFETTI_TOTAL_MS - 1)
      expect(celebration.confettiPieces.value.length).toBeGreaterThan(0)
      vi.advanceTimersByTime(1)
      expect(celebration.confettiPieces.value).toEqual([])
    })

    it('a second burst restarts the confetti timer', async () => {
      const { mod, celebration } = await loadAll()
      celebration.celebrate()
      vi.advanceTimersByTime(mod.CONFETTI_TOTAL_MS - 1000)
      celebration.celebrate()
      vi.advanceTimersByTime(mod.CONFETTI_TOTAL_MS - 1)
      expect(celebration.confettiPieces.value.length).toBeGreaterThan(0)
      vi.advanceTimersByTime(1)
      expect(celebration.confettiPieces.value).toEqual([])
    })

    it('generateConfettiPieces satisfies the timing invariant at the extreme rand value', async () => {
      const { generateConfettiPieces, CONFETTI_TOTAL_MS } = await import(modulePath)
      const pieces = generateConfettiPieces(60, () => 1)
      expect(pieces).toHaveLength(60)
      for (const p of pieces) {
        expect(p.delay + p.duration).toBeLessThanOrEqual((CONFETTI_TOTAL_MS - 500) / 1000)
      }
    })

    it('generateConfettiPieces stays within documented ranges and uses >= 5 distinct colors', async () => {
      const { generateConfettiPieces } = await import(modulePath)
      let seedValue = 1
      const rand = () => {
        seedValue = (seedValue * 16807) % 2147483647
        return seedValue / 2147483647
      }
      const pieces = generateConfettiPieces(60, rand)
      for (const p of pieces) {
        expect(p.left).toBeGreaterThanOrEqual(0)
        expect(p.left).toBeLessThanOrEqual(100)
        expect(p.delay).toBeGreaterThanOrEqual(0)
        expect(p.delay).toBeLessThanOrEqual(0.8)
        expect(p.duration).toBeGreaterThanOrEqual(2.2)
        expect(p.duration).toBeLessThanOrEqual(3.5)
        expect(p.size).toBeGreaterThanOrEqual(6)
        expect(p.size).toBeLessThanOrEqual(12)
        expect(p.drift).toBeGreaterThanOrEqual(-80)
        expect(p.drift).toBeLessThanOrEqual(80)
        expect(['rect', 'circle']).toContain(p.shape)
      }
      expect(new Set(pieces.map((p: { color: string }) => p.color)).size).toBeGreaterThanOrEqual(5)
      expect(new Set(pieces.map((p: { id: number }) => p.id)).size).toBe(60)
    })

    it('reduced motion: message is set but no pieces are generated', async () => {
      window.matchMedia = vi.fn((q: string) => ({ matches: q.includes('reduce') })) as never
      const { celebration } = await loadAll()
      celebration.celebrate()
      expect(celebration.celebrationMessage.value).not.toBeNull()
      expect(celebration.confettiPieces.value).toEqual([])
    })

    it('reduced motion clears any in-flight confetti on the next celebrate', async () => {
      const { celebration } = await loadAll()
      celebration.celebrate()
      expect(celebration.confettiPieces.value.length).toBeGreaterThan(0)
      window.matchMedia = vi.fn(() => ({ matches: true })) as never
      celebration.celebrate()
      expect(celebration.confettiPieces.value).toEqual([])
    })

    it('matchMedia matches=false: pieces appear', async () => {
      window.matchMedia = vi.fn(() => ({ matches: false })) as never
      const { celebration } = await loadAll()
      celebration.celebrate()
      expect(celebration.confettiPieces.value.length).toBeGreaterThan(0)
    })

    it('matchMedia undefined: pieces appear', async () => {
      const { celebration } = await loadAll()
      expect(typeof window.matchMedia).not.toBe('function')
      celebration.celebrate()
      expect(celebration.confettiPieces.value.length).toBeGreaterThan(0)
    })
  })

  describe('toggleTaskDoneWithCelebration', () => {
    it('false -> true returns true, toggles the task, and celebrates', async () => {
      const { celebration, tasks } = await loadAll()
      const t = seed(tasks)
      expect(celebration.toggleTaskDoneWithCelebration(t.id)).toBe(true)
      expect(tasks.tasks.value[0]!.done).toBe(true)
      expect(celebration.celebrationMessage.value).not.toBeNull()
    })

    it('true -> false returns false and does not celebrate again', async () => {
      const { celebration, tasks } = await loadAll()
      const t = seed(tasks)
      celebration.toggleTaskDoneWithCelebration(t.id)
      celebration.dismissCelebration()
      const idBefore = celebration.celebrationId.value
      expect(celebration.toggleTaskDoneWithCelebration(t.id)).toBe(false)
      expect(tasks.tasks.value[0]!.done).toBe(false)
      expect(celebration.celebrationId.value).toBe(idBefore)
      expect(celebration.celebrationMessage.value).toBeNull()
    })

    it('unknown id returns false and does not celebrate', async () => {
      const { celebration } = await loadAll()
      expect(celebration.toggleTaskDoneWithCelebration(999)).toBe(false)
      expect(celebration.celebrationMessage.value).toBeNull()
    })

    it('a sub-task toggle does not celebrate', async () => {
      const { celebration, tasks } = await loadAll()
      const t = tasks.addTask({ name: 'A', section: 'now', subTasks: [{ text: 's' }] })!
      tasks.toggleSubTaskDone(t.id, t.subTasks[0]!.id)
      expect(celebration.celebrationMessage.value).toBeNull()
    })

    it('hydrating a stored done task does not celebrate', async () => {
      localStorage.setItem(
        'untangle:tasks',
        JSON.stringify([
          {
            id: 1,
            name: 'Old',
            section: 'now',
            description: '',
            energyLevel: null,
            estimate: { days: 0, hours: 0, minutes: 0 },
            availableFrom: null,
            dueBy: null,
            subTasks: [],
            done: true,
            createdAt: 1,
            updatedAt: 1,
          },
        ])
      )
      const { celebration } = await loadAll()
      expect(celebration.celebrationMessage.value).toBeNull()
      expect(celebration.confettiPieces.value).toEqual([])
    })

    it('sets completionFocusTarget before the toggle on completion; consume returns then clears it', async () => {
      const { celebration, tasks } = await loadAll()
      const a = seed(tasks, 'A')
      const b = seed(tasks, 'B')
      celebration.toggleTaskDoneWithCelebration(a.id)
      expect(celebration.completionFocusTarget.value).toEqual({ kind: 'task', id: b.id })
      expect(celebration.consumeCompletionFocusTarget()).toEqual({ kind: 'task', id: b.id })
      expect(celebration.completionFocusTarget.value).toBeNull()
      expect(celebration.consumeCompletionFocusTarget()).toBeNull()
    })

    it('leaves completionFocusTarget null for un-completion', async () => {
      const { celebration, tasks } = await loadAll()
      const a = seed(tasks, 'A')
      seed(tasks, 'B')
      celebration.toggleTaskDoneWithCelebration(a.id)
      celebration.toggleTaskDoneWithCelebration(a.id)
      expect(celebration.completionFocusTarget.value).toBeNull()
    })

    it('leaves completionFocusTarget null with { computeFocusTarget: false }', async () => {
      const { celebration, tasks } = await loadAll()
      const a = seed(tasks, 'A')
      seed(tasks, 'B')
      expect(celebration.toggleTaskDoneWithCelebration(a.id, { computeFocusTarget: false })).toBe(
        true
      )
      expect(celebration.completionFocusTarget.value).toBeNull()
    })

    it('resets a stale completionFocusTarget at the start of every call', async () => {
      const { celebration, tasks } = await loadAll()
      const a = seed(tasks, 'A')
      seed(tasks, 'B')
      celebration.toggleTaskDoneWithCelebration(a.id)
      expect(celebration.completionFocusTarget.value).not.toBeNull()
      celebration.toggleTaskDoneWithCelebration(999)
      expect(celebration.completionFocusTarget.value).toBeNull()
    })

    it('falls back to the section target when the completed task is alone in its section', async () => {
      const { celebration, tasks } = await loadAll()
      const a = seed(tasks, 'A', 'later')
      celebration.toggleTaskDoneWithCelebration(a.id)
      expect(celebration.completionFocusTarget.value).toEqual({ kind: 'section', key: 'later' })
    })
  })
})
