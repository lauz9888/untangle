# Untangle

An energy-based task manager, built as a PWA.

## Getting started

```
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Scripts

| Command                 | Purpose                         |
| ----------------------- | ------------------------------- |
| `npm run dev`           | Start the dev server            |
| `npm run build`         | Production build                |
| `npm run preview`       | Preview the production build    |
| `npm test`              | Unit tests (Vitest, watch mode) |
| `npm run test:coverage` | Unit tests with coverage gate   |
| `npm run test:e2e`      | End-to-end tests (Playwright)   |
| `npm run lint`          | ESLint                          |
| `npm run format`        | Prettier                        |

## Development process

Every change goes through a 14-stage, test-driven pipeline — see [CLAUDE.md](./CLAUDE.md) for the full detail, or the [wiki](https://github.com/lauz9888/untangle/wiki) for a narrative overview.
