import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const { mockDismissToughLove } = vi.hoisted(() => ({
  mockDismissToughLove: vi.fn(),
}))

// eslint-disable-next-line no-var
var mockToughLove

vi.mock('../../../src/composables/useToughLove.js', () => {
  mockToughLove = ref(null)
  return {
    useToughLove: () => ({
      toughLove: mockToughLove,
      showToughLove: vi.fn(),
      dismissToughLove: mockDismissToughLove,
    }),
  }
})

import ToughLoveToast from '../../../src/components/ToughLoveToast.vue'

describe('tough love toast — components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockToughLove.value = null
  })

  describe('ToughLoveToast — visibility', () => {
    it('renders nothing when toughLove is null', () => {
      const wrapper = mount(ToughLoveToast)
      expect(wrapper.find('[data-testid="tough-love-toast"]').exists()).toBe(false)
    })

    it('renders the toast when there is a message', () => {
      mockToughLove.value = 'Stop waiting. Start now.'
      const wrapper = mount(ToughLoveToast)
      expect(wrapper.find('[data-testid="tough-love-toast"]').exists()).toBe(true)
    })

    it('displays the tough love message text', () => {
      mockToughLove.value = 'Look at the task. Now do the task.'
      const wrapper = mount(ToughLoveToast)
      expect(wrapper.find('[data-testid="tough-love-text"]').text()).toBe('Look at the task. Now do the task.')
    })
  })

  describe('ToughLoveToast — dismiss', () => {
    it('calls dismissToughLove when the toast is clicked', async () => {
      mockToughLove.value = 'Stop waiting. Start now.'
      const wrapper = mount(ToughLoveToast)
      await wrapper.find('[data-testid="tough-love-toast"]').trigger('click')
      expect(mockDismissToughLove).toHaveBeenCalledOnce()
    })
  })
})
