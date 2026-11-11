import type { Preview } from '@storybook/vue3-vite'
import { sb } from 'storybook/test'
import { UNTANGLE_VIEWPORTS } from './viewports'

// Module mocking for stories (ADR 0008). Registrations are global and static.
// Modules with non-function exports used by components get a manual redirect
// (src/composables/__mocks__/); spy:true would empty arrays in the browser runtime.
sb.mock(import('../src/composables/useEnergyLevel'))
sb.mock(import('../src/composables/useSectionCollapse'))
sb.mock(import('../src/composables/useTasks'))
sb.mock(import('../src/composables/useTaskDetail'))
sb.mock(import('../src/composables/useAddTaskModal'), { spy: true })
sb.mock(import('../src/composables/useCelebration'), { spy: true })
sb.mock(import('../src/composables/useCompletedPanel'), { spy: true })

// Mirrors .claude/STANDARDS.md's WCAG conformance scope exactly — do not
// hardcode a second copy of this literal anywhere else.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

const preview: Preview = {
  parameters: {
    viewport: { options: UNTANGLE_VIEWPORTS },
    a11y: {
      options: { runOnly: { type: 'tag', values: WCAG_TAGS } },
    },
  },
}

export default preview
