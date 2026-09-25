/**
 * Rahmen für alle Seiten eines Paarraums: Kopfzeile mit dem Namen der Partnerperson und
 * die Navigation — analog zur Fallansicht.
 *
 * Lädt den Raum einmal zentral und behandelt „gibt es nicht / beendet" an einer Stelle,
 * damit das nicht jede Unterseite für sich lösen muss.
 *
 * **Warum zwei Ebenen.** Die Leiste war auf neun Reiter gewachsen und scrollte waagerecht.
 * Auf dem Telefon waren die hinteren dadurch unsichtbar, und nichts deutete an, dass dort
 * noch etwas ist — ausgerechnet Rückblick, Fortschritt und Einstellungen. Jetzt oben fünf
 * Gruppen (passen auf jeden Schirm), darunter die Unterreiter der aktiven Gruppe. Wer
 * „Klären" liest, ahnt, was darin liegt; „Mediation" allein sagte das nicht.
 *
 * Die obere Reihe ist auf 375 Pixel Breite ausgemessen und passt dort ohne Scrollen — mit
 * schmalerem Innenabstand als auf dem Schreibtisch. Wer eine sechste Gruppe erwägt, misst
 * bitte nach, statt zu schätzen: Bei px-4 lag „Wir" schon als fünfte außerhalb.
 *
 * Einstellungen sind aus der Reihe heraus und sitzen als Zahnrad rechts in der Kopfzeile —
 * sie sind kein Inhalt, sondern Verwaltung.
 */
import { NavLink, Link, useLocation, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import { coupleApi } from '@/api/couple'
import CoupleOnboarding from './CoupleOnboarding'
import InfoPopover from '@/components/InfoPopover'
import Verbindungshinweis from '@/components/Verbindungshinweis'
import { apiErrorMessage, istEndgueltigWeg } from '@/api/errors'

interface Reiter { path: string; label: string }
interface Gruppe { label: string; kinder: Reiter[] }

/**
 * Die Gruppen bündeln nach dem, was man vorhat — nicht nach der Technik dahinter.
 *
 * **Warum „Üben" dazugekommen ist.** Szenen, Tests und Impulse sind dieselbe Übung: Es gibt
 * vorbereitetes Material, beide antworten getrennt, und erst wenn beide fertig sind, sieht
 * man das Ergebnis nebeneinander. Dieselbe Blindheitsregel, dieselbe Bewegung. Sie lagen
 * trotzdem an drei verschiedenen Orten — Szenen unter „Reden", Tests und Impulse unter
 * „Wir" —, weil sie nacheinander entstanden sind und jeweils dort angehängt wurden, wo
 * gerade Platz war. Wer eine Übung für heute Abend sucht, musste das wissen.
 *
 * **Warum Szenen nicht unter „Reden" gehören.** Dort steht, was man sagt. Bei den Szenen
 * sagt man nichts zueinander, man antwortet getrennt auf fremdes Material. Das ist ein
 * anderer Vorgang, auch wenn hinterher ein Gespräch daraus werden kann.
 *
 * **Fünf statt vier Gruppen.** Die Grenze war nie die Zahl, sondern die Breite: Die alte
 * Leiste scrollte, weil sie neun Reiter trug. Fünf kurze Wörter tun das nicht.
 */
export const GRUPPEN: Gruppe[] = [
  { label: 'Übersicht', kinder: [{ path: '', label: 'Übersicht' }] },
  {
    label: 'Reden',
    kinder: [
      { path: '/echo', label: 'Echo' },
      { path: '/mitteilen', label: 'Ehrlich mitteilen' },
      { path: '/fragen', label: 'Fragen' },
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
    label: 'Üben',
    kinder: [
      { path: '/szenen', label: 'Szenen' },
      { path: '/tests', label: 'Tests' },
      { path: '/impulse', label: 'Impulse' },
    ],
  },
  {
    label: 'Wir',
    kinder: [
      { path: '/rhythmus', label: 'Rhythmus' },
      { path: '/rueckblick', label: 'Rückblick' },
      { path: '/fortschritt', label: 'Fortschritt' },
      { path: '/freigaben', label: 'Freigaben' },
    ],
  },
]

const EINSTELLUNGEN = '/einstellungen'

/**
 * Unterseiten, die keinen eigenen Reiter haben, aber zu einem gehören.
 *
 * Ein einzelner Test liegt unter `/test/<slug>` (Einzahl), der Reiter heißt `/tests`. Die
 * Präfixprüfung unten trifft ihn deshalb nicht, und wer einen Test ausfüllte, sah die Leiste
 * auf „Übersicht" zurückfallen — als hätte er den Bereich verlassen.
 */
const ZUSATZPFADE: Record<string, string> = { '/test/': '/tests' }

/** Welche Gruppe gehört zum aktuellen Pfad? Fällt auf „Übersicht" zurück. */
export function aktiveGruppe(rest: string): Gruppe {
  const treffer = Object.entries(ZUSATZPFADE).find(([p]) => rest.startsWith(p))
  const pfad = treffer ? treffer[1] : rest
  for (const g of GRUPPEN) {
    if (g.kinder.some(k => k.path && pfad.startsWith(k.path))) return g
  }
  return GRUPPEN[0]
}

export default function CoupleShell({
  children, subtitle, aktion,
}: {
  children: React.ReactNode
  subtitle?: string
  /**
   * Die Hauptaktion dieser Seite — bekommt einen festen Platz oben rechts.
   *
   * Das kann der Nutzerbereich seit jeher besser: Dort steht „+ Szene anlegen" immer an
   * derselben Stelle. Im Paarraum lag die entsprechende Aktion irgendwo in einer Karte,
   * mal oben, mal nach einem Formular, mal hinter einem Aufklapper — man musste jedes Mal
   * suchen.
   */
  aktion?: React.ReactNode
}) {
  const { coupleId = '' } = useParams<{ coupleId: string }>()
  const { pathname } = useLocation()
  const base = `/app/paar/${coupleId}`
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : ''

  const { data: room, isLoading, error } = useQuery({
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

  // Nur ein echtes „weg" (404/410) rechtfertigt diesen Satz. Alles andere ist ein
  // „gerade nicht", und dann bleibt der Raum stehen - siehe Verbindungshinweis.
  if (!room) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[1100px] px-6 py-8">
          <div className="card">
            <h1 className="page-title card-title">
              {istEndgueltigWeg(error) ? 'Paarraum nicht gefunden' : 'Paarraum gerade nicht erreichbar'}
            </h1>
            <p className="mt-2 text-sm text-brand-muted">
              {istEndgueltigWeg(error)
                ? 'Dieser Raum existiert nicht oder wurde beendet.'
                : apiErrorMessage(error)}
            </p>
            <Link to="/app/paar" className="btn-quiet !py-2 !px-4 !text-sm mt-4 inline-block">
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
              ← Für Paare
            </Link>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <h1 className="page-title">
                Mit {room.partner_display_name || 'deiner Partnerperson'}
              </h1>
              {/* Die fuenf Grundregeln: beim ersten Besuch offen, danach auf Zuruf. */}
              <InfoPopover label="Die fünf Grundregeln" title="Bevor ihr loslegt" align="left">
                <CoupleOnboarding />
              </InfoPopover>
            </div>
            {subtitle && <p className="mt-1 text-sm text-brand-muted">{subtitle}</p>}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
          {aktion}

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
        </div>

      </div>

      {/* ── Ebene 1: vier Gruppen ────────────────────────────────────
          Eigenes, KLEBENDES Band. Vorher hing es mit der Identitaet in einem Kasten und
          scrollte mit weg — auf einer langen Uebersicht musste man fuer jeden Wechsel
          ganz nach oben. Der Nutzerbereich macht das seit jeher richtig; das Band ueber
          den Reitern darf dagegen ruhig verschwinden, man liest es einmal beim Ankommen. */}
      <div className="sticky top-14 z-30 border-b border-brand-border bg-white">
        <div className="mx-auto max-w-[1100px] px-6">
          {/* Fuenf kurze Woerter passen auf jeden Schirm - aber nur knapp, und nur mit
              schmalerem Innenabstand: Mit px-4 brauchte die Leiste auf einem 375er-Telefon
              369 von 327 verfuegbaren Pixeln, "Wir" lag ausserhalb. Gemessen, nicht
              geschaetzt. overflow-x bleibt als Netz, falls jemand die Schrift hochstellt. */}
          <nav className="flex gap-0 overflow-x-auto" aria-label="Bereiche des Paarraums">
            {GRUPPEN.map(g => {
              const aktiv = !inEinstellungen && g.label === gruppe.label
              return (
                <NavLink
                  key={g.label}
                  to={`${base}${g.kinder[0].path}`}
                  end={g.kinder[0].path === ''}
                  className={`flex-shrink-0 px-2 py-3 text-sm font-medium border-b-2 no-underline transition-colors sm:px-4 ${
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

      <div className="mx-auto max-w-[1100px] px-6 py-8">
        <Verbindungshinweis error={error} />
        {children}
      </div>
    </AppShell>
  )
}
