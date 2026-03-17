import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { gasGet, gasRequest } from '../config'

export default function ProjektleiterPortal() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  
  const [loading, setLoading] = useState(false)
  const [firma, setFirma] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!token) return

    let alive = true
    async function load() {
      setLoading(true)
      try {
        const res = await gasGet('getProjektleiterForm', { token })
        if (!alive) return
        if (res?.status !== 'success') throw new Error(res?.message || 'Token ungültig')
        setFirma(res?.firma || '')
      } catch (e) {
        if (!alive) return
        setFirma('')
        alert('Fehler: ' + (e?.message || String(e)))
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()
    return () => { alive = false }
  }, [token])

  const [form, setForm] = useState({
    projektleiter: '',
    plEmail: '',
    projektstart: '',
    projektende: '',
    beratertage: '',
    stundenGesamt: '',
    aufgabenstellung: '',
    wasWurdeGemacht: '',
    rechnungBetrag: '',
    rechnungDatum: '',
    beratungszeiten: [
      { datum: '', art: 'Tel./Video Call', thema: '', dauer: '' }
    ]
  })

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const addZeile = () => {
    setForm(prev => ({
      ...prev,
      beratungszeiten: [...prev.beratungszeiten, { datum: '', art: 'Tel./Video Call', thema: '', dauer: '' }]
    }))
  }

  const updateZeile = (index, field, value) => {
    setForm(prev => ({
      ...prev,
      beratungszeiten: prev.beratungszeiten.map((z, i) => i === index ? { ...z, [field]: value } : z)
    }))
  }

  const removeZeile = (index) => {
    setForm(prev => ({
      ...prev,
      beratungszeiten: prev.beratungszeiten.filter((_, i) => i !== index)
    }))
  }

  const berechneStunden = () => {
    const sum = form.beratungszeiten.reduce((acc, z) => acc + (parseFloat(z.dauer) || 0), 0)
    update('stundenGesamt', sum.toFixed(1))
    const tage = (sum / 8).toFixed(1)
    update('beratertage', tage)
  }

  const handleSubmit = async () => {
    if (!form.projektleiter) {
      alert('Bitte Projektleiter angeben')
      return
    }
    setSaving(true)
    try {
      const res = await gasRequest('projektleiterDaten', { token, ...form })
      if (res?.status !== 'success') throw new Error(res?.message || 'Konnte nicht speichern')
      setSubmitted(true)
    } catch (error) {
      alert('Fehler: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (!token) {
    return (
      <div style={{ maxWidth: 600, margin: '80px auto', padding: 24, textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, marginBottom: 16 }}>⚠️ Ungültiger Link</h1>
        <p style={{ color: 'var(--text-dim)' }}>
          Dieser Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen Link an.
        </p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div style={{ maxWidth: 600, margin: '80px auto', padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>✅</div>
        <h1 style={{ fontSize: 28, marginBottom: 12 }}>Vielen Dank!</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: 16, lineHeight: 1.6 }}>
          Die Projektdaten für <strong>{firma}</strong> wurden erfolgreich übermittelt. 
          Sie können dieses Fenster jetzt schließen.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 600, margin: '80px auto', padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>⏳</div>
        <h1 style={{ fontSize: 24, marginBottom: 10 }}>Daten werden geladen...</h1>
        <p style={{ color: 'var(--text-dim)' }}>Bitte einen Moment warten.</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 56, height: 56, background: 'linear-gradient(135deg, var(--gold), var(--gold-dim))',
          borderRadius: 12, fontSize: 28, fontWeight: 700, color: 'var(--navy)', marginBottom: 16
        }}>B</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Projektdaten erfassen</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: 16 }}>
          BAFA-Beratungsprojekt: <strong style={{ color: 'var(--gold)' }}>{firma}</strong>
        </p>
      </div>

      {/* Projektleiter */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: 16 }}>👤 Projektleiter</h3>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Name des Projektleiters *</label>
            <input className="form-input" value={form.projektleiter}
              onChange={e => update('projektleiter', e.target.value)}
              placeholder="Vor- und Nachname" />
          </div>
          <div className="form-group">
            <label className="form-label">E-Mail</label>
            <input className="form-input" type="email" value={form.plEmail}
              onChange={e => update('plEmail', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Projektzeitraum */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: 16 }}>📅 Projektzeitraum</h3>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Projektstart</label>
            <input className="form-input" type="date" value={form.projektstart}
              onChange={e => update('projektstart', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Projektende</label>
            <input className="form-input" type="date" value={form.projektende}
              onChange={e => update('projektende', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Beratungszeiten */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">⏱️ Beratungszeiten</h3>
          <button className="btn btn-secondary btn-sm" onClick={addZeile}>+ Zeile</button>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Art</th>
                <th>Thema</th>
                <th>Dauer (Std)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {form.beratungszeiten.map((zeile, i) => (
                <tr key={i}>
                  <td>
                    <input className="form-input" type="date" value={zeile.datum}
                      onChange={e => updateZeile(i, 'datum', e.target.value)}
                      style={{ minWidth: 140 }} />
                  </td>
                  <td>
                    <select className="form-select" value={zeile.art}
                      onChange={e => updateZeile(i, 'art', e.target.value)}
                      style={{ minWidth: 150 }}>
                      <option>Tel./Video Call</option>
                      <option>Remote-Arbeit</option>
                      <option>Vor-Ort-Termin</option>
                      <option>E-Mail-Korrespondenz</option>
                    </select>
                  </td>
                  <td>
                    <input className="form-input" value={zeile.thema}
                      onChange={e => updateZeile(i, 'thema', e.target.value)}
                      placeholder="z.B. Internes Audit"
                      style={{ minWidth: 200 }} />
                  </td>
                  <td>
                    <input className="form-input" type="number" step="0.5" value={zeile.dauer}
                      onChange={e => updateZeile(i, 'dauer', e.target.value)}
                      style={{ width: 80 }} />
                  </td>
                  <td>
                    <button className="btn-icon" onClick={() => removeZeile(i)} 
                      style={{ width: 28, height: 28 }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 16, alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={berechneStunden}>
            🧮 Stunden berechnen
          </button>
          <span style={{ fontSize: 14, color: 'var(--text-dim)' }}>
            Summe: <strong style={{ color: 'var(--gold)' }}>{form.stundenGesamt || '0'} Std</strong> = {form.beratertage || '0'} Tage
          </span>
        </div>
      </div>

      {/* Inhalt */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: 16 }}>📝 Beratungsinhalt</h3>
        <div className="form-group">
          <label className="form-label">Aufgabenstellung</label>
          <textarea className="form-textarea" value={form.aufgabenstellung}
            onChange={e => update('aufgabenstellung', e.target.value)}
            placeholder="z.B. Aufbau eines Qualitätsmanagementsystems nach ISO 9001:2015"
            rows={3} />
        </div>
        <div className="form-group">
          <label className="form-label">Was wurde gemacht? (Zusammenfassung der Maßnahmen)</label>
          <textarea className="form-textarea" value={form.wasWurdeGemacht}
            onChange={e => update('wasWurdeGemacht', e.target.value)}
            placeholder="z.B. QM-Handbuch erstellt, Prozesse dokumentiert, Internes Audit durchgeführt..."
            rows={5} />
        </div>
      </div>

      {/* Rechnung */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: 16 }}>💰 Rechnung</h3>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Rechnungsbetrag (netto, €)</label>
            <input className="form-input" type="number" value={form.rechnungBetrag}
              onChange={e => update('rechnungBetrag', e.target.value)}
              placeholder="z.B. 4000" />
          </div>
          <div className="form-group">
            <label className="form-label">Rechnungsdatum</label>
            <input className="form-input" type="date" value={form.rechnungDatum}
              onChange={e => update('rechnungDatum', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24, marginBottom: 40 }}>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}
          style={{ padding: '14px 48px', fontSize: 16 }}>
          {saving ? '⏳ Wird gespeichert...' : '📤 Daten übermitteln'}
        </button>
      </div>
    </div>
  )
}
