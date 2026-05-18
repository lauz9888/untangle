import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('useToughLove — composable', () => {
  let useToughLove, TOUGH_LOVE_MESSAGES

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.resetModules()
    ;({ useToughLove, TOUGH_LOVE_MESSAGES } = await import('../../../src/composables/useToughLove.js'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('toughLove starts as null', () => {
      const { toughLove } = useToughLove()
      expect(toughLove.value).toBeNull()
    })
  })

  describe('showToughLove', () => {
    it('sets toughLove to a non-empty string', () => {
      const { toughLove, showToughLove } = useToughLove()
      showToughLove()
      expect(typeof toughLove.value).toBe('string')
      expect(toughLove.value.length).toBeGreaterThan(0)
    })

    it('picks a message from the TOUGH_LOVE_MESSAGES list', () => {
      const { toughLove, showToughLove } = useToughLove()
      showToughLove()
      expect(TOUGH_LOVE_MESSAGES).toContain(toughLove.value)
    })

    it('auto-dismisses after 5000ms', () => {
      const { toughLove, showToughLove } = useToughLove()
      showToughLove()
      vi.advanceTimersByTime(5000)
      expect(toughLove.value).toBeNull()
    })

    it('is still visible just before 5000ms', () => {
      const { toughLove, showToughLove } = useToughLove()
      showToughLove()
      vi.advanceTimersByTime(4999)
      expect(toughLove.value).not.toBeNull()
    })

    it('resets the auto-dismiss timer when called again', () => {
      const { toughLove, showToughLove } = useToughLove()
      showToughLove()
      vi.advanceTimersByTime(4000)
      showToughLove()
      vi.advanceTimersByTime(4000)
      expect(toughLove.value).not.toBeNull()
      vi.advanceTimersByTime(1000)
      expect(toughLove.value).toBeNull()
    })
  })

  describe('dismissToughLove', () => {
    it('clears the toughLove immediately', () => {
      const { toughLove, showToughLove, dismissToughLove } = useToughLove()
      showToughLove()
      dismissToughLove()
      expect(toughLove.value).toBeNull()
    })

    it('cancels the auto-dismiss timer', () => {
      const { toughLove, showToughLove, dismissToughLove } = useToughLove()
      showToughLove()
      dismissToughLove()
      vi.advanceTimersByTime(5000)
      expect(toughLove.value).toBeNull()
    })
  })

  describe('TOUGH_LOVE_MESSAGES', () => {
    it('has a meaningful pool of messages', () => {
      expect(TOUGH_LOVE_MESSAGES.length).toBeGreaterThanOrEqual(10)
    })

    it('contains no duplicate messages', () => {
      const unique = new Set(TOUGH_LOVE_MESSAGES)
      expect(unique.size).toBe(TOUGH_LOVE_MESSAGES.length)
    })

    it('all messages are non-empty strings', () => {
      for (const msg of TOUGH_LOVE_MESSAGES) {
        expect(typeof msg).toBe('string')
        expect(msg.trim().length).toBeGreaterThan(0)
      }
    })
  })
})
