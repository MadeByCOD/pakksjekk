import Dexie, { type EntityTable } from 'dexie'
import type { InventoryItem, PackingList } from './types'

const db = new Dexie('pakksjekk') as Dexie & {
  items: EntityTable<InventoryItem, 'id'>
  lists: EntityTable<PackingList, 'id'>
}

db.version(1).stores({
  items: 'id, name, category',
  lists: 'id, name, updatedAt',
})

export { db }
