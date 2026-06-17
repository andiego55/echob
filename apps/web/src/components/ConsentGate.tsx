/**
 * Consent-Gate – blockierender Einwilligungs-Dialog (DSGVO Art. 7 / Art. 9).
 *
 * Erscheint für eingeloggte Nutzer im App-/Fachpersonenbereich, solange keine
 * gültige (versionierte) Einwilligung vorliegt. Deckt damit ALLE Anmeldewege
 * (Passwort, Google, Magic Link), Bestandsnutzer und Versionsänderungen ab –
 * serverseitig protokolliert.
 *
 * Fail-open: Schlägt der Abruf fehl (z. B. Migration noch nicht eingespielt),
 * blockiert das Gate NICHT – statt alle auszusperren.
 */
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { getConsent, recordConsent, CONSENT_VERSION } from '@/api/account'

export default function ConsentGate() {
  const { session, signOut } = useAuth()
  const location = useLocation()
  const queryClient = useQueryClient()

  const inProtected =
    location.pathname.startsWith('/app') || location.pathname.startsWith('/professional')
  const enabled = !!session && inProtected

  const { data, isLoading, isError } = useQuery({
    queryKey: ['consent'],
    queryFn: getConsent,
    enabled,
    staleTime: Infinity,
    retry: false,
  })

  const [privacy, setPrivacy] = useState(false)
  const [sensitive, setSensitive] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!enabled || isLoading || isError) return null

  const consented =
    !!data && data.version === CONSENT_VERSION && data.privacy_policy && data.sensitive_ai
  if (consented) return null

  const submit = async () => {
    setError(null)
    setSaving(true)
    try {
      await recordConsent({
        version: CONSENT_VERSION,
        privacy_policy: privacy,
        sensitive_ai: sensitive,
      })
      await queryClient.invalidateQueries({ queryKey: ['consent'] })
    } catch {
      setError('Konnte nicht gespeichert werden. Bitte erneut versuchen.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-navy/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 md:p-8">
        <h2 className="text-lg font-bold text-navy leading-snug mb-3">
          Bevor es losgeht: deine Einwilligung
        </h2>
        <p className="text-sm text-brand-muted leading-relaxed mb-4">
          EchoB verarbeitet besonders sensible Angaben – zu deinen Beziehungen und deinem Befinden –
          und nutzt dafür auch KI. Das geht nur mit deiner ausdrücklichen Einwilligung.
        </p>

        <div className="space-y-3 mb-4">
          <label className="flex gap-2.5 text-sm text-brand-text cursor-pointer">
            <input
              type="checkbox" checked={privacy}
              onChange={(e) => setPrivacy(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-shrink-0 accent-accent"
            />
            <span>
              Ich akzeptiere die{' '}
              <Link to="/datenschutz" target="_blank" className="text-accent hover:underline">
                Datenschutzerklärung
              </Link>.
            </span>
          </label>
          <label className="flex gap-2.5 text-sm text-brand-text cursor-pointer">
            <input
              type="checkbox" checked={sensitive}
              onChange={(e) => setSensitive(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-shrink-0 accent-accent"
            />
            <span>
              Ich willige <strong>ausdrücklich</strong> ein, dass EchoB meine besonderen Daten
              (Art. 9 DSGVO) KI-gestützt verarbeitet – inkl. Übermittlung an OpenAI (USA).
            </span>
          </label>
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <button
          onClick={submit}
          disabled={!privacy || !sensitive || saving}
          className="btn-primary w-full disabled:opacity-50"
        >
          {saving ? 'Speichere…' : 'Einwilligen & fortfahren'}
        </button>
        <button
          onClick={() => signOut()}
          className="mt-2 w-full text-center text-xs text-brand-muted hover:text-navy"
        >
          Ablehnen und abmelden
        </button>

        <p className="mt-4 text-xs text-brand-muted/80">
          Du kannst deine Einwilligung jederzeit widerrufen – indem du dein Konto unter
          „Datenschutz" löschst oder uns unter info@echo-b.de kontaktierst.
        </p>
      </div>
    </div>
  )
}
