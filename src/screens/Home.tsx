import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../db'
import { formatWeight, totalWeightGrams } from '../utils/weight'
import type { InventoryItem } from '../types'

export default function Home() {
  const navigate = useNavigate()
  const lists = useLiveQuery(() => db.lists.orderBy('updatedAt').reverse().toArray(), [])
  const items = useLiveQuery(() => db.items.toArray(), [])
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const itemsById = new Map<string, InventoryItem>((items ?? []).map((i) => [i.id, i]))

  async function createList() {
    const name = newName.trim() || 'Ny pakkliste'
    const id = crypto.randomUUID()
    const now = Date.now()
    await db.lists.add({ id, name, createdAt: now, updatedAt: now, entries: [] })
    setCreating(false)
    setNewName('')
    navigate(`/liste/${id}`)
  }

  async function confirmRename(id: string) {
    const name = renameValue.trim()
    if (name) {
      await db.lists.update(id, { name, updatedAt: Date.now() })
    }
    setRenamingId(null)
  }

  async function deleteList(id: string, name: string) {
    if (confirm(`Slette pakklisten «${name}»?`)) {
      await db.lists.delete(id)
    }
  }

  return (
    <div>
      <div className="page-title-row">
        <h1>Pakklister</h1>
        {!creating && <button onClick={() => setCreating(true)}>+ Ny liste</button>}
      </div>

      {creating && (
        <div className="card">
          <div className="inline-edit-row">
            <input
              type="text"
              placeholder="Navn på tur, f.eks. Elgjakt uke 42"
              value={newName}
              autoFocus
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createList()}
            />
            <button onClick={createList}>Opprett</button>
            <button className="ghost" onClick={() => setCreating(false)}>
              Avbryt
            </button>
          </div>
        </div>
      )}

      {lists && lists.length === 0 && !creating && (
        <div className="empty-state">
          Ingen pakklister ennå.
          <br />
          Trykk «+ Ny liste» for å komme i gang.
        </div>
      )}

      {lists?.map((list) => {
        const weight = totalWeightGrams(list.entries, itemsById)
        const isRenaming = renamingId === list.id
        return (
          <div className="card" key={list.id}>
            {isRenaming ? (
              <div className="inline-edit-row">
                <input
                  type="text"
                  value={renameValue}
                  autoFocus
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && confirmRename(list.id)}
                />
                <button onClick={() => confirmRename(list.id)}>Lagre</button>
              </div>
            ) : (
              <>
                <div onClick={() => navigate(`/liste/${list.id}`)} style={{ cursor: 'pointer' }}>
                  <div className="card-title">{list.name}</div>
                  <div className="card-meta">
                    {list.entries.length} gjenstander · {formatWeight(weight)}
                  </div>
                </div>
                <div className="actions-row" style={{ marginTop: '0.6rem' }}>
                  <button
                    className="ghost"
                    onClick={() => {
                      setRenamingId(list.id)
                      setRenameValue(list.name)
                    }}
                  >
                    Endre navn
                  </button>
                  <button className="ghost" onClick={() => deleteList(list.id, list.name)}>
                    Slett
                  </button>
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
