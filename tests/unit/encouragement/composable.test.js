import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('useEncouragement — composable', () => {
  let useEncouragement, ENCOURAGEMENT_MESSAGES

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.resetModules()
    ;({ useEncouragement, ENCOURAGEMENT_MESSAGES } = await import('../../../src/composables/useEncouragement.js'))
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
    it('contains exactly 100 messages', () => {
      expect(ENCOURAGEMENT_MESSAGES).toHaveLength(100)
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
})
