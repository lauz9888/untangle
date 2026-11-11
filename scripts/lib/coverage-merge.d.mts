// Hand-written declarations for coverage-merge.mjs so unit tests can import it
// under strict TypeScript without `allowJs`.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FileCoverageData = any
export type LayerData = Record<string, FileCoverageData>

export interface CoverageTotals {
  statements: { covered: number; total: number }
  branches: { covered: number; total: number }
  functions: { covered: number; total: number }
}

export interface IgnoredTally {
  statements: number
  branches: number
  functions: number
}

export interface CombineResult {
  data: LayerData
  totals: CoverageTotals
  ignored: { bdd: IgnoredTally; e2e: IgnoredTally } & Record<string, IgnoredTally>
}

export const UNIVERSE_EXCLUDES: string[]
export const PRIMARY_LAYERS: string[]
export const SECONDARY_LAYERS: string[]

export function normalizeCoverageKeys(data: LayerData): LayerData
export function scopeToOwnSource(data: LayerData): LayerData
export function loadLayers(
  coverageDir: string
): Record<'unit' | 'bdd' | 'e2e' | 'storybook', LayerData>
export function combineCoverage(input: {
  primary: LayerData[]
  secondary: LayerData[]
}): CombineResult
export function assertE2eLayerIsReal(data: LayerData): void
export function assertUniverseComplete(universeFiles: string[], diskFiles: string[]): void
export function assertDedupeEffective(
  layers: { primary: LayerData[]; secondary: LayerData[] },
  result: { data: LayerData; totals: CoverageTotals }
): void
export function assertE2eTemplateParity(
  e2eData: LayerData,
  unitData: LayerData,
  readSource: (filePath: string) => string
): void
