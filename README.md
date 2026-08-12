# research — research.ffilt.us

Static research site. No backend — a React/Vite build served by unprivileged nginx (k3s) and
portable to any static host (Azure Static Web Apps: `public/staticwebapp.config.json` provides
the SPA navigation fallback).

## Sections

- **`/`** — home / project index
- **`/value-index`** — Value Index: capability per joule for local LLMs
  - `frontier` (index) — cumulative Pareto frontier by half-year (interactive)
  - `landscape` — every model, RelIQ vs Serveability, filterable
  - `models` — sortable / searchable table of all models
  - `methodology` — formulas, weights, reference hardware, imputation notes
- **`/notes`** — raw research source material (`public/research/`)
- **`/charts`** — static PNG views (`public/views/`)

## Data pipeline

Site data is generated once, committed, and rendered client-side:

```bash
# 1. drop fresh copies of the source data into scripts/ (gitignored):
#    landscape.json, reliq_posterior.json, frontier.json
# 2. regenerate:
npm run gen:data     # → src/data/{computed,frontier,notes-index,views-index}.json
```

`scripts/gen-data.mjs` ports vi.py's compute pipeline exactly (RelIQ posterior mean + 90% CI,
Serveability, VRAM, t/s, T/J) and **verifies every frontier model's computed values against the
shipped frontier data** — exits non-zero on any mismatch. Add models by appending to
`landscape.json` (source) and re-running.

## Local dev

```bash
npm install
npm run dev         # vite dev server
npm run build       # tsc --noEmit + vite build → dist/
```

## Deploy

Gitea Actions → `reeds/ci-pipelines/.gitea/workflows/build-static.yml` → multi-stage Docker
build (node build → nginx-unprivileged) → Gitea registry → Flux applies
`apps/research/` from `reeds/sutliff-cluster`. The image runs as non-root, serves on 8080,
`/healthz` for probes, SPA fallback for client routes.
