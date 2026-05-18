import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, shallowMount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'

// eslint-disable-next-line no-var
var mockStreakCount
// eslint-disable-next-line no-var
var mockStreakSettings

vi.mock('../../../src/composables/useStreak.js', () => {
  mockStreakCount = ref(0)
  mockStreakSettings = ref({ excludeWeekends: false, excludeBankHolidays: false, freezeUntil: null })
  return {
    useStreak: () => ({
      streakCount: mockStreakCount,
      streakSettings: mockStreakSettings,
      recordCompletion: vi.fn(),
    }),
    todayString: () => '2025-06-02',
  }
})

vi.mock('../../../src/composables/useEncouragement.js', () => ({
  useEncouragement: () => ({
    showEncouragement: vi.fn(),
    dismissEncouragement: vi.fn(),
  }),
}))

vi.mock('../../../src/composables/useToughLove.js', () => ({
  useToughLove: () => ({
    showToughLove: vi.fn(),
    dismissToughLove: vi.fn(),
    toughLove: ref(null),
  }),
}))

import App from '../../../src/App.vue'
import SettingsPanel from '../../../src/components/SettingsPanel.vue'

describe('streak — components', () => {
  beforeEach(() => {
    mockStreakCount.value = 0
    mockStreakSettings.value = { excludeWeekends: false, excludeBankHolidays: false, freezeUntil: null }
  })

  describe('App.vue — streak display', () => {
    it('renders the streak display element', () => {
      const wrapper = shallowMount(App)
      expect(wrapper.find('.streak-display').exists()).toBe(true)
    })

    it('shows "0 days" when streak is 0', () => {
      const wrapper = shallowMount(App)
      expect(wrapper.find('.streak-text').text()).toBe('0 days')
    })

    it('does not have streak-active class when streak is 0', () => {
      const wrapper = shallowMount(App)
      expect(wrapper.find('.streak-display').classes()).not.toContain('streak-active')
    })

    it('has streak-active class when streak is greater than 0', async () => {
      mockStreakCount.value = 3
      const wrapper = shallowMount(App)
      await nextTick()
      expect(wrapper.find('.streak-display').classes()).toContain('streak-active')
    })

    it('shows "1 day" (singular) when streak is 1', async () => {
      mockStreakCount.value = 1
      const wrapper = shallowMount(App)
      await nextTick()
      expect(wrapper.find('.streak-text').text()).toBe('1 day')
    })

    it('shows "N days" (plural) when streak is greater than 1', async () => {
      mockStreakCount.value = 7
      const wrapper = shallowMount(App)
      await nextTick()
      expect(wrapper.find('.streak-text').text()).toBe('7 days')
    })

    it('shows the flame icon', () => {
      const wrapper = shallowMount(App)
      expect(wrapper.find('.streak-icon').text()).toBe('🔥')
    })

    it('updates the display when streakCount changes reactively', async () => {
      const wrapper = shallowMount(App)
      expect(wrapper.find('.streak-text').text()).toBe('0 days')

      mockStreakCount.value = 4
      await nextTick()

      expect(wrapper.find('.streak-text').text()).toBe('4 days')
      expect(wrapper.find('.streak-display').classes()).toContain('streak-active')
    })
  })

  describe('SettingsPanel.vue — streak section', () => {
    it('shows a Streak settings section', () => {
      const wrapper = mount(SettingsPanel)
      expect(wrapper.find('.settings-section').exists()).toBe(true)
      expect(wrapper.find('.section-title').text()).toBe('Streak')
    })

    it('shows three toggle rows', () => {
      const wrapper = mount(SettingsPanel)
      expect(wrapper.findAll('.toggle-row')).toHaveLength(3)
    })

    it('shows the Exclude weekends toggle', () => {
      const wrapper = mount(SettingsPanel)
      const names = wrapper.findAll('.toggle-name').map(n => n.text())
      expect(names).toContain('Exclude weekends')
    })

    it('shows the Exclude UK bank holidays toggle', () => {
      const wrapper = mount(SettingsPanel)
      const names = wrapper.findAll('.toggle-name').map(n => n.text())
      expect(names).toContain('Exclude UK bank holidays')
    })

    it('shows the Streak freeze toggle', () => {
      const wrapper = mount(SettingsPanel)
      const names = wrapper.findAll('.toggle-name').map(n => n.text())
      expect(names).toContain('Streak freeze')
    })

    it('the Streak section appears after the About nav item', () => {
      const wrapper = mount(SettingsPanel)
      const nav = wrapper.find('.settings-nav')
      const section = wrapper.find('.settings-section')
      const position = nav.element.compareDocumentPosition(section.element)
      expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('toggling Exclude weekends updates the setting', async () => {
      const wrapper = mount(SettingsPanel)
      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      await checkboxes[0].setValue(true)
      expect(mockStreakSettings.value.excludeWeekends).toBe(true)
    })

    it('toggling Exclude UK bank holidays updates the setting', async () => {
      const wrapper = mount(SettingsPanel)
      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      await checkboxes[1].setValue(true)
      expect(mockStreakSettings.value.excludeBankHolidays).toBe(true)
    })

    it('hides the date picker when streak freeze is not enabled', () => {
      const wrapper = mount(SettingsPanel)
      expect(wrapper.find('.freeze-date-row').exists()).toBe(false)
    })

    it('shows the date picker when streak freeze is enabled', async () => {
      const wrapper = mount(SettingsPanel)
      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      await checkboxes[2].setValue(true)
      await nextTick()
      expect(wrapper.find('.freeze-date-row').exists()).toBe(true)
    })

    it('sets freezeUntil to today when freeze is first enabled', async () => {
      const wrapper = mount(SettingsPanel)
      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      await checkboxes[2].setValue(true)
      expect(mockStreakSettings.value.freezeUntil).toBe('2025-06-02')
    })

    it('clears freezeUntil when freeze is disabled', async () => {
      mockStreakSettings.value.freezeUntil = '2025-06-05'
      const wrapper = mount(SettingsPanel)
      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      await checkboxes[2].setValue(false)
      expect(mockStreakSettings.value.freezeUntil).toBeNull()
    })

    it('reflects existing setting values on render', () => {
      mockStreakSettings.value.excludeWeekends = true
      mockStreakSettings.value.excludeBankHolidays = true
      const wrapper = mount(SettingsPanel)
      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      expect(checkboxes[0].element.checked).toBe(true)
      expect(checkboxes[1].element.checked).toBe(true)
      expect(checkboxes[2].element.checked).toBe(false)
    })
  })
})
