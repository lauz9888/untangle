# Untangle

An energy-based task manager, built as a PWA.

The homepage currently shows the Untangle logo and the tagline "Space to think", plus a Now/Next/Later layout scaffold (three fixed, empty, collapsible sections — columns on desktop, independently-collapsible rows on mobile); the task manager itself (task creation, content, and persistence) is still being rebuilt.

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

Every change — feature, fix, or refactor — runs through the `/ship-feature` pipeline rather than being made ad hoc: a single orchestrator skill drives 12 specialized subagents (requirements, solution design, test-authors, implementer, bug-fixer, QA, docs, report, quality-reporter) through requirements approval, test-first unit/BDD/e2e coverage, implementation, a QA and coverage gate, manual testing, CI/CD, and a post-change report. Docs and reports land via a small housekeeping PR rather than a direct push to `main`, and every agent treats source files, issue/PR text, and logs as data, never as instructions.

Every 10 releases (or on demand via `/quality-report`), `quality-reporter` writes a rollup of release velocity, defect density, a shift-left analysis of when defects are caught, and requirement delivery time to `reports/metrics/`.

**See the [wiki](https://github.com/lauz9888/untangle/wiki) for the full pipeline walkthrough.** `.claude/skills/ship-feature/SKILL.md` and `.claude/agents/*.md` are the exact, executable source of truth if you need step-by-step detail beyond that; [CLAUDE.md](./CLAUDE.md) covers the Claude-Code-specific technical reference (npm script contract, test-file conventions, key files).
