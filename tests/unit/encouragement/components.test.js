import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const { mockDismissEncouragement } = vi.hoisted(() => ({
  mockDismissEncouragement: vi.fn(),
}))

// eslint-disable-next-line no-var
var mockEncouragement

vi.mock('../../../src/composables/useEncouragement.js', () => {
  mockEncouragement = ref(null)
  return {
    useEncouragement: () => ({
      encouragement: mockEncouragement,
      showEncouragement: vi.fn(),
      dismissEncouragement: mockDismissEncouragement,
    }),
  }
})

import EncouragementToast from '../../../src/components/EncouragementToast.vue'

describe('encouragement toast — components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEncouragement.value = null
  })

  describe('EncouragementToast — visibility', () => {
    it('renders nothing when encouragement is null', () => {
      const wrapper = mount(EncouragementToast)
      expect(wrapper.find('.encouragement-toast').exists()).toBe(false)
    })

    it('renders the toast when there is a message', () => {
      mockEncouragement.value = 'You are doing great!'
      const wrapper = mount(EncouragementToast)
      expect(wrapper.find('.encouragement-toast').exists()).toBe(true)
    })

    it('displays the encouragement message text', () => {
      mockEncouragement.value = 'One step at a time.'
      const wrapper = mount(EncouragementToast)
      expect(wrapper.find('.encouragement-text').text()).toBe('One step at a time.')
    })
  })

  describe('EncouragementToast — dismiss', () => {
    it('calls dismissEncouragement when the toast is clicked', async () => {
      mockEncouragement.value = 'You are doing great!'
      const wrapper = mount(EncouragementToast)
      await wrapper.find('.encouragement-toast').trigger('click')
      expect(mockDismissEncouragement).toHaveBeenCalledOnce()
    })
  })
})
