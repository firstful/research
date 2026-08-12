import { Link } from 'react-router-dom'
import computed from '../data/computed.json'

export default function Home() {
  const rows = computed.rows
  const periods = new Set(rows.map((r) => r.period)).size
  const latest = [...rows].sort((a, b) => (a.released ?? '').localeCompare(b.released ?? ''))[rows.length - 1]
  const cfg = computed.config

  return (
    <div>
      <div className="hero">
        <h1>Research</h1>
        <p>
          An index of open research from the lab — model capability economics, benchmark
          analysis, and the raw source material behind it. Everything here is a static site:
          the data is computed once, verified, and rendered client-side.
        </p>
      </div>

      <div className="project-grid">
        <Link to="/value-index" className="project-card" style={{ color: 'inherit' }}>
          <h3>Value Index ↗</h3>
          <div className="desc">
            Capability per joule for local LLMs. Interactive frontier — the cumulative Pareto
            set of every open model by half-year — plus a full landscape scatter, a sortable
            model table, and the exact methodology.
          </div>
          <div className="meta">
            {rows.length} models · {periods} half-years · reference {cfg.reference.name}
          </div>
        </Link>

        <Link to="/value-index/models" className="project-card" style={{ color: 'inherit' }}>
          <h3>Model table ↗</h3>
          <div className="desc">
            Every model with its RelIQ (posterior mean + 90% CI), Serveability, VRAM, decode
            speed, T/J and benchmark scores — search, filter, sort.
          </div>
          <div className="meta">sortable · searchable · expandable rows</div>
        </Link>

        <Link to="/notes" className="project-card" style={{ color: 'inherit' }}>
          <h3>Research notes ↗</h3>
          <div className="desc">
            The raw source material: release READMEs, blog posts, benchmark dumps and model
            cards for every family in the index.
          </div>
          <div className="meta">raw files · model families · benchmark sources</div>
        </Link>

        <Link to="/charts" className="project-card" style={{ color: 'inherit' }}>
          <h3>Static views ↗</h3>
          <div className="desc">
            The classic chart pack — ceiling &amp; density over time, VRAM vs RelIQ, top-15,
            benchmark correlations, CI width vs coverage.
          </div>
          <div className="meta">{new Date().getFullYear()} snapshot · PNG</div>
        </Link>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h2 style={{ marginBottom: 4 }}>How to read the index</h2>
        <div style={{ color: 'var(--text-dim)', maxWidth: 760 }}>
          <p style={{ margin: '8px 0' }}>
            <b style={{ color: 'var(--text)' }}>RelIQ</b> (0–100) is a weighted benchmark
            composite vs GPT-4o-mini using saturating normalization — ARC-AGI, MMLU-Pro, GPQA,
            MATH-500, IFEval and BFCL, weighted for agentic use. Values here are the{' '}
            <b style={{ color: 'var(--text)' }}>posterior mean</b> of the imputation model, with
            90% intervals.
          </p>
          <p style={{ margin: '8px 0' }}>
            <b style={{ color: 'var(--text)' }}>Serveability S</b> blends how well a model fits
            the reference VRAM budget with its tokens-per-joule, saturating so a 3× faster model
            doesn't get 3× the credit. All throughput is estimated on one reference profile:{' '}
            {cfg.reference.name}, {cfg.reference.mem_bw_gbs} GB/s @ {Math.round(cfg.reference.bw_util * 100)}%,
            {cfg.reference.vram_budget_gb} GB budget, {cfg.reference.overhead_gb} GB overhead.
          </p>
          <p style={{ margin: '8px 0' }}>
            The frontier chart draws the <b style={{ color: 'var(--text)' }}>cumulative Pareto
            set</b> per half-year: models not dominated on both axes by anything newer. Latest
            entry: <span className="mono">{latest?.name}</span> ({latest?.released}).
          </p>
        </div>
      </div>
    </div>
  )
}
