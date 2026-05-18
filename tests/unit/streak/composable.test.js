import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'

const MON  = '2025-06-02'
const TUE  = '2025-06-03'
const WED  = '2025-06-04'
const FRI  = '2025-06-06'
const SAT  = '2025-06-07'
const MON2 = '2025-06-09'
const TUE2 = '2025-06-10'

// Christmas 2024 bank holiday block: Wed Dec 25 + Thu Dec 26 (no weekends in gap)
const TUE_BEFORE_XMAS  = '2024-12-24'
const XMAS_DAY         = '2024-12-25' // bank holiday (Wednesday)
const BOXING_DAY       = '2024-12-26' // bank holiday (Thursday)
const FRI_AFTER_XMAS   = '2024-12-27'
const SAT_AFTER_XMAS   = '2024-12-28'

describe('useStreak — composable', () => {
  let useStreak, todayString

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(`${MON}T09:00:00`))
    vi.resetModules()
    ;({ useStreak, todayString } = await import('../../../src/composables/useStreak.js'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function advanceTo(dateStr) {
    vi.resetModules()
    vi.setSystemTime(new Date(`${dateStr}T09:00:00`))
    ;({ useStreak } = await import('../../../src/composables/useStreak.js'))
  }

  describe('initial state', () => {
    it('streakCount starts at 0', () => {
      const { streakCount } = useStreak()
      expect(streakCount.value).toBe(0)
    })

    it('streakSettings defaults to all exclusions off', () => {
      const { streakSettings } = useStreak()
      expect(streakSettings.value.excludeWeekends).toBe(false)
      expect(streakSettings.value.excludeBankHolidays).toBe(false)
      expect(streakSettings.value.freezeUntil).toBeNull()
    })
  })

  describe('todayString', () => {
    it('returns the current local date as YYYY-MM-DD', () => {
      expect(todayString()).toBe(MON)
    })
  })

  describe('recordCompletion', () => {
    it('sets streakCount to 1 on first completion', () => {
      const { streakCount, recordCompletion } = useStreak()
      recordCompletion()
      expect(streakCount.value).toBe(1)
    })

    it('is a no-op when called twice on the same day', () => {
      const { streakCount, recordCompletion } = useStreak()
      recordCompletion()
      recordCompletion()
      expect(streakCount.value).toBe(1)
    })

    it('increments to 2 when completed on the next consecutive day', async () => {
      const { recordCompletion } = useStreak()
      recordCompletion() // Monday

      await advanceTo(TUE)
      const { streakCount, recordCompletion: rec } = useStreak()
      rec()
      expect(streakCount.value).toBe(2)
    })

    it('resets to 1 when a day was skipped', async () => {
      const { recordCompletion } = useStreak()
      recordCompletion() // Monday

      await advanceTo(WED) // skipped Tuesday
      const { streakCount, recordCompletion: rec } = useStreak()
      rec()
      expect(streakCount.value).toBe(1)
    })

    it('returns the new streak count', () => {
      const { recordCompletion } = useStreak()
      expect(recordCompletion()).toBe(1)
    })

    it('returns the incremented count on a consecutive day', async () => {
      const { recordCompletion } = useStreak()
      recordCompletion() // Monday

      await advanceTo(TUE)
      const { recordCompletion: rec } = useStreak()
      expect(rec()).toBe(2)
    })

    it('returns null when already completed today', () => {
      const { recordCompletion } = useStreak()
      recordCompletion()
      expect(recordCompletion()).toBeNull()
    })
  })

  describe('streakCount display', () => {
    it('shows streak as alive when last completed today', () => {
      const { streakCount, recordCompletion } = useStreak()
      recordCompletion()
      expect(streakCount.value).toBe(1)
    })

    it('shows streak as alive when last completed yesterday', async () => {
      const { recordCompletion } = useStreak()
      recordCompletion() // Monday

      await advanceTo(TUE) // no completion today
      const { streakCount } = useStreak()
      expect(streakCount.value).toBe(1)
    })

    it('shows 0 when a day was missed with no new completion', async () => {
      const { recordCompletion } = useStreak()
      recordCompletion() // Monday

      await advanceTo(WED) // Tuesday missed
      const { streakCount } = useStreak()
      expect(streakCount.value).toBe(0)
    })
  })

  describe('weekend exclusion', () => {
    beforeEach(async () => {
      vi.resetModules()
      vi.setSystemTime(new Date(`${FRI}T09:00:00`))
      ;({ useStreak } = await import('../../../src/composables/useStreak.js'))
    })

    it('completing on Saturday is a no-op when weekends are excluded', async () => {
      const { recordCompletion } = useStreak()
      recordCompletion() // Friday

      await advanceTo(SAT)
      const { streakSettings, recordCompletion: rec, streakCount } = useStreak()
      streakSettings.value.excludeWeekends = true
      rec()
      expect(streakCount.value).toBe(1) // still 1, Saturday completion didn't increment
    })

    it('streak survives over a weekend without any completion', async () => {
      const { recordCompletion } = useStreak()
      recordCompletion() // Friday

      await advanceTo(MON2)
      const { streakSettings, streakCount } = useStreak()
      streakSettings.value.excludeWeekends = true
      expect(streakCount.value).toBe(1) // alive — Sat/Sun were excluded
    })

    it('increments on Monday after Friday when weekends are excluded', async () => {
      const { recordCompletion } = useStreak()
      recordCompletion() // Friday

      await advanceTo(MON2)
      const { streakSettings, recordCompletion: rec, streakCount } = useStreak()
      streakSettings.value.excludeWeekends = true
      rec()
      expect(streakCount.value).toBe(2)
    })

    it('resets if the first active day after the excluded weekend is also missed', async () => {
      const { recordCompletion } = useStreak()
      recordCompletion() // Friday

      await advanceTo(TUE2) // skipped Monday (first required day)
      const { streakSettings, streakCount } = useStreak()
      streakSettings.value.excludeWeekends = true
      expect(streakCount.value).toBe(0)
    })
  })

  describe('bank holiday exclusion', () => {
    // Uses Christmas 2024: Wed Dec 25 + Thu Dec 26 are bank holidays with no weekends in gap
    beforeEach(async () => {
      vi.resetModules()
      vi.setSystemTime(new Date(`${TUE_BEFORE_XMAS}T09:00:00`))
      ;({ useStreak } = await import('../../../src/composables/useStreak.js'))
    })

    it('completing on Christmas Day is a no-op when bank holidays are excluded', async () => {
      const { recordCompletion } = useStreak()
      recordCompletion() // Tuesday Dec 24

      await advanceTo(XMAS_DAY)
      const { streakSettings, recordCompletion: rec, streakCount } = useStreak()
      streakSettings.value.excludeBankHolidays = true
      rec()
      expect(streakCount.value).toBe(1) // still 1
    })

    it('streak survives over Christmas + Boxing Day without any completion', async () => {
      const { recordCompletion } = useStreak()
      recordCompletion() // Tuesday Dec 24

      await advanceTo(FRI_AFTER_XMAS)
      const { streakSettings, streakCount } = useStreak()
      streakSettings.value.excludeBankHolidays = true
      expect(streakCount.value).toBe(1) // alive — Dec 25 + Dec 26 excluded
    })

    it('increments on first active day after the bank holiday block', async () => {
      const { recordCompletion } = useStreak()
      recordCompletion() // Tuesday Dec 24

      await advanceTo(FRI_AFTER_XMAS)
      const { streakSettings, recordCompletion: rec, streakCount } = useStreak()
      streakSettings.value.excludeBankHolidays = true
      rec()
      expect(streakCount.value).toBe(2)
    })

    it('resets if the first active day after the bank holiday block is missed', async () => {
      const { recordCompletion } = useStreak()
      recordCompletion() // Tuesday Dec 24

      await advanceTo(SAT_AFTER_XMAS) // Friday was first required day, missed it
      const { streakSettings, streakCount } = useStreak()
      streakSettings.value.excludeBankHolidays = true
      expect(streakCount.value).toBe(0)
    })
  })

  describe('streak freeze', () => {
    it('completing on a frozen day is a no-op', () => {
      const { streakSettings, recordCompletion, streakCount } = useStreak()
      streakSettings.value.freezeUntil = FRI // freeze through Friday
      recordCompletion() // Monday, within freeze
      expect(streakCount.value).toBe(0)
    })

    it('streak survives while frozen — the gap is covered by the freeze', async () => {
      const { recordCompletion } = useStreak()
      recordCompletion() // Monday

      await advanceTo(FRI) // Tue/Wed/Thu were frozen
      const { streakSettings, streakCount } = useStreak()
      streakSettings.value.freezeUntil = '2025-06-05' // freeze through Thursday
      expect(streakCount.value).toBe(1)
    })

    it('increments on the first active day after the freeze ends', async () => {
      const { recordCompletion } = useStreak()
      recordCompletion() // Monday

      await advanceTo(FRI)
      const { streakSettings, recordCompletion: rec, streakCount } = useStreak()
      streakSettings.value.freezeUntil = '2025-06-05'
      rec()
      expect(streakCount.value).toBe(2)
    })

    it('resets if the first active day after the freeze is missed', async () => {
      const { recordCompletion } = useStreak()
      recordCompletion() // Monday

      await advanceTo(SAT) // Friday was first active day after Thu freeze, missed it
      const { streakSettings, streakCount } = useStreak()
      streakSettings.value.freezeUntil = '2025-06-05'
      expect(streakCount.value).toBe(0)
    })
  })

  describe('all three exclusions combined', () => {
    it('all three settings can be active simultaneously without error', () => {
      const { streakSettings } = useStreak()
      streakSettings.value.excludeWeekends = true
      streakSettings.value.excludeBankHolidays = true
      streakSettings.value.freezeUntil = TUE
      expect(streakSettings.value.excludeWeekends).toBe(true)
      expect(streakSettings.value.excludeBankHolidays).toBe(true)
      expect(streakSettings.value.freezeUntil).toBe(TUE)
    })

    it('a day excluded by any rule is skipped for increment and gap detection', async () => {
      // Start on Friday, enable weekends + freeze covering Mon
      vi.resetModules()
      vi.setSystemTime(new Date(`${FRI}T09:00:00`))
      ;({ useStreak } = await import('../../../src/composables/useStreak.js'))

      const { recordCompletion } = useStreak()
      recordCompletion() // Friday

      // Check on Tuesday: Sat/Sun excluded by weekends, Mon excluded by freeze
      await advanceTo(TUE2)
      const { streakSettings, streakCount } = useStreak()
      streakSettings.value.excludeWeekends = true
      streakSettings.value.freezeUntil = MON2 // freeze through Monday
      expect(streakCount.value).toBe(1) // streak alive — all days in gap were excluded
    })

    it('completing on a day excluded by any one rule is always a no-op', async () => {
      // Saturday excluded by weekends only
      vi.resetModules()
      vi.setSystemTime(new Date(`${SAT}T09:00:00`))
      ;({ useStreak } = await import('../../../src/composables/useStreak.js'))

      const { streakSettings, recordCompletion, streakCount } = useStreak()
      streakSettings.value.excludeWeekends = true
      recordCompletion()
      expect(streakCount.value).toBe(0)
    })
  })

  describe('settings persistence', () => {
    it('streak data persists across module reloads', async () => {
      const { recordCompletion } = useStreak()
      recordCompletion()

      await advanceTo(MON)
      const { streakCount } = useStreak()
      expect(streakCount.value).toBe(1)
    })

    it('streak settings persist across module reloads', async () => {
      const { streakSettings } = useStreak()
      streakSettings.value.excludeWeekends = true
      await nextTick() // flush the deep watcher

      await advanceTo(MON)
      const { streakSettings: s2 } = useStreak()
      expect(s2.value.excludeWeekends).toBe(true)
    })

    it('freeze date persists across module reloads', async () => {
      const { streakSettings } = useStreak()
      streakSettings.value.freezeUntil = FRI
      await nextTick()

      await advanceTo(MON)
      const { streakSettings: s2 } = useStreak()
      expect(s2.value.freezeUntil).toBe(FRI)
    })
  })

  describe('midnight rollover', () => {
    it('streakCount recomputes when today rolls to the next day', () => {
      const { streakCount, recordCompletion } = useStreak()
      recordCompletion() // Monday
      expect(streakCount.value).toBe(1)

      // Advance to just after Tuesday midnight
      const now = new Date(`${MON}T09:00:00`)
      const tueMidnight = new Date(`${TUE}T00:00:00`)
      vi.setSystemTime(tueMidnight.getTime() + 1000)
      vi.advanceTimersByTime(tueMidnight.getTime() - now.getTime() + 1000)

      // Tuesday: no gap between Mon and Tue, streak still alive
      expect(streakCount.value).toBe(1)
    })

    it('streak shows 0 after two midnights pass without a new completion', () => {
      const { streakCount, recordCompletion } = useStreak()
      recordCompletion() // Monday
      expect(streakCount.value).toBe(1)

      // Advance past two midnights to Wednesday
      const now = new Date(`${MON}T09:00:00`)
      const wedMorning = new Date(`${WED}T01:00:00`)
      vi.setSystemTime(wedMorning)
      vi.advanceTimersByTime(wedMorning.getTime() - now.getTime())

      // Wednesday: Tuesday was a gap, streak resets
      expect(streakCount.value).toBe(0)
    })
  })
})
