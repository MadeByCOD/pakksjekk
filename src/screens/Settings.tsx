import { useState } from 'react'
import { Link } from 'react-router-dom'
import { clearSearchSettings, getSearchSettings, saveSearchSettings } from '../utils/settings'

export default function Settings() {
  const existing = getSearchSettings()
  const [apiKey, setApiKey] = useState(existing?.apiKey ?? '')
  const [searchEngineId, setSearchEngineId] = useState(existing?.searchEngineId ?? '')
  const [saved, setSaved] = useState(false)

  function handleSave() {
    if (!apiKey.trim() || !searchEngineId.trim()) {
      alert('Fyll inn begge feltene.')
      return
    }
    saveSearchSettings({ apiKey: apiKey.trim(), searchEngineId: searchEngineId.trim() })
    setSaved(true)
  }

  function handleClear() {
    if (!confirm('Fjerne produktsøk-oppsettet?')) return
    clearSearchSettings()
    setApiKey('')
    setSearchEngineId('')
    setSaved(false)
  }

  return (
    <div>
      <Link className="back-link" to="/inventar">
        ← Tilbake til inventar
      </Link>
      <h1>Produktsøk</h1>

      <div className="card">
        <p style={{ marginTop: 0 }}>
          For å kunne søke etter utstyr på nett trenger appen en gratis Google-nøkkel. Dette gjøres
          én gang:
        </p>
        <ol style={{ paddingLeft: '1.1rem', marginBottom: 0 }}>
          <li>
            Gå til{' '}
            <a href="https://programmablesearchengine.google.com/" target="_blank" rel="noreferrer">
              programmablesearchengine.google.com
            </a>{' '}
            og opprett et nytt søk. Velg «Søk på hele nettet».
          </li>
          <li>Kopier «Søkemotor-ID»-en (cx) fra kontrollpanelet og lim inn under.</li>
          <li>
            Gå til{' '}
            <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">
              console.cloud.google.com/apis/credentials
            </a>
            , opprett en API-nøkkel, og slå på «Custom Search API» for prosjektet i API-biblioteket.
          </li>
          <li>Lim inn API-nøkkelen under og lagre.</li>
        </ol>
      </div>

      <div className="field">
        <label>API-nøkkel</label>
        <input
          type="text"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value)
            setSaved(false)
          }}
        />
      </div>

      <div className="field">
        <label>Søkemotor-ID (cx)</label>
        <input
          type="text"
          value={searchEngineId}
          onChange={(e) => {
            setSearchEngineId(e.target.value)
            setSaved(false)
          }}
        />
      </div>

      <div className="actions-row">
        <button onClick={handleSave}>{saved ? 'Lagret ✓' : 'Lagre'}</button>
        {existing && (
          <button className="danger" onClick={handleClear}>
            Fjern oppsett
          </button>
        )}
      </div>

      <p className="card-meta" style={{ marginTop: '1rem' }}>
        Nøkkelen lagres kun lokalt på denne telefonen, aldri i koden eller i skyen. Google sin
        gratiskvote er 100 søk per dag.
      </p>
    </div>
  )
}
