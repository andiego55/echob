import { useState } from 'react'
import { Link } from 'react-router-dom'
import { exportMyData } from '@/api/account'

/**
 * Einstellungen-Karte: Deine Daten & Konto. Datenexport (DSGVO Art. 15/20) direkt
 * hier; die endgültige Konto-Löschung (Art. 17) liegt – mit Sicherheitsabfrage –
 * unter „Schutz" und wird von hier aus verlinkt (keine doppelte Lösch-Logik).
 */
export default function DataAccountCard() {
  const [exporting, setExporting] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const handleExport = async () => {
    setMsg(null); setExporting(true)
    try {
      const blob = await exportMyData()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'echob-datenexport.json'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setMsg({ ok: true, text: 'Export gestartet – die JSON-Datei wurde heruntergeladen.' })
    } catch {
      setMsg({ ok: false, text: 'Export fehlgeschlagen. Bitte später erneut versuchen.' })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="mt-6 card">
      <h2 className="text-lg font-semibold text-navy">Deine Daten &amp; Konto</h2>
      <p className="mt-1 text-sm text-brand-muted">
        Du hast jederzeit Zugriff auf alle Daten, die EchoB über dich speichert – und kannst dein
        Konto vollständig löschen lassen.
      </p>

      {/* Export */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-brand-border py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-navy">Daten einsehen / exportieren</p>
          <p className="text-xs text-brand-muted">Alle deine Fälle, Szenen, Echo-Gespräche und Profile als JSON-Datei.</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="shrink-0 rounded-brand border-2 border-navy/25 px-4 py-2 text-sm font-semibold text-navy transition-colors hover:border-navy/50 hover:bg-navy/[0.03] disabled:opacity-50"
        >
          {exporting ? 'Exportiere…' : 'Exportieren'}
        </button>
      </div>

      {/* Löschung → Schutz-Seite */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-border py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-red-700">Konto &amp; Daten löschen</p>
          <p className="text-xs text-brand-muted">Entfernt unwiderruflich alle Daten und dein Login (mit Sicherheitsabfrage).</p>
        </div>
        <Link to="/app/privacy" className="shrink-0 text-sm font-medium text-red-600 hover:underline">
          Zur Löschung →
        </Link>
      </div>

      {msg && (
        <p className={`mt-1 text-sm ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>
      )}
    </div>
  )
}
