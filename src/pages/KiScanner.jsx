import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../App'
import { gasRequest } from '../config'

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

  const handleScan = async () => {
    if (!file) {
      addToast('Bitte zuerst ein PDF hochladen', 'error')
      return
    }

    setScanning(true)
    setScanResult(null)

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
  "vorlagefrist": "Vorlagefrist-Datum im Format YYYY-MM-DD"
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
  "jahresumsatz": "Betrag als String"
}

Text des Antrags:
${text.substring(0, 8000)}`

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      })

      const data = await response.json()
      const resultText = data.content?.[0]?.text || ''

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

  const handleDirectSave = async () => {
    if (!scanResult) return
    addToast('Kunde wird direkt angelegt...', 'info')
    try {
      const result = await gasRequest('neuerKunde', scanResult)
      if (result?.status !== 'success') {
        throw new Error(result?.message || 'Konnte Kunden nicht anlegen')
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
        <div className="card" style={{ borderColor: 'rgba(34,197,94,0.3)' }}>
          <div className="card-header">
            <h3 className="card-title" style={{ color: 'var(--green)' }}>✅ Extrahierte Daten</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={handleUebernehmen}>
                ✏️ Bearbeiten
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleDirectSave}>
                💾 Direkt speichern
              </button>
            </div>
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
