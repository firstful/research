import type { ModelRow } from '../lib/types'
import { fmt, fmtInt, fmtGb, toolBadge } from '../lib/format'
import { BENCHMARKS } from '../lib/palette'

/**
 * Detail panel for one model: headline metrics + benchmark scores
 * (raw + imputed posterior estimates for missing benchmarks).
 */
export default function ModelDetail({ model, onClose }: { model: ModelRow; onClose?: () => void }) {
  const tool = toolBadge(model.tool)
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <h2 style={{ margin: 0 }}>
          {model.name} <span className="dim" style={{ fontWeight: 400, fontSize: 13 }}>· {model.family}</span>
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 16 }}
            aria-label="close"
          >
            ✕
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '8px 0 14px' }}>
        <span className="badge">{model.period ?? '—'}</span>
        <span className="badge">{model.released ?? '—'}</span>
        <span className="badge blue">{model.quant}</span>
        <span className={`badge ${tool.tone}`}>{tool.label} tool-call</span>
        {model.cov < 1 && <span className="badge warn">coverage {Math.round(model.cov * 100)}%</span>}
      </div>
      <div className="detail-grid">
        <div className="detail-cell">
          <div className="k">RelIQ (posterior mean)</div>
          <div className="v">{fmt(model.reliq)}</div>
        </div>
        <div className="detail-cell">
          <div className="k">90% CI</div>
          <div className="v" style={{ fontSize: 13 }}>
            {fmt(model.ci_lo)} – {fmt(model.ci_hi)}
          </div>
        </div>
        <div className="detail-cell">
          <div className="k">Serveability S</div>
          <div className="v">{fmt(model.S, 2)}</div>
        </div>
        <div className="detail-cell">
          <div className="k">VRAM needed</div>
          <div className="v">{fmtGb(model.vram)} GB</div>
        </div>
        <div className="detail-cell">
          <div className="k">Decode (ref hw)</div>
          <div className="v">{fmtInt(model.t_s)} t/s</div>
        </div>
        <div className="detail-cell">
          <div className="k">T/J (ref hw)</div>
          <div className="v">{fmt(model.tj, 2)}</div>
        </div>
        <div className="detail-cell">
          <div className="k">Params</div>
          <div className="v">
            {fmt(model.params_b, model.params_b >= 100 ? 0 : 1)}B
            {model.active_params_b !== model.params_b && (
              <span className="dim" style={{ fontSize: 11 }}> · {fmt(model.active_params_b, 1)}B active</span>
            )}
          </div>
        </div>
        <div className="detail-cell">
          <div className="k">Tool multiplier</div>
          <div className="v">×{model.tool_mult.toFixed(1)}</div>
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <h3>Benchmarks</h3>
        <div style={{ maxWidth: 560 }}>
          {BENCHMARKS.map((b) => {
            const raw = model.scores?.[b]
            const imp = model.imputed?.[b]
            return (
              <div className="score-row" key={b}>
                <span className="b">{b}</span>
                <span className="num">
                  {raw !== undefined && raw !== null ? (
                    fmt(raw)
                  ) : (
                    <span className="imputed-tag">
                      imputed ≈ {imp ? fmt(imp.mean) : '—'}
                    </span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
