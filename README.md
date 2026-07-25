# Untangle

An energy-based task manager, built as a PWA.

The homepage currently shows the Untangle logo and the tagline "Space to think"; the task manager itself is still being rebuilt.

## Getting started

```
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Scripts

| Command                       | Purpose                                                   |
| ----------------------------- | --------------------------------------------------------- |
| `npm run dev`                 | Start the dev server                                      |
| `npm run build`               | Production build                                          |
| `npm run preview`             | Preview the production build                              |
| `npm run typecheck`           | Type check (`vue-tsc`)                                    |
| `npm run test:unit`           | Unit tests (Vitest)                                       |
| `npm run test:bdd`            | BDD tests (Cucumber.js)                                   |
| `npm run test:e2e`            | End-to-end tests (Playwright, reads `BASE_URL` when set)  |
| `npm run test:coverage:merge` | Combined coverage percentage across all three test layers |
| `npm run lint`                | ESLint                                                    |
| `npm run format`              | Prettier (writes)                                         |
| `npm run format:check`        | Prettier check (used in CI)                               |

### Accessibility

Automated WCAG 2.1 A/AA scans run alongside the functional tests, scoped via each tool's tag filter (see `.claude/STANDARDS.md`) so only real success criteria are checked (not axe-core's broader best-practice rules):

- **Unit (`test:unit`)**: `jest-axe`, wired up in `vitest.setup.ts`. Color-contrast is disabled at this layer since jsdom has no real rendering engine to evaluate it against.
- **E2e (`test:e2e`)**: `@axe-core/playwright`, covering color-contrast and any other checks that need a real browser. See `tests/e2e/a11y.spec.ts`.

## Development process

Every change — feature, fix, or refactor — runs through the `/ship-feature` pipeline (`.claude/skills/ship-feature/SKILL.md`) rather than being made ad hoc. See [CLAUDE.md](./CLAUDE.md) for the full detail, or the [wiki](https://github.com/lauz9888/untangle/wiki) for a narrative overview.
