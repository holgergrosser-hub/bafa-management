import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useToast } from '../App'
import { CONFIG, gasGet, gasRequest } from '../config'

const CHECKLIST_LABELS = {
  Beraterbericht: '01 Beraterbericht (unterschrieben)',
  Inhaltsverzeichnis: '02 Inhaltsverzeichnis',
  Verfahrensanweisung: '03 Verfahrensanweisung',
  KMU_Erklaerung: '04 EU-KMU & De-minimis-Erklärung',
  Charta_Erklaerung: '05 Charta der Grundrechte EU',
  Rechnung: '06 Rechnung',
  Kontoauszug: '07 Kontoauszug',
  Verwendungsnachweis: '08 Verwendungsnachweisformular',
  Projektbericht: '09 Projektbericht',
  Email_versendet: '✉️ E-Mail an Kunden versendet'
}

export default function KundeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const addToast = useToast()
  
  const [kunde, setKunde] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [activeTab, setActiveTab] = useState('uebersicht')
  const [emailPreview, setEmailPreview] = useState(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showErinnerungModal, setShowErinnerungModal] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [reminderLoading, setReminderLoading] = useState(false)

  useEffect(() => {
    if (!id) return

    let alive = true
    async function load() {
      setLoading(true)
      try {
        const res = await gasGet('getKunde', { id })
        if (!alive) return
        if (res?.status !== 'success') throw new Error(res?.message || 'Kunde nicht gefunden')
        setKunde(res?.kunde || null)
      } catch (e) {
        if (!alive) return
        setKunde(null)
        addToast('Kunde konnte nicht geladen werden: ' + (e?.message || String(e)), 'error')
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()
    return () => { alive = false }
  }, [id])

  const tabs = [
    { id: 'uebersicht', label: '📋 Übersicht' },
    { id: 'checkliste', label: '✅ Checkliste' },
    { id: 'projekt', label: '📊 Projektdaten' },
    { id: 'email', label: '✉️ E-Mail' },
    { id: 'projektbericht', label: '📄 Projektbericht' },
  ]

  // Checkliste-Fortschritt berechnen
  const checkItems = Object.keys(CHECKLIST_LABELS)
  const checkDone = checkItems.filter(k => kunde?.checkliste?.[k]).length
  const checkProgress = Math.round((checkDone / checkItems.length) * 100)

  const handleCheckToggle = async (key) => {
    if (!kunde?.ID) return
    const prevVal = !!kunde?.checkliste?.[key]
    const nextVal = !prevVal

    setKunde(prev => ({
      ...prev,
      checkliste: { ...(prev?.checkliste || {}), [key]: nextVal }
    }))

    try {
      const res = await gasRequest('updateCheckliste', { kundeId: kunde.ID, [key]: nextVal })
      if (res?.status !== 'success') throw new Error(res?.message || 'Konnte Checkliste nicht speichern')
      addToast(`${CHECKLIST_LABELS[key]} ${nextVal ? 'erledigt' : 'offen'}`, 'success')
    } catch (e) {
      // rollback
      setKunde(prev => ({
        ...prev,
        checkliste: { ...(prev?.checkliste || {}), [key]: prevVal }
      }))
      addToast('Fehler beim Speichern: ' + (e?.message || String(e)), 'error')
    }
  }

  const generateEmailLocal_ = () => {
    const anrede = kunde.Anrede === 'Herr' ? 'Sehr geehrter Herr' : 'Sehr geehrte Frau'
    const frist = formatDate(kunde.Vorlagefrist)

    const text = `${anrede} ${kunde.Nachname},

im Anhang erhalten Sie die Verwendungsnachweisunterlagen für die QM-Beratung, die für den BAFA-Antrag erforderlich sind.

Folgende Unterlagen müssen spätestens sechs Monate nach Erhalt Ihres Informationsschreibens in elektronischer Form bei der Leitstelle vorliegen (als Anhänge per E-Mail). Die Vorlagefrist endet am ${frist}.

Anmeldung über folgenden Link:
https://fms.bafa.de/BafaFrame/unternehmensberatung

Ihre Zugangsdaten zum Verwendungsnachweis:
• Vorgangsnummer: ${kunde.UBF_Nummer} (nur die Zahlen, ohne "UBF")
• Passwort: ${kunde.PLZ} (Ihre 5-stellige Postleitzahl)

Bitte füllen Sie alle Pflichtfelder aus.

Angaben zum Beratungsunternehmen:
• BAFA-ID: ${CONFIG.BAFA_ID}
• Durchgeführte Beratung: bitte "organisatorisch" auswählen

Informationen zum Projektstart und -Ende, Projekttagen sowie Inhalt und Ziel des Beratungsauftrages finden Sie im beigefügten Beraterbericht.

Kosten der Beratung: siehe beigefügte Rechnung

Folgende Unterlagen müssen vollständig hochgeladen werden:

1. Beraterbericht (unterschrieben von Berater und Antragsteller) inkl. Fragebogen "bereichsübergreifende Grundsätze des ESF Plus"
2. Inhaltsverzeichnis und Verfahrensanweisung des QM-Dienstleisters
3. EU-KMU-Erklärung und De-minimis-Erklärung (ausgefüllt und unterschrieben)
4. Erklärung zur Kenntnisnahme des Merkblatts zur Charta der Grundrechte der EU (unterschrieben)
5. Rechnung des Beratungsunternehmens
6. Kontoauszug zum Nachweis der vollständigen Zahlung (kein Online-Auszug!)

Nach dem Absenden erhalten Sie eine E-Mail mit einem Link zum vorbefüllten Verwendungsnachweisformular. Dieses bitte ausdrucken, unterschreiben (2x!) und über den Upload-Bereich hochladen.

Erst mit Ihrer Unterschrift ist der Verwendungsnachweis frist- und formgerecht erstellt.

Bei Fragen stehe ich Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen

${CONFIG.BERATER_NAME}
${CONFIG.BERATER_FIRMA}
${CONFIG.BERATER_ADRESSE}`

    setEmailPreview({
      an: kunde.Email,
      betreff: `BAFA Verwendungsnachweis – ${kunde.Firma} – Frist: ${frist}`,
      text: text
    })
    setShowEmailModal(true)
  }

  const generateEmail = async () => {
    if (!kunde?.ID) return
    setEmailLoading(true)
    try {
      const res = await gasRequest('erstelleEmail', { kundeId: kunde.ID })
      if (res?.status !== 'success') throw new Error(res?.message || 'E-Mail konnte nicht generiert werden')
      const email = res?.email
      if (!email?.an || !email?.betreff || !email?.text) throw new Error('Ungültige E-Mail-Daten vom Backend')
      setEmailPreview({ an: email.an, betreff: email.betreff, text: email.text })
      setShowEmailModal(true)
    } catch (e) {
      addToast('Backend-E-Mail nicht verfügbar – nutze lokale Vorlage.', 'info')
      generateEmailLocal_()
    } finally {
      setEmailLoading(false)
    }
  }

  const copyReminderText = async () => {
    if (!kunde?.ID) return
    setReminderLoading(true)
    try {
      const res = await gasRequest('sendeErinnerung', { kundeId: kunde.ID, frontendBaseUrl: window.location.origin })
      if (res?.status !== 'success') throw new Error(res?.message || 'Erinnerung konnte nicht erzeugt werden')
      const text = res?.erinnerung?.text
      if (!text) throw new Error('Ungültige Erinnerung vom Backend')
      await navigator.clipboard.writeText(text)
      addToast('Erinnerungstext kopiert!', 'success')
    } catch (e) {
      const text = `Hallo,\n\nfür den BAFA-Kunden ${kunde.Firma} benötigen wir noch folgende Informationen:\n\n• Projektleiter\n• Gebrauchte Stunden\n• Was wurde gemacht\n• Rechnung\n\nBitte trage die Daten über folgenden Link ein:\n${plLink}\n\nDie Vorlagefrist endet am ${formatDate(kunde.Vorlagefrist)}.\n\nVielen Dank!`
      await navigator.clipboard.writeText(text)
      addToast('Backend-Erinnerung nicht verfügbar – lokale Vorlage kopiert.', 'info')
    } finally {
      setReminderLoading(false)
    }
  }

  const plLink = kunde ? `${window.location.origin}/projektleiter?token=${kunde.projekt?.PL_Token || ''}` : ''

  const handleDownloadProjektbericht = async () => {
    if (!kunde) return
    setDownloading(true)
    try {
      const docx = await import('docx')
      const { Document, Packer, Paragraph, TextRun } = docx

      const lines = [
        'BERATERBERICHT & Fragebogen "bereichsübergreifende Grundsätze des ESF Plus"',
        '',
        CONFIG.BERATER_FIRMA,
        CONFIG.BERATER_NAME,
        CONFIG.BERATER_ADRESSE,
        '',
        `Firma: ${kunde.Firma || ''}`,
        `${kunde.Strasse || ''}`,
        `${kunde.PLZ || ''} ${kunde.Ort || ''}`.trim(),
        '',
        `Projektbeginn: ${formatDate(kunde.projekt?.Projektstart)}`,
        `Projektende: ${formatDate(kunde.projekt?.Projektende)}`,
        `Beratertage insgesamt: ${kunde.projekt?.Beratertage || ''}`,
        `Stunden insgesamt: ${kunde.projekt?.Stunden_Gesamt || ''}`,
        '',
        'Aufgabenstellung:',
        `${kunde.projekt?.Aufgabenstellung || ''}`,
        '',
        'Durchgeführte Maßnahmen:',
        `${kunde.projekt?.Was_wurde_gemacht || ''}`,
        '',
        'Bereichsübergreifende Grundsätze des ESF Plus:',
        '• Bei der Umsetzung soll eine Geschlechterparität im Projektteam gewährleistet sein.',
        '• Es finden bevorzugt virtuelle Arbeitstreffen statt. Dienstreisen erfolgen mit dem Zug (ÖPNV).',
        '• Projektmitarbeiter werden zum AGG geschult.'
      ]

      const doc = new Document({
        sections: [{
          children: lines.map(t => new Paragraph({
            children: [new TextRun({ text: t })]
          }))
        }]
      })

      const blob = await Packer.toBlob(doc)
      const filename = `Projektbericht_${(kunde.Firma || 'Kunde').replace(/[^a-z0-9äöüß\-_. ]/gi, '').trim() || 'Kunde'}.docx`
      downloadBlob_(blob, filename)
      addToast('Projektbericht heruntergeladen', 'success')
    } catch (e) {
      addToast('DOCX konnte nicht erstellt werden: ' + (e?.message || String(e)), 'error')
    } finally {
      setDownloading(false)
    }
  }

  if (loading || !kunde) {
    return (
      <div>
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn-icon" onClick={() => navigate('/')}>←</button>
            <div>
              <h2>{loading ? 'Lädt...' : 'Kunde nicht gefunden'}</h2>
              <p className="subtitle">{loading ? 'Daten werden geladen' : 'Bitte zurück zum Dashboard'}</p>
            </div>
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          {loading ? 'Bitte einen Moment warten…' : 'Kundendaten konnten nicht geladen werden.'}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn-icon" onClick={() => navigate('/')}>←</button>
            <div>
              <h2>{kunde.Firma}</h2>
              <p className="subtitle">
                UBF-{kunde.UBF_Nummer} · {kunde.Ansprechpartner} · {kunde.Ort}
              </p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className={`ampel ${kunde.ampel}`}>
            <span className="ampel-dot" />
            {kunde.fristInfo}
          </span>
        </div>
      </div>

      {/* Schnellinfo */}
      <div className="stats-row">
        <div className={`stat-card ${kunde.ampel}`}>
          <div className="stat-value" style={{ fontSize: 24 }}>{formatDate(kunde.Vorlagefrist)}</div>
          <div className="stat-label">Vorlagefrist</div>
        </div>
        <div className="stat-card blau">
          <div className="stat-value">{checkProgress}%</div>
          <div className="stat-label">Checkliste</div>
        </div>
        <div className="stat-card blau">
          <div className="stat-value" style={{ fontSize: 24 }}>{kunde.projekt?.Stunden_Gesamt || '—'}</div>
          <div className="stat-label">Stunden gesamt</div>
        </div>
        <div className="stat-card blau">
          <div className="stat-value" style={{ fontSize: 24 }}>{kunde.projekt?.Beratertage || '—'}</div>
          <div className="stat-label">Beratertage</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Inhalte */}
      {activeTab === 'uebersicht' && (
        <div>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>👤 Kontaktdaten</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              {[
                ['Anrede', kunde.Anrede],
                ['Name', `${kunde.Vorname} ${kunde.Nachname}`],
                ['Firma', kunde.Firma],
                ['Adresse', `${kunde.Strasse}, ${kunde.PLZ} ${kunde.Ort}`],
                ['E-Mail', kunde.Email],
                ['Telefon', kunde.Telefon || '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div>
                  <div style={{ fontSize: 14, marginTop: 2 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>🏢 Unternehmensdaten</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              {[
                ['Rechtsform', kunde.Rechtsform],
                ['Gründung', formatDate(kunde.Gruendungsdatum)],
                ['Geschäftsgegenstand', kunde.Geschaeftsgegenstand],
                ['WZ-Klassifikation', kunde.WZ_Klassifikation],
                ['Unternehmenstyp', kunde.Unternehmenstyp],
                ['Beschäftigte', kunde.Anzahl_Beschaeftigte],
                ['Bilanzsumme', kunde.Jahresbilanzsumme],
                ['Jahresumsatz', kunde.Jahresumsatz],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div>
                  <div style={{ fontSize: 14, marginTop: 2 }}>{value || '—'}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-primary" onClick={generateEmail}>✉️ E-Mail generieren</button>
            <button className="btn btn-secondary" onClick={() => setShowErinnerungModal(true)}>🔔 Erinnerung senden</button>
            <button className="btn btn-secondary" onClick={() => {
              navigator.clipboard.writeText(plLink)
              addToast('Projektleiter-Link kopiert!', 'success')
            }}>
              🔗 PL-Link kopieren
            </button>
          </div>
        </div>
      )}

      {activeTab === 'checkliste' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">✅ Dokumenten-Checkliste</h3>
            <span style={{ fontSize: 14, color: 'var(--text-dim)' }}>{checkDone}/{checkItems.length} erledigt</span>
          </div>
          <div className="progress-bar" style={{ marginBottom: 20, height: 8 }}>
            <div
              className={`progress-fill ${checkProgress < 30 ? 'low' : checkProgress < 70 ? 'mid' : 'high'}`}
              style={{ width: `${checkProgress}%` }}
            />
          </div>
          {checkItems.map(key => (
            <div key={key} className={`check-item ${kunde.checkliste?.[key] ? 'done' : ''}`}>
              <input
                type="checkbox"
                checked={!!kunde.checkliste?.[key]}
                onChange={() => handleCheckToggle(key)}
                id={`check-${key}`}
              />
              <label htmlFor={`check-${key}`} style={{ cursor: 'pointer', flex: 1 }}>
                {CHECKLIST_LABELS[key]}
              </label>
              {kunde.checkliste?.[key] && (
                <span className="badge badge-success">✓</span>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'projekt' && (
        <div>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">📊 Projektdaten</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => {
                navigator.clipboard.writeText(plLink)
                addToast('Link kopiert!', 'success')
              }}>
                🔗 PL-Link: {plLink.substring(0, 50)}...
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                ['Projektleiter', kunde.projekt?.Projektleiter],
                ['Status', kunde.projekt?.Status || 'Offen'],
                ['Projektstart', formatDate(kunde.projekt?.Projektstart)],
                ['Projektende', formatDate(kunde.projekt?.Projektende)],
                ['Beratertage', kunde.projekt?.Beratertage],
                ['Stunden gesamt', kunde.projekt?.Stunden_Gesamt],
                ['Rechnungsbetrag', kunde.projekt?.Rechnung_Betrag ? `${kunde.projekt.Rechnung_Betrag} €` : '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div>
                  <div style={{ fontSize: 14, marginTop: 2, fontWeight: 500 }}>{value || '—'}</div>
                </div>
              ))}
            </div>
            {kunde.projekt?.Aufgabenstellung && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Aufgabenstellung</div>
                <div style={{ fontSize: 14, lineHeight: 1.6 }}>{kunde.projekt.Aufgabenstellung}</div>
              </div>
            )}
            {kunde.projekt?.Was_wurde_gemacht && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Was wurde gemacht</div>
                <div style={{ fontSize: 14, lineHeight: 1.6 }}>{kunde.projekt.Was_wurde_gemacht}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'email' && (
        <div>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">✉️ E-Mail an Endkunden</h3>
              <button className="btn btn-primary" onClick={generateEmail} disabled={emailLoading}>
                {emailLoading ? '⏳ Wird generiert...' : '📝 E-Mail generieren'}
              </button>
            </div>
            {emailPreview ? (
              <>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>An:</div>
                  <div style={{ fontWeight: 500 }}>{emailPreview.an}</div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Betreff:</div>
                  <div style={{ fontWeight: 500 }}>{emailPreview.betreff}</div>
                </div>
                <div className="email-preview">{emailPreview.text}</div>
                <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={() => {
                    navigator.clipboard.writeText(emailPreview.text)
                    addToast('E-Mail-Text kopiert!', 'success')
                  }}>
                    📋 Text kopieren
                  </button>
                  <button className="btn btn-primary" onClick={() => {
                    window.open(`mailto:${emailPreview.an}?subject=${encodeURIComponent(emailPreview.betreff)}&body=${encodeURIComponent(emailPreview.text)}`)
                    addToast('E-Mail-Client wird geöffnet...', 'info')
                  }}>
                    📧 In E-Mail-Client öffnen
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                Klicken Sie auf "E-Mail generieren" um die Vorlage mit den Kundendaten zu befüllen
              </div>
            )}
          </div>

          {/* Erinnerungsmail */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">🔔 Erinnerungsmail an Projektleiter</h3>
            </div>
            <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 12 }}>
              Sendet eine Erinnerung mit Link zum Projektleiter-Portal, wo fehlende Informationen eingegeben werden können.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary" onClick={copyReminderText} disabled={reminderLoading}>
                {reminderLoading ? '⏳ Wird erzeugt...' : '📋 Erinnerungstext kopieren'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'projektbericht' && (
        <div>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">📄 Projektbericht generieren</h3>
              <button className="btn btn-primary" onClick={handleDownloadProjektbericht} disabled={downloading}>
                {downloading ? '⏳ Wird erstellt...' : '📥 DOCX herunterladen'}
              </button>
            </div>
            <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 20 }}>
              Generiert den Projektbericht aus den Kundendaten und Projektinformationen.
            </p>

            <div className="email-preview" style={{ fontFamily: 'var(--font)', fontSize: 14 }}>
{`BERATERBERICHT & Fragebogen "bereichsübergreifende Grundsätze des ESF Plus"

${CONFIG.BERATER_FIRMA}
${CONFIG.BERATER_NAME}
${CONFIG.BERATER_ADRESSE}

Berater: ${CONFIG.BERATER_NAME}

Firma: ${kunde.Firma}
${kunde.Strasse}
${kunde.PLZ} ${kunde.Ort}

Kontakt:
Email: ${kunde.Email}

Projektbeginn: ${formatDate(kunde.projekt?.Projektstart)}
Projektende: ${formatDate(kunde.projekt?.Projektende)}
Beratertage insgesamt: ${kunde.projekt?.Beratertage || '___'} Tage
Stunden insgesamt: ${kunde.projekt?.Stunden_Gesamt || '___'} Std

Aufgabenstellung:
${kunde.projekt?.Aufgabenstellung || '[Wird vom Projektleiter eingetragen]'}

Durchgeführte Maßnahmen:
${kunde.projekt?.Was_wurde_gemacht || '[Wird vom Projektleiter eingetragen]'}

Bereichsübergreifende Grundsätze des ESF Plus:
Bei der Umsetzung soll eine Geschlechterparität im Projektteam gewährleistet sein.
Es finden bevorzugt virtuelle Arbeitstreffen statt. Dienstreisen erfolgen mit dem Zug (ÖPNV).
Projektmitarbeiter werden zum AGG geschult.`}
            </div>
          </div>
        </div>
      )}

      {/* E-Mail Modal */}
      {showEmailModal && emailPreview && (
        <div className="modal-overlay" onClick={() => setShowEmailModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div className="modal-header">
              <h2>✉️ E-Mail Vorschau</h2>
              <button className="btn-icon" onClick={() => setShowEmailModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 12 }}>
                <strong>An:</strong> {emailPreview.an}
              </div>
              <div style={{ marginBottom: 12 }}>
                <strong>Betreff:</strong> {emailPreview.betreff}
              </div>
              <div className="email-preview">{emailPreview.text}</div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowEmailModal(false)}>Schließen</button>
              <button className="btn btn-primary" onClick={() => {
                window.open(`mailto:${emailPreview.an}?subject=${encodeURIComponent(emailPreview.betreff)}&body=${encodeURIComponent(emailPreview.text)}`)
                setShowEmailModal(false)
              }}>
                📧 Senden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return dateStr }
}

function downloadBlob_(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
