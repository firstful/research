// Data shapes mirroring the generated computed.json / frontier.json.

export interface BenchmarkScores {
  [bench: string]: number | null | undefined
}

export interface ImputedBench {
  mean: number
  lo: number
  hi: number
}

export interface ModelRow {
  name: string
  family: string
  released: string | null
  period: string | null
  params_b: number
  active_params_b: number
  arch: string
  quant: string
  model_gb: number
  kv_gb: number
  tool: string
  tool_mult: number
  source: string
  reliq: number
  y: number
  cov: number
  ci_lo: number | null
  ci_hi: number | null
  reliq_sd: number
  S: number
  comfort: number
  sat_tj: number
  vram: number
  t_s: number
  tj: number
  scores: BenchmarkScores
  imputed: Record<string, ImputedBench | undefined>
}

export interface ReferenceConfig {
  name: string
  mem_bw_gbs: number
  tdp_w: number
  bw_util: number
  load_w_frac: number
  vram_budget_gb: number
  overhead_gb: number
  tj_ref: number
}

export interface LandscapeConfig {
  reference: ReferenceConfig
  weights: Record<string, number>
  ref_scores: Record<string, number>
  missing_credit: number
}

export interface ComputedData {
  generated_at: string
  config: LandscapeConfig
  rows: ModelRow[]
}

export interface FrontierModel {
  name: string
  released: string
  reliq: number
  S: number
  ci_lo: number | null
  ci_hi: number | null
  cov: number
  vram: number
  t_s: number
  tj: number
  tool: string
  scores?: BenchmarkScores
}

export interface FrontierPeriod {
  color: string
  x: number[]
  y: number[]
  models: FrontierModel[]
}

export interface FrontierData {
  [period: string]: FrontierPeriod
}

export interface NotesFile {
  path: string
  name: string
  ext: string
  size: number
}

export interface NotesIndex {
  count: number
  files: NotesFile[]
}
