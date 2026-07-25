import { describe, it, expect, beforeEach, vi } from 'vitest'

const modulePath = '../../../src/composables/useEnergyLevel'

async function load() {
  const mod = await import(modulePath)
  return mod.useEnergyLevel()
}

describe('useEnergyLevel', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('has no energy level selected by default', async () => {
    const { selectedLevel } = await load()
    expect(selectedLevel.value).toBe(null)
  })

  it('has no toast message by default', async () => {
    const { toastMessage } = await load()
    expect(toastMessage.value).toBe(null)
  })

  it.each(['low', 'medium', 'high'])(
    'exposes exactly 20 unique messages for the %s level',
    async (level) => {
      const mod = await import(modulePath)
      const pool: string[] = mod[`${level.toUpperCase()}_MESSAGES`]
      expect(pool).toHaveLength(20)
      expect(new Set(pool).size).toBe(20)
      pool.forEach((message: string) => {
        expect(typeof message).toBe('string')
        expect(message.length).toBeGreaterThan(0)
      })
    }
  )

  it.each(['low', 'medium', 'high'])(
    'selecting %s sets it as the selected level',
    async (level) => {
      const { selectedLevel, selectLevel } = await load()
      selectLevel(level)
      expect(selectedLevel.value).toBe(level)
    }
  )

  it.each(['low', 'medium', 'high'])(
    "selecting %s shows a toast message drawn from that level's pool",
    async (level) => {
      const mod = await import(modulePath)
      const pool = mod[`${level.toUpperCase()}_MESSAGES`]
      const { toastMessage, selectLevel } = mod.useEnergyLevel()
      selectLevel(level)
      expect(pool).toContain(toastMessage.value)
    }
  )

  it('selects a message at random rather than always showing the same one', async () => {
    const { toastMessage, selectLevel } = await load()
    const seen = new Set()
    for (let i = 0; i < 40; i++) {
      selectLevel('high')
      seen.add(toastMessage.value)
      selectLevel('medium')
    }
    expect(seen.size).toBeGreaterThan(1)
  })

  it('clicking the currently selected level deselects it', async () => {
    const { selectedLevel, selectLevel } = await load()
    selectLevel('medium')
    selectLevel('medium')
    expect(selectedLevel.value).toBe(null)
  })

  it('clicking the currently selected level does not change or clear the toast message', async () => {
    const { toastMessage, toastId, selectLevel } = await load()
    selectLevel('medium')
    const messageAfterSelect = toastMessage.value
    const idAfterSelect = toastId.value

    selectLevel('medium')

    expect(toastMessage.value).toBe(messageAfterSelect)
    expect(toastId.value).toBe(idAfterSelect)
  })

  it('switching directly from one level to another updates the selection and fires a new toast', async () => {
    const { selectedLevel, toastId, selectLevel } = await load()
    selectLevel('low')
    const firstToastId = toastId.value

    selectLevel('high')

    expect(selectedLevel.value).toBe('high')
    expect(toastId.value).toBeGreaterThan(firstToastId)
  })

  it('dismissToast clears the current toast message', async () => {
    const { toastMessage, selectLevel, dismissToast } = await load()
    selectLevel('low')
    expect(toastMessage.value).not.toBe(null)

    dismissToast()

    expect(toastMessage.value).toBe(null)
  })

  it('shares state across every call as a singleton', async () => {
    const mod = await import(modulePath)
    const first = mod.useEnergyLevel()
    const second = mod.useEnergyLevel()

    first.selectLevel('high')

    expect(second.selectedLevel.value).toBe('high')
  })

  describe('encourageMe', () => {
    it('exposes exactly 50 unique, non-empty messages', async () => {
      const mod = await import(modulePath)
      expect(mod.ENCOURAGEMENT_MESSAGES).toHaveLength(50)
      expect(new Set(mod.ENCOURAGEMENT_MESSAGES).size).toBe(50)
      mod.ENCOURAGEMENT_MESSAGES.forEach((message: string) => {
        expect(typeof message).toBe('string')
        expect(message.length).toBeGreaterThan(0)
      })
    })

    it('shows a toast message drawn from the encouragement pool', async () => {
      const mod = await import(modulePath)
      const { toastMessage, encourageMe } = mod.useEnergyLevel()

      encourageMe()

      expect(mod.ENCOURAGEMENT_MESSAGES).toContain(toastMessage.value)
    })

    it('selects a message at random rather than always showing the same one', async () => {
      const { toastMessage, encourageMe } = await load()
      const seen = new Set()
      for (let i = 0; i < 40; i++) {
        encourageMe()
        seen.add(toastMessage.value)
      }
      expect(seen.size).toBeGreaterThan(1)
    })

    it('does not select or require any energy level', async () => {
      const { selectedLevel, encourageMe } = await load()

      encourageMe()

      expect(selectedLevel.value).toBe(null)
    })

    it('leaves an already-selected energy level untouched', async () => {
      const { selectedLevel, selectLevel, encourageMe } = await load()
      selectLevel('medium')

      encourageMe()

      expect(selectedLevel.value).toBe('medium')
    })

    it('fires a new toast even while a toast is already showing', async () => {
      const { toastId, encourageMe } = await load()
      encourageMe()
      const firstToastId = toastId.value

      encourageMe()

      expect(toastId.value).toBeGreaterThan(firstToastId)
    })

    it('replaces a currently-showing energy-level toast', async () => {
      const mod = await import(modulePath)
      const { toastMessage, selectLevel, encourageMe } = mod.useEnergyLevel()
      selectLevel('high')

      encourageMe()

      expect(mod.ENCOURAGEMENT_MESSAGES).toContain(toastMessage.value)
    })

    it('selecting an energy level after encouragement replaces the encouragement toast', async () => {
      const mod = await import(modulePath)
      const { toastMessage, selectLevel, encourageMe } = mod.useEnergyLevel()
      encourageMe()

      selectLevel('low')

      expect(mod.LOW_MESSAGES).toContain(toastMessage.value)
    })
  })

  describe('toughLove', () => {
    it('exposes exactly 50 unique, non-empty messages', async () => {
      const mod = await import(modulePath)
      expect(mod.TOUGH_LOVE_MESSAGES).toHaveLength(50)
      expect(new Set(mod.TOUGH_LOVE_MESSAGES).size).toBe(50)
      mod.TOUGH_LOVE_MESSAGES.forEach((message: string) => {
        expect(typeof message).toBe('string')
        expect(message.length).toBeGreaterThan(0)
      })
    })

    it('shows a toast message drawn from the tough love pool', async () => {
      const mod = await import(modulePath)
      const { toastMessage, toughLove } = mod.useEnergyLevel()

      toughLove()

      expect(mod.TOUGH_LOVE_MESSAGES).toContain(toastMessage.value)
    })

    it('selects a message at random rather than always showing the same one', async () => {
      const { toastMessage, toughLove } = await load()
      const seen = new Set()
      for (let i = 0; i < 40; i++) {
        toughLove()
        seen.add(toastMessage.value)
      }
      expect(seen.size).toBeGreaterThan(1)
    })

    it('does not select or require any energy level', async () => {
      const { selectedLevel, toughLove } = await load()

      toughLove()

      expect(selectedLevel.value).toBe(null)
    })

    it('leaves an already-selected energy level untouched', async () => {
      const { selectedLevel, selectLevel, toughLove } = await load()
      selectLevel('medium')

      toughLove()

      expect(selectedLevel.value).toBe('medium')
    })

    it('fires a new toast even while a toast is already showing', async () => {
      const { toastId, toughLove } = await load()
      toughLove()
      const firstToastId = toastId.value

      toughLove()

      expect(toastId.value).toBeGreaterThan(firstToastId)
    })

    it('replaces a currently-showing energy-level toast', async () => {
      const mod = await import(modulePath)
      const { toastMessage, selectLevel, toughLove } = mod.useEnergyLevel()
      selectLevel('high')

      toughLove()

      expect(mod.TOUGH_LOVE_MESSAGES).toContain(toastMessage.value)
    })

    it('selecting an energy level after tough love replaces the tough love toast', async () => {
      const mod = await import(modulePath)
      const { toastMessage, selectLevel, toughLove } = mod.useEnergyLevel()
      toughLove()

      selectLevel('low')

      expect(mod.LOW_MESSAGES).toContain(toastMessage.value)
    })

    it('replaces a currently-showing encouragement toast', async () => {
      const mod = await import(modulePath)
      const { toastMessage, encourageMe, toughLove } = mod.useEnergyLevel()
      encourageMe()

      toughLove()

      expect(mod.TOUGH_LOVE_MESSAGES).toContain(toastMessage.value)
    })
  })
})
