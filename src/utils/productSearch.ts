import { getSearchSettings } from './settings'

const QUOTA_KEY = 'pakksjekk-search-quota-exceeded-date'

export class ProductSearchQuotaError extends Error {
  constructor() {
    super('Dagens gratis søk hos Google er brukt opp.')
    this.name = 'ProductSearchQuotaError'
  }
}

function markQuotaExceeded() {
  localStorage.setItem(QUOTA_KEY, new Date().toDateString())
}

export function isQuotaExceededToday(): boolean {
  const stored = localStorage.getItem(QUOTA_KEY)
  if (!stored) return false
  if (stored !== new Date().toDateString()) {
    localStorage.removeItem(QUOTA_KEY)
    return false
  }
  return true
}

export interface ProductResult {
  title: string
  snippet: string
  link: string
  displayLink: string
}

export interface ImageResult {
  thumbnailUrl: string
  contextLink: string
}

export function isProductSearchConfigured(): boolean {
  return getSearchSettings() !== null
}

async function googleSearch(params: Record<string, string>): Promise<any> {
  const settings = getSearchSettings()
  if (!settings) {
    throw new Error('Produktsøk er ikke satt opp ennå. Gå til innstillinger først.')
  }

  const url = new URL('https://www.googleapis.com/customsearch/v1')
  url.searchParams.set('key', settings.apiKey)
  url.searchParams.set('cx', settings.searchEngineId)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  const res = await fetch(url.toString())
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const reason = body?.error?.errors?.[0]?.reason
    if (res.status === 429 || reason === 'rateLimitExceeded' || reason === 'dailyLimitExceeded') {
      markQuotaExceeded()
      throw new ProductSearchQuotaError()
    }
    throw new Error(body?.error?.message || `Søket feilet (${res.status})`)
  }
  return res.json()
}

export async function searchProductText(query: string): Promise<ProductResult[]> {
  const data = await googleSearch({ q: query, num: '5' })
  return (data.items ?? []).map((item: Record<string, string>) => ({
    title: item.title,
    snippet: item.snippet ?? '',
    link: item.link,
    displayLink: item.displayLink,
  }))
}

export async function searchProductImages(query: string): Promise<ImageResult[]> {
  const data = await googleSearch({ q: query, num: '6', searchType: 'image' })
  return (data.items ?? []).map((item: { link: string; image?: { thumbnailLink?: string; contextLink?: string } }) => ({
    thumbnailUrl: item.image?.thumbnailLink ?? item.link,
    contextLink: item.image?.contextLink ?? item.link,
  }))
}

const WEIGHT_PATTERN = /(\d+(?:[.,]\d+)?)\s?(kilogram|kg|gram|g)\b/i

export function guessWeightGrams(text: string): number | null {
  const match = text.match(WEIGHT_PATTERN)
  if (!match) return null
  const value = parseFloat(match[1].replace(',', '.'))
  if (Number.isNaN(value)) return null
  const unit = match[2].toLowerCase()
  const isKilo = unit === 'kg' || unit === 'kilogram'
  return Math.round(isKilo ? value * 1000 : value)
}

export async function fetchImageAsBlob(url: string): Promise<Blob | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.blob()
  } catch {
    return null
  }
}
