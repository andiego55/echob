/**
 * Der Kopf eines Falls: wo bin ich, und wohin kann ich.
 *
 * **Was gefehlt hat.** Bis zur Angleichung standen hier nur die Reiter. Der Name der
 * Fallperson stand ausschliesslich auf der Ueberblicksseite — wer zwei Faelle fuehrt, sah
 * auf `/scenes` nicht, in welchem er gerade schreibt. Der Paarraum loest das seit jeher mit
 * einem Band ueber den Reitern („Mit Lena"); das Band steht jetzt auch hier.
 *
 * **Warum nur die Reiter kleben.** Die Identitaet darf wegscrollen — man liest sie einmal
 * beim Ankommen. Die Navigation soll bleiben, sonst muss man fuer jeden Wechsel ganz nach
 * oben. Deshalb zwei Baender statt eines hohen: Band scrollt, Reiter kleben.
 *
 * Wird auf allen /app/cases/:caseId/* Seiten angezeigt.
 */
import { useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Avatar from '@/components/Avatar'
import { casesApi } from '@/api/cases'
import { RELATIONSHIP_STATUS_LABELS, RELATIONSHIP_TYPE_LABELS } from '@/types'

interface Props {
  caseId: string
}

const tabs = [
  { path: '',            label: 'Überblick'     },
  { path: '/onboarding', label: 'Onboarding'    },
  { path: '/scenes',     label: 'Szenen'        },
  { path: '/echo',       label: 'Echo'          },
  { path: '/scales',     label: 'Muster'        },
  { path: '/review',     label: 'Verlauf'       },
  { path: '/hypotheses', label: 'Hypothesen'    },
  { path: '/reports',    label: 'Berichte'      },
]

const TOPICS = [
  { id: 'topic_self',           label: 'Über mich'           },
  { id: 'topic_person',         label: 'Über die Fallperson' },
  { id: 'topic_responsibility', label: 'Verantwortung'       },
  { id: 'topic_guilt',          label: 'Schuld'              },
]

export default function CaseNav({ caseId }: Props) {
  const base = `/app/cases/${caseId}`
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!dropdownRef.current?.contains(e.relatedTarget as Node)) {
      setDropdownOpen(false)
    }
  }

  // Nur fuer den Namen im Band. Lange `staleTime`, weil sich ein Fallname praktisch nie
  // aendert und die Abfrage sonst auf jeder Unterseite neu liefe.
  const { data: fall } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => casesApi.get(caseId),
    enabled: !!caseId,
    staleTime: 5 * 60_000,
    retry: false,
  })

  const handleTopicClick = (id: string) => {
    setDropdownOpen(false)
    navigate(`${base}/topics/${id}`)
  }

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
        <div className="mx-auto max-w-[1100px] px-6 flex items-stretch">
        {/* Scrollbare Tab-Links */}
        <nav className="flex gap-0 overflow-x-auto flex-1 min-w-0" aria-label="Fall-Navigation">
          {tabs.map(({ path, label }) => (
            <NavLink
              key={path}
              to={`${base}${path}`}
              end={path === ''}
              className={({ isActive }) =>
                `flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 no-underline transition-colors ${
                  isActive
                    ? 'border-accent text-accent'
                    : 'border-transparent text-brand-muted hover:text-brand-text hover:border-brand-border'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Themendialoge — außerhalb des overflow-Containers */}
        <div
          className="relative flex-shrink-0 border-l border-brand-border ml-2 pl-2"
          ref={dropdownRef}
          onBlur={handleBlur}
        >
          <button
            onClick={() => setDropdownOpen(v => !v)}
            className={`flex items-center gap-1 h-full px-4 text-sm font-medium border-b-2 transition-colors ${
              dropdownOpen
                ? 'border-accent text-accent'
                : 'border-transparent text-brand-muted hover:text-brand-text hover:border-brand-border'
            }`}
          >
            Themendialoge
            <svg
              className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute top-full right-0 mt-1 w-60 rounded-brand border border-brand-border bg-white shadow-lg z-50">
              {/* Standard-Themen */}
              <div className="px-3 pt-2.5 pb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted/60">Themen</span>
              </div>
              {TOPICS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => handleTopicClick(id)}
                  className="w-full text-left px-4 py-2.5 text-sm text-brand-text hover:bg-brand-bg hover:text-navy transition-colors"
                >
                  {label}
                </button>
              ))}

              {/* Trennlinie */}
              <div className="border-t border-brand-border my-1" />

              {/* Wissensseiten – Dialog von einer Wissensseite aus starten */}
              <button
                onClick={() => { setDropdownOpen(false); navigate('/wissen') }}
                className="w-full text-left px-4 py-2.5 text-sm font-medium text-accent hover:bg-accent/5 transition-colors"
              >
                Wissensseiten durchsuchen →
              </button>

              <div className="pb-1" />
            </div>
          )}
        </div>
        </div>
      </div>
    </>
  )
}
