import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../App'
import { gasGet, gasRequest, getAnthropicApiUrl } from '../config'

export default function KiScanner() {
  const navigate = useNavigate()
  const addToast = useToast()
  const fileInputRef = useRef(null)

  const [dokTyp, setDokTyp] = useState('zuwendungsbescheid')
  const [file, setFile] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [scanStep, setScanStep] = useState('')
  const [pdfText, setPdfText] = useState('')

  const [kunden, setKunden] = useState([])
  const [kundenLoading, setKundenLoading] = useState(false)
  const [actionMode, setActionMode] = useState('create') // 'create' | 'assign'
  const [selectedKundeId, setSelectedKundeId] = useState('')

  const [foerderfaelle, setFoerderfaelle] = useState([])
  const [foerderfaelleLoading, setFoerderfaelleLoading] = useState(false)
  const [selectedFoerderfallDate, setSelectedFoerderfallDate] = useState('')

  React.useEffect(() => {
    // Default flow:
    // - Antrag: new customer
    // - Zuwendungsbescheid: assign to existing customer
    setActionMode(dokTyp === 'zuwendungsbescheid' ? 'assign' : 'create')
  }, [dokTyp])

  React.useEffect(() => {
    if (!scanResult) return

    let alive = true
    async function loadKunden() {
      setKundenLoading(true)
      try {
        const res = await gasGet('getKunden')
        if (!alive) return
        if (res?.status !== 'success') throw new Error(res?.message || 'Kunden konnten nicht geladen werden')
        const list = Array.isArray(res?.kunden) ? res.kunden : []
        setKunden(list)

        // Auto-preselect best match (especially helpful for Zuwendungsbescheid)
        const ubf = String(scanResult?.ubf_nummer || '').replace(/\D+/g, '')
        if (ubf) {
          const match = list.find(k => String(k?.UBF_Nummer || '').replace(/\D+/g, '') === ubf)
          if (match?.ID) setSelectedKundeId(String(match.ID))
        } else if (scanResult?.firma) {
          const name = String(scanResult.firma).trim().toLowerCase()
          const match = list.find(k => String(k?.Firma || '').trim().toLowerCase() === name)
          if (match?.ID) setSelectedKundeId(String(match.ID))
        }
      } catch (e) {
        if (!alive) return
        setKunden([])
        addToast('Kundenliste konnte nicht geladen werden: ' + (e?.message || String(e)), 'error')
      } finally {
        if (alive) setKundenLoading(false)
      }
    }

    loadKunden()
    return () => { alive = false }
  }, [scanResult])

  React.useEffect(() => {
    if (!selectedKundeId) {
      setFoerderfaelle([])
      setSelectedFoerderfallDate('')
      return
    }

    let alive = true
    async function loadFoerderfaelle() {
      setFoerderfaelleLoading(true)
      try {
        const res = await gasGet('getFoerderfaelle', { kundeId: selectedKundeId })
        if (!alive) return
        if (res?.status !== 'success') throw new Error(res?.message || 'Förderfälle konnten nicht geladen werden')
        const list = Array.isArray(res?.foerderfaelle) ? res.foerderfaelle : []
        setFoerderfaelle(list)

        // Auto-select: match scan date (antrag_datum / bescheid_datum)
        const scanDate = String(scanResult?.antrag_datum || scanResult?.bescheid_datum || '').trim()
        if (scanDate) {
          const match = list.find(f => String(f?.date) === scanDate)
          if (match?.date) setSelectedFoerderfallDate(String(match.date))
        }
      } catch (e) {
        if (!alive) return
        setFoerderfaelle([])
        setSelectedFoerderfallDate('')
        addToast('Förderfälle konnten nicht geladen werden: ' + (e?.message || String(e)), 'error')
      } finally {
        if (alive) setFoerderfaelleLoading(false)
      }
    }

    loadFoerderfaelle()
    return () => { alive = false }
  }, [selectedKundeId])

  const handleDrop = (e) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f && f.type === 'application/pdf') setFile(f)
    else addToast('Bitte nur PDF-Dateien hochladen', 'error')
  }

  const handleFileSelect = (e) => {
    const f = e.target.files[0]
    if (f) setFile(f)
  }

  const extractPdfText = async (pdfFile) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const pdfjsLib = await import('pdfjs-dist')
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`

          const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(reader.result) }).promise
          let fullText = ''

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i)
            const textContent = await page.getTextContent()
            const pageText = textContent.items.map(item => item.str).join(' ')
            fullText += pageText + '\n\n'
          }

          resolve(fullText)
        } catch (err) {
          console.error('PDF.js Fehler:', err)
          resolve(`[PDF-Datei konnte nicht per PDF.js gelesen werden]\nDateiname: ${pdfFile.name}\nGröße: ${pdfFile.size} bytes`)
        }
      }
      reader.onerror = reject
      reader.readAsArrayBuffer(pdfFile)
    })
  }

  const readJsonSafely_ = async (resp) => {
    const text = await resp.text()
    if (!text) return {}
    try {
      return JSON.parse(text)
    } catch (_) {
      return { raw: text }
    }
  }

  const arrayBufferToBase64_ = (buffer) => {
    const bytes = new Uint8Array(buffer)
    const chunkSize = 0x8000
    let binary = ''
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize)
      binary += String.fromCharCode.apply(null, chunk)
    }
    return btoa(binary)
  }

  const storeScanDocument_ = async ({ kundeId, docType, dateIso }) => {
    if (!file) return
    if (!kundeId) return

    // Avoid extremely large payloads (Apps Script + base64 + JSON overhead)
    const maxBytes = 12 * 1024 * 1024
    if (file.size > maxBytes) {
      addToast('PDF ist zu groß zum automatischen Ablegen in Drive (>12MB). Bitte verkleinern/komprimieren und erneut versuchen.', 'error')
      return
    }

    let base64Data = ''
    try {
      const buf = await file.arrayBuffer()
      base64Data = arrayBufferToBase64_(buf)
    } catch (e) {
      addToast('PDF konnte nicht gelesen werden (für Drive-Upload): ' + (e?.message || String(e)), 'error')
      return
    }

    try {
      const res = await gasRequest('storeScanDocument', {
        kundeId,
        docType,
        antragDatum: dateIso || '',
        fileName: file.name,
        mimeType: file.type || 'application/pdf',
        base64Data
      })
      if (res?.status !== 'success') throw new Error(res?.message || 'Dokument konnte nicht in Drive abgelegt werden')
      addToast('PDF in Drive abgelegt', 'success')
    } catch (e) {
      const msg = String(e?.message || e)
      const hint = /Unbekannte Aktion:\s*storeScanDocument/i.test(msg)
        ? ' (GAS-WebApp läuft vermutlich noch auf alter Version/URL. Bitte GAS-Deployment aktualisieren und die GAS-URL in den Einstellungen prüfen.)'
        : ''
      addToast('PDF konnte nicht in Drive abgelegt werden: ' + msg + hint, 'error')
    }
  }

  const handleScan = async () => {
    if (!file) {
      addToast('Bitte zuerst ein PDF hochladen', 'error')
      return
    }

    setScanning(true)
    setScanResult(null)
    setSelectedKundeId('')

    try {
      setScanStep('📄 PDF wird gelesen...')
      const text = await extractPdfText(file)
      setPdfText(text)

      setScanStep('🤖 KI analysiert das Dokument...')

      const prompt = dokTyp === 'zuwendungsbescheid'
        ? `Du bist ein Experte für BAFA-Zuwendungsbescheide. Extrahiere aus folgendem Text alle relevanten Daten.

Antworte NUR mit einem JSON-Objekt, keine Erklärungen:
{
  "firma": "Firmenname des Antragstellers",
  "ansprechpartner": "Vollständiger Name",
  "vorname": "Vorname",
  "nachname": "Nachname",
  "strasse": "Straße und Hausnummer",
  "plz": "PLZ",
  "ort": "Ort",
  "ubf_nummer": "Nur die Zahlen der UBF-Nummer ohne 'UBF-' Prefix",
  "bescheid_datum": "Datum im Format YYYY-MM-DD",
  "vorlagefrist": "Vorlagefrist-Datum im Format YYYY-MM-DD",
  "antrag_datum": "Datum des Antrags/Bescheids im Format YYYY-MM-DD (für Ordnername Antrag tt.mm.jjjj; wenn unklar, nimm bescheid_datum)"
}

Text des Zuwendungsbescheids:
${text.substring(0, 6000)}`
        : `Du bist ein Experte für BAFA-Förderanträge (UBF3). Extrahiere aus folgendem Antragstext alle relevanten Daten.

Antworte NUR mit einem JSON-Objekt, keine Erklärungen:
{
  "firma": "Firmenname",
  "anrede": "Herr oder Frau",
  "vorname": "Vorname",
  "nachname": "Nachname",
  "strasse": "Straße und Hausnummer",
  "plz": "PLZ",
  "ort": "Ort",
  "telefon": "Telefonnummer",
  "email": "E-Mail-Adresse",
  "rechtsform": "Rechtsform",
  "gruendungsdatum": "YYYY-MM-DD",
  "geschaeftsgegenstand": "Geschäftsgegenstand",
  "wz_klassifikation": "Wirtschaftszweig-Code und Bezeichnung",
  "unternehmenstyp": "eigenständig/Partner/verbunden",
  "anzahl_beschaeftigte": "Zahl als Number",
  "jahresbilanzsumme": "Betrag als String",
  "jahresumsatz": "Betrag als String",
  "antrag_datum": "Datum des Antrags im Format YYYY-MM-DD (meist letzte Seite: 'Formular eingegangen am DD.MM.YYYY')"
}

Text des Antrags:
${text.substring(0, 8000)}`

      const url = getAnthropicApiUrl()

      let response
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000
          })
        })
      } catch (e) {
        const msg = String(e?.message || e)
        if (/failed to fetch/i.test(msg)) {
          throw new Error(
            `Claude-Proxy nicht erreichbar (${url}). ` +
            `Wenn du lokal entwickelst, starte die App über Netlify Functions (z.B. \"netlify dev\"). ` +
            `In Netlify-Prod: prüfe, ob die Function deployed ist und die Env-Var ANTHROPIC_API_KEY gesetzt ist.`
          )
        }
        throw e
      }

      const data = await readJsonSafely_(response)
      if (!response.ok || data?.status === 'error') {
        const rawHint = typeof data?.raw === 'string' && data.raw.trim()
          ? ` Antwort war kein JSON (vermutlich HTML/Redirect): ${data.raw.slice(0, 120)}...`
          : ''
        throw new Error(data?.message || `Claude-Request fehlgeschlagen (${response.status}).${rawHint}`)
      }

      const anthropic = data?.anthropic || data
      const resultText = anthropic?.content?.[0]?.text || ''

      setScanStep('✅ Daten werden verarbeitet...')
      const jsonMatch = resultText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Konnte kein JSON aus der KI-Antwort extrahieren')

      let parsed
      try {
        parsed = JSON.parse(jsonMatch[0])
      } catch (_) {
        throw new Error('KI-Antwort enthielt JSON, aber es konnte nicht geparst werden')
      }

      setScanResult(parsed)
      addToast('KI-Extraktion erfolgreich!', 'success')
    } catch (error) {
      console.error('Scan Fehler:', error)
      addToast('Fehler bei der Analyse: ' + (error?.message || String(error)), 'error')
    } finally {
      setScanning(false)
      setScanStep('')
    }
  }

  const handleUebernehmen = () => {
    addToast('Daten werden übernommen...', 'success')
    navigate('/neu', { state: { prefill: scanResult } })
  }

  const mapScanToKundenUpdate_ = (scan, type) => {
    const out = {}
    const put = (key, value) => {
      if (value === undefined || value === null) return
      const s = typeof value === 'string' ? value.trim() : value
      if (s === '') return
      out[key] = s
    }

    // Common fields (use Sheet header names)
    put('Firma', scan?.firma)
    put('Ansprechpartner', scan?.ansprechpartner)
    put('Anrede', scan?.anrede)
    put('Vorname', scan?.vorname)
    put('Nachname', scan?.nachname)
    put('Strasse', scan?.strasse)
    put('PLZ', scan?.plz)
    put('Ort', scan?.ort)
    put('Telefon', scan?.telefon)
    put('Email', scan?.email)
    put('Rechtsform', scan?.rechtsform)
    put('Gruendungsdatum', scan?.gruendungsdatum)
    put('Geschaeftsgegenstand', scan?.geschaeftsgegenstand)
    put('WZ_Klassifikation', scan?.wz_klassifikation)
    put('Unternehmenstyp', scan?.unternehmenstyp)
    put('Anzahl_Beschaeftigte', scan?.anzahl_beschaeftigte)
    put('Jahresbilanzsumme', scan?.jahresbilanzsumme)
    put('Jahresumsatz', scan?.jahresumsatz)

    if (type === 'zuwendungsbescheid') {
      put('UBF_Nummer', scan?.ubf_nummer)
      put('Bescheid_Datum', scan?.bescheid_datum)
      put('Vorlagefrist', scan?.vorlagefrist)
    }

    return out
  }

  const handleAssignUpdate = async () => {
    if (!scanResult) return
    if (!selectedKundeId) {
      addToast('Bitte zuerst einen Kunden auswählen', 'error')
      return
    }

    const updateFields = mapScanToKundenUpdate_(scanResult, dokTyp)
    const keys = Object.keys(updateFields)
    if (!keys.length) {
      addToast('Keine verwertbaren Felder zum Aktualisieren gefunden', 'error')
      return
    }

    addToast('Kunde wird aktualisiert...', 'info')
    try {
      const res = await gasRequest('updateKunde', { id: selectedKundeId, ...updateFields })
      if (res?.status !== 'success') throw new Error(res?.message || 'Kunde konnte nicht aktualisiert werden')

      // Store the scanned PDF in Drive under the chosen foerderfall (preferred)
      const dateIso = String(selectedFoerderfallDate || scanResult?.antrag_datum || scanResult?.bescheid_datum || '').trim()
      if (!dateIso) {
        addToast('Hinweis: Kein Datum für Ablage gefunden (antrag_datum/bescheid_datum). PDF wird nicht automatisch abgelegt.', 'info')
      } else {
        await storeScanDocument_({ kundeId: selectedKundeId, docType: dokTyp, dateIso })
      }

      addToast('Kunde aktualisiert!', 'success')
      navigate(`/kunde/${selectedKundeId}`)
    } catch (e) {
      addToast('Fehler beim Aktualisieren: ' + (e?.message || String(e)), 'error')
    }
  }

  const ensureFoerderfallFolder = async () => {
    if (!scanResult) return
    if (!selectedKundeId) {
      addToast('Bitte zuerst einen Kunden auswählen', 'error')
      return
    }

    const date = String(scanResult?.antrag_datum || scanResult?.bescheid_datum || '').trim()
    if (!date) {
      addToast('Kein Datum im Scan gefunden (antrag_datum/bescheid_datum). Bitte erst prüfen/bearbeiten.', 'error')
      return
    }

    addToast('Antrag-Unterordner wird angelegt...', 'info')
    try {
      const res = await gasRequest('addFoerderfall', { kundeId: selectedKundeId, antragDatum: date })
      if (res?.status !== 'success') throw new Error(res?.message || 'Foerderfall konnte nicht angelegt werden')
      const created = res?.foerderfall
      if (created?.date) setSelectedFoerderfallDate(String(created.date))
      // refresh list
      const refreshed = await gasGet('getFoerderfaelle', { kundeId: selectedKundeId })
      if (refreshed?.status === 'success') setFoerderfaelle(Array.isArray(refreshed?.foerderfaelle) ? refreshed.foerderfaelle : [])
      addToast('Antrag-Unterordner angelegt', 'success')
    } catch (e) {
      addToast('Fehler beim Anlegen des Antrag-Ordners: ' + (e?.message || String(e)), 'error')
    }
  }

  const handleDirectSave = async () => {
    if (!scanResult) return
    addToast('Kunde wird direkt angelegt...', 'info')
    try {
      const result = await gasRequest('neuerKunde', scanResult)
      if (result?.status !== 'success') {
        throw new Error(result?.message || 'Konnte Kunden nicht anlegen')
      }

      const kundeId = result?.kundeId
      const dateIso = String(scanResult?.antrag_datum || '').trim()
      if (kundeId) {
        await storeScanDocument_({ kundeId, docType: dokTyp, dateIso })
      }

      addToast(`Kunde ${scanResult.firma || 'angelegt'} angelegt!`, 'success')
      if (result?.kundeId) navigate(`/kunde/${result.kundeId}`)
      else navigate('/')
    } catch (e) {
      addToast('Fehler beim Anlegen: ' + (e?.message || String(e)), 'error')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>🤖 KI-Scanner</h2>
          <p className="subtitle">Zuwendungsbescheide und Anträge automatisch auslesen</p>
        </div>
      </div>

      {/* Dokumenttyp Auswahl */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Dokumenttyp wählen</h3>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className={`btn ${dokTyp === 'zuwendungsbescheid' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setDokTyp('zuwendungsbescheid')}
          >
            📜 Zuwendungsbescheid
          </button>
          <button
            className={`btn ${dokTyp === 'antrag' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setDokTyp('antrag')}
          >
            📝 Antrag (UBF3)
          </button>
        </div>
        <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-dim)' }}>
          {dokTyp === 'zuwendungsbescheid' 
            ? 'Extrahiert: Firma, UBF-Nummer, Bescheid-Datum, Vorlagefrist, Adressdaten'
            : 'Extrahiert: Alle Antragsdaten inkl. KMU-Daten, Unternehmenstyp, Beschäftigte, Umsatz'}
        </div>
      </div>

      {/* Upload Zone */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">PDF hochladen</h3>
        </div>
        <div
          className={`upload-zone ${file ? 'active' : ''}`}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          {file ? (
            <>
              <div className="icon">✅</div>
              <p><span className="highlight">{file.name}</span></p>
              <p style={{ marginTop: 4 }}>{(file.size / 1024).toFixed(0)} KB — Klicken um zu ändern</p>
            </>
          ) : (
            <>
              <div className="icon">📂</div>
              <p>PDF hier <span className="highlight">ablegen</span> oder <span className="highlight">klicken</span></p>
              <p style={{ marginTop: 4, fontSize: 12 }}>
                {dokTyp === 'zuwendungsbescheid' ? 'Zuwendungsbescheid' : 'Antrag UBF3'} als PDF
              </p>
            </>
          )}
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleScan} disabled={!file || scanning}>
            {scanning ? '⏳ Analysiert...' : '🤖 KI-Analyse starten'}
          </button>
        </div>
      </div>

      {/* Scan Status */}
      {scanning && (
        <div className="ki-status">
          <div className="ki-spinner" />
          <span>{scanStep}</span>
        </div>
      )}

      {/* Ergebnis */}
      {scanResult && (
        <>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Kunden-Aktion</h3>
            </div>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="scannerAction"
                  checked={actionMode === 'create'}
                  onChange={() => setActionMode('create')}
                />
                Neuen Kunden anlegen
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="scannerAction"
                  checked={actionMode === 'assign'}
                  onChange={() => setActionMode('assign')}
                />
                Bestehendem Kunden zuordnen (ergänzen)
              </label>
            </div>

            {actionMode === 'assign' && (
              <div style={{ marginTop: 12 }}>
                <div className="form-group">
                  <label className="form-label">Kunde auswählen</label>
                  <select
                    className="form-select"
                    value={selectedKundeId}
                    onChange={(e) => setSelectedKundeId(e.target.value)}
                    disabled={kundenLoading}
                  >
                    <option value="">{kundenLoading ? 'Lade Kunden...' : 'Bitte wählen'}</option>
                    {kunden.map(k => (
                      <option key={k?.ID} value={k?.ID}>
                        {k?.Firma ? `${k.Firma} (${k.ID})` : k?.ID}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginTop: 12 }}>
                  <label className="form-label">Antrag auswählen (Unterordner)</label>
                  <select
                    className="form-select"
                    value={selectedFoerderfallDate}
                    onChange={(e) => setSelectedFoerderfallDate(e.target.value)}
                    disabled={!selectedKundeId || foerderfaelleLoading}
                  >
                    <option value="">{foerderfaelleLoading ? 'Lade Anträge...' : 'Bitte wählen'}</option>
                    {foerderfaelle.map(f => (
                      <option key={f?.date} value={f?.date}>
                        {f?.name || f?.date}
                      </option>
                    ))}
                  </select>
                  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={ensureFoerderfallFolder} disabled={!selectedKundeId}>
                      ➕ Antrag-Unterordner anlegen
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => selectedKundeId && navigate(`/kunde/${selectedKundeId}`)}
                    disabled={!selectedKundeId}
                  >
                    📂 Zum Kunden
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleAssignUpdate}
                    disabled={!selectedKundeId}
                  >
                    ✅ Kunde aktualisieren
                  </button>
                </div>
              </div>
            )}

            {actionMode === 'create' && (
              <div style={{ marginTop: 12, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={handleUebernehmen}>
                  ✏️ Bearbeiten
                </button>
                <button className="btn btn-primary" onClick={handleDirectSave}>
                  💾 Direkt speichern
                </button>
              </div>
            )}
          </div>

          <div className="card" style={{ borderColor: 'rgba(34,197,94,0.3)' }}>
            <div className="card-header">
              <h3 className="card-title" style={{ color: 'var(--green)' }}>✅ Extrahierte Daten</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {Object.entries(scanResult).map(([key, value]) => (
                <div key={key} style={{ padding: '8px 12px', background: 'var(--navy)', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {key.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>
                    {value || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Extrahierter Text (Debug) */}
      {pdfText && (
        <details style={{ marginTop: 16 }}>
          <summary style={{ cursor: 'pointer', color: 'var(--text-dim)', fontSize: 13 }}>
            📝 Extrahierter PDF-Text anzeigen (Debug)
          </summary>
          <div className="email-preview" style={{ marginTop: 8, maxHeight: 200, fontSize: 11 }}>
            {pdfText.substring(0, 3000)}
            {pdfText.length > 3000 && '\n\n... (gekürzt)'}
          </div>
        </details>
      )}
    </div>
  )
}
