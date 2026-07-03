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
  <div class="energy-selector" role="group" aria-label="Energy level">
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
</template>

<style scoped>
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
</style>
