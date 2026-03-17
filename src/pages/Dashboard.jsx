import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../App'
import { gasGet } from '../config'

export default function Dashboard() {
  const navigate = useNavigate()
  const addToast = useToast()
  const [kunden, setKunden] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('alle')

  useEffect(() => {
    let alive = true

    async function load() {
      setLoading(true)
      try {
        const res = await gasGet('getDashboard')
        if (!alive) return

        if (res?.status !== 'success') {
          throw new Error(res?.message || 'Unbekannter Backend-Fehler')
        }
        setKunden(Array.isArray(res.dashboard) ? res.dashboard : [])
      } catch (err) {
        if (!alive) return
        setKunden([])
        addToast('Dashboard konnte nicht geladen werden: ' + (err?.message || String(err)), 'error')
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()
    return () => { alive = false }
  }, [])

  const stats = {
    gesamt: kunden.length,
    rot: kunden.filter(k => k.ampel === 'rot').length,
    gelb: kunden.filter(k => k.ampel === 'gelb').length,
    gruen: kunden.filter(k => k.ampel === 'gruen').length
  }

  const filtered = filter === 'alle' ? kunden : kunden.filter(k => k.ampel === filter)

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>BAFA Dashboard</h2>
          <p className="subtitle">Übersicht aller Förderanträge</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-primary" onClick={() => navigate('/scanner')}>
            🤖 KI-Scanner
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/neu')}>
            ➕ Neuer Kunde
          </button>
        </div>
      </div>

      {/* Statistik-Karten */}
      <div className="stats-row">
        <div className="stat-card blau" onClick={() => setFilter('alle')} style={{ cursor: 'pointer' }}>
          <div className="stat-value">{stats.gesamt}</div>
          <div className="stat-label">Gesamt</div>
        </div>
        <div className="stat-card rot" onClick={() => setFilter('rot')} style={{ cursor: 'pointer' }}>
          <div className="stat-value">{stats.rot}</div>
          <div className="stat-label">Kritisch</div>
        </div>
        <div className="stat-card gelb" onClick={() => setFilter('gelb')} style={{ cursor: 'pointer' }}>
          <div className="stat-value">{stats.gelb}</div>
          <div className="stat-label">Warnung</div>
        </div>
        <div className="stat-card gruen" onClick={() => setFilter('gruen')} style={{ cursor: 'pointer' }}>
          <div className="stat-value">{stats.gruen}</div>
          <div className="stat-label">Im Plan</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="tabs">
        {['alle', 'rot', 'gelb', 'gruen'].map(f => (
          <button
            key={f}
            className={`tab ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'alle' ? 'Alle' : f === 'rot' ? '🔴 Kritisch' : f === 'gelb' ? '🟡 Warnung' : '🟢 Im Plan'}
          </button>
        ))}
      </div>

      {/* Kunden-Tabelle */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Firma</th>
              <th>Ansprechpartner</th>
              <th>UBF-Nr.</th>
              <th>Vorlagefrist</th>
              <th>Fortschritt</th>
              <th>Projektleiter</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  Lädt Daten...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  Keine Kunden in dieser Kategorie
                </td>
              </tr>
            ) : (
              filtered.sort((a, b) => (a.fristTage || 999) - (b.fristTage || 999)).map(kunde => (
                <tr key={kunde.ID} className="clickable" onClick={() => navigate(`/kunde/${kunde.ID}`)}>
                  <td>
                    <span className={`ampel ${kunde.ampel}`}>
                      <span className="ampel-dot" />
                      {kunde.fristInfo}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{kunde.Firma}</td>
                  <td>{kunde.Ansprechpartner}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>UBF-{kunde.UBF_Nummer}</td>
                  <td>{formatDate(kunde.Vorlagefrist)}</td>
                  <td style={{ minWidth: 120 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="progress-bar" style={{ flex: 1 }}>
                        <div
                          className={`progress-fill ${(kunde.checkliste?.fortschritt || 0) < 30 ? 'low' : (kunde.checkliste?.fortschritt || 0) < 70 ? 'mid' : 'high'}`}
                          style={{ width: `${kunde.checkliste?.fortschritt || 0}%` }}
                        />
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
                        {kunde.checkliste?.fortschritt || 0}%
                      </span>
                    </div>
                  </td>
                  <td>
                    {kunde.projekt?.Projektleiter ? (
                      <span className="badge badge-success">{kunde.projekt.Projektleiter}</span>
                    ) : (
                      <span className="badge badge-warning">Fehlt</span>
                    )}
                  </td>
                  <td>
                    <button className="btn-icon" onClick={(e) => { e.stopPropagation(); navigate(`/kunde/${kunde.ID}`) }}>
                      →
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Info Box */}
      <div className="card" style={{ borderColor: 'rgba(59,130,246,0.3)', background: 'var(--blue-bg)' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 24 }}>💡</span>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--blue)' }}>Tipp: Automatische Fristüberwachung</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
              Das System prüft täglich alle Vorlagfristen und sendet automatisch Warnungen per E-Mail 
              bei 30, 14, 7, 3 und 1 Tag(en) vor Ablauf. Richten Sie den täglichen Trigger in den 
              Einstellungen ein.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return dateStr }
}
