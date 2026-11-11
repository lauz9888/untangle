// Test-only: literal copies of non-function exports that components read from
// mocked composables. Storybook-free so tests/unit/storybook-mocks can import
// it under jsdom. Drift against the real modules is guarded by
// tests/unit/storybook-mocks/composable.test.ts. Never imported by the app.
export const ENERGY_LEVEL_OPTIONS: { value: 'low' | 'medium' | 'high'; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

export const SECTION_DEFS: { key: 'now' | 'next' | 'later'; label: string }[] = [
  { key: 'now', label: 'Now' },
  { key: 'next', label: 'Next' },
  { key: 'later', label: 'Later' },
]
