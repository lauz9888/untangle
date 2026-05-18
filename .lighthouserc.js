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
 */

export default {
  ci: {
    collect: {
      // Build is already done in CI; serve the dist/ directory.
      staticDistDir: './dist',
      numberOfRuns: 1,
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
