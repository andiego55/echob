import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { clientInvitesApi } from '@/api/clientInvites'
import { clearPendingInvite, setPendingInvite } from '@/lib/pendingInvite'

/**
 * Öffentliche Einladungs-Landingpage (/einladung/:token). Zeigt, wer einlädt,
 * merkt sich die Einladung (localStorage) und führt die Person in die
 * Registrierung. Ist sie bereits eingeloggt, wird die Einladung direkt
 * angenommen und die Verbindung hergestellt.
 */
export default function ClientInvitePage() {
  const { token } = useParams<{ token: string }>()
  const { session } = useAuth()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-invite', token],
    queryFn: () => clientInvitesApi.public(token!),
    enabled: !!token,
    retry: false,
  })

  // Einladung über den Auth-Umweg hinweg merken.
  useEffect(() => {
    if (token) setPendingInvite({ token })
  }, [token])

  // Bereits eingeloggt → direkt annehmen.
  const ran = useRef(false)
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState<{ name: string | null } | null>(null)
  const [acceptErr, setAcceptErr] = useState<string | null>(null)

  useEffect(() => {
    if (!session || !token || ran.current) return
    ran.current = true
    setAccepting(true)
    clientInvitesApi.accept({ token })
      .then((res) => { clearPendingInvite(); setAccepted({ name: res.professional_display_name }) })
      .catch(() => { setAcceptErr('Diese Einladung ist nicht mehr gültig oder wurde bereits verwendet.') })
      .finally(() => setAccepting(false))
  }, [session, token])

  const proName = data?.professional_display_name
  const proLine = [data?.professional_title, data?.org_name].filter(Boolean).join(' · ')

  return (
    <Shell>
      {isLoading && <p className="text-sm text-brand-muted">Einladung wird geladen …</p>}

      {isError && <Invalid text="Diese Einladung wurde nicht gefunden." />}

      {data && !data.valid && !accepted && (
        <Invalid text={
          data.status === 'expired'
            ? 'Diese Einladung ist abgelaufen.'
            : 'Diese Einladung ist nicht mehr gültig (bereits verwendet oder zurückgezogen).'
        } proName={proName} />
      )}

      {/* Erfolg (eingeloggt + angenommen) */}
      {accepted && (
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-3xl text-accent">✓</div>
          <h1 className="text-xl font-bold text-navy">
            {accepted.name ? `Sie sind mit ${accepted.name} verbunden.` : 'Verbindung hergestellt.'}
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-brand-muted">
            Erstellen Sie jetzt Ihren ersten Fall und geben Sie ihn frei, wann immer Sie bereit
            sind. Sie entscheiden, was geteilt wird.
          </p>
          <Link to="/app" className="btn-primary mt-6 inline-flex">Zu meinen Fällen</Link>
        </div>
      )}

      {acceptErr && !accepted && <Invalid text={acceptErr} proName={proName} />}

      {/* Gültig + nicht eingeloggt → Einladung annehmen via Registrierung */}
      {data?.valid && !session && (
        <div className="text-center">
          <span className="label">Persönliche Einladung</span>
          <h1 className="mt-2 text-[clamp(1.4rem,3vw,1.9rem)] font-extrabold leading-tight text-navy">
            {proName ? <>{proName} lädt Sie zu <span className="text-accent">EchoB</span> ein</> : <>Einladung zu EchoB</>}
          </h1>
          {proLine && <p className="mt-1 text-sm text-brand-muted">{proLine}</p>}

          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-brand-muted">
            Mit EchoB sortieren Sie Ihre Beziehungssituation in Ruhe – Szene für Szene – und teilen
            gezielt, was Sie möchten. Ihre Daten bleiben bei Ihnen; Sie behalten jederzeit die
            Kontrolle.
          </p>

          <ul className="mx-auto mt-5 max-w-sm space-y-1.5 text-left text-sm text-brand-text">
            {[
              'Kostenlos starten, ohne Kreditkarte',
              'Sie geben nur frei, was Sie ausdrücklich teilen möchten',
              `Direkt mit ${proName ?? 'Ihrer Fachperson'} verbunden`,
            ].map(t => (
              <li key={t} className="flex gap-2"><span className="text-accent">✓</span>{t}</li>
            ))}
          </ul>

          <Link to="/auth" className="btn-primary mt-7 inline-flex w-full justify-center sm:w-auto">
            Kostenlos starten
          </Link>
          <p className="mt-4 text-xs text-brand-muted">
            Schon ein Konto?{' '}
            <Link to="/auth" state={{ defaultTab: 'login' }} className="text-accent hover:underline">
              Anmelden
            </Link>{' '}– die Verbindung wird danach automatisch hergestellt.
          </p>
        </div>
      )}

      {accepting && !accepted && !acceptErr && (
        <p className="text-center text-sm text-brand-muted">Verbindung wird hergestellt …</p>
      )}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-brand-bg">
      <header className="border-b border-white/[0.07] bg-navy px-6 py-4">
        <Link to="/" className="text-[1.2rem] font-extrabold tracking-[-0.02em] text-white">
          Echo<span className="text-accent">B</span>
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="card">{children}</div>
          <p className="mt-6 text-center text-xs text-brand-muted">
            <Link to="/datenschutz" className="hover:underline">Datenschutz</Link>
            {' · '}
            <Link to="/impressum" className="hover:underline">Impressum</Link>
          </p>
        </div>
      </main>
    </div>
  )
}

function Invalid({ text, proName }: { text: string; proName?: string | null }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-bg text-2xl">⌛</div>
      <h1 className="text-lg font-bold text-navy">Einladung nicht verfügbar</h1>
      {proName && <p className="mt-1 text-sm text-brand-muted">Einladung von {proName}</p>}
      <p className="mx-auto mt-3 max-w-sm text-sm text-brand-muted">{text}</p>
      <Link to="/" className="mt-6 inline-flex text-sm font-medium text-accent hover:underline">
        Zur EchoB-Startseite
      </Link>
    </div>
  )
}
