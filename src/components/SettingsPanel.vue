<script setup>
import { ref, computed } from 'vue'
import { useStreak, todayString } from '../composables/useStreak.js'

defineEmits(['close'])

const showAbout = ref(false)
const { streakSettings } = useStreak()

const freezeEnabled = computed({
  get: () => !!streakSettings.value.freezeUntil,
  set: (val) => {
    if (val) {
      streakSettings.value.freezeUntil = streakSettings.value.freezeUntil || todayString()
    } else {
      streakSettings.value.freezeUntil = null
    }
  },
})

</script>

<template>
  <div class="settings-overlay" @click.self="$emit('close')">
    <aside class="settings-panel">
      <div class="settings-header">
        <span class="settings-title">Settings</span>
        <button class="settings-close" @click="$emit('close')" aria-label="Close settings">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <div class="settings-body">
        <nav class="settings-nav">
          <button class="settings-nav-item" @click="showAbout = true">
            <svg class="nav-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.5"/>
              <path d="M8 7v5M8 5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            About
          </button>
        </nav>

        <div class="settings-divider" />

        <section class="settings-section">
          <div class="section-title">Streak</div>

          <label class="toggle-row">
            <span class="toggle-label">
              <span class="toggle-name">Exclude weekends</span>
              <span class="toggle-desc">Sat &amp; Sun don't count against your streak</span>
            </span>
            <input
              type="checkbox"
              class="toggle-switch"
              v-model="streakSettings.excludeWeekends"
              aria-label="Exclude weekends from streak"
            />
          </label>

          <label class="toggle-row">
            <span class="toggle-label">
              <span class="toggle-name">Exclude UK bank holidays</span>
              <span class="toggle-desc">England &amp; Wales public holidays are skipped</span>
            </span>
            <input
              type="checkbox"
              class="toggle-switch"
              v-model="streakSettings.excludeBankHolidays"
              aria-label="Exclude UK bank holidays from streak"
            />
          </label>

          <label class="toggle-row">
            <span class="toggle-label">
              <span class="toggle-name">Streak freeze</span>
              <span class="toggle-desc">Pause your streak until a chosen date</span>
            </span>
            <input
              type="checkbox"
              class="toggle-switch"
              v-model="freezeEnabled"
              aria-label="Enable streak freeze"
            />
          </label>

          <div v-if="freezeEnabled" class="freeze-date-row">
            <label class="freeze-date-label" for="freeze-until">Frozen until</label>
            <input
              id="freeze-until"
              type="date"
              class="freeze-date-input"
              :value="streakSettings.freezeUntil"
              @change="streakSettings.freezeUntil = $event.target.value"
            />
          </div>
        </section>
      </div>
    </aside>
  </div>

  <div v-if="showAbout" class="about-overlay" @click.self="showAbout = false">
    <div class="about-modal">
      <div class="about-modal-header">
        <span class="about-modal-title">About Untangle</span>
        <button class="about-modal-close" @click="showAbout = false" aria-label="Close about">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <div class="about-content">
        <p class="about-lead">
          Untangle is a calm, energy-aware task manager designed to help you decide what to work on right now — without the overwhelm.
        </p>
        <div class="about-features">
          <div class="about-feature">
            <span class="feature-label">Three columns</span>
            <span class="feature-desc">Organise tasks across <strong>Now</strong>, <strong>Next</strong>, and <strong>Future</strong> to keep your focus clear.</span>
          </div>
          <div class="about-feature">
            <span class="feature-label">Energy levels</span>
            <span class="feature-desc">Tag each task by how much effort it takes — Tiny, Small, Medium, or Large — so you can match tasks to how you feel.</span>
          </div>
          <div class="about-feature">
            <span class="feature-label">Filter by energy</span>
            <span class="feature-desc">Use the energy selector in the header to surface only the tasks that fit your current capacity.</span>
          </div>
          <div class="about-feature">
            <span class="feature-label">History</span>
            <span class="feature-desc">Completed tasks are saved so you can look back and see everything you've accomplished.</span>
          </div>
        </div>
        <p class="about-footer">Your tasks are saved locally in your browser — nothing leaves your device.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  z-index: 50;
  display: flex;
  justify-content: flex-end;
}

.settings-panel {
  width: 320px;
  max-width: 100vw;
  height: 100%;
  background: var(--bg);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.08);
  animation: slide-in 0.18s ease-out;
}

@keyframes slide-in {
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.settings-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-h);
  letter-spacing: -0.2px;
}

.settings-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}

.settings-close:hover {
  background: var(--border);
  color: var(--text-h);
}

.settings-body {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

/* Streak section */

.settings-section {
  padding: 16px 16px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.section-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text);
  opacity: 0.5;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  padding: 0 4px 8px;
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 4px;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.1s;
}

.toggle-row:hover {
  background: var(--column-bg);
}

.toggle-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.toggle-name {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text-h);
  line-height: 1.3;
}

.toggle-desc {
  font-size: 11.5px;
  color: var(--text);
  opacity: 0.65;
  line-height: 1.35;
}

/* Toggle switch */
.toggle-switch {
  appearance: none;
  -webkit-appearance: none;
  flex-shrink: 0;
  width: 36px;
  height: 22px;
  border-radius: 11px;
  background: var(--border);
  cursor: pointer;
  position: relative;
  transition: background 0.18s;
  outline: none;
}

.toggle-switch::after {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  border-radius: 9px;
  background: white;
  top: 2px;
  left: 2px;
  transition: transform 0.18s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle-switch:checked {
  background: var(--accent);
}

.toggle-switch:checked::after {
  transform: translateX(14px);
}

.toggle-switch:focus-visible {
  box-shadow: 0 0 0 2px var(--accent);
}

/* Freeze date picker */
.freeze-date-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 4px 10px 4px;
  gap: 12px;
}

.freeze-date-label {
  font-size: 12.5px;
  color: var(--text);
  opacity: 0.75;
}

.freeze-date-input {
  font-family: inherit;
  font-size: 12.5px;
  color: var(--text-h);
  background: var(--column-bg);
  border: 1.5px solid var(--border);
  border-radius: 7px;
  padding: 4px 8px;
  cursor: pointer;
  outline: none;
  transition: border-color 0.12s;
}

.freeze-date-input:focus {
  border-color: var(--accent);
}

.settings-divider {
  height: 1px;
  background: var(--border);
  margin: 4px 0;
  flex-shrink: 0;
}

/* Nav (About) */

.settings-nav {
  padding: 8px;
}

.settings-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 12px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 13.5px;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s, color 0.12s;
}

.settings-nav-item:hover {
  background: var(--column-bg);
  color: var(--text-h);
}

.nav-icon {
  flex-shrink: 0;
  opacity: 0.7;
}

/* About modal */

.about-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.about-modal {
  background: var(--bg);
  border-radius: 12px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.14), 0 0 0 1px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  animation: modal-in 0.15s ease-out;
}

@keyframes modal-in {
  from { transform: scale(0.96); opacity: 0; }
  to   { transform: scale(1);    opacity: 1; }
}

.about-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.about-modal-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-h);
  letter-spacing: -0.2px;
}

.about-modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}

.about-modal-close:hover {
  background: var(--border);
  color: var(--text-h);
}

.about-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
}

.about-lead {
  font-size: 13px;
  color: var(--text-h);
  line-height: 1.6;
  margin: 0;
}

.about-features {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.about-feature {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.feature-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 0.1px;
}

.feature-desc {
  font-size: 12.5px;
  color: var(--text);
  line-height: 1.55;
}

.feature-desc strong {
  color: var(--text-h);
  font-weight: 600;
}

.about-footer {
  font-size: 11.5px;
  color: var(--text);
  opacity: 0.7;
  margin: 0;
  line-height: 1.5;
  border-top: 1px solid var(--border);
  padding-top: 12px;
}
</style>
