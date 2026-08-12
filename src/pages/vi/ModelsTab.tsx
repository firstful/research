import { Fragment, useMemo, useState } from 'react'
import computed from '../../data/computed.json'
import type { ModelRow } from '../../lib/types'
import { fmt, fmtInt } from '../../lib/format'
import { PERIODS } from '../../lib/palette'
import ModelDetail from '../../components/ModelDetail'

type SortKey = 'name' | 'period' | 'released' | 'params_b' | 'vram' | 'reliq' | 'S' | 't_s' | 'tj' | 'cov'
const SORTS: SortKey[] = ['name', 'period', 'released', 'params_b', 'vram', 'reliq', 'S', 't_s', 'tj', 'cov']

function val(r: ModelRow, k: SortKey): string | number {
  switch (k) {
    case 'name': return r.name.toLowerCase()
    case 'period': return r.period ?? ''
    case 'released': return r.released ?? ''
    case 'params_b': return r.params_b
    case 'vram': return r.vram
    case 'reliq': return r.reliq
    case 'S': return r.S
    case 't_s': return r.t_s
    case 'tj': return r.tj
    case 'cov': return r.cov
  }
}

export default function ModelsTab() {
  const [query, setQuery] = useState('')
  const [period, setPeriod] = useState<string>('all')
  const [budget, setBudget] = useState<number | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('reliq')
  const [sortDir, setSortDir] = useState<1 | -1>(-1)
  const [pinned, setPinned] = useState<ModelRow | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = computed.rows.filter((r) => {
      if (period !== 'all' && r.period !== period) return false
      if (budget !== 'all' && r.vram > budget) return false
      if (q && !`${r.name} ${r.family}`.toLowerCase().includes(q)) return false
      return true
    })
    return [...filtered].sort((a, b) => {
      const va = val(a, sortKey)
      const vb = val(b, sortKey)
      const cmp = typeof va === 'string' && typeof vb === 'string'
        ? va.localeCompare(vb)
        : (va as number) - (vb as number)
      return cmp * sortDir
    })
  }, [query, period, budget, sortKey, sortDir])

  const clickSort = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === 1 ? -1 : 1))
    else {
      setSortKey(k)
      setSortDir(k === 'name' || k === 'period' || k === 'released' ? 1 : -1)
    }
  }

  return (
    <div>
      <div className="card">
        <div className="controls">
          <input
            type="search"
            placeholder="search model or family…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ minWidth: 240 }}
          />
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="all">any half-year</option>
            {PERIODS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select value={budget} onChange={(e) => setBudget(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
            <option value="all">any VRAM</option>
            {[8, 12, 16, 24, 32, 48, 64, 96, 128].map((b) => (
              <option key={b} value={b}>≤ {b} GB VRAM</option>
            ))}
          </select>
          <span className="dim mono" style={{ fontSize: 12 }}>{rows.length} / {computed.rows.length} models</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data">
            <thead>
              <tr>
                {SORTS.map((k) => (
                  <th key={k} onClick={() => clickSort(k)}>
                    {k}
                    {sortKey === k && <span className="arrow"> {sortDir === 1 ? '▲' : '▼'}</span>}
                  </th>
                ))}
                <th>tool</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Fragment key={r.name}>
                  <tr
                    className={pinned?.name === r.name ? 'selected' : ''}
                    onClick={() => {
                      setPinned(r)
                      setExpanded(expanded === r.name ? null : r.name)
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <span className="mono">{r.name}</span>
                      <div className="dim" style={{ fontSize: 11 }}>{r.family} · {r.arch}</div>
                    </td>
                    <td className="num dim">{r.period}</td>
                    <td className="num dim">{r.released}</td>
                    <td className="num">{fmt(r.params_b, r.params_b >= 100 ? 0 : 1)}B</td>
                    <td className="num">{fmt(r.vram, 1)}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{fmt(r.reliq)}</td>
                    <td className="num dim" style={{ fontSize: 11.5 }}>
                      {fmt(r.ci_lo, 0)}–{fmt(r.ci_hi, 0)}
                    </td>
                    <td className="num">{fmt(r.S, 2)}</td>
                    <td className="num">{fmtInt(r.t_s)}</td>
                    <td className="num">{fmt(r.tj, 2)}</td>
                    <td className="num">{Math.round(r.cov * 100)}%</td>
                    <td>
                      <span className={`badge ${r.cov >= 1 ? 'ok' : 'warn'}`}>{r.tool}</span>
                    </td>
                  </tr>
                  {expanded === r.name && (
                    <tr key={`${r.name}-scores`}>
                      <td colSpan={12} style={{ background: 'var(--bg-inset)' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '4px 0' }}>
                          {Object.entries(r.scores).map(([b, v]) => (
                            <span key={b} className="badge blue">{b} <b className="num">{v !== null && v !== undefined ? fmt(v) : '—'}</b></span>
                          ))}
                          {Object.keys(r.imputed).length > 0 && (
                            <span className="dim mono" style={{ fontSize: 11, alignSelf: 'center' }}>
                              + {Object.keys(r.imputed).length} imputed · {r.quant} · {fmt(r.model_gb, 1)} GB weights
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {pinned && <ModelDetail model={pinned} onClose={() => setPinned(null)} />}
    </div>
  )
}
