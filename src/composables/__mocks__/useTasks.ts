// Test-only manual Storybook mock, consumed solely by the sb.mock redirects in
// .storybook/preview.ts (ADR 0008). Never imported by the app.
import { fn } from 'storybook/test'

export const useTasks = fn()
