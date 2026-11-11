// Pure, unit-testable helpers for scripts/merge-coverage.mjs. See
// docs/adr/0007-single-statement-universe-and-istanbul-e2e-for-combined-coverage.md.
//
// All inputs/outputs are Istanbul `coverage-final.json`-shaped objects
// (`{ [path]: FileCoverageData }`).

import fs from 'node:fs'
import path from 'node:path'

// Must mirror vite.config.ts's `test.coverage.exclude`. assertUniverseComplete
// fails loudly if the two drift.
export const UNIVERSE_EXCLUDES = ['src/main.ts', 'src/**/*.stories.ts']

export const PRIMARY_LAYERS = ['unit', 'storybook']
export const SECONDARY_LAYERS = ['bdd', 'e2e']

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

// Loads all four layers from `<coverageDir>/<layer>/coverage-final.json`,
// normalised and scoped. A missing layer file throws (never silently dropped).
export function loadLayers(coverageDir) {
  const out = {}
  for (const layer of [...PRIMARY_LAYERS, ...SECONDARY_LAYERS]) {
    const file = path.join(coverageDir, layer, 'coverage-final.json')
    if (!fs.existsSync(file)) {
      throw new Error(`Missing coverage-final.json for the "${layer}" layer (${file})`)
    }
    out[layer] = scopeToOwnSource(normalizeCoverageKeys(JSON.parse(fs.readFileSync(file, 'utf8'))))
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

function safeArmCredit(type, universeArms, secondaryArms) {
  if (universeArms === secondaryArms) return true
  return type === 'if' && secondaryArms === universeArms - 1
}

export function combineCoverage({ primary, secondary }) {
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

  // Pick the template deterministically: the first primary layer (in the given
  // order) is the template source, but order must not alter totals, which only
  // depend on counts and hits. (Templates only affect emitted locations.)
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

  // Pass 3: credit secondary hits onto existing keys only.
  const ignored = {}
  const secondaryNames = ['bdd', 'e2e']
  secondary.forEach((layer, idx) => {
    const name = secondaryNames[idx] ?? `secondary${idx}`
    ignored[name] = { statements: 0, branches: 0, functions: 0 }
    for (const [file, fc] of Object.entries(layer)) {
      const u = universe.get(file)
      const items = extractItems(fc)
      for (const kind of KINDS) {
        const groups = groupItems(items[kind])
        for (const [gk, arr] of groups) {
          const slots = u?.[kind].get(gk)
          arr.forEach((item, i) => {
            const slot = slots?.[i]
            if (!slot) {
              ignored[name][kind]++
              return
            }
            if (kind === 'branches') {
              if (!safeArmCredit(item.kind, slot.hits.length, item.hits.length)) {
                ignored[name][kind]++
                return
              }
              item.hits.forEach((h, a) => {
                slot.hits[a] += h
              })
            } else {
              slot.hits[0] += item.hits[0]
            }
          })
        }
      }
    }
  })
  // Ensure ignored entries exist for the two conventional names.
  for (const name of secondaryNames) {
    ignored[name] ??= { statements: 0, branches: 0, functions: 0 }
  }

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

  return { data, totals, ignored }
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

export function assertE2eLayerIsReal(data) {
  const files = Object.values(data)
  let fns = 0
  let branches = 0
  let zeroStatements = 0
  let bigFiles = 0
  let flatFiles = 0
  for (const fc of files) {
    fns += Object.keys(fc.f ?? {}).length
    branches += Object.keys(fc.b ?? {}).length
    const hs = Object.values(fc.s ?? {})
    zeroStatements += hs.filter((h) => h === 0).length
    if (hs.length >= 5) {
      bigFiles++
      if (new Set(hs).size === 1) flatFiles++
    }
  }
  const fail = (reason) => {
    throw new Error(`e2e coverage layer looks flat/fake: ${reason}`)
  }
  if (fns === 0) fail('it has zero functions')
  if (branches === 0) fail('it has zero branches')
  if (zeroStatements === 0) fail('no statement anywhere has a zero hit count')
  if (bigFiles > 0 && flatFiles / bigFiles >= 0.5) {
    fail(
      `${flatFiles} of ${bigFiles} files with >= 5 statements are single-valued (uniform hit counts)`
    )
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

export function assertE2eTemplateParity(e2eData, unitData, readSource) {
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
    const lines = String(readSource(file)).split(/\r?\n/)
    let styleStart = -1
    let styleEnd = -1
    lines.forEach((text, i) => {
      if (styleStart < 0 && /^\s*<style\b/.test(text)) styleStart = i + 1
      if (styleStart >= 0 && styleEnd < 0 && /<\/style>/.test(text)) styleEnd = i + 1
    })
    for (const loc of Object.values(e2e.statementMap ?? {})) {
      const line = loc.start.line
      const text = (lines[line - 1] ?? '').trim()
      const inStyle =
        styleStart > 0 && line >= styleStart && line <= (styleEnd > 0 ? styleEnd : Infinity)
      const blank = text === ''
      const comment = /^(\/\/|\/\*|\*|<!--)/.test(text)
      if (inStyle || blank || comment) {
        const why = inStyle ? 'inside <style>' : blank ? 'blank line' : 'comment-only line'
        throw new Error(
          `e2e template parity failed for ${file}: statement at line ${line} is on a ${why}`
        )
      }
    }
  }
}
