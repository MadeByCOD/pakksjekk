const STATS_KEY = 'pakksjekk-search-domain-hits'

export interface DomainHit {
  domain: string
  count: number
  lastUsed: number
}

function readStats(): Record<string, DomainHit> {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function recordDomainHit(domain: string) {
  if (!domain) return
  const stats = readStats()
  const existing = stats[domain]
  stats[domain] = { domain, count: (existing?.count ?? 0) + 1, lastUsed: Date.now() }
  localStorage.setItem(STATS_KEY, JSON.stringify(stats))
}

export function getDomainHits(): DomainHit[] {
  return Object.values(readStats()).sort((a, b) => b.count - a.count)
}

export function clearDomainHits() {
  localStorage.removeItem(STATS_KEY)
}
