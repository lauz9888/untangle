#!/usr/bin/env node
// CI PWA validation (pipeline step 13h): verifies the production build produced a valid,
// installable PWA — manifest with the required fields, a generated service worker, and
// index.html wiring both up. Runs against dist/, so `npm run build` must happen first.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const DIST = join(process.cwd(), 'dist')
const REQUIRED_MANIFEST_FIELDS = ['name', 'short_name', 'start_url', 'display', 'icons']

const failures = []

function fail(message) {
  failures.push(message)
}

const manifestPath = join(DIST, 'manifest.webmanifest')
if (!existsSync(manifestPath)) {
  fail('dist/manifest.webmanifest is missing.')
} else {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  for (const field of REQUIRED_MANIFEST_FIELDS) {
    if (!manifest[field]) fail(`manifest.webmanifest is missing required field "${field}".`)
  }
  if (Array.isArray(manifest.icons)) {
    const hasUsableIcon = manifest.icons.some((icon) => icon.src && icon.sizes)
    if (!hasUsableIcon) fail('manifest.webmanifest has no icon with both "src" and "sizes".')
  }
}

if (!existsSync(join(DIST, 'sw.js'))) {
  fail('dist/sw.js (service worker) was not generated.')
}

const indexPath = join(DIST, 'index.html')
if (!existsSync(indexPath)) {
  fail('dist/index.html is missing.')
} else {
  const html = readFileSync(indexPath, 'utf8')
  if (!/<link[^>]+rel=["']manifest["']/.test(html)) {
    fail('dist/index.html does not link the web app manifest.')
  }
  if (!/registerSW\.js|serviceWorker/.test(html)) {
    fail('dist/index.html does not register the service worker.')
  }
}

if (failures.length > 0) {
  console.error('PWA validation failed:')
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}

console.log('PWA validation passed: manifest, service worker, and index.html wiring all present.')
