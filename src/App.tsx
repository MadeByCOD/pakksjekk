import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import Home from './screens/Home'
import Inventory from './screens/Inventory'
import ItemDetail from './screens/ItemDetail'
import PackingListEditor from './screens/PackingListEditor'

function App() {
  return (
    <HashRouter>
      <div className="app-shell">
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/liste/:listId" element={<PackingListEditor />} />
            <Route path="/inventar" element={<Inventory />} />
            <Route path="/utstyr/ny" element={<ItemDetail />} />
            <Route path="/utstyr/:itemId" element={<ItemDetail />} />
          </Routes>
        </main>
        <nav className="bottom-nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="icon">🎒</span>
            Pakklister
          </NavLink>
          <NavLink to="/inventar" className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="icon">📦</span>
            Inventar
          </NavLink>
        </nav>
      </div>
    </HashRouter>
  )
}

export default App
