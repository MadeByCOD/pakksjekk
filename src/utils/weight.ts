import type { InventoryItem, PackingListEntry } from '../types'

export function formatWeight(grams: number): string {
  if (grams >= 1000) {
    const kg = grams / 1000
    return `${kg.toLocaleString('nb-NO', { maximumFractionDigits: 2 })} kg`
  }
  return `${Math.round(grams)} g`
}

export function entryWeightGrams(
  entry: PackingListEntry,
  itemsById: Map<string, InventoryItem>,
): number {
  if (entry.itemId) return itemsById.get(entry.itemId)?.weightGrams ?? 0
  return entry.adHocWeightGrams ?? 0
}

export function totalWeightGrams(
  entries: PackingListEntry[],
  itemsById: Map<string, InventoryItem>,
): number {
  return entries.reduce((sum, entry) => sum + entryWeightGrams(entry, itemsById) * entry.quantity, 0)
}

export interface MissingDependency {
  item: InventoryItem
  missingDependencies: InventoryItem[]
}

export function findMissingDependencies(
  entries: PackingListEntry[],
  itemsById: Map<string, InventoryItem>,
): MissingDependency[] {
  const selectedIds = new Set(entries.map((e) => e.itemId).filter((id): id is string => !!id))
  const result: MissingDependency[] = []

  for (const entry of entries) {
    if (!entry.itemId) continue
    const item = itemsById.get(entry.itemId)
    if (!item || item.dependencyIds.length === 0) continue

    const missingDependencies = item.dependencyIds
      .filter((depId) => !selectedIds.has(depId))
      .map((depId) => itemsById.get(depId))
      .filter((dep): dep is InventoryItem => dep !== undefined)

    if (missingDependencies.length > 0) {
      result.push({ item, missingDependencies })
    }
  }

  return result
}

export function wouldCreateDependencyCycle(
  itemId: string,
  newDependencyIds: string[],
  itemsById: Map<string, InventoryItem>,
): boolean {
  const visited = new Set<string>()
  const stack = [...newDependencyIds]

  while (stack.length > 0) {
    const currentId = stack.pop()!
    if (currentId === itemId) return true
    if (visited.has(currentId)) continue
    visited.add(currentId)

    const current = itemsById.get(currentId)
    if (current) stack.push(...current.dependencyIds)
  }

  return false
}
