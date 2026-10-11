import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '../db'
import { compressImage, blobToObjectUrl } from '../utils/image'
import { wouldCreateDependencyCycle } from '../utils/weight'
import type { InventoryItem } from '../types'

export default function ItemDetail() {
  const { itemId } = useParams()
  const isNew = !itemId || itemId === 'ny'
  const navigate = useNavigate()

  const existing = useLiveQuery(
    () => (isNew ? undefined : db.items.get(itemId!)),
    [itemId, isNew],
  )
  const allItems = useLiveQuery(() => db.items.toArray(), []) ?? []

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [weightGrams, setWeightGrams] = useState(0)
  const [quantityOwned, setQuantityOwned] = useState(1)
  const [notes, setNotes] = useState('')
  const [dependencyIds, setDependencyIds] = useState<string[]>([])
  const [photo, setPhoto] = useState<Blob | undefined>(undefined)
  const [depFilter, setDepFilter] = useState('')
  const [loaded, setLoaded] = useState(isNew)

  useEffect(() => {
    if (existing && !loaded) {
      setName(existing.name)
      setCategory(existing.category)
      setWeightGrams(existing.weightGrams)
      setQuantityOwned(existing.quantityOwned)
      setNotes(existing.notes)
      setDependencyIds(existing.dependencyIds)
      setPhoto(existing.photo)
      setLoaded(true)
    }
  }, [existing, loaded])

  const categories = useMemo(() => {
    const set = new Set<string>()
    allItems.forEach((i) => i.category && set.add(i.category))
    return Array.from(set).sort()
  }, [allItems])

  const dependencyCandidates = useMemo(
    () =>
      allItems
        .filter((i) => i.id !== itemId)
        .filter((i) => i.name.toLowerCase().includes(depFilter.trim().toLowerCase())),
    [allItems, itemId, depFilter],
  )

  const itemsById = useMemo(() => new Map(allItems.map((i) => [i.id, i])), [allItems])

  async function handlePhotoChange(file: File | null) {
    if (!file) return
    const compressed = await compressImage(file)
    setPhoto(compressed)
  }

  function toggleDependency(depId: string) {
    setDependencyIds((prev) => {
      if (prev.includes(depId)) return prev.filter((id) => id !== depId)
      const currentId = itemId ?? '__new__'
      if (wouldCreateDependencyCycle(currentId, [...prev, depId], itemsById)) {
        alert('Dette ville skapt en sirkulær avhengighet og kan ikke legges til.')
        return prev
      }
      return [...prev, depId]
    })
  }

  async function handleSave() {
    if (!name.trim()) {
      alert('Gi utstyret et navn.')
      return
    }
    const payload: Omit<InventoryItem, 'id'> = {
      name: name.trim(),
      category: category.trim(),
      weightGrams: Math.max(0, weightGrams),
      quantityOwned: Math.max(0, quantityOwned),
      notes: notes.trim(),
      dependencyIds,
      photo,
    }

    if (isNew) {
      await db.items.add({ id: crypto.randomUUID(), ...payload })
    } else {
      await db.items.update(itemId!, payload)
    }
    navigate('/inventar')
  }

  async function handleDelete() {
    if (!itemId) return
    if (
      !confirm(
        'Slette dette utstyret? Det fjernes også fra pakklister og som avhengighet hos annet utstyr.',
      )
    ) {
      return
    }

    await db.transaction('rw', db.items, db.lists, async () => {
      const others = await db.items.where('id').notEqual(itemId).toArray()
      for (const other of others) {
        if (other.dependencyIds.includes(itemId)) {
          await db.items.update(other.id, {
            dependencyIds: other.dependencyIds.filter((id) => id !== itemId),
          })
        }
      }
      const lists = await db.lists.toArray()
      for (const list of lists) {
        if (list.entries.some((e) => e.itemId === itemId)) {
          await db.lists.update(list.id, {
            entries: list.entries.filter((e) => e.itemId !== itemId),
            updatedAt: Date.now(),
          })
        }
      }
      await db.items.delete(itemId)
    })

    navigate('/inventar')
  }

  if (!isNew && !loaded) {
    return <div className="empty-state">Laster…</div>
  }

  return (
    <div>
      <Link className="back-link" to="/inventar">
        ← Tilbake til inventar
      </Link>
      <h1>{isNew ? 'Nytt utstyr' : 'Rediger utstyr'}</h1>

      <div className="field">
        <label>Navn</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="field">
        <label>Kategori</label>
        <input
          type="text"
          list="category-options"
          value={category}
          placeholder="f.eks. Jakt, Friluft, Felles"
          onChange={(e) => setCategory(e.target.value)}
        />
        <datalist id="category-options">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      <div className="field">
        <label>Bilde</label>
        <div className="photo-input">
          {photo ? (
            <img className="photo-preview" src={blobToObjectUrl(photo)} alt="" />
          ) : (
            <div className="photo-preview thumb">📦</div>
          )}
          <div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
            />
            {photo && (
              <button
                type="button"
                className="ghost"
                onClick={() => setPhoto(undefined)}
              >
                Fjern bilde
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="field">
        <label>Vekt (gram)</label>
        <input
          type="number"
          min={0}
          value={weightGrams}
          onChange={(e) => setWeightGrams(Number(e.target.value))}
        />
      </div>

      <div className="field">
        <label>Antall du eier</label>
        <input
          type="number"
          min={0}
          value={quantityOwned}
          onChange={(e) => setQuantityOwned(Number(e.target.value))}
        />
      </div>

      <div className="field">
        <label>Notater</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="field">
        <label>Avhengig av annet utstyr (f.eks. radio trenger batteri)</label>
        <input
          type="search"
          placeholder="Søk i inventar…"
          value={depFilter}
          onChange={(e) => setDepFilter(e.target.value)}
        />
        <div className="card" style={{ maxHeight: 260, overflowY: 'auto', marginTop: '0.5rem' }}>
          {dependencyCandidates.length === 0 && (
            <div className="card-meta">Ingen andre gjenstander i inventaret ennå.</div>
          )}
          {dependencyCandidates.map((cand) => (
            <label className="checkbox-row" key={cand.id}>
              <input
                type="checkbox"
                checked={dependencyIds.includes(cand.id)}
                onChange={() => toggleDependency(cand.id)}
              />
              {cand.name}
            </label>
          ))}
        </div>
      </div>

      <div className="actions-row">
        <button onClick={handleSave}>Lagre</button>
        {!isNew && (
          <button className="danger" onClick={handleDelete}>
            Slett
          </button>
        )}
      </div>
    </div>
  )
}
