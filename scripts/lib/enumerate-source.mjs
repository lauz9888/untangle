// Zero-hit enumeration of a source file's statements, functions and branches, for
// scripts/lib/coverage-merge.mjs's disk-enumeration step (a file no test imports must
// still appear in the inventory with every statement at 0 hits). Kept out of
// coverage-merge.mjs so that file stays dependency-free. See
// docs/adr/0009-coverage-method-v3-calibration-and-class-reconciliation.md.
//
// Approximate by design: the TypeScript AST and the coverage providers' ASTs disagree on
// some corner cases, so an untested file's denominator is an approximation. The aim is
// presence at 0 hits, not exact provider parity. For `.vue` files only the `<script>` and
// `<script setup>` blocks are enumerated: template-derived items depend on the SFC compile
// output and are not reproduced here (this lowers the figure rather than raising it).

import { createRequire } from 'node:module'

// Loaded lazily (and synchronously) on first use: `typescript` and `vue/compiler-sfc` cost
// ~0.5s to load, which a run that enumerates nothing should not pay.
const require = createRequire(import.meta.url)
let tsModule
let sfcModule
const getTs = () => (tsModule ??= require('typescript'))
const getSfc = () => (sfcModule ??= require('vue/compiler-sfc'))

let statementKinds
function getStatementKinds(ts) {
  return (statementKinds ??= new Set([
    ts.SyntaxKind.ExpressionStatement,
    ts.SyntaxKind.VariableStatement,
    ts.SyntaxKind.ReturnStatement,
    ts.SyntaxKind.IfStatement,
    ts.SyntaxKind.ForStatement,
    ts.SyntaxKind.ForInStatement,
    ts.SyntaxKind.ForOfStatement,
    ts.SyntaxKind.WhileStatement,
    ts.SyntaxKind.DoStatement,
    ts.SyntaxKind.SwitchStatement,
    ts.SyntaxKind.ThrowStatement,
    ts.SyntaxKind.TryStatement,
    ts.SyntaxKind.BreakStatement,
    ts.SyntaxKind.ContinueStatement,
  ]))
}

let logicalOperators
function getLogicalOperators(ts) {
  return (logicalOperators ??= new Set([
    ts.SyntaxKind.AmpersandAmpersandToken,
    ts.SyntaxKind.BarBarToken,
    ts.SyntaxKind.QuestionQuestionToken,
  ]))
}

function isDeclare(ts, node) {
  return (ts.getModifiers?.(node) ?? node.modifiers ?? []).some(
    (m) => m.kind === ts.SyntaxKind.DeclareKeyword
  )
}

function isFunctionLike(ts, node) {
  switch (node.kind) {
    case ts.SyntaxKind.FunctionDeclaration:
    case ts.SyntaxKind.MethodDeclaration:
    case ts.SyntaxKind.Constructor:
    case ts.SyntaxKind.GetAccessor:
    case ts.SyntaxKind.SetAccessor:
      return node.body !== undefined
    case ts.SyntaxKind.FunctionExpression:
    case ts.SyntaxKind.ArrowFunction:
      return true
    default:
      return false
  }
}

function syntaxErrors(ts, filePath, text) {
  const out = ts.transpileModule(text, {
    fileName: filePath.replace(/\.vue$/, '.ts'),
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
  })
  return (out.diagnostics ?? []).map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))
}

// Walks one script text; appends Istanbul-shaped items to `acc`, with lines shifted by
// `lineOffset` (the script block's position inside a .vue file).
function collect(filePath, text, lineOffset, acc) {
  const ts = getTs()
  const statementKindSet = getStatementKinds(ts)
  const logicalOps = getLogicalOperators(ts)
  const errors = syntaxErrors(ts, filePath, text)
  if (errors.length) {
    throw new Error(`Cannot parse ${filePath} to enumerate its statements: ${errors[0]}`)
  }
  const sf = ts.createSourceFile(
    filePath.replace(/\.vue$/, '.ts'),
    text,
    ts.ScriptTarget.ESNext,
    true
  )
  const locOf = (node) => {
    const start = sf.getLineAndCharacterOfPosition(node.getStart(sf))
    const end = sf.getLineAndCharacterOfPosition(node.getEnd())
    return {
      start: { line: start.line + 1 + lineOffset, column: start.character },
      end: { line: end.line + 1 + lineOffset, column: end.character },
    }
  }
  const visit = (node) => {
    if (statementKindSet.has(node.kind) && !isDeclare(ts, node)) {
      acc.statements.push(locOf(node))
    }
    if (isFunctionLike(ts, node)) {
      const l = locOf(node)
      acc.functions.push({ name: node.name?.getText(sf) ?? '(anonymous)', loc: l })
    }
    if (node.kind === ts.SyntaxKind.IfStatement) {
      acc.branches.push({ type: 'if', arms: 2, loc: locOf(node) })
    } else if (node.kind === ts.SyntaxKind.ConditionalExpression) {
      acc.branches.push({ type: 'cond-expr', arms: 2, loc: locOf(node) })
    } else if (
      node.kind === ts.SyntaxKind.BinaryExpression &&
      logicalOps.has(node.operatorToken.kind)
    ) {
      acc.branches.push({ type: 'binary-expr', arms: 2, loc: locOf(node) })
    } else if (node.kind === ts.SyntaxKind.SwitchStatement) {
      acc.branches.push({
        type: 'switch',
        arms: node.caseBlock.clauses.length,
        loc: locOf(node),
      })
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
}

function enumerate(filePath, sourceText) {
  const acc = { statements: [], functions: [], branches: [] }
  if (filePath.endsWith('.vue')) {
    const { descriptor, errors } = getSfc().parse(sourceText, { filename: filePath })
    if (errors.length) {
      throw new Error(`Cannot parse ${filePath} to enumerate its statements: ${errors[0].message}`)
    }
    for (const block of [descriptor.script, descriptor.scriptSetup]) {
      if (block) collect(filePath, block.content, block.loc.start.line - 1, acc)
    }
  } else {
    collect(filePath, sourceText, 0, acc)
  }
  return acc
}

export function enumerateZeroHitCoverage(filePath, sourceText) {
  const { statements, functions, branches } = enumerate(filePath, sourceText)
  const fc = { path: filePath, statementMap: {}, fnMap: {}, branchMap: {}, s: {}, f: {}, b: {} }
  statements.forEach((loc, i) => {
    fc.statementMap[String(i)] = loc
    fc.s[String(i)] = 0
  })
  functions.forEach((fn, i) => {
    fc.fnMap[String(i)] = { name: fn.name, decl: fn.loc, loc: fn.loc, line: fn.loc.start.line }
    fc.f[String(i)] = 0
  })
  branches.forEach((br, i) => {
    fc.branchMap[String(i)] = {
      type: br.type,
      loc: br.loc,
      locations: Array.from({ length: br.arms }, () => br.loc),
      line: br.loc.start.line,
    }
    fc.b[String(i)] = Array.from({ length: br.arms }, () => 0)
  })
  return fc
}

// Number of functions and branch constructs in the file's script (used by the
// empty-fnMap / empty-branchMap signals).
export function countFunctionsAndBranches(filePath, sourceText) {
  const { functions, branches } = enumerate(filePath, sourceText)
  return { functions: functions.length, branches: branches.length }
}
