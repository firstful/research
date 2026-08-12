import { useMemo, useState } from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import computed from '../../data/computed.json'
import type { ModelRow } from '../../lib/types'
import { fmt, fmtInt } from '../../lib/format'
import { PERIODS, periodColor } from '../../lib/palette'
import ModelDetail from '../../components/ModelDetail'

const BUDGETS = [8, 12, 16, 24, 32, 48, 64, 96, 128]

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const r = payload[0].payload as ModelRow & { x: number; y: number }
  return (
    <div className="card" style={{ padding: '10px 14px', fontSize: 12.5 }}>
      <div style={{ fontWeight: 600 }}>{r.name}</div>
      <div className="dim">{r.family} · {r.period} · {r.released}</div>
      <div className="num">RelIQ {fmt(r.reliq)} · S {fmt(r.S, 2)}</div>
      <div className="dim">{fmt(r.vram, 1)} GB · {fmtInt(r.t_s)} t/s · {fmt(r.tj, 2)} T/J</div>
    </div>
  )
}

export default function LandscapeTab() {
  const [query, setQuery] = useState('')
  const [budget, setBudget] = useState<number | 'all'>('all')
  const [periods, setPeriods] = useState<Set<string>>(new Set(PERIODS))
  const [axis, setAxis] = useState<'reliq' | 'y'>('reliq')
  const [pinned, setPinned] = useState<ModelRow | null>(null)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return computed.rows.filter((r) => {
      if (!periods.has(r.period ?? '')) return false
      if (budget !== 'all' && r.vram > budget) return false
      if (q && !`${r.name} ${r.family}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [query, budget, periods])

  const byPeriod = useMemo(() => {
    const m = new Map<string, ModelRow[]>()
    for (const r of rows) {
      const k = r.period ?? ''
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(r)
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [rows])

  const togglePeriod = (p: string) => {
    const next = new Set(periods)
    if (next.has(p)) next.delete(p)
    else next.add(p)
    setPeriods(next)
  }

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>Landscape — every model, RelIQ vs Serveability</h2>
          <div className="legend-row">
            <span className="dim mono" style={{ fontSize: 12 }}>Y:</span>
            <button className={`chip ${axis === 'reliq' ? 'on' : ''}`} onClick={() => setAxis('reliq')}>RelIQ</button>
            <button className={`chip ${axis === 'y' ? 'on' : ''}`} onClick={() => setAxis('y')}>RelIQ×tool</button>
          </div>
        </div>
        <div className="controls">
          <input
            type="search"
            placeholder="search model or family…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ minWidth: 240 }}
          />
          <select value={budget} onChange={(e) => setBudget(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
            <option value="all">any VRAM</option>
            {BUDGETS.map((b) => (
              <option key={b} value={b}>≤ {b} GB VRAM</option>
            ))}
          </select>
          <div className="legend-row">
            {PERIODS.map((p) => (
              <button key={p} className={`chip ${periods.has(p) ? 'on' : ''}`} onClick={() => togglePeriod(p)}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 16, bottom: 4, left: -8 }}>
              <CartesianGrid stroke="#1a212a" strokeDasharray="3 3" />
              <XAxis
                dataKey="x" type="number" domain={[0, 1.05]} tickCount={6}
                stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'var(--mono)' }}
                label={{ value: 'Serveability S', position: 'insideBottom', offset: -2, fill: '#94a3b8', fontSize: 11 }}
              />
              <YAxis
                dataKey="y" type="number" domain={[0, 85]} tickCount={9}
                stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'var(--mono)' }}
                label={{ value: axis === 'reliq' ? 'RelIQ (posterior mean)' : 'RelIQ × tool multiplier', angle: -90, position: 'insideLeft', offset: 18, fill: '#94a3b8', fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} />
              {byPeriod.map(([p, pts]) => (
                <Scatter
                  key={p}
                  name={p}
                  data={pts.map((r) => ({ ...r, x: r.S, y: axis === 'reliq' ? r.reliq : r.y }))}
                  dataKey="y"
                  isAnimationActive={false}
                  fill={periodColor(p)}
                  shape={(props: any) => {
                    const { cx, cy, payload } = props
                    const r: ModelRow = payload
                    const full = r.cov >= 1
                    const size = 5.5 + Math.min(3, Math.max(0, (2026 - Number((r.released ?? '2026').slice(0, 4))) / 2))
                    return full ? (
                      <circle key={r.name} cx={cx} cy={cy} r={size} fill={periodColor(r.period)} fillOpacity={0.75} style={{ cursor: 'pointer' }} />
                    ) : (
                      <circle key={r.name} cx={cx} cy={cy} r={size} fill="none" stroke={periodColor(r.period)} strokeWidth={1.4} strokeOpacity={0.9} style={{ cursor: 'pointer' }} />
                    )
                  }}
                  onClick={(pt: any) => setPinned(pt as ModelRow)}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="dim" style={{ fontSize: 11.5, marginTop: 6 }}>
          filled = full benchmark coverage · hollow = partial coverage (imputed) · hover for a model card · click to pin
        </div>
      </div>

      {pinned && <ModelDetail model={pinned} onClose={() => setPinned(null)} />}
    </div>
  )
}
