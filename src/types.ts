export interface InventoryItem {
  id: string
  name: string
  category: string
  photo?: Blob
  weightGrams: number
  quantityOwned: number
  notes: string
  dependencyIds: string[]
}

export interface PackingListEntry {
  itemId: string
  quantity: number
}

export interface PackingList {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  entries: PackingListEntry[]
}
