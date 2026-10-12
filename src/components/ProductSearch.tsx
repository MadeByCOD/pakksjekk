import { useState } from 'react'
import { compressImage } from '../utils/image'
import {
  fetchImageAsBlob,
  guessWeightGrams,
  isProductSearchConfigured,
  isQuotaExceededToday,
  ProductSearchQuotaError,
  searchProductImages,
  searchProductText,
  type ImageResult,
  type ProductResult,
} from '../utils/productSearch'

interface ProductSearchProps {
  onApplyNameAndWeight: (name: string, weightGrams: number | null) => void
  onApplyPhoto: (photo: Blob) => void
  confirmedName: string | null
}

type Status = 'idle' | 'loading' | 'results' | 'quota' | 'error'

function cleanTitle(title: string): string {
  return title.split(/[|–-]/)[0].trim()
}

export default function ProductSearch({
  onApplyNameAndWeight,
  onApplyPhoto,
  confirmedName,
}: ProductSearchProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [textResults, setTextResults] = useState<ProductResult[]>([])
  const [imageResults, setImageResults] = useState<ImageResult[]>([])
  const [showAllResults, setShowAllResults] = useState(false)
  const [imageFetchStatus, setImageFetchStatus] = useState<'idle' | 'loading' | 'failed'>('idle')
  const [accessoryResults, setAccessoryResults] = useState<ProductResult[] | null>(null)
  const [accessoryLoading, setAccessoryLoading] = useState(false)

  if (!isProductSearchConfigured()) {
    return null
  }

  if (isQuotaExceededToday()) {
    return (
      <div className="warning-banner" style={{ marginBottom: '1rem' }}>
        <strong>Dagens gratis nettsøk er brukt opp</strong>
        Google sin gratiskvote (100 søk/dag) er nådd. Søket er tilgjengelig igjen i morgen — fyll
        ut utstyret manuelt i feltene under i mellomtiden.
      </div>
    )
  }

  async function runSearch(q: string) {
    if (!q.trim()) return
    setStatus('loading')
    setShowAllResults(false)
    setErrorMessage('')
    try {
      const [text, images] = await Promise.all([
        searchProductText(q),
        searchProductImages(q).catch(() => []),
      ])
      setTextResults(text)
      setImageResults(images)
      setStatus(text.length > 0 ? 'results' : 'error')
      if (text.length === 0) setErrorMessage('Fant ingen treff. Prøv et annet søkeord.')
    } catch (err) {
      if (err instanceof ProductSearchQuotaError) {
        setStatus('quota')
      } else {
        setStatus('error')
        setErrorMessage(err instanceof Error ? err.message : 'Søket feilet.')
      }
    }
  }

  function pickResult(result: ProductResult) {
    const weight = guessWeightGrams(result.snippet)
    onApplyNameAndWeight(cleanTitle(result.title), weight)
  }

  async function pickImage(image: ImageResult) {
    setImageFetchStatus('loading')
    const blob = await fetchImageAsBlob(image.thumbnailUrl)
    if (!blob) {
      setImageFetchStatus('failed')
      return
    }
    const compressed = await compressImage(blob)
    onApplyPhoto(compressed)
    setImageFetchStatus('idle')
  }

  async function findAccessories() {
    if (!confirmedName) return
    setAccessoryLoading(true)
    try {
      const results = await searchProductText(`${confirmedName} tilbehør`)
      setAccessoryResults(results)
    } catch {
      setAccessoryResults([])
    }
    setAccessoryLoading(false)
  }

  if (!open) {
    return (
      <button type="button" className="secondary" style={{ marginBottom: '1rem' }} onClick={() => setOpen(true)}>
        🔎 Søk etter produkt på nett
      </button>
    )
  }

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="inline-edit-row" style={{ marginBottom: '0.5rem' }}>
        <input
          type="text"
          placeholder="F.eks. Amok Draumr"
          value={query}
          autoFocus
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runSearch(query)}
        />
        <button type="button" onClick={() => runSearch(query)} disabled={status === 'loading'}>
          {status === 'loading' ? 'Søker…' : 'Søk'}
        </button>
      </div>

      {status === 'quota' && (
        <div className="warning-banner">
          <strong>Dagens gratis nettsøk er brukt opp</strong>
          Prøv igjen i morgen. Du kan fylle ut utstyret manuelt i feltene under i mellomtiden.
        </div>
      )}

      {status === 'error' && <p className="card-meta">{errorMessage}</p>}

      {status === 'results' && textResults.length > 0 && !showAllResults && (
        <div className="card">
          <p style={{ marginTop: 0 }}>
            Er det denne? <strong>{cleanTitle(textResults[0].title)}</strong>{' '}
            <span className="card-meta">({textResults[0].displayLink})</span>
          </p>
          <p className="card-meta">{textResults[0].snippet}</p>
          <div className="actions-row">
            <button type="button" onClick={() => pickResult(textResults[0])}>
              Ja, dette er riktig
            </button>
            <button type="button" className="secondary" onClick={() => setShowAllResults(true)}>
              Nei
            </button>
          </div>
        </div>
      )}

      {status === 'results' && showAllResults && (
        <div>
          <p className="card-meta">Velg riktig treff, eller søk på nytt over:</p>
          {textResults.slice(1).map((result) => (
            <div className="card" key={result.link}>
              <div className="card-title">{cleanTitle(result.title)}</div>
              <div className="card-meta">{result.displayLink}</div>
              <div className="card-meta">{result.snippet}</div>
              <button type="button" className="ghost" onClick={() => pickResult(result)}>
                Velg denne
              </button>
            </div>
          ))}
        </div>
      )}

      {imageResults.length > 0 && (status === 'results' || imageFetchStatus !== 'idle') && (
        <div style={{ marginTop: '0.75rem' }}>
          <p className="card-meta">Velg bilde (valgfritt):</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {imageResults.map((image) => (
              <img
                key={image.thumbnailUrl}
                src={image.thumbnailUrl}
                alt=""
                onClick={() => pickImage(image)}
                style={{
                  width: 64,
                  height: 64,
                  objectFit: 'cover',
                  borderRadius: 8,
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
          {imageFetchStatus === 'failed' && (
            <p className="card-meta">
              Kunne ikke hente bildet automatisk. Åpne det i nettleseren og last det opp manuelt i
              bilde-feltet over.
            </p>
          )}
        </div>
      )}

      {confirmedName && (
        <div style={{ marginTop: '0.75rem' }}>
          <button type="button" className="ghost" onClick={findAccessories} disabled={accessoryLoading}>
            {accessoryLoading ? 'Søker…' : `🔎 Finn tilbehør til «${confirmedName}»`}
          </button>
          {accessoryResults && (
            <div style={{ marginTop: '0.5rem' }}>
              {accessoryResults.length === 0 && <p className="card-meta">Fant ingen treff.</p>}
              {accessoryResults.length > 0 && (
                <p className="card-meta">
                  Søketreff — vurder selv om noe bør legges til som eget utstyr og kobles som
                  avhengighet under.
                </p>
              )}
              {accessoryResults.map((result) => (
                <a
                  key={result.link}
                  href={result.link}
                  target="_blank"
                  rel="noreferrer"
                  className="card"
                  style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
                >
                  <div className="card-title">{cleanTitle(result.title)}</div>
                  <div className="card-meta">{result.displayLink}</div>
                  <div className="card-meta">{result.snippet}</div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
