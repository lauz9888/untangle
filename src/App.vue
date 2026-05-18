<script setup>
import { ref } from 'vue'
import AppLogo from './components/AppLogo.vue'
import EnergySelector from './components/EnergySelector.vue'
import TaskBoard from './components/TaskBoard.vue'
import HistoryPanel from './components/HistoryPanel.vue'
import CelebrationPopup from './components/CelebrationPopup.vue'
import EncouragementToast from './components/EncouragementToast.vue'
import ToughLoveToast from './components/ToughLoveToast.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import { useEncouragement } from './composables/useEncouragement.js'
import { useToughLove } from './composables/useToughLove.js'
import { useStreak } from './composables/useStreak.js'

const showHistory = ref(false)
const showSettings = ref(false)
const { showEncouragement, dismissEncouragement } = useEncouragement()
const { showToughLove, dismissToughLove } = useToughLove()
const { streakCount } = useStreak()

function handleEncourage() { dismissToughLove(); showEncouragement() }
function handleToughLove() { dismissEncouragement(); showToughLove() }
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
        <EnergySelector />
      </div>
      <div class="app-controls">
        <div class="streak-display" :class="{ 'streak-active': streakCount > 0 }" title="Days in a row you've completed a task">
          <span class="streak-icon">🔥</span>
          <span class="streak-text">{{ streakCount }} {{ streakCount === 1 ? 'day' : 'days' }}</span>
        </div>
        <button class="encourage-btn" @click="handleEncourage">Encourage Me</button>
        <button class="tough-love-btn" @click="handleToughLove">Tough Love</button>
        <button class="history-btn" @click="showHistory = true">History</button>
        <button class="settings-btn" @click="showSettings = true" aria-label="Open settings">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M13.3 9.6a1 1 0 0 0 .2 1.1l.04.04a1.2 1.2 0 0 1-1.7 1.7l-.04-.04a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.92v.12a1.2 1.2 0 0 1-2.4 0v-.06a1 1 0 0 0-.66-.92 1 1 0 0 0-1.1.2l-.04.04a1.2 1.2 0 0 1-1.7-1.7l.04-.04a1 1 0 0 0 .2-1.1 1 1 0 0 0-.92-.6H3.2a1.2 1.2 0 0 1 0-2.4h.06a1 1 0 0 0 .92-.66 1 1 0 0 0-.2-1.1l-.04-.04a1.2 1.2 0 0 1 1.7-1.7l.04.04a1 1 0 0 0 1.1.2h.05A1 1 0 0 0 7.4 3.2V3.1a1.2 1.2 0 0 1 2.4 0v.06a1 1 0 0 0 .6.92 1 1 0 0 0 1.1-.2l.04-.04a1.2 1.2 0 0 1 1.7 1.7l-.04.04a1 1 0 0 0-.2 1.1v.05a1 1 0 0 0 .92.6h.12a1.2 1.2 0 0 1 0 2.4h-.06a1 1 0 0 0-.92.6Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
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
    <EncouragementToast />
    <ToughLoveToast />
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

.streak-display {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 7px;
  border: 1.5px solid var(--border);
  font-size: 13px;
  color: var(--text);
  opacity: 0.5;
  flex-shrink: 0;
  user-select: none;
}

.streak-display.streak-active {
  opacity: 1;
  border-color: #f97316;
  color: var(--text-h);
}

.streak-icon {
  font-size: 14px;
  line-height: 1;
}

.streak-text {
  font-variant-numeric: tabular-nums;
}

.encourage-btn,
.tough-love-btn,
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
  flex-shrink: 0;
}

.encourage-btn:hover,
.tough-love-btn:hover,
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
    padding: 10px 14px;
    gap: 8px;
  }

  .app-tagline {
    display: none;
  }

  .app-controls {
    width: 100%;
    gap: 6px;
    flex-wrap: wrap;
  }

  .streak-display {
    padding: 5px 8px;
    font-size: 12px;
  }

  .encourage-btn,
  .tough-love-btn,
  .history-btn {
    padding: 6px 10px;
    font-size: 12px;
    flex: 1;
    justify-content: center;
    text-align: center;
  }

  .settings-btn {
    width: 36px;
    height: 36px;
  }
}

@media (max-width: 400px) {
  .encourage-btn,
  .tough-love-btn {
    flex-basis: calc(50% - 3px);
  }
}
</style>
