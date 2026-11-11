// Hand-written declarations for coverage-merge.mjs so unit tests can import it
// under strict TypeScript without `allowJs`.

// Deliberately loose: Storybook's v8 output has null end columns and sparse
// maps that istanbul-lib-coverage's FileCoverageData type rejects.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FileCoverageData = any
export type LayerData = Record<string, FileCoverageData>
export type LayerName = 'unit' | 'storybook' | 'bdd' | 'e2e'

export interface CoverageTotals {
  statements: { covered: number; total: number }
  branches: { covered: number; total: number }
  functions: { covered: number; total: number }
}

export interface UnclassifiedItem {
  file: string
  line: number
  kind: string
  layer: string
}

export interface Reconciliation {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  classes: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unclassified: any[]
}

export interface CombineResult {
  data: LayerData
  totals: CoverageTotals
  reconciliation: Reconciliation
}

export interface CombineInput {
  primary: LayerData[]
  secondary: LayerData[]
  secondaryNames?: string[]
  readSource?: (filePath: string) => string
}

export interface CalibrationSite {
  file: string
  line: number
}

export interface Baseline {
  statements: number
  branches: number
  method: string
}

export interface Check {
  id: number
  name: string
  ok: boolean
  message: string
}

export interface SourceCounts {
  functions: number
  branches: number
}

// A zero-hit Istanbul-shaped entry plus the function / branch counts of its source.
export type EnumerateFn = (
  filePath: string,
  sourceText: string
) => FileCoverageData & Partial<SourceCounts>

export const UNIVERSE_EXCLUDES: string[]
export const PRIMARY_LAYERS: string[]
export const SECONDARY_LAYERS: string[]
export const LAYER_NAMES: string[]
export const SIGNAL_PREFIX: string
export const CALIBRATION_MARKER: string
export const ARTEFACT_CLASSES: { id: string; description: string }[]

export function normalizeCoverageKeys(data: LayerData): LayerData
export function relativeSrcPath(file: string): string
export function scopeToOwnSource(data: LayerData): LayerData
export function globToRegExp(pattern: string): RegExp
export function isExcluded(relPath: string): boolean
export function scopeToInScope(data: LayerData): LayerData
export function loadLayers(coverageDir: string): Record<LayerName, LayerData>
export function vueTemplateRange(text: string): { start: number; end: number } | null
export function classifySecondaryItem(input: {
  layer: string
  kind: string
  file: string
  line: number
  hasSlot: boolean
  armRejected?: boolean
  source: {
    lineText: (line: number) => string
    template: { start: number; end: number } | null
  } | null
}): string | null
export function combineCoverage(input: CombineInput): CombineResult
export function assertE2eLayerIsReal(data: LayerData): void
export function assertUniverseComplete(universeFiles: string[], diskFiles: string[]): void
export function assertDedupeEffective(
  layers: { primary: LayerData[]; secondary: LayerData[] },
  result: { data: LayerData; totals: CoverageTotals }
): void
export function assertNoStatementOnNonCode(
  data: LayerData,
  readSource: (filePath: string) => string,
  label: string
): void
export function assertE2eTemplateParity(
  e2eData: LayerData,
  unitData: LayerData,
  readSource: (filePath: string) => string
): void
export function assertInventoryKeysUnique(data: LayerData): void
export function assertNoUnclassified(reconciliation: Reconciliation): void
export function assertTotalsNonZero(totals: CoverageTotals): void
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function findCalibrationSites(files: { path: string; text: string }[]): any[]
export function checkCalibration(input: {
  layers: Record<string, LayerData>
  inventory: LayerData
  sites: CalibrationSite[]
}): void
export function checkDeterminism(
  input: CombineInput,
  options?: { combine?: (input: CombineInput) => CombineResult }
): void
export function formatSignal(input: {
  pattern: string
  layer?: string
  file?: string
  detail?: string
}): string
export function parseBaselineFromReport(text: string): Baseline | null
export function collectSignals(input: {
  layers: Record<string, LayerData>
  inventory: LayerData
  readSource: (filePath: string) => string
  baseline: Baseline | null
  enumerate: EnumerateFn
}): string[]
export function buildLayerSummaryLines(layers: Record<string, LayerData>): string[]
export function buildReconciliationSummary(
  reconciliation: Reconciliation,
  counts: { diskFileCount: number; inventoryFileCount: number }
): string[]
export function formatUnclassifiedLine(item: UnclassifiedItem): string
export function formatCombinedLines(totals: CoverageTotals): string[]
export function analyzeCoverage(input: {
  layers: Record<string, LayerData>
  diskFiles: string[]
  readSource: (filePath: string) => string
  enumerate: EnumerateFn
  baseline: Baseline | null
}): {
  result: CombineResult
  checks: Check[]
  signals: string[]
  lines: string[]
  failed: boolean
}
