import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '../../src/App.vue'

describe('App', () => {
  it('renders the Untangle heading', () => {
    const wrapper = mount(App)
    expect(wrapper.find('h1').text()).toBe('Untangle')
  })
})
