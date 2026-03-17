import React, { useState } from 'react'
import { useToast } from '../App'

export default function Einstellungen() {
  const addToast = useToast()
  const [gasUrl, setGasUrl] = useState(localStorage.getItem('gasUrl') || '')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    localStorage.setItem('gasUrl', gasUrl)
    setSaved(true)
    addToast('Einstellungen gespeichert!', 'success')
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>⚙️ Einstellungen</h2>
          <p className="subtitle">Konfiguration und Setup</p>
        </div>
      </div>

      {/* Setup-Anleitung */}
      <div className="card" style={{ borderColor: 'rgba(247,201,72,0.3)', background: 'rgba(247,201,72,0.03)' }}>
        <h3 className="card-title" style={{ color: 'var(--gold)', marginBottom: 16 }}>🚀 Ersteinrichtung</h3>
        <div style={{ fontSize: 14, lineHeight: 2, color: 'var(--text-dim)' }}>
          <p style={{ marginBottom: 12 }}>Folge diesen Schritten um das System einzurichten:</p>
          
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
            <span style={{ background: 'var(--gold)', color: 'var(--navy)', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>1</span>
            <div>
              <strong style={{ color: 'var(--text)' }}>Google Sheet erstellen</strong>
              <br />Erstelle ein neues Google Sheet im Ordner
              <a href="https://drive.google.com/drive/u/0/folders/1bu9og0iHmEx9v8-iMSqSdUCXg87aMHd-" 
                target="_blank" style={{ color: 'var(--gold)' }}> BAFA-Ordner</a>.
              Nenne es "BAFA Management".
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
            <span style={{ background: 'var(--gold)', color: 'var(--navy)', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>2</span>
            <div>
              <strong style={{ color: 'var(--text)' }}>Apps Script hinzufügen</strong>
              <br />Öffne das Sheet → Erweiterungen → Apps Script. 
              Kopiere den Code aus <code style={{ background: 'var(--navy)', padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--mono)' }}>Code.gs</code>.
              Trage die Spreadsheet-ID in CONFIG ein.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
            <span style={{ background: 'var(--gold)', color: 'var(--navy)', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>3</span>
            <div>
              <strong style={{ color: 'var(--text)' }}>setupSpreadsheet() ausführen</strong>
              <br />Führe die Funktion <code style={{ background: 'var(--navy)', padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--mono)' }}>setupSpreadsheet()</code> aus.
              Das erstellt alle Tabellenblätter (Kunden, Projekte, Checkliste, Aktivitäten).
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
            <span style={{ background: 'var(--gold)', color: 'var(--navy)', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>4</span>
            <div>
              <strong style={{ color: 'var(--text)' }}>Web-App deployen</strong>
              <br />Bereitstellen → Neue Bereitstellung → Web-App.
              Ausführen als: Ich. Zugriff: Jeder.
              <strong style={{ color: 'var(--red)' }}> Neue URL kopieren!</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
            <span style={{ background: 'var(--gold)', color: 'var(--navy)', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>5</span>
            <div>
              <strong style={{ color: 'var(--text)' }}>URL hier eintragen</strong>
              <br />Trage die Apps Script URL unten ein und speichere.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
            <span style={{ background: 'var(--gold)', color: 'var(--navy)', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>6</span>
            <div>
              <strong style={{ color: 'var(--text)' }}>Trigger einrichten</strong>
              <br />Führe <code style={{ background: 'var(--navy)', padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--mono)' }}>setupTrigger()</code> aus 
              für die tägliche Fristprüfung um 8:00 Uhr.
            </div>
          </div>
        </div>
      </div>

      {/* API URL */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: 16 }}>🔗 Google Apps Script URL</h3>
        <div className="form-group">
          <label className="form-label">Web-App URL</label>
          <input
            className="form-input"
            value={gasUrl}
            onChange={e => setGasUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/AKfycb.../exec"
            style={{ fontFamily: 'var(--mono)', fontSize: 13 }}
          />
        </div>
        <button className="btn btn-primary" onClick={handleSave}>
          {saved ? '✅ Gespeichert!' : '💾 Speichern'}
        </button>
      </div>

      {/* Prozessübersicht */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: 16 }}>📋 BAFA-Prozess Übersicht</h3>
        <div style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-dim)' }}>
          {[
            { nr: '1', titel: 'Kunde beantragt Förderung', desc: 'Kunde stellt AA-Antrag bei der Leitstelle' },
            { nr: '2', titel: 'Zuwendungsbescheid', desc: 'BAFA sendet Bescheid → Kunde leitet an uns weiter' },
            { nr: '3', titel: 'KI-Erfassung', desc: 'Zuwendungsbescheid + Antrag scannen → Daten automatisch erfassen' },
            { nr: '4', titel: 'Ordner & Checkliste', desc: 'Google Drive Ordner + Checkliste wird automatisch angelegt' },
            { nr: '5', titel: 'Beratung durchführen', desc: 'Projektleiter erfasst Stunden über Magic-Link-Portal' },
            { nr: '6', titel: 'Projektbericht', desc: 'Bericht wird aus Daten automatisch generiert' },
            { nr: '7', titel: 'E-Mail an Kunden', desc: 'Anschreiben mit Anleitung und Unterlagen wird erstellt' },
            { nr: '8', titel: 'Fristüberwachung', desc: 'Tägliche automatische Prüfung aller Vorlagfristen' },
          ].map(step => (
            <div key={step.nr} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
              <span style={{
                background: 'var(--navy-mid)', borderRadius: '50%', width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: 'var(--gold)', flexShrink: 0
              }}>{step.nr}</span>
              <div>
                <strong style={{ color: 'var(--text)' }}>{step.titel}</strong>
                <div style={{ fontSize: 13 }}>{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
