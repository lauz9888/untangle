<script setup>
import { useEnergyLevel } from '../composables/useEnergyLevel.js'

const { toughLove } = useEnergyLevel()
</script>

<template>
  <button type="button" class="tough-love-button" @click="toughLove">Tough love</button>
</template>

<style scoped>
.tough-love-button {
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

.tough-love-button:hover {
  border-color: #a8a8a8;
}

@media (max-width: 640px) {
  .tough-love-button {
    min-height: 44px;
    padding: 0.6rem 1rem;
  }
}
</style>
