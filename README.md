# Untangle

A task manager designed for anyone who struggles with overwhelm, motivation, task initiation, or consistency — built to be neurodivergent-friendly without being exclusively for neurodivergent people.

Tasks are organised across three columns (Now, Next, Future) and can have an energy level. Set your current energy in the header and anything that needs more than you have right now is faded out — still visible, but deprioritised. Complete a task and it's gone from the board, logged to your history, and counted toward your streak.

---

## Using Untangle

Untangle runs in your browser. No account, login, or internet connection required — all data is stored locally.

### Install the app (recommended)

Visit **[lauz9888.github.io/untangle](https://lauz9888.github.io/untangle/)** in Chrome or Edge, then click the install icon in the address bar (or open the browser menu and choose "Install Untangle"). It lands on your desktop like a normal app and works fully offline from then on.

Safari on iPhone/iPad: tap the Share button and choose **Add to Home Screen**.

### Run it locally (developers)

```
npm install
npm run dev
```

Then open `http://localhost:5173`.

---

## Making changes

```
npm run dev        # dev server with hot reload
npm test           # unit tests (Vitest)
npm run test:e2e   # end-to-end tests (Playwright)
```

Before pushing any branch, run `/qa-review` in Claude Code. The pre-push hook will block if it hasn't been run.

---

## AI involvement

Untangle was built using an AI-assisted development workflow. Claude writes the code; the human author owns the architecture, makes all design decisions, and reviews every change before it ships.

All AI-generated code goes through the same pipeline as hand-written code: automated unit and end-to-end tests, a QA review step, and human sign-off before merging. Generated code that can't be read, reasoned about, and defended is treated as a liability — not a shortcut.

Full details on the workflow (skills, pipeline steps, and the test strategy that keeps generated code honest) are in the [wiki](https://github.com/lauz9888/untangle/wiki).

---

## What this repo demonstrates

For anyone evaluating it as a portfolio project or engineering sample:

- **AI-assisted SDLC governance** — every change goes through a structured pipeline (requirement capture → solution design → implementation → QA review → CI) enforced by git hooks and a custom workflow-state machine. Claude writes the code; the human author owns the architecture and signs off every change.
- **Layered test strategy** — unit tests (Vitest) isolate composables and components; end-to-end tests (Playwright) cover full user journeys; a coverage gate (≥ 80% statements/lines/functions) is enforced both locally and in CI.
- **CI/CD with GitHub Actions** — unit tests, E2E tests, coverage gate, and a production build check all run on every pull request. Failures automatically open GitHub issues with a link to the failing run.
- **PWA delivery** — ships as an installable Progressive Web App (offline-capable, home-screen installable on iOS and Android) via Vite PWA plugin and a GitHub Pages deployment pipeline.
- **Quality gates** — a `pre-push` hook blocks pushes without a QA approval marker; a `PreToolUse` hook blocks `gh pr create` without the same marker. Generated code that can't be read, reasoned about, and defended is treated as a liability.
- **Accessibility-aware UX** — interactive elements carry ARIA roles and labels; keyboard navigation is preserved; dynamic content is announced to screen readers.

---

## Wiki

Full documentation lives in the [Untangle wiki](https://github.com/lauz9888/untangle/wiki):

- [Architecture](https://github.com/lauz9888/untangle/wiki/Architecture)
- [Data Model](https://github.com/lauz9888/untangle/wiki/Data-Model)
- [Testing](https://github.com/lauz9888/untangle/wiki/Testing)
