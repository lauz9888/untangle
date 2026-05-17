import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

describe('energy — composable and EnergySelector', () => {
  let useTasks, EnergySelector

  beforeEach(async () => {
    localStorage.clear()
    vi.resetModules()
    ;({ useTasks } = await import('../../../src/composables/useTasks.js'))
    ;({ default: EnergySelector } = await import('../../../src/components/EnergySelector.vue'))
  })

  describe('isOverCapacity', () => {
    it('returns false when task has no energy set', () => {
      const { addTask, isOverCapacity, tasks } = useTasks()
      addTask('Task', 'now')
      expect(isOverCapacity(tasks.value[0])).toBe(false)
    })

    it('returns false when current energy is null (unset)', () => {
      const { addTask, isOverCapacity, currentEnergy, tasks } = useTasks()
      currentEnergy.value = null
      addTask('Task', 'now', { energy: 'large' })
      expect(isOverCapacity(tasks.value[0])).toBe(false)
    })

    it('returns false when task energy matches current energy', () => {
      const { addTask, isOverCapacity, currentEnergy, tasks } = useTasks()
      currentEnergy.value = 'medium'
      addTask('Task', 'now', { energy: 'medium' })
      expect(isOverCapacity(tasks.value[0])).toBe(false)
    })

    it('returns false when task energy is below current energy', () => {
      const { addTask, isOverCapacity, currentEnergy, tasks } = useTasks()
      currentEnergy.value = 'large'
      addTask('Task', 'now', { energy: 'tiny' })
      expect(isOverCapacity(tasks.value[0])).toBe(false)
    })

    it('returns true when task energy exceeds current energy', () => {
      const { addTask, isOverCapacity, currentEnergy, tasks } = useTasks()
      currentEnergy.value = 'tiny'
      addTask('Task', 'now', { energy: 'large' })
      expect(isOverCapacity(tasks.value[0])).toBe(true)
    })

    it('reacts to changes in currentEnergy', () => {
      const { addTask, isOverCapacity, currentEnergy, tasks } = useTasks()
      addTask('Task', 'now', { energy: 'medium' })
      currentEnergy.value = 'small'
      expect(isOverCapacity(tasks.value[0])).toBe(true)
      currentEnergy.value = 'large'
      expect(isOverCapacity(tasks.value[0])).toBe(false)
    })
  })

  describe('EnergySelector', () => {
    it('renders all four energy level buttons', () => {
      const wrapper = mount(EnergySelector)
      const buttons = wrapper.findAll('[role="group"] button')
      expect(buttons).toHaveLength(4)
      const labels = buttons.map(b => b.text().toLowerCase())
      expect(labels).toContain('tiny')
      expect(labels).toContain('small')
      expect(labels).toContain('medium')
      expect(labels).toContain('large')
    })

    it('no button is active when energy is unset (default)', () => {
      const wrapper = mount(EnergySelector)
      const buttons = wrapper.findAll('[role="group"] button')
      buttons.forEach(btn => expect(btn.classes()).not.toContain('active'))
    })

    it('all buttons have aria-pressed="false" when energy is unset', () => {
      const wrapper = mount(EnergySelector)
      const buttons = wrapper.findAll('[role="group"] button')
      buttons.forEach(btn => expect(btn.attributes('aria-pressed')).toBe('false'))
    })

    it('marks the clicked button as active', async () => {
      const wrapper = mount(EnergySelector)
      const buttons = wrapper.findAll('[role="group"] button')
      const tinyBtn = buttons.find(b => b.text().toLowerCase() === 'tiny')
      await tinyBtn.trigger('click')
      expect(tinyBtn.classes()).toContain('active')
    })

    it('sets aria-pressed="true" on the clicked button', async () => {
      const wrapper = mount(EnergySelector)
      const buttons = wrapper.findAll('[role="group"] button')
      const smallBtn = buttons.find(b => b.text().toLowerCase() === 'small')
      await smallBtn.trigger('click')
      expect(smallBtn.attributes('aria-pressed')).toBe('true')
    })

    it('deactivates a button when clicked again (toggle off)', async () => {
      const wrapper = mount(EnergySelector)
      const { currentEnergy } = useTasks()
      const buttons = wrapper.findAll('[role="group"] button')
      const tinyBtn = buttons.find(b => b.text().toLowerCase() === 'tiny')
      await tinyBtn.trigger('click')
      expect(tinyBtn.classes()).toContain('active')
      await tinyBtn.trigger('click')
      expect(tinyBtn.classes()).not.toContain('active')
      expect(currentEnergy.value).toBeNull()
    })

    it('updates currentEnergy when a button is clicked', async () => {
      const wrapper = mount(EnergySelector)
      const { currentEnergy } = useTasks()
      const buttons = wrapper.findAll('[role="group"] button')
      const largeBtn = buttons.find(b => b.text().toLowerCase() === 'large')
      await largeBtn.trigger('click')
      expect(currentEnergy.value).toBe('large')
    })

    it('deactivates the previously active button when a new one is clicked', async () => {
      const wrapper = mount(EnergySelector)
      const buttons = wrapper.findAll('[role="group"] button')
      const tinyBtn = buttons.find(b => b.text().toLowerCase() === 'tiny')
      const mediumBtn = buttons.find(b => b.text().toLowerCase() === 'medium')
      await tinyBtn.trigger('click')
      await mediumBtn.trigger('click')
      expect(tinyBtn.classes()).not.toContain('active')
      expect(mediumBtn.classes()).toContain('active')
    })

    it('renders the group with the correct aria-label', () => {
      const wrapper = mount(EnergySelector)
      const group = wrapper.find('[role="group"]')
      expect(group.attributes('aria-label')).toBe('Current energy level')
    })

    it('shows the energy level label text', () => {
      const wrapper = mount(EnergySelector)
      expect(wrapper.find('.energy-label').exists()).toBe(true)
      expect(wrapper.find('.energy-label').text().length).toBeGreaterThan(0)
    })
  })
})
