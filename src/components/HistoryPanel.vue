<script setup>
import { computed } from 'vue'
import { useTasks } from '../composables/useTasks.js'

defineEmits(['close'])

const { tasks } = useTasks()

const completedTasks = computed(() => tasks.value.filter(t => t.completedAt))

function startOfWeek(ts) {
  const d = new Date(ts)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  return d
}

const chartWeeks = computed(() => {
  const thisMonday = startOfWeek(Date.now())
  return Array.from({ length: 4 }, (_, i) => {
    const weekStart = new Date(thisMonday)
    weekStart.setDate(thisMonday.getDate() - (3 - i) * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)

    const count = completedTasks.value.filter(t =>
      t.completedAt >= weekStart.getTime() && t.completedAt < weekEnd.getTime()
    ).length

    const endDay = new Date(weekEnd)
    endDay.setDate(weekEnd.getDate() - 1)
    const label = weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    const labelEnd = endDay.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

    return { weekStart, weekEnd, count, label, labelEnd }
  })
})

const chartMax = computed(() => Math.max(...chartWeeks.value.map(w => w.count), 1))

const chartAriaLabel = computed(() => {
  const summary = chartWeeks.value
    .map(w => `${w.label}: ${w.count} ${w.count === 1 ? 'task' : 'tasks'}`)
    .join(', ')
  return `Bar chart of tasks completed over the past 4 weeks. ${summary}`
})

function barHeight(count) {
  return Math.round((count / chartMax.value) * 100)
}

const bestWeekEver = computed(() => {
  if (!completedTasks.value.length) return null
  const weekMap = new Map()
  for (const task of completedTasks.value) {
    const ws = startOfWeek(task.completedAt)
    const key = ws.toISOString()
    if (!weekMap.has(key)) weekMap.set(key, { date: ws, count: 0 })
    weekMap.get(key).count++
  }
  let best = null
  for (const entry of weekMap.values()) {
    if (!best || entry.count > best.count) best = entry
  }
  return best
})

const bestWeekLabel = computed(() => {
  if (!bestWeekEver.value) return null
  const start = bestWeekEver.value.date
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const s = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const e = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${s} – ${e}`
})
</script>

<template>
  <div class="history-overlay" @click.self="$emit('close')">
    <div class="history-panel" role="dialog" aria-modal="true" aria-label="Task history">

      <div class="panel-header">
        <h2 class="panel-title">History</h2>
        <button class="panel-close" @click="$emit('close')" aria-label="Close history">✕</button>
      </div>

      <section class="chart-section">
        <h3 class="chart-title">Tasks completed — past 4 weeks</h3>

        <div v-if="completedTasks.length === 0" class="empty-history">
          <p>No tasks completed yet.</p>
          <p class="empty-hint">Mark tasks done with the ✓ button to track your progress here.</p>
        </div>

        <div v-else class="bar-chart" role="img" :aria-label="chartAriaLabel">
          <div v-for="week in chartWeeks" :key="week.label" class="bar-col">
            <span class="bar-count" :class="{ zero: week.count === 0 }">
              {{ week.count }}
            </span>
            <div class="bar-track">
              <div
                class="bar-fill"
                :style="{ height: barHeight(week.count) + '%' }"
                :class="{ empty: week.count === 0 }"
              />
            </div>
            <span class="bar-label">{{ week.label }}</span>
          </div>
        </div>
      </section>

      <div v-if="bestWeekEver" class="best-week">
        <span class="best-week-icon">★</span>
        <p class="best-week-text">
          Your most productive week was
          <strong>{{ bestWeekLabel }}</strong>
          with <strong>{{ bestWeekEver.count }}</strong>
          {{ bestWeekEver.count === 1 ? 'task' : 'tasks' }} completed.
        </p>
      </div>

    </div>
  </div>
</template>

<style scoped>
.history-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 24px;
}

.history-panel {
  background: var(--card-bg);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.14), 0 2px 8px rgba(0, 0, 0, 0.08);
  width: 100%;
  max-width: 480px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--border);
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-h);
  margin: 0;
}

.panel-close {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 13px;
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s, color 0.12s;
}

.panel-close:hover {
  background: var(--border);
  color: var(--text-h);
}

.chart-section {
  padding: 20px 24px;
}

.chart-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--text);
  margin: 0 0 20px;
}

.empty-history {
  text-align: center;
  padding: 24px 0 8px;
}

.empty-history p {
  margin: 0 0 6px;
  font-size: 14px;
  color: var(--text-h);
}

.empty-hint {
  font-size: 12px;
  color: var(--text);
  opacity: 0.7;
}

.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  height: 160px;
}

.bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  gap: 6px;
}

.bar-count {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-h);
  min-height: 18px;
  display: flex;
  align-items: center;
}

.bar-count.zero {
  color: var(--text);
  opacity: 0.4;
}

.bar-track {
  flex: 1;
  width: 100%;
  background: var(--column-bg);
  border-radius: 6px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
  min-height: 4px;
}

.bar-fill {
  width: 100%;
  background: var(--accent);
  border-radius: 6px;
  transition: height 0.3s ease;
  min-height: 4px;
}

.bar-fill.empty {
  background: var(--border);
  min-height: 0;
  height: 0 !important;
}

.bar-label {
  font-size: 11px;
  color: var(--text);
  white-space: nowrap;
  text-align: center;
}

.best-week {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 16px 24px 20px;
  border-top: 1px solid var(--border);
  background: var(--column-bg);
}

.best-week-icon {
  font-size: 14px;
  color: var(--energy-medium-active);
  flex-shrink: 0;
  margin-top: 1px;
}

.best-week-text {
  font-size: 13px;
  color: var(--text);
  margin: 0;
  line-height: 1.5;
}

.best-week-text strong {
  color: var(--text-h);
  font-weight: 600;
}
</style>
