// Single source of truth for the mobile sizes used by stories' globals.viewport
// and by tests/storybook-interactive/interactive.spec.ts.
export const UNTANGLE_VIEWPORTS = {
  untangleMobile: {
    name: 'Untangle mobile (375x812)',
    styles: { width: '375px', height: '812px' },
    type: 'mobile',
  },
  untangleMobileLarge: {
    name: 'Untangle mobile large (390x844)',
    styles: { width: '390px', height: '844px' },
    type: 'mobile',
  },
} as const
