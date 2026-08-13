import { Fragment, useMemo, useState } from 'react'
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import pricing from '../data/pricing.json'
import type { PricingData, PriceSeries, SubSeries, PriceSegment, SubSegment, PriceMode } from '../lib/pricing'
import {
  parseDate, segEndMs, domainFor, fmtPrice, fmtPriceRange, fmtMonth, fmtDate, confBadge,
} from '../lib/pricing'

const data = pricing as unknown as PricingData
const HORIZON_MS = parseDate(data.horizon)
const DENSE = 24 // points per segment — keeps tooltips responsive along the whole segment

interface LinePt { t: number; v: number; seg: PriceSegment; series: PriceSeries }
interface BandPt { t: number; hi: number; lo: number; seg: PriceSegment; series: PriceSeries }
interface SubPt { t: number; v: number; seg: SubSegment; series: SubSeries }

function xDomain(): [number, number] {
  let lo = Infinity
  let hi = -Infinity
  for (const s of data.api) {
    for (const seg of s.segments) {
      lo = Math.min(lo, parseDate(seg.since))
      hi = Math.max(hi, segEndMs(seg, HORIZON_MS))
    }
  }
  for (const s of data.subscriptions) {
    for (const seg of s.segments) {
      lo = Math.min(lo, parseDate(seg.since))
      hi = Math.max(hi, segEndMs(seg, HORIZON_MS))
    }
  }
  if (!isFinite(lo)) return [Date.now() - 3.156e10, Date.now()]
  const PAD = 4 * 864e5
  return [lo - PAD, hi + PAD]
}
const XDOMAIN = xDomain()

function buildApiDisplay(s: PriceSeries, mode: PriceMode) {
  const lines: LinePt[][] = []
  const bands: BandPt[][] = []
  for (const seg of s.segments) {
    const t0 = parseDate(seg.since)
    const t1 = segEndMs(seg, HORIZON_MS)
    const v = mode === 'in' ? seg.in : seg.out
    if (v !== undefined) {
      const pts: LinePt[] = []
      for (let k = 0; k <= DENSE; k++) pts.push({ t: t0 + ((t1 - t0) * k) / DENSE, v, seg, series: s })
      lines.push(pts)
    } else {
      const lo = mode === 'in' ? seg.in_lo : seg.out_lo
      const hi = mode === 'in' ? seg.in_hi : seg.out_hi
      if (lo === undefined || hi === undefined) continue
      const pts: BandPt[] = []
      for (let k = 0; k <= DENSE; k++) pts.push({ t: t0 + ((t1 - t0) * k) / DENSE, hi, lo, seg, series: s })
      bands.push(pts)
    }
  }
  return { lines, bands }
}

function ApiTip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const pt = payload[0].payload as LinePt | BandPt
  const seg = pt.seg
  const isBand = 'hi' in pt
  const badge = confBadge(seg.conf)
  const untilTxt = seg.status === 'announced' ? 'announced' : seg.until ? fmtDate(parseDate(seg.until)) : 'present'
  const price =
    isBand
      ? `in ${fmtPriceRange(seg.in_lo, seg.in_hi)} · out ${fmtPriceRange(seg.out_lo, seg.out_hi)}`
      : `in ${fmtPrice(seg.in!)} · out ${fmtPrice(seg.out!)}`
  return (
    <div className="card" style={{ padding: '10px 14px', fontSize: 12.5, maxWidth: 360 }}>
      <div style={{ fontWeight: 600 }}>{pt.series.label}</div>
      <div className="dim">
        {fmtDate(parseDate(seg.since))} → {untilTxt}
        {seg.range_kind ? ` · ${seg.range_kind}` : ''}
      </div>
      <div className="num">{price}</div>
      {seg.cache_hit !== undefined && <div className="dim">cache hit {fmtPrice(seg.cache_hit)}/M</div>}
      <div style={{ marginTop: 4 }}>
        <span className={`badge ${badge.tone}`}>{badge.label}</span>{' '}
        <span className="dim">{seg.source.slice(0, 120)}{seg.source.length > 120 ? '…' : ''}</span>
      </div>
      {seg.note && <div className="dim" style={{ marginTop: 2 }}>{seg.note}</div>}
    </div>
  )
}

function PriceChart({ series, mode, hidden }: { series: PriceSeries[]; mode: PriceMode; hidden: Set<string> }) {
  const visible = series.filter((s) => !hidden.has(s.id))
  const domain = useMemo(() => domainFor(series, mode, HORIZON_MS), [series, mode])
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart margin={{ top: 8, right: 16, bottom: 4, left: -4 }}>
          <CartesianGrid stroke="#1a212a" strokeDasharray="3 3" />
          <XAxis
            dataKey="t" type="number" domain={XDOMAIN} tickCount={9}
            stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'var(--mono)' }}
            tickFormatter={(ms: number) => fmtMonth(ms)}
            label={{ value: 'release / effective date', position: 'insideBottom', offset: -2, fill: '#94a3b8', fontSize: 11 }}
          />
          <YAxis
            type="number" scale="log" domain={domain} allowDataOverflow
            stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'var(--mono)' }}
            tickFormatter={(v: number) => fmtPrice(v)}
            label={{ value: 'USD per 1M tokens · log', angle: -90, position: 'insideLeft', offset: 14, fill: '#94a3b8', fontSize: 11 }}
          />
          <Tooltip content={<ApiTip />} />
          <ReferenceLine x={Date.now()} stroke="#facc15" strokeDasharray="3 3" strokeOpacity={0.6} />
          {visible.map((s) => {
            const { lines, bands } = buildApiDisplay(s, mode)
            return (
              <Fragment key={s.id}>
                {lines.map((pts, i) => (
                  <Line
                    key={`${s.id}-l${i}`}
                    data={pts} dataKey="v" type="linear"
                    stroke={s.color} strokeWidth={2}
                    strokeDasharray={s.dashed ? '6 3' : undefined}
                    dot={false} isAnimationActive={false}
                  />
                ))}
                {bands.map((pts, i) => (
                  <Area
                    key={`${s.id}-b${i}`}
                    data={pts} dataKey="hi" baseValue={pts[0].lo}
                    stroke={s.color} strokeWidth={1.5}
                    strokeDasharray={s.dashed ? '6 3' : undefined}
                    fill={s.color} fillOpacity={0.28}
                    isAnimationActive={false}
                  />
                ))}
              </Fragment>
            )
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

function SubsTip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const pt = payload[0].payload as SubPt
  const seg = pt.seg
  const badge = confBadge(seg.conf)
  const untilTxt = seg.until ? fmtDate(parseDate(seg.until)) : 'present'
  return (
    <div className="card" style={{ padding: '10px 14px', fontSize: 12.5, maxWidth: 340 }}>
      <div style={{ fontWeight: 600 }}>{pt.series.label}</div>
      <div className="dim">{fmtDate(parseDate(seg.since))} → {untilTxt}</div>
      <div className="num">${seg.monthly}/mo</div>
      <div style={{ marginTop: 4 }}>
        <span className={`badge ${badge.tone}`}>{badge.label}</span>{' '}
        <span className="dim">{seg.source.slice(0, 110)}{seg.source.length > 110 ? '…' : ''}</span>
      </div>
      {seg.note && <div className="dim" style={{ marginTop: 2 }}>{seg.note}</div>}
    </div>
  )
}

function SubsChart({ subs }: { subs: SubSeries[] }) {
  return (
    <div className="chart-wrap" style={{ height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart margin={{ top: 8, right: 16, bottom: 4, left: -4 }}>
          <CartesianGrid stroke="#1a212a" strokeDasharray="3 3" />
          <XAxis
            dataKey="t" type="number" domain={XDOMAIN} tickCount={9}
            stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'var(--mono)' }}
            tickFormatter={(ms: number) => fmtMonth(ms)}
            label={{ value: 'subscription start (or inferred) date', position: 'insideBottom', offset: -2, fill: '#94a3b8', fontSize: 11 }}
          />
          <YAxis
            type="number" domain={[0, 30]} allowDataOverflow
            stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'var(--mono)' }}
            tickFormatter={(v: number) => `$${v}`}
            label={{ value: 'USD per month', angle: -90, position: 'insideLeft', offset: 14, fill: '#94a3b8', fontSize: 11 }}
          />
          <Tooltip content={<SubsTip />} />
          <ReferenceLine x={Date.now()} stroke="#facc15" strokeDasharray="3 3" strokeOpacity={0.6} />
          {subs.map((s) => {
            const segs = s.segments.map((seg) => {
              const t0 = parseDate(seg.since)
              const t1 = segEndMs(seg, HORIZON_MS)
              const pts: SubPt[] = []
              for (let k = 0; k <= DENSE; k++) pts.push({ t: t0 + ((t1 - t0) * k) / DENSE, v: seg.monthly, seg, series: s })
              return pts
            })
            return segs.map((pts, i) => (
              <Line
                key={`${s.id}-${i}`} data={pts} dataKey="v" type="linear"
                stroke={s.color} strokeWidth={2} strokeDasharray="5 4"
                dot={false} isAnimationActive={false}
              />
            ))
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

function SegmentTable() {
  const rows: {
    model: string; since: string; until: string; inPx: string; outPx: string; cache: string; monthly: string;
    kind: string; conf: string; source: string;
  }[] = []
  for (const s of data.api) {
    for (const seg of s.segments) {
      const isBand = seg.in_lo !== undefined
      rows.push({
        model: s.label,
        since: seg.since,
        until: seg.status === 'announced' ? 'announced' : seg.until ?? 'open',
        inPx: isBand ? fmtPriceRange(seg.in_lo, seg.in_hi) : fmtPrice(seg.in!),
        outPx: isBand ? fmtPriceRange(seg.out_lo, seg.out_hi) : fmtPrice(seg.out!),
        cache: seg.cache_hit !== undefined ? fmtPrice(seg.cache_hit) : '—',
        monthly: '—',
        kind: seg.range_kind ?? '—',
        conf: seg.conf,
        source: seg.source,
      })
    }
  }
  for (const s of data.subscriptions) {
    for (const seg of s.segments) {
      rows.push({
        model: s.label,
        since: seg.since,
        until: seg.until ?? 'open',
        inPx: '—', outPx: '—', cache: '—',
        monthly: `$${seg.monthly}`,
        kind: '—',
        conf: seg.conf,
        source: seg.source,
      })
    }
  }
  return (
    <table className="data">
      <thead>
        <tr>
          <th>model</th><th>since</th><th>until</th><th>input $/M</th><th>output $/M</th>
          <th>cache $/M</th><th>monthly</th><th>kind</th><th>conf</th><th>source</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td className="mono">{r.model}</td>
            <td className="mono dim">{r.since}</td>
            <td className="mono dim">{r.until}</td>
            <td className="num">{r.inPx}</td>
            <td className="num">{r.outPx}</td>
            <td className="num dim">{r.cache}</td>
            <td className="num">{r.monthly}</td>
            <td className="dim">{r.kind}</td>
            <td><span className={`badge ${confBadge(r.conf).tone}`}>{r.conf}</span></td>
            <td className="dim" style={{ whiteSpace: 'normal', maxWidth: 380 }}>{r.source}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function Pricing() {
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const toggle = (id: string) =>
    setHidden((h) => {
      const n = new Set(h)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const allVisible = hidden.size === 0

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ margin: 0 }}>Model API pricing — history</h2>
            <div className="dim" style={{ fontSize: 12.5, marginTop: 2 }}>
              documented list prices, $ per 1M tokens · data as of {data.updated} · horizon {data.horizon}
            </div>
          </div>
          <div className="dim mono" style={{ fontSize: 11.5, textAlign: 'right' }}>
            thin line = exact list price<br />
            <span style={{ background: '#34d399', opacity: 0.35, display: 'inline-block', width: 26, height: 8, borderRadius: 2, verticalAlign: 'middle' }} /> thick band = conditional / uncertain (peak·off-peak, prompt-length tier, reseller route)<br />
            - - dashed = reseller route
          </div>
        </div>
        <div className="legend-row" style={{ marginTop: 12 }}>
          {data.api.map((s) => (
            <button
              key={s.id}
              className={`legend-chip ${!hidden.has(s.id) ? 'on' : ''}`}
              onClick={() => toggle(s.id)}
              title={s.label}
            >
              <span className="sw" style={{ background: s.color }} />
              {s.family}
            </button>
          ))}
          <button className={`legend-chip ${allVisible ? '' : ''}`} onClick={() => setHidden(new Set())} title="show all">
            reset
          </button>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: 4 }}>Input price <span className="dim mono" style={{ fontWeight: 400, fontSize: 13 }}>— cache-miss, USD / 1M tokens</span></h2>
        <div className="dim" style={{ marginBottom: 10, fontSize: 12.5 }}>
          DeepSeek's 08-16 switch to peak/off-peak billing turns its flat line into a band (off-peak low, peak high) —
          and it lands above the Qwen3.7 flash band, which widened because its price depends on prompt length.
        </div>
        <PriceChart series={data.api} mode="in" hidden={hidden} />
      </div>

      <div className="card">
        <h2 style={{ marginBottom: 4 }}>Output price <span className="dim mono" style={{ fontWeight: 400, fontSize: 13 }}>— USD / 1M tokens</span></h2>
        <div className="dim" style={{ marginBottom: 10, fontSize: 12.5 }}>
          Output is where agentic and codegen workloads burn tokens — the DeepSeek hike lands hardest here (2.4x off-peak, 4.7x peak).
        </div>
        <PriceChart series={data.api} mode="out" hidden={hidden} />
      </div>

      <div className="card">
        <h2 style={{ marginBottom: 4 }}>
          Subscriptions <span className="dim mono" style={{ fontWeight: 400, fontSize: 13 }}>— flat monthly fees, separate graph</span>
        </h2>
        <div className="dim" style={{ marginBottom: 10, fontSize: 12.5 }}>
          Less reliable than API list prices: terms change more often and value depends entirely on usage, so they are charted
          separately (dashed) and never mixed with per-token prices. Inferred start dates are flagged.
        </div>
        <SubsChart subs={data.subscriptions} />
      </div>

      <div className="card">
        <h2 style={{ marginBottom: 4 }}>All segments</h2>
        <div className="dim" style={{ marginBottom: 10, fontSize: 12.5 }}>
          every price segment in the dataset, with the documented source for each
        </div>
        <div style={{ overflowX: 'auto' }}>
          <SegmentTable />
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: 4 }}>Methodology &amp; caveats</h2>
        <div style={{ color: 'var(--text-dim)', fontSize: 13, maxWidth: 860 }}>
          <ul style={{ margin: '8px 0', paddingLeft: 18 }}>
            <li><b style={{ color: 'var(--text)' }}>Sources:</b> first-party pricing pages (api.deepseek.com, provider pages) and the OpenRouter model + endpoints API. Launch dates anchor to the model's OpenRouter <span className="mono">created</span> timestamp — close to, but not guaranteed to be, the public launch day.</li>
            <li><b style={{ color: 'var(--text)' }}>Thin vs thick:</b> a thin segment is a single documented list price. A thick band spans a price range whose value depends on a condition — DeepSeek peak/off-peak hours, Qwen3.7 prompt-length tiers (&lt;32K $0.03/$0.13 · ≥32K $0.10/$0.40 · ≥256K $0.20/$0.80), or the OpenRouter direct route running at roughly half DeepSeek's list (likely a launch promo, persistence unconfirmed).</li>
            <li><b style={{ color: 'var(--text)' }}>Cache hits excluded from charts:</b> input cache-read prices sit 80–98% below list (DeepSeek V4 Flash: $0.0028/M hit vs $0.14/M miss) and dominate effective cost for long-context reuse; they're in the table for reference.</li>
            <li><b style={{ color: 'var(--text)' }}>Subscriptions:</b> flat fees are documented, but the same $10–20 buys wildly different token volumes across plans and usage patterns — hence a separate graph, dashed, with inferred dates flagged. OpenCode Go's $10 flat is additionally metered ($12/5hr, $30/wk, $60/mo).</li>
            <li><b style={{ color: 'var(--text)' }}>Omitted for scope:</b> Gemini 3.1 Flash-Lite preview (2026-03-03, same price as GA), GPT-5.6 Luna (≥272K tier $0.20/$0.90), batch/free tiers, and per-token volume discounts beyond the tiers noted.</li>
            <li><b style={{ color: 'var(--text)' }}>Refresh:</b> <span className="mono">node scripts/snapshot-pricing.mjs</span> pulls current OpenRouter prices for every tracked model; review the output, append a segment, bump <span className="mono">updated</span>. <span className="mono">scripts/validate-pricing.mjs</span> gates the build so malformed data can't ship.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
