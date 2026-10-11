import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../db'
import { formatWeight } from '../utils/weight'
import { blobToObjectUrl } from '../utils/image'

export default function Inventory() {
  const navigate = useNavigate()
  const items = useLiveQuery(() => db.items.orderBy('name').toArray(), [])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Alle')

  const categories = useMemo(() => {
    const set = new Set<string>()
    items?.forEach((i) => i.category && set.add(i.category))
    return ['Alle', ...Array.from(set).sort()]
  }, [items])

  const filtered = useMemo(() => {
    if (!items) return []
    const q = search.trim().toLowerCase()
    return items.filter((item) => {
      const matchesSearch = !q || item.name.toLowerCase().includes(q)
      const matchesCategory = category === 'Alle' || item.category === category
      return matchesSearch && matchesCategory
    })
  }, [items, search, category])

  return (
    <div>
      <div className="page-title-row">
        <h1>Inventar</h1>
        <button onClick={() => navigate('/utstyr/ny')}>+ Nytt utstyr</button>
      </div>

      <div className="search-row">
        <input
          type="search"
          placeholder="Søk i inventar…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {items && items.length === 0 && (
        <div className="empty-state">
          Inventaret er tomt.
          <br />
          Legg til utstyret ditt så kan du bruke det i pakklister.
        </div>
      )}

      {items && items.length > 0 && filtered.length === 0 && (
        <div className="empty-state">Ingen treff.</div>
      )}

      {filtered.map((item) => (
        <div
          className="card card-row"
          key={item.id}
          onClick={() => navigate(`/utstyr/${item.id}`)}
          style={{ cursor: 'pointer' }}
        >
          <div className="thumb">
            {item.photo ? <img className="thumb" src={blobToObjectUrl(item.photo)} alt="" /> : '📦'}
          </div>
          <div className="card-body">
            <div className="card-title">{item.name}</div>
            <div className="card-meta">
              {formatWeight(item.weightGrams)}
              {item.category ? ` · ${item.category}` : ''}
              {item.quantityOwned > 1 ? ` · eier ${item.quantityOwned}` : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
