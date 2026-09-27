import type { Preview } from '@storybook/vue3-vite'

// Mirrors .claude/STANDARDS.md's WCAG conformance scope exactly — do not
// hardcode a second copy of this literal anywhere else.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

const preview: Preview = {
  parameters: {
    a11y: {
      options: { runOnly: { type: 'tag', values: WCAG_TAGS } },
    },
  },
}

export default preview
