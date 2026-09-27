import { vi, expect } from 'vitest'
import { within, userEvent } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import EnergySelector from './EnergySelector.vue'

const state = {
  selectedLevel: ref<'low' | 'medium' | 'high' | null>(null),
  toastMessage: ref<string | null>(null),
  toastId: ref(0),
  selectLevel: vi.fn(),
  dismissToast: vi.fn(),
  encourageMe: vi.fn(),
  toughLove: vi.fn(),
}

vi.mock('../composables/useEnergyLevel', () => ({
  useEnergyLevel: () => state,
  ENERGY_LEVEL_OPTIONS: [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ],
}))

const meta: Meta<typeof EnergySelector> = {
  title: 'Components/EnergySelector',
  component: EnergySelector,
}
export default meta
type Story = StoryObj<typeof EnergySelector>

export const Unselected: Story = {
  beforeEach: () => {
    state.selectedLevel.value = null
    state.selectLevel.mockReset()
  },
}

export const LowSelected: Story = {
  beforeEach: () => {
    state.selectedLevel.value = 'low'
    state.selectLevel.mockReset()
  },
}

export const MediumSelected: Story = {
  beforeEach: () => {
    state.selectedLevel.value = 'medium'
    state.selectLevel.mockReset()
  },
}

export const HighSelected: Story = {
  beforeEach: () => {
    state.selectedLevel.value = 'high'
    state.selectLevel.mockReset()
  },
}

// Requirement 4: reproduces the exact interaction + assertion from
// tests/unit/energy-level/components.test.ts's removed
// "calls selectLevel with the matching value when a button is clicked".
export const Interactions: Story = {
  beforeEach: () => {
    state.selectedLevel.value = null
    state.selectLevel.mockReset()
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Low' }))
    expect(state.selectLevel).toHaveBeenCalledWith('low')
    await userEvent.click(canvas.getByRole('button', { name: 'Medium' }))
    expect(state.selectLevel).toHaveBeenCalledWith('medium')
    await userEvent.click(canvas.getByRole('button', { name: 'High' }))
    expect(state.selectLevel).toHaveBeenCalledWith('high')
  },
}
