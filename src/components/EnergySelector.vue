<script setup>
import { useEnergyLevel } from '../composables/useEnergyLevel.js'

const LEVELS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

const { selectedLevel, selectLevel } = useEnergyLevel()
</script>

<template>
  <div class="energy-panel">
    <span id="energy-panel-label" class="energy-panel-label">Energy level</span>
    <div class="energy-selector" role="group" aria-labelledby="energy-panel-label">
      <button
        v-for="level in LEVELS"
        :key="level.value"
        type="button"
        class="energy-option"
        :class="{ selected: selectedLevel === level.value }"
        :aria-pressed="selectedLevel === level.value"
        @click="selectLevel(level.value)"
      >
        {{ level.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.energy-panel {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  background: #f0f0f0;
  border: 1px solid #e2e2e2;
}

.energy-panel-label {
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #595959;
}

.energy-selector {
  display: flex;
  gap: 0.5rem;
}

.energy-option {
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 0.85rem;
  font-weight: 500;
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  border: 1px solid #d6d6d6;
  background: #fff;
  color: #1a1a1a;
  cursor: pointer;
}

.energy-option:hover {
  border-color: #a8a8a8;
}

.energy-option.selected {
  background: #1a1a1a;
  border-color: #1a1a1a;
  color: #fff;
}

@media (max-width: 640px) {
  .energy-option {
    min-height: 44px;
    min-width: 44px;
    padding: 0.6rem 1rem;
  }
}
</style>
