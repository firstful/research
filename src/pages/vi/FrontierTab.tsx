import { useMemo, useState } from 'react'
import {
  ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import frontierData from '../../data/frontier.json'
import computed from '../../data/computed.json'
import type { FrontierData, FrontierModel } from '../../lib/types'
import { fmt, fmtInt } from '../../lib/format'
import ModelDetail from '../../components/ModelDetail'
import type { ModelRow } from '../../lib/types'

const frontier = frontierData as unknown as FrontierData
const periods = Object.keys(frontier).filter((k) => k.startsWith('20'))
const byName = new Map(computed.rows.map((r) => [r.name, r]))

interface LinePoint { x: number; y: number; period: string }
interface ModelPoint extends FrontierModel { x: number; y: number; period: string }

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload as LinePoint | ModelPoint
  const isModel = 'name' in p
  return (
    <div className="card" style={{ padding: '10px 14px', fontSize: 12.5 }}>
      {isModel ? (
        <>
          <div style={{ fontWeight: 600 }}>{(p as ModelPoint).name}</div>
          <div className="dim">{p.period} · {(p as ModelPoint).released}</div>
          <div className="num">RelIQ {(p as ModelPoint).reliq} · S {(p as ModelPoint).S}</div>
          <div className="dim">
            {(p as ModelPoint).vram} GB · {(p as ModelPoint).t_s} t/s · {(p as ModelPoint).tj} T/J
          </div>
        </>
      ) : (
        <>
          <div style={{ fontWeight: 600 }}>{p.period} frontier</div>
          <div className="num">RelIQ {fmt(p.y, 2)} at S {fmt(p.x, 3)}</div>
        </>
      )}
    </div>
  )
}

export default function FrontierTab() {
  const [selected, setSelected] = useState<string>(periods[periods.length - 1])
  const [pinned, setPinned] = useState<ModelRow | null>(null)

  const lineData = useMemo(
    () =>
      periods.map((p) => ({
        period: p,
        points: frontier[p].x.map((x, i) => ({ x, y: frontier[p].y[i], period: p })),
      })),
    [],
  )

  const modelPoints = useMemo<ModelPoint[]>(
    () =>
      periods.flatMap((p) =>
        frontier[p].models.map((m) => ({
          ...m, x: m.S, y: m.reliq, period: p,
        })),
      ),
    [],
  )

  const selectedModels: FrontierModel[] = frontier[selected]?.models ?? []

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>Open-source LLM frontier — cumulative Pareto by half-year</h2>
          <div className="dim mono" style={{ fontSize: 11.5 }}>
            ref: {computed.config.reference.name} · {computed.config.reference.vram_budget_gb} GB budget · Q4_K_M
          </div>
        </div>
        <div className="legend-row" style={{ marginBottom: 12 }}>
          {periods.map((p) => (
            <button
              key={p}
              className={`legend-chip ${selected === p ? 'on' : ''}`}
              onClick={() => setSelected(p)}
              style={{ borderColor: frontier[p].color }}
            >
              <span className="sw" style={{ background: frontier[p].color }} />
              {p}
            </button>
          ))}
        </div>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart margin={{ top: 8, right: 16, bottom: 4, left: -8 }}>
              <CartesianGrid stroke="#1a212a" strokeDasharray="3 3" />
              <XAxis
                dataKey="x" type="number" domain={[0, 1.05]} tickCount={6}
                stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'var(--mono)' }}
                label={{ value: 'Serveability S = 0.65·Comfort + 0.35·sat(T/J)', position: 'insideBottom', offset: -2, fill: '#94a3b8', fontSize: 11 }}
              />
              <YAxis
                dataKey="y" type="number" domain={[0, 85]} tickCount={9}
                stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'var(--mono)' }}
                label={{ value: 'RelIQ (posterior mean)', angle: -90, position: 'insideLeft', offset: 18, fill: '#94a3b8', fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} />
              {lineData.map(({ period, points }) => (
                <Line
                  key={period}
                  data={points}
                  dataKey="y"
                  type="monotone"
                  stroke={frontier[period].color}
                  strokeWidth={selected === period ? 3 : 1.4}
                  strokeOpacity={selected === period ? 1 : 0.4}
                  dot={false}
                  isAnimationActive={false}
                  onClick={() => setSelected(period)}
                  activeDot={{ r: 2 }}
                />
              ))}
              <Scatter
                data={modelPoints}
                dataKey="y"
                fill="#34d399"
                isAnimationActive={false}
                shape={(props: any) => {
                  const { cx, cy, payload } = props
                  const size = payload.period === selected ? 7 : 4.5
                  return (
                    <circle
                      key={`${payload.name}-${payload.period}`}
                      cx={cx} cy={cy} r={size}
                      fill={frontier[payload.period].color}
                      fillOpacity={0.85}
                      stroke={payload.period === selected ? '#e8edf2' : 'none'}
                      strokeWidth={1}
                      style={{ cursor: 'pointer' }}
                    />
                  )
                }}
                onClick={(pt: any) => {
                  const row = byName.get(pt?.name)
                  if (row) setPinned(row)
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="dim" style={{ fontSize: 11.5, marginTop: 6 }}>
          each line = PCHIP-smoothed cumulative Pareto frontier of every open model released up to that half-year
          (blue → green = newer) · hover a point for the model · click a line or chip to inspect its frontier models
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 4 }}>
          Frontier models <span className="dim mono" style={{ fontWeight: 400, fontSize: 13 }}>— {selected}</span>
        </h2>
        <div className="dim" style={{ marginBottom: 10, fontSize: 12.5 }}>
          every model on the {selected} frontier: undominated on RelIQ × Serveability at that point in time
        </div>
        <table className="data">
          <thead>
            <tr>
              <th>model</th>
              <th>released</th>
              <th>RelIQ</th>
              <th>90% CI</th>
              <th>S</th>
              <th>VRAM</th>
              <th>t/s</th>
              <th>T/J</th>
              <th>cov</th>
            </tr>
          </thead>
          <tbody>
            {selectedModels.map((m) => (
              <tr
                key={`${m.name}-${selected}`}
                className={pinned?.name === m.name ? 'selected' : ''}
                onClick={() => {
                  const row = byName.get(m.name)
                  if (row) setPinned(row)
                }}
                style={{ cursor: 'pointer' }}
              >
                <td className="mono">{m.name}{m.cov < 1 ? ' *' : ''}</td>
                <td className="mono dim">{m.released}</td>
                <td className="num">{fmt(m.reliq)}</td>
                <td className="num dim">{fmt(m.ci_lo)}–{fmt(m.ci_hi)}</td>
                <td className="num">{fmt(m.S, 2)}</td>
                <td className="num">{fmt(m.vram, 1)}</td>
                <td className="num">{fmtInt(m.t_s)}</td>
                <td className="num">{fmt(m.tj, 2)}</td>
                <td className="num">{Math.round(m.cov * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="dim" style={{ fontSize: 11.5, marginTop: 8 }}>* partial benchmark coverage — missing benchmarks imputed at reduced credit</div>
      </div>

      {pinned && <ModelDetail model={pinned} onClose={() => setPinned(null)} />}
    </div>
  )
}
