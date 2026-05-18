import { ref, computed, watch } from 'vue'

const STREAK_KEY = 'untangle-streak'
const STREAK_SETTINGS_KEY = 'untangle-streak-settings'

// England & Wales bank holidays 2024–2028
const UK_BANK_HOLIDAYS = new Set([
  // 2024
  '2024-01-01',
  '2024-03-29',
  '2024-04-01',
  '2024-05-06',
  '2024-05-27',
  '2024-08-26',
  '2024-12-25',
  '2024-12-26',
  // 2025
  '2025-01-01',
  '2025-04-18',
  '2025-04-21',
  '2025-05-05',
  '2025-05-26',
  '2025-08-25',
  '2025-12-25',
  '2025-12-26',
  // 2026
  '2026-01-01',
  '2026-04-03',
  '2026-04-06',
  '2026-05-04',
  '2026-05-25',
  '2026-08-31',
  '2026-12-25',
  '2026-12-28',
  // 2027
  '2027-01-01',
  '2027-03-26',
  '2027-03-29',
  '2027-05-03',
  '2027-05-31',
  '2027-08-30',
  '2027-12-27',
  '2027-12-28',
  // 2028
  '2028-01-03',
  '2028-04-14',
  '2028-04-17',
  '2028-05-01',
  '2028-05-29',
  '2028-08-28',
  '2028-12-25',
  '2028-12-26',
])

function toDateString(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayString() {
  return toDateString(new Date())
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toDateString(d)
}

function isWeekend(dateStr) {
  const day = new Date(dateStr + 'T00:00:00').getDay()
  return day === 0 || day === 6
}

function isExcluded(dateStr, settings) {
  if (settings.excludeWeekends && isWeekend(dateStr)) return true
  if (settings.excludeBankHolidays && UK_BANK_HOLIDAYS.has(dateStr)) return true
  if (settings.freezeUntil && dateStr <= settings.freezeUntil) return true
  return false
}

// Most recent non-excluded day strictly before dateStr (up to 730 days back)
function prevActiveDay(dateStr, settings) {
  let d = addDays(dateStr, -1)
  for (let i = 0; i < 730; i++) {
    if (!isExcluded(d, settings)) return d
    d = addDays(d, -1)
  }
  return null
}

// True if any non-excluded day falls strictly between fromDate and toDate
function hasActiveDayBetween(fromDate, toDate, settings) {
  let d = addDays(fromDate, 1)
  while (d < toDate) {
    if (!isExcluded(d, settings)) return true
    d = addDays(d, 1)
  }
  return false
}

function loadStreak() {
  try {
    const val = localStorage.getItem(STREAK_KEY)
    if (!val) return { count: 0, lastCompletedDate: null }
    return JSON.parse(val)
  } catch {
    return { count: 0, lastCompletedDate: null }
  }
}

function loadStreakSettings() {
  try {
    const val = localStorage.getItem(STREAK_SETTINGS_KEY)
    if (!val) return { excludeWeekends: false, excludeBankHolidays: false, freezeUntil: null }
    return JSON.parse(val)
  } catch {
    return { excludeWeekends: false, excludeBankHolidays: false, freezeUntil: null }
  }
}

const streakData = ref(loadStreak())
const streakSettings = ref(loadStreakSettings())

// Reactive today — updated at each midnight so streakCount recomputes on date rollover
const today = ref(todayString())
;(function scheduleMidnightUpdate() {
  const now = new Date()
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  setTimeout(() => {
    today.value = todayString()
    scheduleMidnightUpdate()
  }, midnight.getTime() - now.getTime())
})()

watch(
  streakSettings,
  (val) => {
    localStorage.setItem(STREAK_SETTINGS_KEY, JSON.stringify(val))
  },
  { deep: true }
)

// Streak is alive if no non-excluded day between lastCompletedDate and today was missed
const streakCount = computed(() => {
  const { count, lastCompletedDate } = streakData.value
  if (!lastCompletedDate) return 0
  if (hasActiveDayBetween(lastCompletedDate, today.value, streakSettings.value)) return 0
  return count
})

export function useStreak() {
  function recordCompletion() {
    const now = todayString()
    const settings = streakSettings.value

    if (streakData.value.lastCompletedDate === now) return null
    if (isExcluded(now, settings)) return null

    const { count, lastCompletedDate } = streakData.value
    const streakAlive = lastCompletedDate && !hasActiveDayBetween(lastCompletedDate, now, settings)
    const newCount = streakAlive ? count + 1 : 1

    streakData.value = { count: newCount, lastCompletedDate: now }
    localStorage.setItem(STREAK_KEY, JSON.stringify(streakData.value))
    return newCount
  }

  return { streakCount, streakSettings, recordCompletion }
}
