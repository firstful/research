import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { to: '/value-index', label: 'frontier', end: true },
  { to: '/value-index/landscape', label: 'landscape', end: false },
  { to: '/value-index/models', label: 'models', end: false },
  { to: '/value-index/methodology', label: 'methodology', end: false },
]

export default function ValueIndex() {
  return (
    <div>
      <div style={{ padding: '28px 0 4px' }}>
        <h1>Value Index</h1>
        <p className="dim" style={{ marginTop: 4, maxWidth: 780 }}>
          Capability per joule for local LLMs. VI = (RelIQ/100)² × Comfort × T/J — the index
          answers "which open model maximizes useful work per joule on a home box".
        </p>
      </div>
      <div className="tabs">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            {t.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  )
}
