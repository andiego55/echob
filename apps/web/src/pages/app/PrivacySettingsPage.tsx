/**
 * /app/privacy — Diskretion & Schutz
 * PIN-Sperre aktivieren/deaktivieren + Erklärung des Schnell-Verlassens.
 */
import { useState, type FormEvent } from 'react'
import AppShell from '@/components/app/AppShell'
import { useLock } from '@/contexts/LockContext'

export default function PrivacySettingsPage() {
  const { enabled, enable, disable, lock } = useLock()

  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [currentPin, setCurrentPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

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

  return (
    <AppShell>
      <div className="mx-auto max-w-[640px] px-6 py-8 space-y-5">
        <header>
          <h1 className="text-xl font-bold text-navy">Diskretion &amp; Schutz</h1>
          <p className="text-sm text-brand-muted mt-1">
            Zusätzlicher Schutz, falls andere Zugriff auf dein Gerät haben könnten. Diese Einstellungen
            gelten nur auf diesem Gerät und in diesem Browser.
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
      </div>
    </AppShell>
  )
}
