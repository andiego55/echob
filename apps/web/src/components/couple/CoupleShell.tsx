/**
 * Rahmen für alle Seiten eines Paarraums: Kopfzeile mit dem Namen der Partnerperson und
 * die Navigation — analog zur Fallansicht.
 *
 * Lädt den Raum einmal zentral und behandelt „gibt es nicht / beendet" an einer Stelle,
 * damit das nicht jede Unterseite für sich lösen muss.
 *
 * **Warum zwei Ebenen.** Die Leiste war auf neun Reiter gewachsen und scrollte waagerecht.
 * Auf dem Telefon waren die hinteren dadurch unsichtbar, und nichts deutete an, dass dort
 * noch etwas ist — ausgerechnet Rückblick, Fortschritt und Einstellungen. Jetzt oben vier
 * Gruppen (passen auf jeden Schirm), darunter die Unterreiter der aktiven Gruppe. Wer
 * „Klären" liest, ahnt, was darin liegt; „Mediation" allein sagte das nicht.
 *
 * Einstellungen sind aus der Reihe heraus und sitzen als Zahnrad rechts in der Kopfzeile —
 * sie sind kein Inhalt, sondern Verwaltung.
 */
import { NavLink, Link, useLocation, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import { coupleApi } from '@/api/couple'

interface Reiter { path: string; label: string }
interface Gruppe { label: string; kinder: Reiter[] }

/** Die Gruppen bündeln nach dem, was man vorhat — nicht nach der Technik dahinter. */
const GRUPPEN: Gruppe[] = [
  { label: 'Übersicht', kinder: [{ path: '', label: 'Übersicht' }] },
  {
    label: 'Reden',
    kinder: [
      { path: '/echo', label: 'Echo' },
      { path: '/gespraeche', label: 'Gespräche' },
      { path: '/streit', label: 'Nach einem Streit' },
    ],
  },
  {
    label: 'Klären',
    kinder: [
      { path: '/mediation', label: 'Mediation' },
      { path: '/abmachungen', label: 'Abmachungen' },
    ],
  },
  {
    label: 'Wir',
    kinder: [
      { path: '/rueckblick', label: 'Rückblick' },
      { path: '/fortschritt', label: 'Fortschritt' },
      { path: '/tests', label: 'Tests' },
    ],
  },
]

const EINSTELLUNGEN = '/einstellungen'

/** Welche Gruppe gehört zum aktuellen Pfad? Fällt auf „Übersicht" zurück. */
function aktiveGruppe(rest: string): Gruppe {
  for (const g of GRUPPEN) {
    if (g.kinder.some(k => k.path && rest.startsWith(k.path))) return g
  }
  return GRUPPEN[0]
}

export default function CoupleShell({
  children, subtitle,
}: { children: React.ReactNode; subtitle?: string }) {
  const { coupleId = '' } = useParams<{ coupleId: string }>()
  const { pathname } = useLocation()
  const base = `/app/paar/${coupleId}`
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : ''

  const { data: room, isLoading, isError } = useQuery({
    queryKey: ['couple-link', coupleId],
    queryFn: () => coupleApi.get(coupleId),
    enabled: !!coupleId,
    retry: false,
  })

  if (isLoading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[1100px] px-6 py-8" role="status" aria-busy="true">
          <div className="animate-pulse space-y-3">
            <div className="h-7 w-64 rounded bg-brand-border/60" />
            <div className="h-4 w-96 max-w-full rounded bg-brand-border/60" />
          </div>
          <span className="sr-only">Paarraum wird geladen</span>
        </div>
      </AppShell>
    )
  }

  if (isError || !room) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[1100px] px-6 py-8">
          <div className="card">
            <h1 className="card-title">Paarraum nicht gefunden</h1>
            <p className="mt-2 text-sm text-brand-muted">
              Dieser Raum existiert nicht oder wurde beendet.
            </p>
            <Link to="/app/paar" className="btn-outline !py-2 !px-4 !text-sm mt-4 inline-block">
              Zur Übersicht
            </Link>
          </div>
        </div>
      </AppShell>
    )
  }

  const gruppe = aktiveGruppe(rest)
  const inEinstellungen = rest.startsWith(EINSTELLUNGEN)
  const zeigeUnterreiter = !inEinstellungen && gruppe.kinder.length > 1

  return (
    <AppShell>
      <div className="border-b border-brand-border bg-white">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-start justify-between gap-3 px-6 pt-6 pb-3">
          <div className="min-w-0">
            <Link to="/app/paar" className="text-xs text-brand-muted hover:text-navy">
              ← Zu zweit
            </Link>
            <h1 className="mt-1.5 text-2xl font-bold text-navy">
              Mit {room.partner_display_name || 'deiner Partnerperson'}
            </h1>
            {subtitle && <p className="mt-1 text-sm text-brand-muted">{subtitle}</p>}
          </div>

          {/* Verwaltung gehört nicht in die Inhaltsreihe. */}
          <NavLink
            to={`${base}${EINSTELLUNGEN}`}
            aria-label="Einstellungen des Paarraums"
            title="Einstellungen"
            className={`shrink-0 rounded-brand-sm p-2 transition-colors ${
              inEinstellungen
                ? 'bg-accent/10 text-accent'
                : 'text-brand-muted hover:bg-brand-bg hover:text-navy'
            }`}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.36.43.64.79.79H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </NavLink>
        </div>

        {/* ── Ebene 1: vier Gruppen ────────────────────────────────── */}
        <div className="mx-auto max-w-[1100px] px-6">
          {/* Vier kurze Woerter passen auf jeden Schirm; overflow-x bleibt als Netz,
              falls jemand die Schrift hochstellt. */}
          <nav className="flex gap-0 overflow-x-auto" aria-label="Bereiche des Paarraums">
            {GRUPPEN.map(g => {
              const aktiv = !inEinstellungen && g.label === gruppe.label
              return (
                <NavLink
                  key={g.label}
                  to={`${base}${g.kinder[0].path}`}
                  end={g.kinder[0].path === ''}
                  className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 no-underline transition-colors ${
                    aktiv
                      ? 'border-accent text-accent'
                      : 'border-transparent text-brand-muted hover:text-brand-text hover:border-brand-border'
                  }`}
                >
                  {g.label}
                </NavLink>
              )
            })}
          </nav>
        </div>
      </div>

      {/* ── Ebene 2: was in dieser Gruppe liegt ──────────────────── */}
      {zeigeUnterreiter && (
        <div className="border-b border-brand-border bg-brand-bg">
          <div className="mx-auto max-w-[1100px] px-6">
            <nav className="flex flex-wrap gap-1.5 py-2.5" aria-label={`${gruppe.label} – Unterbereiche`}>
              {gruppe.kinder.map(k => (
                <NavLink
                  key={k.path}
                  to={`${base}${k.path}`}
                  className={({ isActive }) =>
                    `rounded-full px-3.5 py-1.5 text-xs no-underline transition-colors ${
                      isActive
                        ? 'bg-accent/10 font-semibold text-accent'
                        : 'text-brand-muted hover:bg-white hover:text-navy'
                    }`
                  }
                >
                  {k.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1100px] px-6 py-8">{children}</div>
    </AppShell>
  )
}
