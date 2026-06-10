/**
 * CaseNav – Tab-Navigation innerhalb eines Falls.
 * Wird auf allen /app/cases/:caseId/* Seiten angezeigt.
 */
import { NavLink } from 'react-router-dom'

interface Props {
  caseId: string
}

const tabs = [
  { path: '',          label: 'Überblick'  },
  { path: '/onboarding', label: 'Onboarding' },
  { path: '/scenes',   label: 'Szenen'    },
  { path: '/echo',     label: 'Echo'      },
  { path: '/scales',   label: 'Muster'    },
  { path: '/reports',  label: 'Berichte'  },
]

export default function CaseNav({ caseId }: Props) {
  const base = `/app/cases/${caseId}`

  return (
    <div className="border-b border-brand-border bg-white sticky top-14 z-30">
      <div className="mx-auto max-w-[1100px] px-6">
        <nav className="flex gap-0 overflow-x-auto" aria-label="Fall-Navigation">
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
