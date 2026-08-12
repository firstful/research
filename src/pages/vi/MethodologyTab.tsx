import computed from '../../data/computed.json'

const cfg = computed.config

const TOOL_MULTS = [
  { tool: 'clean', mult: 1.0, note: 'valid tool-call JSON, no errors' },
  { tool: 'garbled', mult: 0.4, note: 'malformed tool-call output' },
  { tool: 'refused', mult: 0.3, note: 'refused a legitimate tool call' },
  { tool: 'hallucinated', mult: 0.2, note: 'invented a tool call or result' },
]

const BENCH_NOTES: Record<string, string> = {
  'ARC-AGI': 'abstraction / reasoning — hardest signal',
  'MMLU-Pro': 'broad knowledge',
  GPQA: 'hard science reasoning',
  'MATH-500': 'math',
  IFEval: 'instruction following',
  BFCL: 'tool calling (agentic)',
}

export default function MethodologyTab() {
  return (
    <div>
      <div className="card">
        <h2>The index</h2>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 16, padding: '10px 0' }}>
          VI = (RelIQ/100)² × Comfort × T/J
        </div>
        <div style={{ display: 'grid', gap: 10, maxWidth: 760 }}>
          <div className="stat-line"><span className="k">RelIQ (0–100)</span><span className="v">weighted benchmark composite vs GPT-4o-mini, saturating-normalized</span></div>
          <div className="stat-line"><span className="k">Comfort (0.1–1.0)</span><span className="v">(model + KV@ctx + {cfg.reference.overhead_gb} GB) vs VRAM budget</span></div>
          <div className="stat-line"><span className="k">T/J</span><span className="v">agentic-mix throughput ÷ watts — tokens per joule</span></div>
        </div>
        <p className="dim" style={{ maxWidth: 760, marginBottom: 0 }}>
          The RelIQ² term is deliberate: capability is worth more than linear cost — a model that saves one
          retry pays for its joules. Make it ^1 for a pure efficiency view.
        </p>
      </div>

      <div className="card">
        <h2>Composite weights (agentic-use tilt)</h2>
        <table className="data" style={{ maxWidth: 560 }}>
          <thead><tr><th>benchmark</th><th>weight</th><th>measures</th></tr></thead>
          <tbody>
            {Object.entries(cfg.weights).map(([b, w]) => (
              <tr key={b}>
                <td className="mono">{b}</td>
                <td className="num">{w.toFixed(2)}</td>
                <td className="dim" style={{ textAlign: 'left' }}>{BENCH_NOTES[b] ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="dim" style={{ maxWidth: 760, marginBottom: 0 }}>
          Each benchmark is normalized <span className="mono">s = 1 − e^(−x/x_ref)</span> against a fixed
          reference (GPT-4o-mini) so small models don't get flattened into noise on ARC-class benchmarks,
          then weighted-averaged → RelIQ.
        </p>
      </div>

      <div className="card">
        <h2>Serveability &amp; the reference hardware</h2>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 14, padding: '6px 0 10px' }}>
          S = 0.65·Comfort + 0.35·sat(T/J), &nbsp; sat(x) = 1 − e^(−x)
        </div>
        <div style={{ display: 'grid', gap: 10, maxWidth: 760 }}>
          <div className="stat-line"><span className="k">Comfort</span><span className="v">min(1, budget / (model + KV@16k + {cfg.reference.overhead_gb} GB))</span></div>
          <div className="stat-line"><span className="k">decode speed</span><span className="v">{Math.round(cfg.reference.bw_util * 100)}% of {cfg.reference.mem_bw_gbs} GB/s ÷ bytes/token (MoE = active params)</span></div>
          <div className="stat-line"><span className="k">T/J</span><span className="v">t/s ÷ ({Math.round(cfg.reference.load_w_frac * 100)}% of {cfg.reference.tdp_w} W)</span></div>
          <div className="stat-line"><span className="k">budget</span><span className="v">{cfg.reference.vram_budget_gb} GB VRAM · {cfg.reference.name}</span></div>
        </div>
        <p className="dim" style={{ maxWidth: 760, marginBottom: 0 }}>
          Throughput is estimated on one reference profile so every model is compared on the same hardware —
          decode is memory-bandwidth-bound, so tok/s ≈ mem_bw / model_bytes. The saturating T/J term means a
          3× faster model doesn't get 3× the X credit.
        </p>
      </div>

      <div className="card">
        <h2>Tool-call multiplier</h2>
        <table className="data" style={{ maxWidth: 560 }}>
          <thead><tr><th>verdict</th><th>mult</th><th>meaning</th></tr></thead>
          <tbody>
            {TOOL_MULTS.map((t) => (
              <tr key={t.tool}>
                <td className="mono">{t.tool}</td>
                <td className="num">×{t.mult.toFixed(1)}</td>
                <td className="dim" style={{ textAlign: 'left' }}>{t.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="dim" style={{ maxWidth: 760, marginBottom: 0 }}>
          Folds a functional tool-call test into the score — a fast model that mangles JSON must not beat a
          slower honest one. Missing benchmarks are credited at {Math.round(cfg.missing_credit * 100)}% of the
          model's own average (penalty for incomplete coverage).
        </p>
      </div>

      <div className="card">
        <h2>Imputation &amp; intervals</h2>
        <p className="dim" style={{ maxWidth: 760 }}>
          RelIQ values shown site-wide are <b style={{ color: 'var(--text)' }}>posterior means</b> from a
          hierarchical imputation model over the six benchmarks (fitted on {computed.rows.length} models with
          varying coverage). The 90% interval reflects both measurement noise and imputation uncertainty —
          narrower for well-covered models, wide for one-benchmark entries. Frontier curves are the cumulative
          Pareto set per half-year (no point dominates another on both RelIQ and Serveability), PCHIP-smoothed.
        </p>
        <div style={{ display: 'grid', gap: 10, maxWidth: 760 }}>
          <div className="stat-line"><span className="k">source</span><span className="v">landscape.json · reliq_posterior.json</span></div>
          <div className="stat-line"><span className="k">computed</span><span className="v">port of vi.py (verified 35/35 frontier models)</span></div>
          <div className="stat-line"><span className="k">generated</span><span className="v">{computed.generated_at.slice(0, 10)}</span></div>
        </div>
      </div>
    </div>
  )
}
