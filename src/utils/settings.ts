const STORAGE_KEY = 'pakksjekk-search-settings'

export interface SearchSettings {
  apiKey: string
  searchEngineId: string
}

export function getSearchSettings(): SearchSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.apiKey || !parsed?.searchEngineId) return null
    return parsed
  } catch {
    return null
  }
}

export function saveSearchSettings(settings: SearchSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function clearSearchSettings() {
  localStorage.removeItem(STORAGE_KEY)
}
