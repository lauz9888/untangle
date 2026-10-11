# 0006. Hand-rolled DOM and CSS confetti, no new dependency

Status: Accepted
Date: 2026-10-11

## Context

Completing a task triggers a short confetti celebration. It must last no more than 5 seconds,
never block pointer input, be hidden from assistive technology, respect
`prefers-reduced-motion`, and add no new dependency (requirement 13). It must work offline and
under the `/untangle/` GitHub Pages base path, and be assertable in jsdom, Storybook and
Playwright.

## Decision

Render a fixed, `aria-hidden`, `pointer-events: none` layer (`ConfettiLayer.vue`) of plain `<span>`
pieces animated with a CSS `@keyframes` fall, parameterised by per-piece CSS custom properties.
Piece data comes from a pure, injectable-random generator in `useCelebration.ts`, and cleanup is a
composable-owned timer that empties the array. Reduced motion is handled twice: no pieces are
generated in JS, and a CSS media query hides the layer.

## Alternatives considered

- `canvas-confetti`: rejected, it adds a dependency (requirement 13).
- Hand-rolled `<canvas>`: rejected, jsdom has no canvas `getContext`, so it is not unit-testable.
- DOM nodes plus CSS animation: chosen.

## Consequences

- 60 DOM nodes for under 5 seconds is acceptable; the piece count is a single constant.
- Pieces are keyed by burst id plus piece id so each new burst remounts every node and restarts
  its animation.
