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
  key: string
  itemId?: string
  adHocName?: string
  adHocWeightGrams?: number
  quantity: number
}

export interface PackingList {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  entries: PackingListEntry[]
}
