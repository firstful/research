#!/usr/bin/env node
/**
 * validate-pricing.mjs — structure/consistency gate for src/data/pricing.json.
 * Runs as `prebuild` (npm run build → validate first). Exits non-zero on any
 * violation so bad data can never ship to the site.
 *
 * Checks:
 *  - ids unique (api + subscriptions)
 *  - dates parse as YYYY-MM-DD; until >= since; horizon covers all segments
 *  - exact segments carry in/out > 0; range segments carry lo/hi with 0 < lo <= hi
 *  - conf in {documented, range, inferred}; source present
 *  - range_kind required for range segments; cache_hit > 0 when present
 *  - subscriptions: monthly > 0
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const data = JSON.parse(readFileSync(join(HERE, '..', 'src', 'data', 'pricing.json'), 'utf8'))

const errors = []
const ok = (cond, msg) => {
  if (!cond) errors.push(msg)
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
function checkDate(d, what) {
  ok(typeof d === 'string' && DATE_RE.test(d) && !Number.isNaN(Date.parse(d + 'T00:00:00Z')), `${what}: bad date "${d}"`)
}

checkDate(data.updated, 'updated')
checkDate(data.horizon, 'horizon')
const horizonMs = Date.parse(data.horizon + 'T00:00:00Z')

// --- api series ---
const seen = new Set()
for (const s of data.api) {
  ok(typeof s.id === 'string' && s.id.length > 0, 'series with missing id')
  ok(!seen.has(s.id), `duplicate api id: ${s.id}`)
  seen.add(s.id)
  ok(s.segments?.length > 0, `${s.id}: no segments`)
  for (const seg of s.segments) {
    checkDate(seg.since, `${s.id}.since`)
    if (seg.until) {
      checkDate(seg.until, `${s.id}.until`)
      ok(Date.parse(seg.until + 'T00:00:00Z') >= Date.parse(seg.since + 'T00:00:00Z'), `${s.id}: until < since`)
    }
    ok(['documented', 'range', 'inferred'].includes(seg.conf), `${s.id}: bad conf "${seg.conf}"`)
    ok(typeof seg.source === 'string' && seg.source.length > 5, `${s.id}: source missing/too short`)
    const isRange = seg.in_lo !== undefined || seg.in_hi !== undefined || seg.out_lo !== undefined || seg.out_hi !== undefined
    if (isRange) {
      ok(seg.in_lo !== undefined && seg.in_hi !== undefined && seg.out_lo !== undefined && seg.out_hi !== undefined,
        `${s.id} ${seg.since}: range segment must carry all of in_lo/in_hi/out_lo/out_hi`)
      ok(seg.in_lo > 0 && seg.in_hi >= seg.in_lo && seg.out_lo > 0 && seg.out_hi >= seg.out_lo,
        `${s.id} ${seg.since}: range must satisfy 0 < lo <= hi`)
      ok(typeof seg.range_kind === 'string' && seg.range_kind.length > 0, `${s.id} ${seg.since}: range_kind required`)
    } else {
      ok(seg.in !== undefined && seg.out !== undefined && seg.in > 0 && seg.out > 0,
        `${s.id} ${seg.since}: exact segment must carry in/out > 0`)
    }
    if (seg.cache_hit !== undefined) ok(seg.cache_hit > 0, `${s.id} ${seg.since}: cache_hit must be > 0`)
    if (seg.status !== undefined) ok(seg.status === 'announced', `${s.id} ${seg.since}: bad status`)
    ok(Date.parse(seg.since + 'T00:00:00Z') <= horizonMs, `${s.id} ${seg.since}: since beyond horizon`)
  }
}

// --- subscriptions ---
const subSeen = new Set()
for (const s of data.subscriptions ?? []) {
  ok(typeof s.id === 'string' && s.id.length > 0, 'subscription with missing id')
  ok(!subSeen.has(s.id), `duplicate subscription id: ${s.id}`)
  subSeen.add(s.id)
  for (const seg of s.segments) {
    checkDate(seg.since, `${s.id}.since`)
    if (seg.until) {
      checkDate(seg.until, `${s.id}.until`)
      ok(Date.parse(seg.until + 'T00:00:00Z') >= Date.parse(seg.since + 'T00:00:00Z'), `${s.id}: until < since`)
    }
    ok(['documented', 'range', 'inferred'].includes(seg.conf), `${s.id}: bad conf "${seg.conf}"`)
    ok(typeof seg.source === 'string' && seg.source.length > 5, `${s.id}: source missing`)
    ok(typeof seg.monthly === 'number' && seg.monthly > 0, `${s.id}: monthly must be > 0`)
  }
}

if (errors.length) {
  console.error(`pricing.json validation FAILED (${errors.length}):`)
  for (const e of errors) console.error('  - ' + e)
  process.exit(1)
}
console.log(`pricing.json OK — ${data.api.length} api series, ${(data.subscriptions ?? []).length} subscription series (updated ${data.updated})`)
