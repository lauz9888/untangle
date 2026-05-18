import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('useCelebration — composable', () => {
  let useCelebration, CELEBRATION_MESSAGES

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.resetModules()
    ;({ useCelebration, CELEBRATION_MESSAGES } = await import('../../../src/composables/useCelebration.js'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('popup starts as null', () => {
      const { popup } = useCelebration()
      expect(popup.value).toBeNull()
    })
  })

  describe('showCelebration', () => {
    it('sets popup to a non-empty string', () => {
      const { popup, showCelebration } = useCelebration()
      showCelebration()
      expect(typeof popup.value).toBe('string')
      expect(popup.value.length).toBeGreaterThan(0)
    })

    it('picks a message from the CELEBRATION_MESSAGES list', () => {
      const { popup, showCelebration } = useCelebration()
      showCelebration()
      expect(CELEBRATION_MESSAGES).toContain(popup.value)
    })

    it('auto-dismisses after 3500ms', () => {
      const { popup, showCelebration } = useCelebration()
      showCelebration()
      vi.advanceTimersByTime(3500)
      expect(popup.value).toBeNull()
    })

    it('is still visible just before 3500ms', () => {
      const { popup, showCelebration } = useCelebration()
      showCelebration()
      vi.advanceTimersByTime(3499)
      expect(popup.value).not.toBeNull()
    })

    it('resets the auto-dismiss timer when called again', () => {
      const { popup, showCelebration } = useCelebration()
      showCelebration()
      vi.advanceTimersByTime(3000)
      showCelebration()
      vi.advanceTimersByTime(3000)
      expect(popup.value).not.toBeNull()
      vi.advanceTimersByTime(500)
      expect(popup.value).toBeNull()
    })
  })

  describe('dismiss', () => {
    it('clears the popup immediately', () => {
      const { popup, showCelebration, dismiss } = useCelebration()
      showCelebration()
      dismiss()
      expect(popup.value).toBeNull()
    })

    it('cancels the auto-dismiss timer', () => {
      const { popup, showCelebration, dismiss } = useCelebration()
      showCelebration()
      dismiss()
      vi.advanceTimersByTime(3500)
      expect(popup.value).toBeNull()
    })
  })

  describe('CELEBRATION_MESSAGES', () => {
    it('has a meaningful pool of messages', () => {
      expect(CELEBRATION_MESSAGES.length).toBeGreaterThanOrEqual(10)
    })

    it('contains no duplicate messages', () => {
      const unique = new Set(CELEBRATION_MESSAGES)
      expect(unique.size).toBe(CELEBRATION_MESSAGES.length)
    })

    it('all messages are non-empty strings', () => {
      for (const msg of CELEBRATION_MESSAGES) {
        expect(typeof msg).toBe('string')
        expect(msg.trim().length).toBeGreaterThan(0)
      }
    })
  })
})
