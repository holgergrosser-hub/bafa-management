import React, { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { CONFIG } from './config'
import Dashboard from './pages/Dashboard'
import NeuerKunde from './pages/NeuerKunde'
import KundeDetail from './pages/KundeDetail'
import KiScanner from './pages/KiScanner'
import ProjektleiterPortal from './pages/ProjektleiterPortal'
import Einstellungen from './pages/Einstellungen'

// Toast Context
export const ToastContext = createContext()

export function useToast() {
  return useContext(ToastContext)
}

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = (message, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// Sidebar Navigation
function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const path = location.pathname

  const items = [
    { icon: '📊', label: 'Dashboard', path: '/' },
    { icon: '➕', label: 'Neuer Kunde', path: '/neu' },
    { icon: '🤖', label: 'KI-Scanner', path: '/scanner' },
    { icon: '⚙️', label: 'Einstellungen', path: '/einstellungen' },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">B</div>
        <h1>
          BAFA Manager
          <span>Förderung & Beratung</span>
        </h1>
      </div>
      <nav className="sidebar-nav">
        {items.map(item => (
          <button
            key={item.path}
            className={`nav-item ${path === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 'auto' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          QM-Dienstleistungen<br />
          Holger Grosser
        </div>
      </div>
    </aside>
  )
}

// Layout mit Sidebar
function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/neu" element={<NeuerKunde />} />
          <Route path="/kunde/:id" element={<KundeDetail />} />
          <Route path="/scanner" element={<KiScanner />} />
          <Route path="/einstellungen" element={<Einstellungen />} />
        </Routes>
      </main>
    </div>
  )
}

// Projektleiter-Portal hat eigenes Layout (kein Sidebar)
function ProjektleiterLayout() {
  return <ProjektleiterPortal />
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/projektleiter" element={<ProjektleiterLayout />} />
          <Route path="/*" element={<AppLayout />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}
