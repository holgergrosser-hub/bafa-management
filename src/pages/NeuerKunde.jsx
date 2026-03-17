import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useToast } from '../App'
import { gasRequest } from '../config'

export default function NeuerKunde() {
  const navigate = useNavigate()
  const location = useLocation()
  const addToast = useToast()
  const [saving, setSaving] = useState(false)
  const prefill = location?.state?.prefill || null
  const [form, setForm] = useState({
    firma: '',
    anrede: 'Herr',
    vorname: '',
    nachname: '',
    strasse: '',
    plz: '',
    ort: '',
    telefon: '',
    email: '',
    rechtsform: 'juristische Person',
    gruendungsdatum: '',
    geschaeftsgegenstand: '',
    wz_klassifikation: '',
    unternehmenstyp: 'eigenständiges Unternehmen',
    anzahl_beschaeftigte: '',
    jahresbilanzsumme: '',
    jahresumsatz: '',
    ubf_nummer: '',
    bescheid_datum: '',
    vorlagefrist: '',
    ...(prefill && typeof prefill === 'object' ? prefill : {})
  })

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    if (!form.firma) {
      addToast('Bitte Firma angeben', 'error')
      return
    }
    setSaving(true)
    try {
      const result = await gasRequest('neuerKunde', form)
      if (result?.status !== 'success') {
        throw new Error(result?.message || 'Konnte Kunden nicht anlegen')
      }
      addToast(`Kunde ${form.firma} erfolgreich angelegt!`, 'success')
      if (result?.kundeId) navigate(`/kunde/${result.kundeId}`)
      else navigate('/')
    } catch (error) {
      addToast('Fehler beim Speichern: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Neuer BAFA-Kunde</h2>
          <p className="subtitle">Kundendaten manuell erfassen oder KI-Scanner verwenden</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/scanner')}>
          🤖 Lieber KI-Scanner nutzen
        </button>
      </div>

      {/* Zuwendungsbescheid Daten */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📋 Zuwendungsbescheid</h3>
        </div>
        <div className="form-row-3">
          <div className="form-group">
            <label className="form-label">UBF-Nummer *</label>
            <input className="form-input" placeholder="z.B. 1273159" value={form.ubf_nummer}
              onChange={e => update('ubf_nummer', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Bescheid-Datum</label>
            <input className="form-input" type="date" value={form.bescheid_datum}
              onChange={e => update('bescheid_datum', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Vorlagefrist *</label>
            <input className="form-input" type="date" value={form.vorlagefrist}
              onChange={e => update('vorlagefrist', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Angaben zur antragstellenden Person */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">👤 Angaben zur antragstellenden Person</h3>
        </div>
        <div className="form-group">
          <label className="form-label">Firma / Organisation *</label>
          <input className="form-input" placeholder="Firmenname" value={form.firma}
            onChange={e => update('firma', e.target.value)} />
        </div>
        <div className="form-row-3">
          <div className="form-group">
            <label className="form-label">Anrede</label>
            <select className="form-select" value={form.anrede} onChange={e => update('anrede', e.target.value)}>
              <option value="Herr">Herr</option>
              <option value="Frau">Frau</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Vorname</label>
            <input className="form-input" value={form.vorname} onChange={e => update('vorname', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Nachname</label>
            <input className="form-input" value={form.nachname} onChange={e => update('nachname', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Straße und Hausnummer</label>
            <input className="form-input" value={form.strasse} onChange={e => update('strasse', e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">PLZ</label>
              <input className="form-input" value={form.plz} onChange={e => update('plz', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Ort</label>
              <input className="form-input" value={form.ort} onChange={e => update('ort', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Telefon</label>
            <input className="form-input" value={form.telefon} onChange={e => update('telefon', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">E-Mail *</label>
            <input className="form-input" type="email" value={form.email} onChange={e => update('email', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Unternehmensdaten */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">🏢 Unternehmensdaten</h3>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Rechtsform</label>
            <select className="form-select" value={form.rechtsform} onChange={e => update('rechtsform', e.target.value)}>
              <option value="natürliche Person">Natürliche Person</option>
              <option value="juristische Person">Juristische Person (privat-rechtlich)</option>
              <option value="juristische Person öffentlich">Juristische Person (öffentlich-rechtlich)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Gründungsdatum</label>
            <input className="form-input" type="date" value={form.gruendungsdatum}
              onChange={e => update('gruendungsdatum', e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Angemeldeter Geschäftsgegenstand</label>
          <input className="form-input" value={form.geschaeftsgegenstand}
            onChange={e => update('geschaeftsgegenstand', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">WZ-Klassifikation</label>
          <input className="form-input" placeholder="z.B. 4646 - Großhandel mit pharmazeutischen Erzeugnissen"
            value={form.wz_klassifikation} onChange={e => update('wz_klassifikation', e.target.value)} />
        </div>
      </div>

      {/* Unternehmensgröße */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📏 Unternehmensgröße (KMU-Kriterien)</h3>
        </div>
        <div className="form-group">
          <label className="form-label">Unternehmenstyp</label>
          <select className="form-select" value={form.unternehmenstyp} onChange={e => update('unternehmenstyp', e.target.value)}>
            <option value="eigenständiges Unternehmen">Eigenständiges Unternehmen</option>
            <option value="Partnerunternehmen">Partnerunternehmen</option>
            <option value="verbundenes Unternehmen">Verbundenes Unternehmen</option>
          </select>
        </div>
        <div className="form-row-3">
          <div className="form-group">
            <label className="form-label">Anzahl Beschäftigte</label>
            <input className="form-input" type="number" value={form.anzahl_beschaeftigte}
              onChange={e => update('anzahl_beschaeftigte', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Jahresbilanzsumme (€)</label>
            <input className="form-input" placeholder="z.B. 6.723.786,87" value={form.jahresbilanzsumme}
              onChange={e => update('jahresbilanzsumme', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Jahresumsatz (€)</label>
            <input className="form-input" placeholder="z.B. 11.857.202,00" value={form.jahresumsatz}
              onChange={e => update('jahresumsatz', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Speichern */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>Abbrechen</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? '⏳ Speichern...' : '💾 Kunde anlegen & Ordner erstellen'}
        </button>
      </div>
    </div>
  )
}
