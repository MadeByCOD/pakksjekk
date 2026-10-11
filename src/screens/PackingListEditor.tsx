import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '../db'
import { blobToObjectUrl } from '../utils/image'
import {
  entryWeightGrams,
  findMissingDependencies,
  formatWeight,
  totalWeightGrams,
} from '../utils/weight'
import type { PackingListEntry } from '../types'

export default function PackingListEditor() {
  const { listId } = useParams()
  const navigate = useNavigate()
  const list = useLiveQuery(() => db.lists.get(listId!), [listId])
  const items = useLiveQuery(() => db.items.orderBy('name').toArray(), []) ?? []
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Alle')
  const [nameDraft, setNameDraft] = useState<string | null>(null)
  const [addingAdHoc, setAddingAdHoc] = useState(false)
  const [adHocDraftName, setAdHocDraftName] = useState('')

  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])

  const entries = useMemo(
    () => (list?.entries ?? []).map((e) => (e.key ? e : { ...e, key: e.itemId! })),
    [list],
  )
  const inventoryEntries = useMemo(() => entries.filter((e) => e.itemId), [entries])
  const adHocEntries = useMemo(() => entries.filter((e) => !e.itemId), [entries])
  const quantityByItemId = useMemo(
    () => new Map(inventoryEntries.map((e) => [e.itemId!, e.quantity])),
    [inventoryEntries],
  )

  const categories = useMemo(() => {
    const set = new Set<string>()
    items.forEach((i) => i.category && set.add(i.category))
    return ['Alle', ...Array.from(set).sort()]
  }, [items])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((item) => {
      const matchesSearch = !q || item.name.toLowerCase().includes(q)
      const matchesCategory = category === 'Alle' || item.category === category
      return matchesSearch && matchesCategory
    })
  }, [items, search, category])

  const totalWeight = totalWeightGrams(entries, itemsById)
  const missing = findMissingDependencies(entries, itemsById)

  async function saveEntries(next: PackingListEntry[]) {
    if (!list) return
    await db.lists.update(list.id, { entries: next, updatedAt: Date.now() })
  }

  async function setQuantity(itemId: string, quantity: number) {
    const next = entries.filter((e) => e.itemId !== itemId)
    if (quantity > 0) next.push({ key: itemId, itemId, quantity })
    await saveEntries(next)
  }

  async function addMissingDependency(itemId: string) {
    await setQuantity(itemId, 1)
  }

  async function setAdHocQuantity(key: string, quantity: number) {
    const next = entries.filter((e) => e.key !== key)
    const current = entries.find((e) => e.key === key)
    if (quantity > 0 && current) next.push({ ...current, quantity })
    await saveEntries(next)
  }

  async function addAdHocItem() {
    const name = adHocDraftName.trim()
    if (!name || !list) return
    const key = crypto.randomUUID()
    await saveEntries([...entries, { key, adHocName: name, adHocWeightGrams: 0, quantity: 1 }])
    setAdHocDraftName('')
    setAddingAdHoc(false)

    if (confirm(`Vil du legge «${name}» til i det faste inventaret (med vekt, bilde, notater osv.)?`)) {
      navigate('/utstyr/ny', {
        state: { prefillName: name, returnToListId: list.id, returnToListKey: key },
      })
    }
  }

  function promoteToInventory(entry: PackingListEntry) {
    if (!list) return
    navigate('/utstyr/ny', {
      state: {
        prefillName: entry.adHocName,
        prefillWeightGrams: entry.adHocWeightGrams,
        returnToListId: list.id,
        returnToListKey: entry.key,
      },
    })
  }

  async function saveName() {
    if (!list || nameDraft === null) return
    const name = nameDraft.trim() || list.name
    await db.lists.update(list.id, { name, updatedAt: Date.now() })
    setNameDraft(null)
  }

  if (!list) {
    return <div className="empty-state">Laster…</div>
  }

  return (
    <div>
      <Link className="back-link" to="/">
        ← Tilbake til pakklister
      </Link>

      {nameDraft !== null ? (
        <div className="inline-edit-row" style={{ marginBottom: '0.75rem' }}>
          <input
            type="text"
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveName()}
          />
          <button onClick={saveName}>Lagre</button>
        </div>
      ) : (
        <div className="page-title-row">
          <h1 style={{ margin: 0 }}>{list.name}</h1>
          <button className="ghost" onClick={() => setNameDraft(list.name)}>
            Endre navn
          </button>
        </div>
      )}

      <div className="sticky-summary">
        <span>Totalvekt</span>
        <span className="weight-value">{formatWeight(totalWeight)}</span>
      </div>

      {missing.length > 0 && (
        <div className="warning-banner">
          <strong>⚠ Mangler utstyr som trengs</strong>
          <ul>
            {missing.map(({ item, missingDependencies }) => (
              <li key={item.id}>
                {item.name} trenger: {missingDependencies.map((d) => d.name).join(', ')}
                {' — '}
                {missingDependencies.map((d) => (
                  <button
                    key={d.id}
                    className="ghost"
                    style={{ padding: '0.1rem 0.4rem', textDecoration: 'underline' }}
                    onClick={() => addMissingDependency(d.id)}
                  >
                    legg til {d.name}
                  </button>
                ))}
              </li>
            ))}
          </ul>
        </div>
      )}

      {adHocEntries.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <h2>Annet i sekken (ikke i inventar)</h2>
          {adHocEntries.map((entry) => (
            <div className="card card-row" key={entry.key}>
              <div className="thumb">📦</div>
              <div className="card-body">
                <div className="card-title">{entry.adHocName}</div>
                <div className="card-meta">
                  {formatWeight(entryWeightGrams(entry, itemsById))}
                  {' · '}
                  <button
                    type="button"
                    className="ghost"
                    style={{ padding: 0, textDecoration: 'underline' }}
                    onClick={() => promoteToInventory(entry)}
                  >
                    Legg til i inventar
                  </button>
                </div>
              </div>
              <div className="stepper">
                <button
                  type="button"
                  onClick={() => setAdHocQuantity(entry.key, Math.max(0, entry.quantity - 1))}
                >
                  −
                </button>
                <span className="count">{entry.quantity}</span>
                <button type="button" onClick={() => setAdHocQuantity(entry.key, entry.quantity + 1)}>
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        {addingAdHoc ? (
          <div className="inline-edit-row">
            <input
              type="text"
              placeholder="Navn på tingen, f.eks. lånt sovepose"
              value={adHocDraftName}
              autoFocus
              onChange={(e) => setAdHocDraftName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addAdHocItem()}
            />
            <button onClick={addAdHocItem}>Legg til</button>
            <button className="ghost" onClick={() => setAddingAdHoc(false)}>
              Avbryt
            </button>
          </div>
        ) : (
          <button className="secondary" onClick={() => setAddingAdHoc(true)}>
            + Legg til noe som ikke er i inventaret
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          Inventaret er tomt. Legg til utstyr under «Inventar»-fanen, eller bruk «Legg til noe som
          ikke er i inventaret» over.
        </div>
      ) : (
        <>
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

          {filtered.map((item) => {
            const quantity = quantityByItemId.get(item.id) ?? 0
            return (
              <div className="card card-row" key={item.id}>
                <div className="thumb">
                  {item.photo ? (
                    <img className="thumb" src={blobToObjectUrl(item.photo)} alt="" />
                  ) : (
                    '📦'
                  )}
                </div>
                <div className="card-body">
                  <div className="card-title">{item.name}</div>
                  <div className="card-meta">{formatWeight(item.weightGrams)}</div>
                </div>
                <div className="stepper">
                  <button
                    type="button"
                    disabled={quantity <= 0}
                    onClick={() => setQuantity(item.id, Math.max(0, quantity - 1))}
                  >
                    −
                  </button>
                  <span className="count">{quantity}</span>
                  <button type="button" onClick={() => setQuantity(item.id, quantity + 1)}>
                    +
                  </button>
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
