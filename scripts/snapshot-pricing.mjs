#!/usr/bin/env node
/**
 * snapshot-pricing.mjs — refresh current prices for the series tracked in
 * src/data/pricing.json from the OpenRouter model API (read-only).
 *
 * Usage:  node scripts/snapshot-pricing.mjs [--json]
 *
 * Prints, per api series with an or_id: current input/output/cache-read prices,
 * the OpenRouter created date (launch anchor), and volume overrides. Review the
 * output, then append/update segments in src/data/pricing.json by hand and bump
 * "updated" — the "documented" guarantee lives in the review step, not the tool.
 *
 * --json emits the raw rows for scripting.
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const data = JSON.parse(readFileSync(join(HERE, '..', 'src', 'data', 'pricing.json'), 'utf8'))
const asJson = process.argv.includes('--json')

const res = await fetch('https://openrouter.ai/api/v1/models', {
  headers: { 'user-agent': 'rook-ops-research' },
})
if (!res.ok) {
  console.error(`OpenRouter API ${res.status}: ${await res.text().catch(() => '')}`)
  process.exit(1)
}
const models = (await res.json()).data
const byId = new Map(models.map((m) => [m.id, m]))

const rows = []
for (const s of data.api) {
  if (!s.or_id) continue
  const m = byId.get(s.or_id)
  if (!m) {
    rows.push({ id: s.id, or_id: s.or_id, missing: true })
    continue
  }
  const p = m.pricing ?? {}
  rows.push({
    id: s.id,
    or_id: s.or_id,
    since: new Date((m.created ?? 0) * 1000).toISOString().slice(0, 10),
    in: (parseFloat(p.prompt ?? '0') || 0) * 1e6,
    out: (parseFloat(p.completion ?? '0') || 0) * 1e6,
    cache: (parseFloat(p.input_cache_read ?? '0') || 0) * 1e6,
    overrides: p.overrides ?? [],
    ctx: m.context_length,
  })
}

if (asJson) {
  console.log(JSON.stringify(rows, null, 2))
} else {
  console.log(`OpenRouter snapshot ${new Date().toISOString().slice(0, 10)} — compare with pricing.json "updated"\n`)
  for (const r of rows) {
    if (r.missing) {
      console.log(`${r.id.padEnd(22)} ${r.or_id.padEnd(38)} MISSING from OpenRouter`)
      continue
    }
    console.log(
      `${r.id.padEnd(22)} ${r.or_id.padEnd(38)} since=${r.since}  in=$${r.in.toFixed(4).replace(/0+$/, '')}  out=$${r.out.toFixed(4).replace(/0+$/, '')}  cache=$${r.cache.toFixed(6).replace(/0+$/, '')}  ctx=${r.ctx}${r.overrides.length ? `  overrides=${JSON.stringify(r.overrides)}` : ''}`,
    )
  }
}
