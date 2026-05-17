import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('useToast — composable', () => {
  let useToast, CELEBRATION_MESSAGES

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.resetModules()
    ;({ useToast, CELEBRATION_MESSAGES } = await import('../../../src/composables/useToast.js'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('toast starts as null', () => {
      const { toast } = useToast()
      expect(toast.value).toBeNull()
    })
  })

  describe('showCelebration', () => {
    it('sets toast to a non-empty string', () => {
      const { toast, showCelebration } = useToast()
      showCelebration()
      expect(typeof toast.value).toBe('string')
      expect(toast.value.length).toBeGreaterThan(0)
    })

    it('picks a message from the CELEBRATION_MESSAGES list', () => {
      const { toast, showCelebration } = useToast()
      showCelebration()
      expect(CELEBRATION_MESSAGES).toContain(toast.value)
    })

    it('auto-dismisses after 3500ms', () => {
      const { toast, showCelebration } = useToast()
      showCelebration()
      vi.advanceTimersByTime(3500)
      expect(toast.value).toBeNull()
    })

    it('is still visible just before 3500ms', () => {
      const { toast, showCelebration } = useToast()
      showCelebration()
      vi.advanceTimersByTime(3499)
      expect(toast.value).not.toBeNull()
    })

    it('resets the auto-dismiss timer when called again', () => {
      const { toast, showCelebration } = useToast()
      showCelebration()
      vi.advanceTimersByTime(3000)
      showCelebration()
      vi.advanceTimersByTime(3000)
      expect(toast.value).not.toBeNull()
      vi.advanceTimersByTime(500)
      expect(toast.value).toBeNull()
    })
  })

  describe('dismissToast', () => {
    it('clears the toast immediately', () => {
      const { toast, showCelebration, dismissToast } = useToast()
      showCelebration()
      dismissToast()
      expect(toast.value).toBeNull()
    })

    it('cancels the auto-dismiss timer', () => {
      const { toast, showCelebration, dismissToast } = useToast()
      showCelebration()
      dismissToast()
      vi.advanceTimersByTime(3500)
      expect(toast.value).toBeNull()
    })
  })

  describe('CELEBRATION_MESSAGES', () => {
    it('contains exactly 50 messages', () => {
      expect(CELEBRATION_MESSAGES).toHaveLength(50)
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
