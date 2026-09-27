import { fn, within, userEvent, expect } from 'storybook/test'
import { page } from 'vitest/browser'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import CollapsibleSection from './CollapsibleSection.vue'

const meta: Meta<typeof CollapsibleSection> = {
  title: 'Components/CollapsibleSection',
  component: CollapsibleSection,
  args: {
    sectionKey: 'now',
    label: 'Now',
    onToggle: fn(),
  },
}
export default meta
type Story = StoryObj<typeof CollapsibleSection>

export const Expanded: Story = {
  args: { expanded: true },
}

export const Collapsed: Story = {
  args: { expanded: false },
}

// Requirement 4: reproduces tests/unit/now-next-later/components.test.ts's removed
// "emits toggle when the button is clicked". The section-toggle button is only
// visible/clickable at the <=640px breakpoint (CollapsibleSection.vue's own
// desktop-first CSS, see CLAUDE.md's NowNextLaterBoard.vue description) — resize
// the real browser viewport before interacting so the click lands on a rendered
// element, matching the only width at which this control (and thus this
// interaction) exists in the real app.
export const Interactions: Story = {
  args: { expanded: true },
  play: async ({ canvasElement, args }) => {
    await page.viewport(375, 812)
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button'))
    expect(args.onToggle).toHaveBeenCalled()
  },
}
