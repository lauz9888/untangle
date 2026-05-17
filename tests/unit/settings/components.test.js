import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SettingsPanel from '../../../src/components/SettingsPanel.vue'

describe('settings panel — components', () => {
  describe('SettingsPanel — structure', () => {
    it('renders the panel', () => {
      const wrapper = mount(SettingsPanel)
      expect(wrapper.find('.settings-panel').exists()).toBe(true)
    })

    it('shows "Settings" as the panel title', () => {
      const wrapper = mount(SettingsPanel)
      expect(wrapper.find('.settings-title').text()).toBe('Settings')
    })

    it('shows an About menu item', () => {
      const wrapper = mount(SettingsPanel)
      expect(wrapper.find('.settings-nav-item').text()).toContain('About')
    })
  })

  describe('SettingsPanel — About modal', () => {
    it('does not show the About modal by default', () => {
      const wrapper = mount(SettingsPanel)
      expect(wrapper.find('.about-overlay').exists()).toBe(false)
    })

    it('shows the About modal when About is clicked', async () => {
      const wrapper = mount(SettingsPanel)
      await wrapper.find('.settings-nav-item').trigger('click')
      expect(wrapper.find('.about-overlay').exists()).toBe(true)
    })

    it('shows descriptive text in the About modal', async () => {
      const wrapper = mount(SettingsPanel)
      await wrapper.find('.settings-nav-item').trigger('click')
      expect(wrapper.find('.about-lead').text()).toBeTruthy()
    })

    it('closes the About modal when its close button is clicked', async () => {
      const wrapper = mount(SettingsPanel)
      await wrapper.find('.settings-nav-item').trigger('click')
      await wrapper.find('.about-modal-close').trigger('click')
      expect(wrapper.find('.about-overlay').exists()).toBe(false)
    })

    it('closes the About modal when its overlay is clicked', async () => {
      const wrapper = mount(SettingsPanel)
      await wrapper.find('.settings-nav-item').trigger('click')
      await wrapper.find('.about-overlay').trigger('click')
      expect(wrapper.find('.about-overlay').exists()).toBe(false)
    })
  })

  describe('SettingsPanel — close', () => {
    it('emits close when the close button is clicked', async () => {
      const wrapper = mount(SettingsPanel)
      await wrapper.find('.settings-close').trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('emits close when the overlay is clicked', async () => {
      const wrapper = mount(SettingsPanel)
      await wrapper.find('.settings-overlay').trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })
})
