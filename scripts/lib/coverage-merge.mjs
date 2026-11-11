// Pure, unit-testable helpers for scripts/merge-coverage.mjs. See
// docs/adr/0007-single-statement-universe-and-istanbul-e2e-for-combined-coverage.md.
//
// All inputs/outputs are Istanbul `coverage-final.json`-shaped objects
// (`{ [path]: FileCoverageData }`).

import fs from 'node:fs'
import path from 'node:path'

// Must mirror vite.config.ts's `test.coverage.exclude`. assertUniverseComplete
// fails loudly if the two drift.
export const UNIVERSE_EXCLUDES = ['src/main.ts', 'src/**/*.stories.ts', 'src/**/__mocks__/**']

export const PRIMARY_LAYERS = ['unit', 'storybook']
export const SECONDARY_LAYERS = ['bdd', 'e2e']

export const LAYER_NAMES = [...PRIMARY_LAYERS, ...SECONDARY_LAYERS]

export const SIGNAL_PREFIX = 'Coverage signal:'

// The token that marks the calibration statement in src/ (exactly one occurrence). The
// statement itself is unreachable from every layer's tests, so every layer must report it at
// 0 hits. Located by marker, not line number. See docs/adr/0009-*.md.
export const CALIBRATION_MARKER = 'coverage-calibration-statement'

// Known secondary-only artefact classes. The ids are the stable ids listed in
// .claude/STANDARDS.md ("Known secondary-only artefact classes"); a unit test asserts
// the two lists agree. Anything a secondary layer reports that matches none of these
// is "unclassified" and fails validity check 4.
export const ARTEFACT_CLASSES = [
  {
    id: 'bdd-commonjs-emit',
    description:
      'bdd statement on an import / export function / export const line (ts-node CommonJS emit)',
  },
  {
    id: 'e2e-vue-template-branch',
    description: 'e2e .vue branch inside <template> (production SFC compile placement)',
  },
  {
    id: 'unalignable-branch-arm',
    description: 'secondary branch whose arm count differs from its inventory slot',
  },
  {
    id: 'e2e-vue-template-expression',
    description: 'e2e .vue statement or function inside <template> (production SFC compile)',
  },
]

// Different producers resolve file paths differently on Windows; normalise to
// forward slashes so one physical file is one entry.
export function normalizeCoverageKeys(data) {
  const normalized = {}
  for (const [filePath, fileCoverage] of Object.entries(data)) {
    const key = filePath.split(path.win32.sep).join(path.posix.sep)
    normalized[key] = { ...fileCoverage, path: key }
  }
  return normalized
}

// `src/...` with forward slashes, whatever the separator or absolute prefix of the key.
export function relativeSrcPath(file) {
  const norm = String(file).split(path.win32.sep).join(path.posix.sep)
  const at = norm.lastIndexOf('/src/')
  return at !== -1 ? norm.slice(at + 1) : norm
}

// Scope a layer to this project's application code (the sourcemap remap can
// surface node_modules sources).
export function scopeToOwnSource(data) {
  const scoped = {}
  for (const [filePath, fileCoverage] of Object.entries(data)) {
    if (/\/src\//.test(filePath) && !/\/node_modules\//.test(filePath)) {
      scoped[filePath] = fileCoverage
    }
  }
  return scoped
}

// Minimal glob matcher for UNIVERSE_EXCLUDES: `**/` spans any number of
// directories, a trailing `**` matches anything below, `*` stays within one
// segment (`src/**/*.stories.ts`, `src/**/__mocks__/**`).
export function globToRegExp(pattern) {
  const source = pattern
    .split(/(\*\*\/|\*\*|\*)/)
    .map((part) => {
      if (part === '**/') return '(?:.*/)?'
      if (part === '**') return '.*'
      if (part === '*') return '[^/]*'
      return part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    })
    .join('')
  return new RegExp(`^${source}$`)
}

export function isExcluded(relPath) {
  return UNIVERSE_EXCLUDES.some((pattern) => globToRegExp(pattern).test(relPath))
}

// Drops files on the shared exclusion list (src/main.ts, stories, mocks) so they are
// neither reconciled nor counted: they are out of scope, not an artefact class.
export function scopeToInScope(data) {
  const scoped = {}
  for (const [filePath, fileCoverage] of Object.entries(data)) {
    if (!isExcluded(relativeSrcPath(filePath))) scoped[filePath] = fileCoverage
  }
  return scoped
}

// Loads all four layers from `<coverageDir>/<layer>/coverage-final.json`,
// normalised and scoped. A missing or unparseable layer file throws (never silently dropped).
export function loadLayers(coverageDir) {
  const out = {}
  for (const layer of LAYER_NAMES) {
    const file = path.join(coverageDir, layer, 'coverage-final.json')
    if (!fs.existsSync(file)) {
      throw new Error(`Missing coverage-final.json for the "${layer}" layer (${file})`)
    }
    let parsed
    try {
      parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch (error) {
      throw new Error(
        `unparseable coverage-final.json for the "${layer}" layer (${file}): ${error.message}`
      )
    }
    out[layer] = scopeToInScope(scopeToOwnSource(normalizeCoverageKeys(parsed)))
  }
  return out
}

// ---------------------------------------------------------------------------
// Item extraction
// ---------------------------------------------------------------------------

function cmp(a, b) {
  return a.col - b.col || a.endLine - b.endLine || a.endCol - b.endCol
}

function posOf(loc) {
  return {
    line: loc?.start?.line ?? 0,
    col: loc?.start?.column ?? 0,
    endLine: loc?.end?.line ?? loc?.start?.line ?? 0,
    endCol: loc?.end?.column ?? 0,
  }
}

// Returns { statements: Item[], branches: Item[], functions: Item[] } where an
// Item is { kind, line, col, endLine, endCol, hits: number[], loc, extra }.
function extractItems(fc) {
  const statements = []
  for (const [id, loc] of Object.entries(fc.statementMap ?? {})) {
    statements.push({
      kind: 's',
      ...posOf(loc),
      hits: [fc.s?.[id] ?? 0],
      loc,
    })
  }
  const branches = []
  for (const [id, br] of Object.entries(fc.branchMap ?? {})) {
    const l = br.loc ?? br.locations?.[0]
    branches.push({
      kind: br.type ?? 'branch',
      ...posOf(l),
      hits: [...(fc.b?.[id] ?? [])],
      loc: br.loc ?? l,
      locations: br.locations,
    })
  }
  const functions = []
  for (const [id, fn] of Object.entries(fc.fnMap ?? {})) {
    functions.push({
      kind: 'f',
      ...posOf(fn.decl ?? fn.loc),
      hits: [fc.f?.[id] ?? 0],
      loc: fn.loc,
      decl: fn.decl,
      name: fn.name,
    })
  }
  return { statements, branches, functions }
}

// group key -> sorted items
function groupItems(items) {
  const groups = new Map()
  for (const it of items) {
    const k = `${it.line}|${it.kind}`
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k).push(it)
  }
  for (const arr of groups.values()) arr.sort(cmp)
  return groups
}

const KINDS = ['statements', 'branches', 'functions']

// ---------------------------------------------------------------------------
// combineCoverage
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Secondary-only item classification
// ---------------------------------------------------------------------------

function safeArmCredit(type, universeArms, secondaryArms) {
  if (universeArms === secondaryArms) return true
  return type === 'if' && secondaryArms === universeArms - 1
}

// 1-based start/end lines of a .vue file's top-level template: the column-0 `<template`
// line through the first column-0 `</template>` line after it. A `<template>` string inside
// a <script> block is never at the start of a line as a tag, so it cannot move the range.
export function vueTemplateRange(text) {
  const lines = String(text ?? '').split(/\r?\n/)
  const start = lines.findIndex((l) => /^<template(\s|>|$)/.test(l))
  if (start === -1) return null
  const endOffset = lines.slice(start + 1).findIndex((l) => /^<\/template>\s*$/.test(l))
  if (endOffset === -1) return null
  return { start: start + 1, end: start + 1 + endOffset + 1 }
}

const BDD_EMIT_LINE = /^(import\b|export function\b|export async function\b|export const\b)/

// Returns the declared artefact-class id for a secondary-only item, or null (unclassified).
// `source` is { lineText(line) -> string, template -> {start,end}|null }, or null when no
// source is available (the source-line rules then cannot apply, so nothing is classified).
export function classifySecondaryItem({ layer, kind, file, line, hasSlot, armRejected, source }) {
  if (kind === 'branch' && hasSlot) return armRejected ? 'unalignable-branch-arm' : null
  if (hasSlot || !source) return null
  if (kind === 'statement' && layer === 'bdd') {
    return BDD_EMIT_LINE.test(source.lineText(line).trim()) ? 'bdd-commonjs-emit' : null
  }
  const range = source.template
  const inTemplate = Boolean(range) && line > range.start && line < range.end
  if (layer === 'e2e' && file.endsWith('.vue') && inTemplate) {
    if (kind === 'branch') return 'e2e-vue-template-branch'
    if (kind === 'statement' || kind === 'function') return 'e2e-vue-template-expression'
  }
  return null
}

const SINGULAR_KIND = { statements: 'statement', branches: 'branch', functions: 'function' }

function compareUnclassified(x, y) {
  return (
    (x.file < y.file ? -1 : x.file > y.file ? 1 : 0) ||
    x.line - y.line ||
    (x.kind < y.kind ? -1 : x.kind > y.kind ? 1 : 0) ||
    (x.layer < y.layer ? -1 : x.layer > y.layer ? 1 : 0)
  )
}

// ---------------------------------------------------------------------------
// combineCoverage
// ---------------------------------------------------------------------------

export function combineCoverage({ primary, secondary, secondaryNames, readSource }) {
  // file -> kind -> Map(groupKey -> slots[]) ; slot = { template item, hits[] }
  const universe = new Map()

  const ensureFile = (file) => {
    if (!universe.has(file)) {
      universe.set(file, { statements: new Map(), branches: new Map(), functions: new Map() })
    }
    return universe.get(file)
  }

  // Pass 1: universe shape from primary layers (max group size, max arms).
  const primaryItems = primary.map((layer) => {
    const perFile = {}
    for (const [file, fc] of Object.entries(layer)) {
      perFile[file] = {}
      const items = extractItems(fc)
      for (const kind of KINDS) perFile[file][kind] = groupItems(items[kind])
    }
    return perFile
  })

  // Deterministic file order.
  const files = [...new Set(primaryItems.flatMap((p) => Object.keys(p)))].sort()
  for (const file of files) {
    const u = ensureFile(file)
    for (const kind of KINDS) {
      for (const layerItems of primaryItems) {
        const groups = layerItems[file]?.[kind]
        if (!groups) continue
        for (const [gk, arr] of groups) {
          if (!u[kind].has(gk)) u[kind].set(gk, [])
          const slots = u[kind].get(gk)
          arr.forEach((item, i) => {
            if (!slots[i]) {
              slots[i] = { template: item, hits: item.hits.map(() => 0) }
            }
            const slot = slots[i]
            while (slot.hits.length < item.hits.length) slot.hits.push(0)
          })
        }
      }
    }
  }

  // Pass 2: credit primary hits.
  for (const layerItems of primaryItems) {
    for (const file of Object.keys(layerItems)) {
      const u = universe.get(file)
      for (const kind of KINDS) {
        for (const [gk, arr] of layerItems[file][kind]) {
          const slots = u[kind].get(gk)
          arr.forEach((item, i) => {
            item.hits.forEach((h, a) => {
              slots[i].hits[a] += h
            })
          })
        }
      }
    }
  }

  // Pass 3: credit secondary hits onto existing slots; classify everything that has no slot
  // (or whose arms cannot be aligned) into a declared class, else report it unclassified.
  // Nothing here adds to or removes from the inventory.
  const names = secondary.map(
    (_, idx) => secondaryNames?.[idx] ?? SECONDARY_LAYERS[idx] ?? `secondary${idx}`
  )
  const layerKeys = [...new Set([...SECONDARY_LAYERS, ...names])]
  const classes = {}
  for (const c of ARTEFACT_CLASSES) {
    classes[c.id] = { total: 0, byLayer: Object.fromEntries(layerKeys.map((n) => [n, 0])) }
  }
  const unclassified = []
  const sourceCache = new Map()
  const sourceOf = (file) => {
    if (!readSource) return null
    if (!sourceCache.has(file)) {
      let text
      try {
        text = readSource(file)
      } catch {
        text = undefined
      }
      if (typeof text !== 'string') {
        sourceCache.set(file, null)
      } else {
        const lines = text.split(/\r?\n/)
        sourceCache.set(file, {
          lineText: (n) => lines[n - 1] ?? '',
          template: file.endsWith('.vue') ? vueTemplateRange(text) : null,
        })
      }
    }
    return sourceCache.get(file)
  }

  secondary.forEach((layer, idx) => {
    const name = names[idx]
    for (const [file, fc] of Object.entries(layer)) {
      const u = universe.get(file)
      const items = extractItems(fc)
      for (const kind of KINDS) {
        const groups = groupItems(items[kind])
        for (const [gk, arr] of groups) {
          const slots = u?.[kind].get(gk)
          arr.forEach((item, i) => {
            const slot = slots?.[i]
            let armRejected = false
            if (slot) {
              if (kind === 'branches') {
                if (safeArmCredit(item.kind, slot.hits.length, item.hits.length)) {
                  item.hits.forEach((h, a) => {
                    slot.hits[a] += h
                  })
                  return
                }
                armRejected = true
              } else {
                slot.hits[0] += item.hits[0]
                return
              }
            }
            const singular = SINGULAR_KIND[kind]
            const id = classifySecondaryItem({
              layer: name,
              kind: singular,
              file,
              line: item.line,
              hasSlot: Boolean(slot),
              armRejected,
              source: sourceOf(file),
            })
            if (id) {
              classes[id].total++
              classes[id].byLayer[name]++
            } else {
              unclassified.push({ file, line: item.line, kind: singular, layer: name })
            }
          })
        }
      }
    }
  })
  unclassified.sort(compareUnclassified)

  // Emit.
  const data = {}
  const totals = {
    statements: { covered: 0, total: 0 },
    branches: { covered: 0, total: 0 },
    functions: { covered: 0, total: 0 },
  }
  for (const file of files) {
    const u = universe.get(file)
    const out = { path: file, statementMap: {}, fnMap: {}, branchMap: {}, s: {}, f: {}, b: {} }
    let n = 0
    for (const [, slots] of sortedGroups(u.statements)) {
      for (const slot of slots) {
        const id = String(n++)
        out.statementMap[id] = slot.template.loc
        out.s[id] = slot.hits[0]
        totals.statements.total++
        if (slot.hits[0] > 0) totals.statements.covered++
      }
    }
    n = 0
    for (const [, slots] of sortedGroups(u.branches)) {
      for (const slot of slots) {
        const id = String(n++)
        const t = slot.template
        out.branchMap[id] = {
          type: t.kind,
          loc: t.loc,
          locations: slot.hits.map((_, a) => t.locations?.[a] ?? t.loc),
          line: t.line,
        }
        out.b[id] = slot.hits
        for (const h of slot.hits) {
          totals.branches.total++
          if (h > 0) totals.branches.covered++
        }
      }
    }
    n = 0
    for (const [, slots] of sortedGroups(u.functions)) {
      for (const slot of slots) {
        const id = String(n++)
        const t = slot.template
        out.fnMap[id] = {
          name: t.name ?? `fn${id}`,
          decl: t.decl ?? t.loc,
          loc: t.loc,
          line: t.line,
        }
        out.f[id] = slot.hits[0]
        totals.functions.total++
        if (slot.hits[0] > 0) totals.functions.covered++
      }
    }
    data[file] = out
  }

  return { data, totals, reconciliation: { classes, unclassified } }
}

function sortedGroups(map) {
  return [...map.entries()].sort((a, b) => {
    const [al, ak] = a[0].split('|')
    const [bl, bk] = b[0].split('|')
    return Number(al) - Number(bl) || (ak < bk ? -1 : ak > bk ? 1 : 0)
  })
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

// Blocks only on objective evidence the e2e layer is not real hit data: no functions, no
// branches, or a fully flat layer (every statement of every file shares one hit count, the
// historical fake). Softer patterns are advisory signals (collectSignals).
export function assertE2eLayerIsReal(data) {
  let fns = 0
  let branches = 0
  let statements = 0
  const hitValues = new Set()
  for (const fc of Object.values(data)) {
    fns += Object.keys(fc.f ?? {}).length
    branches += Object.keys(fc.b ?? {}).length
    for (const h of Object.values(fc.s ?? {})) {
      statements++
      hitValues.add(h)
    }
  }
  const fail = (reason) => {
    throw new Error(`e2e coverage layer looks flat/fake: ${reason}`)
  }
  if (fns === 0) fail('it has zero functions')
  if (branches === 0) fail('it has zero branches')
  if (statements > 0 && hitValues.size === 1) {
    fail(`all ${statements} statements share one hit count (${[...hitValues][0]})`)
  }
}

export function assertUniverseComplete(universeFiles, diskFiles) {
  const u = new Set(universeFiles)
  const d = new Set(diskFiles)
  const missing = [...d].filter((f) => !u.has(f)).sort()
  const extra = [...u].filter((f) => !d.has(f)).sort()
  if (missing.length || extra.length) {
    const parts = []
    if (missing.length) {
      parts.push(`source files missing from the coverage universe: ${missing.join(', ')}`)
    }
    if (extra.length) {
      parts.push(`universe files not found on disk: ${extra.join(', ')}`)
    }
    throw new Error(`Coverage universe mismatch - ${parts.join('; ')}`)
  }
}

// Independent recount of the expected universe size from raw primary inputs.
export function assertDedupeEffective(layers, result) {
  const { primary } = layers
  if (result.totals.statements.total === 0) {
    throw new Error('Merged coverage contains zero statements')
  }
  const files = new Set(primary.flatMap((l) => Object.keys(l)))
  const sizeOf = (fc, kind) => {
    // group key -> count (arms: sum of arms in the group's items)
    const groups = new Map()
    const add = (key, loc, n) => {
      const pos = posOf(loc)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push({ n, pos })
    }
    if (kind === 'statements') {
      for (const loc of Object.values(fc?.statementMap ?? {})) {
        add(`${loc.start.line}|s`, loc, 1)
      }
    } else if (kind === 'functions') {
      for (const fn of Object.values(fc?.fnMap ?? {})) {
        const l = fn.decl ?? fn.loc
        add(`${l.start.line}|f`, l, 1)
      }
    } else {
      for (const [id, br] of Object.entries(fc?.branchMap ?? {})) {
        const l = br.loc ?? br.locations[0]
        add(`${l.start.line}|${br.type}`, l, fc.b[id].length)
      }
    }
    for (const [k, arr] of groups) {
      arr.sort((a, b) => cmp(a.pos, b.pos))
      groups.set(
        k,
        arr.map((x) => x.n)
      )
    }
    return groups
  }
  for (const file of files) {
    for (const kind of KINDS) {
      // expected: per group, max count of items; for branches, items sorted desc by arms is
      // not needed: universe slot i takes max arms across layers' i-th item.
      const perLayer = primary.map((l) => sizeOf(l[file], kind))
      const keys = new Set(perLayer.flatMap((m) => [...m.keys()]))
      let expected = 0
      let upperBound = 0
      for (const k of keys) {
        const lists = perLayer.map((m) => m.get(k) ?? [])
        const slots = Math.max(...lists.map((x) => x.length))
        for (let i = 0; i < slots; i++) {
          expected += Math.max(...lists.map((x) => x[i] ?? 0))
        }
        // tight bound: best layer's count plus ordinals others have beyond it
        upperBound += Math.max(...lists.map((x) => x.length))
      }
      const fc = result.data[file]
      let actual = 0
      if (fc) {
        if (kind === 'statements') actual = Object.keys(fc.s).length
        else if (kind === 'functions') actual = Object.keys(fc.f).length
        else actual = Object.values(fc.b).reduce((n, arms) => n + arms.length, 0)
      }
      if (actual !== expected) {
        throw new Error(
          `Dedupe check failed for ${file} (${kind}): merged ${actual}, expected universe size ${expected}`
        )
      }
      if (kind !== 'branches' && actual > upperBound) {
        throw new Error(
          `Dedupe check failed for ${file} (${kind}): merged ${actual} exceeds bound ${upperBound}`
        )
      }
    }
  }
}

// A statement on a blank line, a comment-only line, or (in a .vue file) inside <style> compiles
// to no executable code, so it can only be a measurement artefact. `label` names the data set
// in the error ("inventory", "e2e template parity").
export function assertNoStatementOnNonCode(data, readSource, label) {
  for (const [file, fc] of Object.entries(data)) {
    const raw = readSource(file)
    if (typeof raw !== 'string') continue
    const lines = raw.split(/\r?\n/)
    let styleStart = -1
    let styleEnd = -1
    if (file.endsWith('.vue')) {
      lines.forEach((text, i) => {
        if (styleStart < 0 && /^\s*<style\b/.test(text)) styleStart = i + 1
        if (styleStart >= 0 && styleEnd < 0 && /<\/style>/.test(text)) styleEnd = i + 1
      })
    }
    for (const loc of Object.values(fc.statementMap ?? {})) {
      const line = loc.start.line
      const text = (lines[line - 1] ?? '').trim()
      const inStyle =
        styleStart > 0 && line >= styleStart && line <= (styleEnd > 0 ? styleEnd : Infinity)
      const blank = text === ''
      const comment = /^(\/\/|\/\*|\*|<!--)/.test(text)
      if (inStyle || blank || comment) {
        const why = inStyle ? 'inside <style>' : blank ? 'blank line' : 'comment-only line'
        throw new Error(`${label} failed for ${file}: statement at line ${line} is on a ${why}`)
      }
    }
  }
}

export function assertE2eTemplateParity(e2eData, unitData, readSource) {
  const checked = {}
  for (const [file, e2e] of Object.entries(e2eData)) {
    if (!file.endsWith('.vue')) continue
    const unit = unitData[file]
    if (!unit) continue
    const e2eCount = Object.keys(e2e.statementMap ?? {}).length
    const unitCount = Object.keys(unit.statementMap ?? {}).length
    const allowed = unitCount + Math.max(2, Math.ceil(0.1 * unitCount))
    if (e2eCount > allowed) {
      throw new Error(
        `e2e template parity failed for ${file}: ${e2eCount} statements vs unit ${unitCount} (allowed ${allowed})`
      )
    }
    checked[file] = e2e
  }
  assertNoStatementOnNonCode(checked, readSource, 'e2e template parity')
}

// Two inventory items at an identical location (same file, kind and start/end position) mean
// the de-duplication left a copy behind.
export function assertInventoryKeysUnique(data) {
  const locKey = (l) => `${l?.start?.line}:${l?.start?.column}-${l?.end?.line}:${l?.end?.column}`
  for (const [file, fc] of Object.entries(data)) {
    const sets = {
      statement: Object.values(fc.statementMap ?? {}).map((l) => [locKey(l), l]),
      branch: Object.values(fc.branchMap ?? {}).map((b) => [`${b.type}|${locKey(b.loc)}`, b.loc]),
      function: Object.values(fc.fnMap ?? {}).map((fn) => [locKey(fn.decl ?? fn.loc), fn.decl]),
    }
    for (const [kind, entries] of Object.entries(sets)) {
      const seen = new Set()
      for (const [key, l] of entries) {
        if (seen.has(key)) {
          throw new Error(
            `Inventory has two ${kind} items at the same location in ${file} (line ${l?.start?.line})`
          )
        }
        seen.add(key)
      }
    }
  }
}

export function assertNoUnclassified(reconciliation) {
  const n = reconciliation?.unclassified?.length ?? 0
  if (n > 0) {
    throw new Error(
      `${n} unclassified secondary-only item(s) match no known artefact class, so the inventory's ` +
        'completeness is unverified - see the `Unclassified secondary-only item:` lines above'
    )
  }
}

export function assertTotalsNonZero(totals) {
  if (!totals || totals.statements.total === 0) {
    throw new Error('Merged coverage contains zero statements')
  }
  if (totals.branches.total === 0) {
    throw new Error('Merged coverage contains zero branches')
  }
}

// ---------------------------------------------------------------------------
// Calibration statement (validity check 7)
// ---------------------------------------------------------------------------

// files: { path, text }[] -> [{ file, line }] for every line carrying the marker.
export function findCalibrationSites(files) {
  const sites = []
  for (const { path: file, text } of files) {
    String(text ?? '')
      .split(/\r?\n/)
      .forEach((lineText, i) => {
        if (lineText.includes(CALIBRATION_MARKER)) sites.push({ file, line: i + 1 })
      })
  }
  return sites
}

function findByRelPath(data, file) {
  const rel = relativeSrcPath(file)
  const key = Object.keys(data ?? {}).find((k) => relativeSrcPath(k) === rel)
  return key === undefined ? undefined : data[key]
}

function statementsOnLine(fc, line) {
  return Object.entries(fc?.statementMap ?? {})
    .filter(([, loc]) => loc.start.line === line)
    .map(([id]) => fc.s?.[id] ?? 0)
}

// The calibration statement is unreachable from every layer's tests: each layer must report
// it (present, not omitted) at 0 hits, and so must the merged inventory.
export function checkCalibration({ layers, inventory, sites }) {
  if (sites.length !== 1) {
    throw new Error(
      `Calibration statement: expected exactly one \`${CALIBRATION_MARKER}\` marker site in src/, found ${sites.length}` +
        (sites.length
          ? ` (${sites.map((s) => `${relativeSrcPath(s.file)}:${s.line}`).join(', ')})`
          : '')
    )
  }
  const [site] = sites
  const where = `${relativeSrcPath(site.file)}:${site.line}`
  const problems = []
  for (const name of LAYER_NAMES) {
    const hits = statementsOnLine(findByRelPath(layers[name], site.file), site.line)
    if (hits.length === 0) {
      problems.push(`layer ${name} omitted the calibration statement at ${where}`)
    } else if (hits.some((h) => h > 0)) {
      problems.push(`layer ${name} reports the calibration statement at ${where} as hit`)
    }
  }
  const merged = statementsOnLine(findByRelPath(inventory, site.file), site.line)
  if (merged.length === 0) {
    problems.push(`the merged inventory is missing the calibration statement at ${where}`)
  } else if (merged.some((h) => h > 0)) {
    problems.push(`the merged inventory reports the calibration statement at ${where} as covered`)
  }
  if (problems.length) throw new Error(`Calibration failed: ${problems.join('; ')}`)
}

// ---------------------------------------------------------------------------
// Determinism (validity check 8)
// ---------------------------------------------------------------------------

export function checkDeterminism(input, options = {}) {
  const combine = options.combine ?? combineCoverage
  const names =
    input.secondaryNames ?? input.secondary.map((_, i) => SECONDARY_LAYERS[i] ?? `secondary${i}`)
  const first = combine(input)
  let second
  try {
    second = combine({
      ...input,
      primary: [...input.primary].reverse(),
      secondary: [...input.secondary].reverse(),
      secondaryNames: [...names].reverse(),
    })
  } catch (error) {
    throw new Error(`Determinism re-run (layers reversed) failed: ${error.message}`)
  }
  const diffs = []
  for (const kind of KINDS) {
    const a = first.totals[kind]
    const b = second.totals[kind]
    if (a.covered !== b.covered || a.total !== b.total) {
      diffs.push(`${kind} ${a.covered}/${a.total} vs ${b.covered}/${b.total}`)
    }
  }
  const ra = first.reconciliation ?? { classes: {}, unclassified: [] }
  const rb = second.reconciliation ?? { classes: {}, unclassified: [] }
  const ids = [...new Set([...Object.keys(ra.classes), ...Object.keys(rb.classes)])].sort()
  for (const id of ids) {
    const a = ra.classes[id] ?? { total: 0, byLayer: {} }
    const b = rb.classes[id] ?? { total: 0, byLayer: {} }
    if (
      a.total !== b.total ||
      JSON.stringify(sortKeys(a.byLayer)) !== JSON.stringify(sortKeys(b.byLayer))
    ) {
      diffs.push(`class ${id} ${a.total} vs ${b.total}`)
    }
  }
  if (JSON.stringify(ra.unclassified) !== JSON.stringify(rb.unclassified)) {
    diffs.push(
      `unclassified list ${ra.unclassified.length} item(s) vs ${rb.unclassified.length} item(s)`
    )
  }
  if (diffs.length) {
    throw new Error(`Non-deterministic merge (layer order changed the result): ${diffs.join('; ')}`)
  }
}

function sortKeys(obj) {
  return Object.fromEntries(Object.entries(obj ?? {}).sort(([x], [y]) => (x < y ? -1 : 1)))
}

// ---------------------------------------------------------------------------
// Investigation signals (advisory, never throw)
// ---------------------------------------------------------------------------

export function formatSignal({ pattern, layer, file, detail }) {
  return [
    `${SIGNAL_PREFIX} ${pattern}`,
    layer ? `layer=${layer}` : '',
    file ? `file=${file}` : '',
    detail ?? '',
  ]
    .filter(Boolean)
    .join(' ')
}

// Reads the baseline figures from a report's metrics block (`coverage_percent`,
// `branch_coverage_percent`, `coverage_method`). Null when any is missing (e.g. a v1 report).
export function parseBaselineFromReport(text) {
  const num = (key) => {
    const m = new RegExp(`^${key}:\\s*(\\d+(?:\\.\\d+)?)\\s*$`, 'm').exec(text ?? '')
    return m ? Number(m[1]) : null
  }
  const statements = num('coverage_percent')
  const branches = num('branch_coverage_percent')
  const method = /^coverage_method:\s*(\S+)\s*$/m.exec(text ?? '')?.[1] ?? null
  if (statements === null || branches === null || method === null) return null
  return { statements, branches, method }
}

function inventoryPercentages(inventory) {
  let sc = 0
  let st = 0
  let bc = 0
  let bt = 0
  for (const fc of Object.values(inventory ?? {})) {
    for (const h of Object.values(fc.s ?? {})) {
      st++
      if (h > 0) sc++
    }
    for (const arms of Object.values(fc.b ?? {})) {
      for (const h of arms) {
        bt++
        if (h > 0) bc++
      }
    }
  }
  return {
    statements: st ? (sc / st) * 100 : null,
    branches: bt ? (bc / bt) * 100 : null,
  }
}

export function collectSignals({ layers, inventory, readSource, baseline, enumerate }) {
  const out = []
  const guard = (fn) => {
    try {
      fn()
    } catch {
      // Signals are advisory: a failure to compute one never blocks anything.
    }
  }
  const countCache = new Map()
  const countsOf = (file) => {
    if (!countCache.has(file)) {
      let counts = null
      try {
        counts = enumerate ? enumerate(file, readSource(file)) : null
      } catch {
        counts = null
      }
      countCache.set(file, counts)
    }
    return countCache.get(file)
  }

  for (const name of LAYER_NAMES) {
    const data = layers?.[name] ?? {}
    const files = Object.keys(data).sort()
    guard(() => {
      const values = new Set()
      let statementCount = 0
      for (const file of files) {
        for (const h of Object.values(data[file].s ?? {})) {
          statementCount++
          values.add(h)
        }
      }
      const fullyFlat = statementCount > 0 && values.size === 1
      if (statementCount > 0 && !fullyFlat && !values.has(0)) {
        out.push(
          formatSignal({
            pattern: 'no-zero-hit-statements',
            layer: name,
            detail: `none of its ${statementCount} statements has a zero hit count`,
          })
        )
      }
    })
    for (const file of files) {
      const fc = data[file]
      const rel = relativeSrcPath(file)
      guard(() => {
        const hits = Object.values(fc.s ?? {})
        if (hits.length >= 5 && new Set(hits).size === 1 && hits[0] > 0) {
          out.push(
            formatSignal({
              pattern: 'uniform-hit-counts',
              layer: name,
              file: rel,
              detail: `all ${hits.length} statements have hit count ${hits[0]}`,
            })
          )
        }
      })
      guard(() => {
        if (Object.keys(fc.fnMap ?? {}).length === 0) {
          const counts = countsOf(file)
          if (counts && counts.functions > 0) {
            out.push(
              formatSignal({
                pattern: 'empty-fn-map',
                layer: name,
                file: rel,
                detail: `no function data, but the source has ${counts.functions} function(s)`,
              })
            )
          }
        }
        if (Object.keys(fc.branchMap ?? {}).length === 0) {
          const counts = countsOf(file)
          if (counts && counts.branches > 0) {
            out.push(
              formatSignal({
                pattern: 'empty-branch-map',
                layer: name,
                file: rel,
                detail: `no branch data, but the source has ${counts.branches} conditional(s)`,
              })
            )
          }
        }
      })
      guard(() => {
        const inv = inventory?.[file]
        if (!inv) return
        const layerCount = Object.keys(fc.statementMap ?? {}).length
        const invCount = Object.keys(inv.statementMap ?? {}).length
        const allowed = invCount + Math.max(2, Math.ceil(0.1 * invCount))
        if (layerCount > allowed) {
          out.push(
            formatSignal({
              pattern: 'statement-excess',
              layer: name,
              file: rel,
              detail: `${layerCount} statements vs ${invCount} in the inventory (allowed ${allowed})`,
            })
          )
        }
      })
    }
  }

  guard(() => {
    if (!baseline) return
    const current = inventoryPercentages(inventory)
    for (const [key, label] of [
      ['statements', 'statements'],
      ['branches', 'branches'],
    ]) {
      const now = current[key]
      if (now === null || typeof baseline[key] !== 'number') continue
      if (Math.round(Math.abs(now - baseline[key]) * 100) / 100 > 2) {
        out.push(
          formatSignal({
            pattern: 'coverage-movement',
            detail:
              `${label} moved from ${baseline[key].toFixed(2)}% (last ${baseline.method} report) to ` +
              `${now.toFixed(2)}% (more than 2 points) - check whether the diff changes tests or tooling`,
          })
        )
      }
    }
  })
  return out
}

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

const pctText = (covered, total) => (total > 0 ? `${((covered / total) * 100).toFixed(2)}%` : 'n/a')

export function buildLayerSummaryLines(layers) {
  return LAYER_NAMES.filter((name) => name in layers).map((name) => {
    let sc = 0
    let st = 0
    let bc = 0
    let bt = 0
    for (const fc of Object.values(layers[name])) {
      for (const h of Object.values(fc.s ?? {})) {
        st++
        if (h > 0) sc++
      }
      for (const arms of Object.values(fc.b ?? {})) {
        for (const h of arms) {
          bt++
          if (h > 0) bc++
        }
      }
    }
    return (
      `Coverage layer: ${name} statements ${sc}/${st} (${pctText(sc, st)}) ` +
      `branches ${bc}/${bt} (${pctText(bc, bt)})`
    )
  })
}

export function buildReconciliationSummary(reconciliation, { diskFileCount, inventoryFileCount }) {
  const lines = ARTEFACT_CLASSES.map(
    (c) => `Coverage reconciliation: class ${c.id}: ${reconciliation.classes[c.id]?.total ?? 0}`
  )
  lines.push(`Coverage reconciliation: unclassified: ${reconciliation.unclassified.length}`)
  lines.push(`Coverage reconciliation: source files on disk: ${diskFileCount}`)
  lines.push(`Coverage reconciliation: files in the inventory: ${inventoryFileCount}`)
  return lines
}

export function formatUnclassifiedLine({ file, line, kind, layer }) {
  return `Unclassified secondary-only item: ${relativeSrcPath(file)}:${line} ${kind} (${layer})`
}

// The two output-contract lines, statements first, then branches. Never a 0/0 line.
export function formatCombinedLines(totals) {
  const { statements, branches } = totals
  if (statements.total === 0)
    throw new Error('Cannot print combined coverage: statement total is zero (0/0)')
  if (branches.total === 0)
    throw new Error('Cannot print combined branch coverage: branch total is zero (0/0)')
  const pct = (c) => c.toFixed(2)
  return [
    `Combined coverage: ${pct((statements.covered / statements.total) * 100)}% (${statements.covered}/${statements.total} statements)`,
    `Combined branch coverage: ${pct((branches.covered / branches.total) * 100)}% (${branches.covered}/${branches.total} branches)`,
  ]
}

function formatCheckLine({ id, name, ok, message }) {
  return ok
    ? `Coverage check ${id}: ok - ${name}`
    : `Coverage check ${id}: FAILED - ${name}: ${message}`
}

// ---------------------------------------------------------------------------
// analyzeCoverage: everything after the layers have produced coverage-final.json
// ---------------------------------------------------------------------------

const ZERO_TOTALS = {
  statements: { covered: 0, total: 0 },
  branches: { covered: 0, total: 0 },
  functions: { covered: 0, total: 0 },
}

export function analyzeCoverage({ layers, diskFiles, readSource, enumerate, baseline }) {
  const scoped = {}
  for (const name of LAYER_NAMES) scoped[name] = scopeToInScope(layers[name] ?? {})

  const disk = [...new Set(diskFiles)].filter((f) => !isExcluded(relativeSrcPath(f))).sort()
  const safeRead = (file) => {
    try {
      const text = readSource(file)
      return typeof text === 'string' ? text : undefined
    } catch {
      return undefined
    }
  }

  // Disk enumeration decides which files count: a file no primary layer reports is inserted
  // with every statement at 0 hits (an unparseable one stays missing and fails check 3).
  const reported = new Set(
    [scoped.unit, scoped.storybook].flatMap((l) => Object.keys(l).map(relativeSrcPath))
  )
  const diskZero = {}
  const enumerateErrors = []
  for (const file of disk) {
    if (reported.has(relativeSrcPath(file))) continue
    try {
      const text = readSource(file)
      const fc = enumerate(file, text)
      diskZero[file] = {
        path: file,
        statementMap: fc.statementMap,
        fnMap: fc.fnMap,
        branchMap: fc.branchMap,
        s: fc.s,
        f: fc.f,
        b: fc.b,
      }
    } catch (error) {
      enumerateErrors.push({ file, message: error.message })
    }
  }

  const primary = [scoped.unit, scoped.storybook]
  if (Object.keys(diskZero).length) primary.push(diskZero)
  const input = {
    primary,
    secondary: [scoped.bdd, scoped.e2e],
    secondaryNames: ['bdd', 'e2e'],
    readSource,
  }

  let result
  let combineError = null
  try {
    result = combineCoverage(input)
  } catch (error) {
    combineError = error
    result = {
      data: {},
      totals: structuredClone(ZERO_TOTALS),
      reconciliation: { classes: {}, unclassified: [] },
    }
  }

  const sites = findCalibrationSites(
    disk
      .map((file) => ({ path: file, text: safeRead(file) }))
      .filter((f) => typeof f.text === 'string')
  )

  const checks = []
  const check = (id, name, fn) => {
    try {
      if (combineError && id !== 1) throw combineError
      fn()
      checks.push({ id, name, ok: true, message: '' })
    } catch (error) {
      checks.push({ id, name, ok: false, message: error.message })
    }
  }
  check(1, 'all four layers loaded and the e2e layer has real hit data', () =>
    assertE2eLayerIsReal(scoped.e2e)
  )
  check(2, 'combined statement and branch totals are non-zero', () =>
    assertTotalsNonZero(result.totals)
  )
  check(3, 'the inventory covers every in-scope source file on disk', () => {
    try {
      assertUniverseComplete(
        Object.keys(result.data).map(relativeSrcPath),
        disk.map(relativeSrcPath)
      )
    } catch (error) {
      const parse = enumerateErrors.map(
        (e) =>
          `${relativeSrcPath(e.file)} could not be parsed for zero-hit enumeration (${e.message})`
      )
      throw new Error([error.message, ...parse].join('; '))
    }
  })
  check(4, 'no unclassified secondary-only items', () =>
    assertNoUnclassified(result.reconciliation)
  )
  check(5, 'no statement on a blank, comment or markup line (inventory and e2e)', () => {
    assertNoStatementOnNonCode(result.data, readSource, 'inventory')
    assertE2eTemplateParity(scoped.e2e, scoped.unit, readSource)
  })
  check(6, 'de-duplication effective and inventory keys unique', () => {
    assertDedupeEffective(input, result)
    assertInventoryKeysUnique(result.data)
  })
  check(7, 'the calibration statement is at 0 hits in every layer and the inventory', () =>
    checkCalibration({ layers: scoped, inventory: result.data, sites })
  )
  check(8, 'the merge is deterministic (layer order does not change the result)', () =>
    checkDeterminism(input)
  )

  let signals = []
  try {
    signals = collectSignals({
      layers: scoped,
      inventory: result.data,
      readSource,
      baseline,
      enumerate,
    })
  } catch {
    signals = []
  }

  const failed = checks.some((c) => !c.ok)
  const lines = [
    ...buildLayerSummaryLines(scoped),
    ...buildReconciliationSummary(result.reconciliation, {
      diskFileCount: disk.length,
      inventoryFileCount: Object.keys(result.data).length,
    }),
    ...result.reconciliation.unclassified.map(formatUnclassifiedLine),
    ...checks.map(formatCheckLine),
    ...signals,
  ]
  if (!failed) lines.push(...formatCombinedLines(result.totals))

  return { result, checks, signals, lines, failed }
}
