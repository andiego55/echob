/**
 * StudentCaseNav – Tab-Navigation (zweite Menüleiste) innerhalb einer Fall-Arbeitskopie.
 * Wird auf allen /student/cases/:id/* Seiten angezeigt.
 */
import { NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { studentApi } from '@/api/student'

const baseTabs = [
  { path: '',            label: 'Fall'        },
  { path: '/echo',       label: 'Echo'        },
  { path: '/hypotheses', label: 'Hypothesen'  },
  { path: '/reports',    label: 'Berichte'    },
  { path: '/notes',      label: 'Notizen'     },
]

export default function StudentCaseNav({ copyId }: { copyId: string }) {
  const base = `/student/cases/${copyId}`

  // Paar-Analyse-Tab nur, wenn die Arbeitskopie eine Partnerperson hat.
  // Gleicher Query-Key wie die Fallansicht → geteilter Cache, kein Extra-Load.
  const { data: detail } = useQuery({
    queryKey: ['student-case', copyId],
    queryFn: () => studentApi.caseDetail(copyId),
    enabled: !!copyId,
    staleTime: 60_000,
  })

  const tabs = [
    ...baseTabs,
    ...(detail?.partner ? [{ path: '/couple', label: 'Paar-Analyse' }] : []),
    { path: '/submit', label: 'An Institut' },
  ]
  return (
    <div className="border-b border-brand-border bg-white sticky top-14 z-30">
      <div className="mx-auto max-w-[1100px] px-6 flex items-stretch">
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
      </div>
    </div>
  )
}
