import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '../../src/App.vue'

describe('App', () => {
  it('renders the Untangle heading as the wordmark', () => {
    const wrapper = mount(App)
    expect(wrapper.find('h1').text()).toBe('Untangle')
  })

  it('renders the tagline beneath the logo', () => {
    const wrapper = mount(App)
    expect(wrapper.find('.tagline').text()).toBe('Space to think')
  })

  it('renders a decorative logo icon hidden from assistive tech', () => {
    const wrapper = mount(App)
    const icon = wrapper.find('svg')
    expect(icon.exists()).toBe(true)
    expect(icon.attributes('aria-hidden')).toBe('true')
  })

  it('renders no body content beyond the logo and tagline', () => {
    const wrapper = mount(App)
    expect(wrapper.findAll('p').length).toBe(1)
    expect(wrapper.find('nav').exists()).toBe(false)
    expect(wrapper.findAll('h1').length).toBe(1)
  })
})
