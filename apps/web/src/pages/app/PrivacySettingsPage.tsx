/**
 * /app/privacy — Diskretion & Schutz
 * PIN-Sperre + Schnell-Verlassen (gerätebezogen) sowie DSGVO-Datenrechte
 * (Datenexport Art. 15/20, Konto-/Datenlöschung Art. 17).
 */
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '@/components/app/AppShell'
import { useLock } from '@/contexts/LockContext'
import { useAuth } from '@/contexts/AuthContext'
import { exportMyData, deleteMyAccount } from '@/api/account'

export default function PrivacySettingsPage() {
  const { enabled, enable, disable, lock } = useLock()
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [currentPin, setCurrentPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [exporting, setExporting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const activate = async (e: FormEvent) => {
    e.preventDefault()
    setError(null); setMessage(null)
    if (!/^\d{4,6}$/.test(pin)) { setError('Die PIN muss aus 4–6 Ziffern bestehen.'); return }
    if (pin !== confirm) { setError('Die beiden PINs stimmen nicht überein.'); return }
    await enable(pin)
    setPin(''); setConfirm('')
    setMessage('Sperre aktiviert. Sie greift künftig beim Öffnen und nach Inaktivität.')
  }

  const deactivate = async (e: FormEvent) => {
    e.preventDefault()
    setError(null); setMessage(null)
    const ok = await disable(currentPin)
    if (!ok) { setError('Falsche PIN.'); return }
    setCurrentPin('')
    setMessage('Sperre deaktiviert.')
  }

  const handleExport = async () => {
    setError(null); setMessage(null); setExporting(true)
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
      setMessage('Export gestartet – die JSON-Datei wurde heruntergeladen.')
    } catch {
      setError('Export fehlgeschlagen. Bitte später erneut versuchen.')
    } finally {
      setExporting(false)
    }
  }

  const handleDelete = async () => {
    setError(null); setMessage(null); setDeleting(true)
    try {
      await deleteMyAccount()
      await signOut()
      navigate('/', { replace: true })
    } catch {
      setError('Löschen fehlgeschlagen. Bitte später erneut versuchen oder info@echo-b.de kontaktieren.')
      setDeleting(false)
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-[640px] px-6 py-8 space-y-5">
        <header>
          <h1 className="text-xl font-bold text-navy">Diskretion &amp; Schutz</h1>
          <p className="text-sm text-brand-muted mt-1">
            Zusätzlicher Schutz, falls andere Zugriff auf dein Gerät haben könnten – plus volle
            Kontrolle über deine Daten.
          </p>
        </header>

        {message && <p className="rounded-brand border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">{message}</p>}
        {error && <p className="rounded-brand border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}

        {/* PIN-Sperre */}
        <section className="card">
          <div className="flex items-center justify-between gap-3 mb-1">
            <h2 className="text-sm font-bold text-navy">PIN-Sperre</h2>
            <span className={`text-xs font-medium ${enabled ? 'text-green-600' : 'text-brand-muted'}`}>
              {enabled ? '● Aktiv' : 'Inaktiv'}
            </span>
          </div>
          <p className="text-sm text-brand-muted mb-4">
            Sperrt EchoB mit einer PIN – beim Öffnen, nach 5 Minuten Inaktivität und beim Wechseln des Tabs.
          </p>

          {!enabled ? (
            <form onSubmit={activate} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="password" inputMode="numeric" value={pin}
                  onChange={(e) => setPin(e.target.value)} placeholder="Neue PIN (4–6 Ziffern)"
                  className="rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
                />
                <input
                  type="password" inputMode="numeric" value={confirm}
                  onChange={(e) => setConfirm(e.target.value)} placeholder="PIN bestätigen"
                  className="rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
              <button type="submit" className="btn-primary !py-2 !px-4 !text-sm">Sperre aktivieren</button>
            </form>
          ) : (
            <div className="space-y-3">
              <button onClick={lock} className="btn-primary !py-2 !px-4 !text-sm">Jetzt sperren</button>
              <form onSubmit={deactivate} className="flex flex-wrap items-center gap-2 pt-2 border-t border-brand-border">
                <input
                  type="password" inputMode="numeric" value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)} placeholder="Aktuelle PIN"
                  className="rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
                />
                <button type="submit" className="text-sm text-red-600 hover:underline">Sperre deaktivieren</button>
              </form>
            </div>
          )}

          <p className="mt-4 text-xs text-brand-muted/80">
            Hinweis: Dies ist eine Diskretions-Sperre, kein vollwertiger Datenschutz. Vergisst du die PIN,
            kannst du sie nur durch Löschen der Browserdaten zurücksetzen.
          </p>
        </section>

        {/* Schnell-Verlassen */}
        <section className="card">
          <h2 className="text-sm font-bold text-navy mb-1">Schnell verlassen</h2>
          <p className="text-sm text-brand-muted">
            Oben rechts findest du jederzeit den Button <span className="font-medium text-navy">„↪ Verlassen"</span>.
            Er bringt dich sofort auf eine neutrale Seite. Alternativ <span className="font-medium text-navy">zweimal kurz die Esc-Taste</span> drücken.
            Der Zurück-Knopf des Browsers führt danach nicht zu EchoB zurück.
          </p>
        </section>

        {/* Deine Daten (DSGVO) */}
        <section className="card">
          <h2 className="text-sm font-bold text-navy mb-1">Deine Daten</h2>
          <p className="text-sm text-brand-muted mb-2">
            Du hast jederzeit Zugriff auf alle Daten, die EchoB über dich speichert – und kannst sie
            vollständig löschen.
          </p>

          {/* Export */}
          <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-t border-brand-border">
            <div className="min-w-0">
              <p className="text-sm font-medium text-navy">Daten exportieren</p>
              <p className="text-xs text-brand-muted">Alle deine Fälle, Szenen, Echo-Gespräche und Profile als JSON-Datei.</p>
            </div>
            <button onClick={handleExport} disabled={exporting} className="btn-outline !py-2 !px-4 !text-sm disabled:opacity-50">
              {exporting ? 'Exportiere…' : 'Exportieren'}
            </button>
          </div>

          {/* Konto löschen */}
          <div className="py-3 border-t border-brand-border">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-red-700">Konto löschen</p>
                <p className="text-xs text-brand-muted">Entfernt unwiderruflich alle Daten und dein Login.</p>
              </div>
              {!confirmOpen && (
                <button onClick={() => { setConfirmOpen(true); setError(null); setMessage(null) }} className="text-sm text-red-600 hover:underline">
                  Konto löschen…
                </button>
              )}
            </div>

            {confirmOpen && (
              <div className="mt-3 rounded-brand border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-800 mb-3">
                  Das löscht <strong>endgültig</strong> alle deine Fälle, Szenen, Echo-Gespräche, Hypothesen,
                  Profile und dein Konto. Das lässt sich nicht rückgängig machen. Tippe zur Bestätigung
                  {' '}<strong>LÖSCHEN</strong>.
                </p>
                <input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="LÖSCHEN"
                  className="w-full sm:w-52 rounded-brand border border-red-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={confirmText.trim().toUpperCase() !== 'LÖSCHEN' || deleting}
                    className="rounded-brand bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-red-600"
                  >
                    {deleting ? 'Lösche…' : 'Endgültig löschen'}
                  </button>
                  <button
                    onClick={() => { setConfirmOpen(false); setConfirmText('') }}
                    disabled={deleting}
                    className="px-4 py-2 text-sm text-brand-muted hover:text-navy"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  )
}
