import { Routes, Route, NavLink, Outlet, Link } from 'react-router-dom'
import Home from './pages/Home'
import ValueIndex from './pages/ValueIndex'
import FrontierTab from './pages/vi/FrontierTab'
import LandscapeTab from './pages/vi/LandscapeTab'
import ModelsTab from './pages/vi/ModelsTab'
import MethodologyTab from './pages/vi/MethodologyTab'
import Notes from './pages/Notes'
import Charts from './pages/Charts'

function Header() {
  return (
    <header className="site-header">
      <div className="container">
        <Link to="/" className="brand">
          <span className="dot" /> research<span className="dim">.ffilt.us</span>
        </Link>
        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            home
          </NavLink>
          <NavLink to="/value-index" className={({ isActive }) => (isActive ? 'active' : '')}>
            value-index
          </NavLink>
          <NavLink to="/notes" className={({ isActive }) => (isActive ? 'active' : '')}>
            notes
          </NavLink>
          <NavLink to="/charts" className={({ isActive }) => (isActive ? 'active' : '')}>
            charts
          </NavLink>
        </nav>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        research.ffilt.us — static site, no backend. Data generated from{' '}
        <code>landscape.json</code> + <code>reliq_posterior.json</code> (vi.py pipeline, ported and
        verified against shipped frontier values).
      </div>
    </footer>
  )
}

export default function App() {
  return (
    <>
      <Header />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/value-index" element={<ValueIndex />}>
            <Route index element={<FrontierTab />} />
            <Route path="landscape" element={<LandscapeTab />} />
            <Route path="models" element={<ModelsTab />} />
            <Route path="methodology" element={<MethodologyTab />} />
          </Route>
          <Route path="/notes" element={<Notes />} />
          <Route path="/charts" element={<Charts />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Footer />
      <Outlet />
    </>
  )
}
