import viewsIndex from '../data/views-index.json'

const views = viewsIndex as { count: number; files: { path: string; name: string; size: number }[] }

const CAPTIONS: Record<string, string> = {
  '00-landscape.png': 'Landscape — RelIQ × tool-mult vs Serveability for every model; brightness/size = release date',
  '01-ceiling-over-time.png': 'Ceiling over time — best achievable RelIQ by half-year',
  '02-density-over-time.png': 'Density over time — how many models reach each RelIQ band',
  '03-vram-vs-reliq.png': 'VRAM vs RelIQ — where the value cliff lives',
  '04-top15-ranked.png': 'Top 15 models ranked by the index',
  '05-bench-corr.png': 'Benchmark correlations — which evals move together',
  '06-ci-width-vs-coverage.png': 'CI width vs coverage — imputation uncertainty by benchmark completeness',
}

export default function Charts() {
  return (
    <div>
      <div style={{ padding: '28px 0 4px' }}>
        <h1>Static views</h1>
        <p className="dim" style={{ marginTop: 4, maxWidth: 780 }}>
          The classic chart pack from the Value Index pipeline — precomputed PNGs of the full
          landscape. Interactive versions live under{' '}
          <a href="/value-index/landscape">value-index → landscape</a>.
        </p>
      </div>
      <div className="gallery">
        {views.files.map((f) => (
          <figure key={f.path}>
            <img src={`/${f.path}`} alt={CAPTIONS[f.name] ?? f.name} loading="lazy" />
            <figcaption>{CAPTIONS[f.name] ?? f.name}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}
