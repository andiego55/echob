/**
 * CaseNav – Tab-Navigation innerhalb eines Falls.
 * Wird auf allen /app/cases/:caseId/* Seiten angezeigt.
 */
import { useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

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

const BLOG_TOPICS = [
  { id: 'blog_beziehungsmuster',     label: 'Beziehungsmuster erkennen'          },
  { id: 'blog_beobachtung_gefuehl',  label: 'Beobachtung, Gefühl, Interpretation'},
  { id: 'blog_professionelle_hilfe', label: 'Wann professionelle Hilfe sinnvoll ist' },
  { id: 'blog_krisentelefone',       label: 'Krisentelefone & Anlaufstellen'     },
]

export default function CaseNav({ caseId }: Props) {
  const base = `/app/cases/${caseId}`
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [blogExpanded, setBlogExpanded] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!dropdownRef.current?.contains(e.relatedTarget as Node)) {
      setDropdownOpen(false)
      setBlogExpanded(false)
    }
  }

  const handleTopicClick = (id: string) => {
    setDropdownOpen(false)
    setBlogExpanded(false)
    navigate(`${base}/topics/${id}`)
  }

  return (
    <div className="border-b border-brand-border bg-white sticky top-14 z-30">
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
            onClick={() => { setDropdownOpen(v => !v); setBlogExpanded(false) }}
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

              {/* Aus dem Blog — aufklappbar */}
              <button
                onClick={() => setBlogExpanded(v => !v)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-accent hover:bg-accent/5 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Aus dem Blog</span>
                </span>
                <svg
                  className={`w-3.5 h-3.5 transition-transform ${blogExpanded ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {blogExpanded && (
                <>
                  {BLOG_TOPICS.map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => handleTopicClick(id)}
                      className="w-full text-left px-4 py-2.5 text-sm text-brand-text hover:bg-accent/5 hover:text-navy transition-colors pl-6"
                    >
                      {label}
                    </button>
                  ))}
                </>
              )}

              <div className="pb-1" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
