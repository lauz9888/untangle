import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('useEncouragement — composable', () => {
  let useEncouragement, ENCOURAGEMENT_MESSAGES, ENERGY_MESSAGES

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.resetModules()
    ;({ useEncouragement, ENCOURAGEMENT_MESSAGES, ENERGY_MESSAGES } = await import('../../../src/composables/useEncouragement.js'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('encouragement starts as null', () => {
      const { encouragement } = useEncouragement()
      expect(encouragement.value).toBeNull()
    })
  })

  describe('showEncouragement', () => {
    it('sets encouragement to a non-empty string', () => {
      const { encouragement, showEncouragement } = useEncouragement()
      showEncouragement()
      expect(typeof encouragement.value).toBe('string')
      expect(encouragement.value.length).toBeGreaterThan(0)
    })

    it('picks a message from the ENCOURAGEMENT_MESSAGES list', () => {
      const { encouragement, showEncouragement } = useEncouragement()
      showEncouragement()
      expect(ENCOURAGEMENT_MESSAGES).toContain(encouragement.value)
    })

    it('auto-dismisses after 5000ms', () => {
      const { encouragement, showEncouragement } = useEncouragement()
      showEncouragement()
      vi.advanceTimersByTime(5000)
      expect(encouragement.value).toBeNull()
    })

    it('is still visible just before 5000ms', () => {
      const { encouragement, showEncouragement } = useEncouragement()
      showEncouragement()
      vi.advanceTimersByTime(4999)
      expect(encouragement.value).not.toBeNull()
    })

    it('resets the auto-dismiss timer when called again', () => {
      const { encouragement, showEncouragement } = useEncouragement()
      showEncouragement()
      vi.advanceTimersByTime(4000)
      showEncouragement()
      vi.advanceTimersByTime(4000)
      expect(encouragement.value).not.toBeNull()
      vi.advanceTimersByTime(1000)
      expect(encouragement.value).toBeNull()
    })
  })

  describe('dismissEncouragement', () => {
    it('clears the encouragement immediately', () => {
      const { encouragement, showEncouragement, dismissEncouragement } = useEncouragement()
      showEncouragement()
      dismissEncouragement()
      expect(encouragement.value).toBeNull()
    })

    it('cancels the auto-dismiss timer', () => {
      const { encouragement, showEncouragement, dismissEncouragement } = useEncouragement()
      showEncouragement()
      dismissEncouragement()
      vi.advanceTimersByTime(5000)
      expect(encouragement.value).toBeNull()
    })
  })

  describe('ENCOURAGEMENT_MESSAGES', () => {
    it('has a meaningful pool of messages', () => {
      expect(ENCOURAGEMENT_MESSAGES.length).toBeGreaterThanOrEqual(10)
    })

    it('contains no duplicate messages', () => {
      const unique = new Set(ENCOURAGEMENT_MESSAGES)
      expect(unique.size).toBe(ENCOURAGEMENT_MESSAGES.length)
    })

    it('all messages are non-empty strings', () => {
      for (const msg of ENCOURAGEMENT_MESSAGES) {
        expect(typeof msg).toBe('string')
        expect(msg.trim().length).toBeGreaterThan(0)
      }
    })
  })

  describe('ENERGY_MESSAGES', () => {
    it('has entries for all four energy levels', () => {
      expect(ENERGY_MESSAGES).toHaveProperty('tiny')
      expect(ENERGY_MESSAGES).toHaveProperty('small')
      expect(ENERGY_MESSAGES).toHaveProperty('medium')
      expect(ENERGY_MESSAGES).toHaveProperty('large')
    })

    it('each level has exactly 20 messages', () => {
      for (const level of ['tiny', 'small', 'medium', 'large']) {
        expect(ENERGY_MESSAGES[level]).toHaveLength(20)
      }
    })

    it('all messages are non-empty strings', () => {
      for (const messages of Object.values(ENERGY_MESSAGES)) {
        for (const msg of messages) {
          expect(typeof msg).toBe('string')
          expect(msg.trim().length).toBeGreaterThan(0)
        }
      }
    })

    it('contains no duplicate messages within a level', () => {
      for (const messages of Object.values(ENERGY_MESSAGES)) {
        const unique = new Set(messages)
        expect(unique.size).toBe(messages.length)
      }
    })
  })

  describe('showEnergyEncouragement', () => {
    it('sets encouragement to a message from the specified level list', () => {
      const { encouragement, showEnergyEncouragement } = useEncouragement()
      showEnergyEncouragement('tiny')
      expect(ENERGY_MESSAGES.tiny).toContain(encouragement.value)
    })

    it('picks from the correct level list for each level', () => {
      for (const level of ['tiny', 'small', 'medium', 'large']) {
        const { encouragement, showEnergyEncouragement } = useEncouragement()
        showEnergyEncouragement(level)
        expect(ENERGY_MESSAGES[level]).toContain(encouragement.value)
      }
    })

    it('does nothing when called with an unknown levelId', () => {
      const { encouragement, showEnergyEncouragement } = useEncouragement()
      showEnergyEncouragement('unknown')
      expect(encouragement.value).toBeNull()
    })

    it('auto-dismisses after 5000ms', () => {
      const { encouragement, showEnergyEncouragement } = useEncouragement()
      showEnergyEncouragement('medium')
      vi.advanceTimersByTime(5000)
      expect(encouragement.value).toBeNull()
    })

    it('is still visible just before 5000ms', () => {
      const { encouragement, showEnergyEncouragement } = useEncouragement()
      showEnergyEncouragement('small')
      vi.advanceTimersByTime(4999)
      expect(encouragement.value).not.toBeNull()
    })

    it('resets the auto-dismiss timer when called again', () => {
      const { encouragement, showEnergyEncouragement } = useEncouragement()
      showEnergyEncouragement('small')
      vi.advanceTimersByTime(4000)
      showEnergyEncouragement('large')
      vi.advanceTimersByTime(4000)
      expect(encouragement.value).not.toBeNull()
      vi.advanceTimersByTime(1000)
      expect(encouragement.value).toBeNull()
    })
  })
})
