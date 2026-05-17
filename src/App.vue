<script setup>
import { ref } from 'vue'
import AppLogo from './components/AppLogo.vue'
import EnergySelector from './components/EnergySelector.vue'
import TaskBoard from './components/TaskBoard.vue'
import HistoryPanel from './components/HistoryPanel.vue'
import CelebrationPopup from './components/CelebrationPopup.vue'
import SettingsPanel from './components/SettingsPanel.vue'

const showHistory = ref(false)
const showSettings = ref(false)
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
        <button class="settings-btn" @click="showSettings = true" aria-label="Open settings">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </header>

    <main class="app-main">
      <TaskBoard />
    </main>

    <HistoryPanel v-if="showHistory" @close="showHistory = false" />
    <SettingsPanel v-if="showSettings" @close="showSettings = false" />
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

.settings-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 7px;
  border: 1.5px solid var(--border);
  background: transparent;
  color: var(--text);
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
  flex-shrink: 0;
}

.settings-btn:hover {
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
