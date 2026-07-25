import { expect } from 'vitest'
import { toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

// jest-axe's own type declarations only augment Jest's global `expect`
// (`declare global { namespace jest { ... } }`), not Vitest's `Assertion`
// interface — without this, `expect(results).toHaveNoViolations()` type-checks
// under Jest but not under Vitest, even though the matcher is registered and
// works correctly at runtime via expect.extend above.
declare module 'vitest' {
  interface Assertion {
    toHaveNoViolations(): void
  }
}
