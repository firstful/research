// Types + helpers for the model-pricing dataset (src/data/pricing.json).
// A series is a list of time segments; each segment is either an EXACT
// documented price (in/out) or a RANGE (in_lo..in_hi, out_lo..out_hi) when the
// price depends on a condition (peak/off-peak, prompt-length tier, reseller
// route) or is otherwise uncertain. Ranges render as thick bands; exact prices
// as thin lines.

export interface PriceSegment {
  since: string // YYYY-MM-DD
  until?: string // YYYY-MM-DD; absent = open-ended (runs to horizon)
  status?: 'announced' // future-dated price already documented (e.g. effective 08-16)
  in?: number // exact input $/1M tokens (cache miss)
  out?: number // exact output $/1M tokens
  in_lo?: number // range input low
  in_hi?: number // range input high
  out_lo?: number // range output low
  out_hi?: number // range output high
  cache_hit?: number // input cache-read $/1M tokens (table only, not charted)
  range_kind?: string // what the range depends on
  conf: 'documented' | 'range' | 'inferred'
  source: string
  note?: string
}

export interface PriceSeries {
  id: string
  label: string
  family: string
  color: string
  dashed?: boolean
  or_id?: string
  segments: PriceSegment[]
}

export interface SubSegment {
  since: string
  until?: string
  monthly: number
  conf: 'documented' | 'range' | 'inferred'
  source: string
  note?: string
}

export interface SubSeries {
  id: string
  label: string
  color: string
  segments: SubSegment[]
}

export interface PricingData {
  updated: string
  horizon: string
  notes: string[]
  api: PriceSeries[]
  subscriptions: SubSeries[]
}

export function parseDate(d: string): number {
  return new Date(d + 'T00:00:00Z').getTime()
}

export function segEndMs(seg: PriceSegment | SubSegment, horizonMs: number): number {
  return seg.until ? parseDate(seg.until) : horizonMs
}

export type PriceMode = 'in' | 'out'

export interface ExactPt {
  t: number
  v: number
  seg: PriceSegment
  series: PriceSeries
}
export interface BandPt {
  t: number
  hi: number
  lo: number
  seg: PriceSegment
  series: PriceSeries
}

export function seriesPoints(
  s: PriceSeries,
  mode: PriceMode,
  horizonMs: number,
): { exact: ExactPt[]; bands: BandPt[] } {
  const exact: ExactPt[] = []
  const bands: BandPt[] = []
  for (const seg of s.segments) {
    const t0 = parseDate(seg.since)
    const t1 = segEndMs(seg, horizonMs)
    if (mode === 'in') {
      if (seg.in !== undefined) {
        exact.push({ t: t0, v: seg.in, seg, series: s }, { t: t1, v: seg.in, seg, series: s })
      } else if (seg.in_lo !== undefined && seg.in_hi !== undefined) {
        bands.push({ t: t0, hi: seg.in_hi, lo: seg.in_lo, seg, series: s }, { t: t1, hi: seg.in_hi, lo: seg.in_lo, seg, series: s })
      }
    } else {
      if (seg.out !== undefined) {
        exact.push({ t: t0, v: seg.out, seg, series: s }, { t: t1, v: seg.out, seg, series: s })
      } else if (seg.out_lo !== undefined && seg.out_hi !== undefined) {
        bands.push({ t: t0, hi: seg.out_hi, lo: seg.out_lo, seg, series: s }, { t: t1, hi: seg.out_hi, lo: seg.out_lo, seg, series: s })
      }
    }
  }
  return { exact, bands }
}

// Log-ish domain covering every plotted value in a mode (padding to a clean decade).
export function domainFor(series: PriceSeries[], mode: PriceMode, horizonMs: number): [number, number] {
  let lo = Infinity
  let hi = -Infinity
  for (const s of series) {
    const { exact, bands } = seriesPoints(s, mode, horizonMs)
    for (const p of exact) {
      lo = Math.min(lo, p.v)
      hi = Math.max(hi, p.v)
    }
    for (const p of bands) {
      lo = Math.min(lo, p.lo)
      hi = Math.max(hi, p.hi)
    }
  }
  if (!isFinite(lo)) return [0.01, 10]
  const dlo = Math.pow(10, Math.floor(Math.log10(lo)))
  const dhi = Math.pow(10, Math.ceil(Math.log10(hi)))
  return [dlo, dhi === dlo ? dhi * 10 : dhi]
}

export function fmtPrice(v: number): string {
  if (v >= 1) return `$${v.toFixed(2).replace(/\.?0+$/, '')}`
  if (v >= 0.1) return `$${v.toFixed(2)}`
  return `$${v.toFixed(3).replace(/0+$/, '')}`
}

export function fmtPriceRange(lo: number | undefined, hi: number | undefined): string {
  if (lo === undefined || hi === undefined) return '—'
  return `${fmtPrice(lo)} – ${fmtPrice(hi)}`
}

export function fmtMonth(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' })
}

export function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

export function confBadge(conf: string): { label: string; tone: string } {
  switch (conf) {
    case 'documented':
      return { label: 'documented', tone: 'ok' }
    case 'range':
      return { label: 'range', tone: 'warn' }
    default:
      return { label: 'inferred', tone: 'mute' }
  }
}
