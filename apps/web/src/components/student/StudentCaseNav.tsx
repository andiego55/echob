/**
 * StudentCaseNav – Tab-Navigation (zweite Menüleiste) innerhalb einer Fall-Arbeitskopie.
 * Wird auf allen /student/cases/:id/* Seiten angezeigt.
 */
import { NavLink } from 'react-router-dom'

const tabs = [
  { path: '',            label: 'Fall'        },
  { path: '/echo',       label: 'Echo'        },
  { path: '/hypotheses', label: 'Hypothesen'  },
  { path: '/reports',    label: 'Berichte'    },
  { path: '/notes',      label: 'Notizen'     },
  { path: '/submit',     label: 'An Institut' },
]

export default function StudentCaseNav({ copyId }: { copyId: string }) {
  const base = `/student/cases/${copyId}`
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
