<script setup>
import { ref } from 'vue'
import AppLogo from './components/AppLogo.vue'
import EnergySelector from './components/EnergySelector.vue'
import TaskBoard from './components/TaskBoard.vue'
import HistoryPanel from './components/HistoryPanel.vue'
import CelebrationPopup from './components/CelebrationPopup.vue'

const showHistory = ref(false)
</script>

<template>
  <div class="app-wrapper">
    <header class="app-header">
      <div class="app-brand">
        <AppLogo />
        <div class="app-title-group">
          <span class="app-title">untangle</span>
          <span class="app-tagline">A space to think</span>
        </div>
      </div>
      <div class="app-controls">
        <button class="history-btn" @click="showHistory = true">History</button>
        <EnergySelector />
      </div>
    </header>

    <main class="app-main">
      <TaskBoard />
    </main>

    <HistoryPanel v-if="showHistory" @close="showHistory = false" />
    <CelebrationPopup />
  </div>
</template>

<style scoped>
.app-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  position: sticky;
  top: 0;
  z-index: 10;
  gap: 16px;
}

.app-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.app-title-group {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.app-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-h);
  letter-spacing: -0.3px;
  line-height: 1.2;
}

.app-tagline {
  font-size: 11px;
  color: var(--text);
  opacity: 0.7;
  letter-spacing: 0.1px;
  line-height: 1.2;
}

.app-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.history-btn {
  padding: 5px 13px;
  border-radius: 7px;
  border: 1.5px solid var(--border);
  background: transparent;
  color: var(--text);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}

.history-btn:hover {
  background: var(--border);
  color: var(--text-h);
}

.app-main {
  flex: 1;
}

@media (max-width: 600px) {
  .app-header {
    flex-wrap: wrap;
    padding: 12px 16px;
    gap: 10px;
  }

  .app-controls {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
