/**
 * Lighthouse CI configuration.
 *
 * Used by the main deployment pipeline to validate:
 *   - Accessibility  — full WCAG audit, not just critical/serious violations
 *   - Best practices — security headers, modern APIs, no deprecated features
 *   - PWA            — manifest, service worker, icons, offline behaviour
 *
 * The branch pipeline runs the lighter axe-core E2E check instead.
 * This full audit only runs on the main pipeline before production deploy.
 *
 * Thresholds are intentionally pragmatic for an initial baseline:
 * raise them incrementally as the scores improve.
 *
 * NOTE: Must be .cjs (CommonJS) — LHCI uses require() to load config files,
 * which fails for ES modules. Since this project has "type": "module" in
 * package.json, a plain .js file would be treated as ESM and silently ignored,
 * causing LHCI to fall back to auto-detection defaults (wrong static server,
 * wrong URL, NO_FCP). The .cjs extension forces CommonJS regardless.
 */

module.exports = {
  ci: {
    collect: {
      // Use `vite preview` rather than LHCI's built-in static server.
      // The built-in server lacks SPA fallback and the correct MIME/cache
      // headers that Vite sets, which causes NO_FCP in headless Chrome.
      // `vite preview` serves the dist/ exactly as production would.
      startServerCommand: 'npx vite preview --port 4173',
      startServerReadyPattern: 'Local:',
      url: ['http://localhost:4173/'],
      numberOfRuns: 1,
      settings: {
        // Required for headless Chrome on Linux CI runners.
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
      },
    },
    assert: {
      assertions: {
        // Accessibility: no failures allowed; score must be ≥ 90.
        'categories:accessibility': ['error', { minScore: 0.9 }],

        // Best practices: ≥ 90.
        'categories:best-practices': ['error', { minScore: 0.9 }],

        // PWA checks — these prove the install/offline story works.
        'installable-manifest': ['error', { minScore: 1 }],
        'service-worker': ['error', { minScore: 1 }],
        'splash-screen': ['warn', { minScore: 1 }],
        'themed-omnibox': ['warn', { minScore: 1 }],
        'content-width': ['error', { minScore: 1 }],
        'viewport': ['error', { minScore: 1 }],
        'without-javascript': ['warn', { minScore: 1 }],

        // Performance and SEO are tracked but not gated — they vary by runner.
        'categories:performance': ['warn', { minScore: 0.5 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
      },
    },
    upload: {
      // Upload reports to temporary public storage so the CI summary links to them.
      target: 'temporary-public-storage',
    },
  },
}
