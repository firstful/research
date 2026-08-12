#!/usr/bin/env node
/**
 * gen-data.mjs — port of vi.py's compute pipeline → static JSON for the site.
 *
 * Reads: scripts/landscape.json, scripts/reliq_posterior.json, scripts/frontier.json
 *        (drop fresh copies there to regenerate; gitignored)
 * Also scans public/research + public/views to build index files.
 *
 * Writes:
 *   src/data/computed.json  — every model: raw landscape fields + computed
 *                             RelIQ (posterior mean), 90% CI, coverage, Y,
 *                             Serveability, VRAM, tok/s, T/J, benchmark scores,
 *                             imputed benchmark estimates (posterior)
 *   src/data/frontier.json  — per half-year cumulative Pareto frontier curves
 *                             (faithful copy of what vi.py shipped)
 *   src/data/notes-index.json, src/data/views-index.json
 *
 * Verification: every frontier model's computed S/vram/t_s/tj/reliq must match
 * the shipped frontier values (within rounding) — otherwise the port is wrong
 * and the script exits non-zero.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')

// --- vi.py constants (must match) ---
const QP = { FP16: 2.0, Q8_0: 1.06, Q6_K: 0.81, Q5_K_M: 0.69, Q4_K_M: 0.62, Q4_0: 0.56, Q3_K_M: 0.47, IQ2_M: 0.43, IQ1_M: 0.26 }
const TOOL_MULT = { clean: 1.0, garbled: 0.4, refused: 0.3, hallucinated: 0.2 }

const landscape = JSON.parse(readFileSync(join(HERE, 'landscape.json'), 'utf8'))
const posterior = JSON.parse(readFileSync(join(HERE, 'reliq_posterior.json'), 'utf8'))
const frontier = JSON.parse(readFileSync(join(HERE, 'frontier.json'), 'utf8'))

const cfg = landscape.config
const ref = cfg.reference

function halfyear(released) {
  if (!released) return null
  const d = new Date(released + 'T00:00:00Z')
  if (isNaN(d)) return null
  return `${d.getUTCFullYear()}H${d.getUTCMonth() < 6 ? '1' : '2'}`
}

function bytesPerTokenGb(m) {
  const bpw = QP[m.quant] ?? 0.62
  return (m.active_params_b ?? m.params_b) * bpw
}

function serveability(m) {
  const modelGb = m.model_gb ?? (QP[m.quant] ?? 0.62) * m.params_b
  const kvGb = m.kv_gb ?? 0.09 * m.params_b
  const vram = modelGb + kvGb + ref.overhead_gb
  const comfort = Math.min(1.0, ref.vram_budget_gb / vram)
  const t_s = ref.bw_util * ref.mem_bw_gbs / bytesPerTokenGb(m)
  const tj = t_s / (ref.load_w_frac * ref.tdp_w)
  const sat = 1 - Math.exp(-tj / ref.tj_ref)
  return { S: 0.65 * comfort + 0.35 * sat, comfort, sat_tj: sat, t_s, tj, vram_gb: vram }
}

// --- compute rows (mirrors vi.py compute_rows) ---
const rows = []
for (const m of landscape.models) {
  const scores = m.scores ?? {}
  if (!Object.values(scores).some((v) => v !== null && v !== undefined)) continue
  const toolMult = TOOL_MULT[m.tool] ?? 1.0
  const s = serveability(m)
  const p = posterior.models?.[m.name]
  let row
  if (p && !p.prior_only) {
    row = {
      name: m.name, family: m.family, released: m.released ?? null,
      period: halfyear(m.released),
      params_b: m.params_b, active_params_b: m.active_params_b ?? m.params_b,
      arch: m.arch, quant: m.quant, model_gb: m.model_gb, kv_gb: m.kv_gb,
      tool: m.tool ?? 'unknown', tool_mult: p.tool_mult ?? toolMult, source: m.source,
      reliq: p.reliq_mean, y: p.y_mean, cov: p.cov,
      ci_lo: p.y_lo, ci_hi: p.y_hi, reliq_sd: p.reliq_sd,
      S: s.S, comfort: s.comfort, sat_tj: s.sat_tj,
      vram: s.vram_gb, t_s: s.t_s, tj: s.tj,
      scores: Object.fromEntries(Object.entries(scores).filter(([, v]) => v !== null && v !== undefined)),
      imputed: p.imputed ?? {},
    }
  } else {
    throw new Error(`model without posterior entry: ${m.name} (${m.tool})`)
  }
  if (row.S > 0 && row.period) rows.push(row)
}
rows.sort((a, b) => (a.period < b.period ? -1 : a.period > b.period ? 1 : b.reliq - a.reliq))

// --- verification against shipped frontier data ---
const shipped = new Map()
for (const [k, v] of Object.entries(frontier)) {
  if (!k.startsWith('20')) continue
  for (const mo of v.models) shipped.set(mo.name, mo)
}
let checked = 0
let bad = 0
for (const r of rows) {
  const f = shipped.get(r.name)
  if (!f) continue
  checked++
  const errs = []
  if (Math.abs(r.S - f.S) > 0.011) errs.push(`S ${r.S.toFixed(2)} vs ${f.S}`)
  if (Math.abs(r.vram - f.vram) > 0.11) errs.push(`vram ${r.vram.toFixed(1)} vs ${f.vram}`)
  if (Math.abs(r.t_s - f.t_s) > 1.1) errs.push(`t_s ${r.t_s.toFixed(0)} vs ${f.t_s}`)
  if (Math.abs(r.tj - f.tj) > 0.011) errs.push(`tj ${r.tj.toFixed(2)} vs ${f.tj}`)
  if (Math.abs(r.reliq - f.reliq) > 0.11) errs.push(`reliq ${r.reliq.toFixed(1)} vs ${f.reliq}`)
  if (errs.length) { bad++; console.error(`MISMATCH ${r.name}: ${errs.join('; ')}`) }
}
console.log(`verify: ${checked} frontier models checked, ${bad} mismatches`)
if (bad) process.exit(1)

// --- write computed.json ---
writeFileSync(
  join(ROOT, 'src/data/computed.json'),
  JSON.stringify({ generated_at: new Date().toISOString(), config: cfg, rows }, null, 1),
)

// --- write frontier.json (site copy, same content as shipped) ---
writeFileSync(join(ROOT, 'src/data/frontier.json'), JSON.stringify(frontier, null, 1))

// --- notes index ---
function scanDir(dir, base) {
  const out = []
  for (const f of readdirSync(dir).sort()) {
    const full = join(dir, f)
    const st = statSync(full)
    if (st.isDirectory()) {
      out.push(...scanDir(full, join(base, f)))
    } else {
      const ext = f.includes('.') ? f.slice(f.lastIndexOf('.') + 1).toLowerCase() : ''
      out.push({ path: join(base, f).replace(/\\/g, '/'), name: f, ext, size: st.size })
    }
  }
  return out
}
const notes = scanDir(join(ROOT, 'public/research'), 'research')
writeFileSync(join(ROOT, 'src/data/notes-index.json'), JSON.stringify({ count: notes.length, files: notes }, null, 1))

const views = scanDir(join(ROOT, 'public/views'), 'views')
writeFileSync(join(ROOT, 'src/data/views-index.json'), JSON.stringify({ count: views.length, files: views }, null, 1))

console.log(`rows: ${rows.length} | periods: ${[...new Set(rows.map((r) => r.period))].join(', ')} | notes: ${notes.length} | views: ${views.length}`)
