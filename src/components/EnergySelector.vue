<script setup>
import { useTasks } from '../composables/useTasks.js'
import { ENERGY_LEVELS } from '../constants/energy.js'

const { currentEnergy } = useTasks()
</script>

<template>
  <div class="energy-selector">
    <span class="energy-label">Energy</span>
    <div class="energy-buttons" role="group" aria-label="Current energy level">
      <button
        v-for="level in ENERGY_LEVELS"
        :key="level.id"
        class="energy-btn"
        :class="[`energy-${level.id}`, { active: currentEnergy === level.id }]"
        :aria-pressed="currentEnergy === level.id"
        @click="currentEnergy = currentEnergy === level.id ? null : level.id"
      >
        {{ level.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.energy-selector {
  display: flex;
  align-items: center;
  gap: 10px;
}

.energy-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.energy-buttons {
  display: flex;
  gap: 3px;
}

.energy-btn {
  padding: 4px 12px;
  border-radius: 100px;
  border: 1.5px solid var(--border);
  background: transparent;
  font-size: 13px;
  font-weight: 400;
  cursor: pointer;
  color: var(--text);
  font-family: inherit;
  transition: border-color 0.12s, background 0.12s, color 0.12s;
}

.energy-btn:hover:not(.active) {
  border-color: var(--text);
  color: var(--text-h);
}

.energy-btn.energy-tiny.active  { border-color: var(--energy-tiny-active);   color: var(--energy-tiny-active);   background: var(--energy-tiny-bg); }
.energy-btn.energy-small.active { border-color: var(--energy-small-active);  color: var(--energy-small-active);  background: var(--energy-small-bg); }
.energy-btn.energy-medium.active{ border-color: var(--energy-medium-active); color: var(--energy-medium-active); background: var(--energy-medium-bg); }
.energy-btn.energy-large.active { border-color: var(--energy-large-active);  color: var(--energy-large-active);  background: var(--energy-large-bg); }
</style>
