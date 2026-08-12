import { useMemo, useState } from 'react'
import notesIndex from '../data/notes-index.json'
import type { NotesIndex } from '../lib/types'
import { fmtBytes } from '../lib/format'

const notes = notesIndex as NotesIndex

function familyOf(name: string): string {
  const m = name.match(/^([a-z0-9]+)[_.]/)
  if (m) return m[1]
  return 'misc'
}

const FAMILY_NAMES: Record<string, string> = {
  ai2: 'AI2 (OLMo/OLMoE)',
  meta: 'Meta',
  yi: '01.AI Yi',
  google: 'Google (Gemma)',
  deepseek: 'DeepSeek',
  kimi: 'Moonshot Kimi',
  qwen: 'Qwen',
  zhipu: 'Zhipu GLM',
  mistral: 'Mistral',
  openai: 'OpenAI',
  bfcl: 'BFCL leaderboard',
  gh: 'GitHub news',
  aa: 'Analytics (aa-*)',
  v32: 'papers',
  k2: 'K2 notes',
  k26: 'K2.6 notes',
  k20905: 'K2.09 notes',
  k3: 'K3 notes',
  gemma: 'Gemma',
  page: 'blog pages',
  card: 'model cards',
  frankx: 'Gemma blog',
  olmoe: 'OLMoE blog',
  olmo2: 'OLMo 2 blog',
  k2t: 'K2 blog',
  k2blog: 'K2 blog',
  ds: 'DeepSeek news',
  hf: 'HF org data',
  allenai: 'AllenAI',
  reliq: 'posterior',
}

const EXTS = ['all', 'md', 'json', 'html', 'txt', 'js']

export default function Notes() {
  const [query, setQuery] = useState('')
  const [ext, setExt] = useState('all')
  const [family, setFamily] = useState('all')

  const families = useMemo(() => {
    const s = new Set<string>()
    for (const f of notes.files) s.add(familyOf(f.name))
    return [...s].sort()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return notes.files.filter((f) => {
      if (ext !== 'all' && f.ext !== ext) return false
      if (family !== 'all' && familyOf(f.name) !== family) return false
      if (q && !f.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [query, ext, family])

  return (
    <div>
      <div style={{ padding: '28px 0 4px' }}>
        <h1>Research notes</h1>
        <p className="dim" style={{ marginTop: 4, maxWidth: 780 }}>
          Raw source material behind the index: release READMEs, blog posts, model cards and
          benchmark dumps for every family — {notes.count} files, served as-is.
        </p>
      </div>
      <div className="controls">
        <input
          type="search"
          placeholder="search filenames…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ minWidth: 240 }}
        />
        <select value={ext} onChange={(e) => setExt(e.target.value)}>
          {EXTS.map((e) => (
            <option key={e} value={e}>{e === 'all' ? 'any type' : `.${e}`}</option>
          ))}
        </select>
        <select value={family} onChange={(e) => setFamily(e.target.value)}>
          <option value="all">any family</option>
          {families.map((f) => (
            <option key={f} value={f}>{FAMILY_NAMES[f] ?? f}</option>
          ))}
        </select>
        <span className="dim mono" style={{ fontSize: 12 }}>{filtered.length} files</span>
      </div>
      <div className="card" style={{ padding: '8px 0' }}>
        {filtered.map((f) => (
          <a key={f.path} className="note-file" href={`/${f.path}`} target="_blank" rel="noreferrer">
            <span>
              <span className="badge" style={{ marginRight: 8 }}>{f.ext}</span>
              <span className="path">{f.path}</span>
            </span>
            <span className="dim num">{fmtBytes(f.size)}</span>
          </a>
        ))}
        {filtered.length === 0 && <div className="dim" style={{ padding: 20 }}>no files match</div>}
      </div>
    </div>
  )
}
