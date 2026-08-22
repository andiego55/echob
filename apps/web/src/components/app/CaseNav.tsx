/**
 * Der Kopf eines Falls: wo bin ich, und wohin kann ich.
 *
 * **Was gefehlt hat.** Bis zur Angleichung standen hier nur acht gleichrangige Reiter. Der
 * Name der Fallperson stand ausschließlich auf der Überblicksseite — wer zwei Fälle führt,
 * sah auf `/scenes` nicht, in welchem er gerade schreibt. Und Szenen landen im falschen
 * Fall, wenn man das nicht sieht.
 *
 * **Warum jetzt Gruppen.** Acht Reiter nebeneinander verlangen, dass man alle acht liest,
 * um einen zu finden — und sie sagen nichts darüber, wie die Arbeit an einem Fall abläuft.
 * Vier Gruppen sagen es: **erfassen**, was passiert ist · **verstehen**, was dahintersteckt ·
 * **zeigen**, was daraus geworden ist. Das ist dieselbe Gliederung, die der Paarraum seit
 * jeher hat, und dieselbe Bauweise: eine Ebene für die Gruppe, eine für das, was darin liegt.
 *
 * **Warum nur die Reiter kleben.** Die Identität darf wegscrollen — man liest sie einmal
 * beim Ankommen. Die Navigation soll bleiben, sonst muss man für jeden Wechsel ans
 * Seitenende zurück.
 *
 * Wird auf allen /app/cases/:caseId/* Seiten angezeigt.
 */
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Avatar from '@/components/Avatar'
import { casesApi } from '@/api/cases'
import { RELATIONSHIP_STATUS_LABELS, RELATIONSHIP_TYPE_LABELS } from '@/types'
import { GRUPPEN, gruppeFuer } from './caseNavGroups'

interface Props {
  caseId: string
}

/** Die vier geführten Themendialoge — sie hängen an „Verstehen". */
const TOPICS = [
  { id: 'topic_self',           label: 'Über mich'           },
  { id: 'topic_person',         label: 'Über die Fallperson' },
  { id: 'topic_responsibility', label: 'Verantwortung'       },
  { id: 'topic_guilt',          label: 'Schuld'              },
]

export default function CaseNav({ caseId }: Props) {
  const base = `/app/cases/${caseId}`
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Nur für den Namen im Band. Lange `staleTime`, weil sich ein Fallname praktisch nie
  // ändert und die Abfrage sonst auf jeder Unterseite neu liefe.
  const { data: fall } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => casesApi.get(caseId),
    enabled: !!caseId,
    staleTime: 5 * 60_000,
    retry: false,
  })

  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : ''
  const inThemen = rest.startsWith('/topics')
  const gruppe = gruppeFuer(rest)
  const zeigeUnterreiter = gruppe.kinder.length > 1

  useEffect(() => {
    if (!dropdownOpen) return
    const zu = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) setDropdownOpen(false)
    }
    const taste = (e: KeyboardEvent) => { if (e.key === 'Escape') setDropdownOpen(false) }
    document.addEventListener('mousedown', zu)
    document.addEventListener('keydown', taste)
    return () => {
      document.removeEventListener('mousedown', zu)
      document.removeEventListener('keydown', taste)
    }
  }, [dropdownOpen])

  return (
    <>
      {/* Wo bin ich — scrollt bewusst weg, man liest es einmal beim Ankommen. */}
      <div className="border-b border-brand-border bg-white">
        <div className="mx-auto flex max-w-[1100px] items-center gap-3 px-6 pt-5 pb-3">
          <Avatar value={fall?.avatar} size="sm" />
          <div className="min-w-0">
            <Link to="/app" className="text-xs text-brand-muted no-underline hover:text-navy">
              ← Meine Fälle
            </Link>
            <p className="truncate text-lg font-bold leading-tight text-navy">
              {fall?.person_name?.trim()
                || (fall && RELATIONSHIP_STATUS_LABELS[fall.relationship_status])
                || 'Fall'}
            </p>
          </div>
          {fall && (
            <span className="ml-auto hidden shrink-0 text-xs text-brand-muted sm:block">
              {RELATIONSHIP_TYPE_LABELS[fall.relationship_type]}
            </span>
          )}
        </div>
      </div>

      {/* Wohin kann ich — bleibt stehen, damit ein Wechsel nicht ans Seitenende zwingt. */}
      <div className="sticky top-14 z-30 border-b border-brand-border bg-white">
        <div className="mx-auto max-w-[1100px] px-6">
          <nav className="flex gap-0 overflow-x-auto" aria-label="Bereiche des Falls">
            {GRUPPEN.map(g => {
              const aktiv = g.label === gruppe.label
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

      {/* Was in dieser Gruppe liegt. */}
      {zeigeUnterreiter && (
        <div className="border-b border-brand-border bg-brand-bg">
          <div className="mx-auto max-w-[1100px] px-6">
            <nav className="flex flex-wrap items-center gap-1.5 py-2.5"
              aria-label={`${gruppe.label} – Unterbereiche`}>
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

              {/* Die vier gefuehrten Themendialoge haengen an „Verstehen“ — sie sind
                  keine Seite, sondern vier Einstiege, deshalb ein Aufklapper. */}
              {gruppe.label === 'Verstehen' && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(v => !v)}
                    aria-expanded={dropdownOpen}
                    className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                      inThemen || dropdownOpen
                        ? 'bg-accent/10 font-semibold text-accent'
                        : 'text-brand-muted hover:bg-white hover:text-navy'
                    }`}
                  >
                    Themendialoge
                    <svg className={`h-3 w-3 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {dropdownOpen && (
                    <div className="absolute left-0 top-full z-50 mt-1 w-60 rounded-brand border border-brand-border bg-white py-1 shadow-brand-lg">
                      {TOPICS.map(({ id, label }) => (
                        <button
                          key={id}
                          onClick={() => { setDropdownOpen(false); navigate(`${base}/topics/${id}`) }}
                          className="w-full px-4 py-2.5 text-left text-sm text-brand-text transition-colors hover:bg-brand-bg hover:text-navy"
                        >
                          {label}
                        </button>
                      ))}
                      <div className="my-1 border-t border-brand-border" />
                      <button
                        onClick={() => { setDropdownOpen(false); navigate('/wissen') }}
                        className="w-full px-4 py-2.5 text-left text-sm font-medium text-accent transition-colors hover:bg-accent/5"
                      >
                        Wissensseiten durchsuchen →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
