/**
 * Rahmen für alle Seiten eines Paarraums: Kopfzeile mit dem Namen der Partnerperson und
 * die Reiter-Navigation — analog zur Fallansicht.
 *
 * Lädt den Raum einmal zentral und behandelt „gibt es nicht / beendet" an einer Stelle,
 * damit das nicht jede Unterseite für sich lösen muss.
 */
import { NavLink, Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import { coupleApi } from '@/api/couple'

const TABS = [
  { path: '',               label: 'Übersicht' },
  { path: '/echo',          label: 'Echo' },
  { path: '/gespraeche',    label: 'Gespräche' },
  { path: '/mediation',     label: 'Mediation' },
  { path: '/abmachungen',   label: 'Abmachungen' },
  { path: '/tests',         label: 'Tests' },
  { path: '/rueckblick',    label: 'Rückblick' },
  { path: '/fortschritt',   label: 'Fortschritt' },
  { path: '/einstellungen', label: 'Einstellungen' },
]

export default function CoupleShell({
  children, subtitle,
}: { children: React.ReactNode; subtitle?: string }) {
  const { coupleId = '' } = useParams<{ coupleId: string }>()
  const base = `/app/paar/${coupleId}`

  const { data: room, isLoading, isError } = useQuery({
    queryKey: ['couple-link', coupleId],
    queryFn: () => coupleApi.get(coupleId),
    enabled: !!coupleId,
    retry: false,
  })

  if (isLoading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[1100px] px-6 py-8 text-sm text-brand-muted">Lade …</div>
      </AppShell>
    )
  }

  if (isError || !room) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[1100px] px-6 py-8">
          <div className="card">
            <h1 className="text-sm font-bold text-navy">Paarraum nicht gefunden</h1>
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

  return (
    <AppShell>
      <div className="border-b border-brand-border bg-white">
        <div className="mx-auto max-w-[1100px] px-6 pt-6 pb-3">
          <Link to="/app/paar" className="text-xs text-brand-muted hover:text-navy">
            ← Zu zweit
          </Link>
          <h1 className="mt-1.5 text-2xl font-bold text-navy">
            Mit {room.partner_display_name || 'deiner Partnerperson'}
          </h1>
          {subtitle && <p className="mt-1 text-sm text-brand-muted">{subtitle}</p>}
        </div>

        <div className="mx-auto max-w-[1100px] px-6">
          <nav className="flex gap-0 overflow-x-auto" aria-label="Paarraum-Navigation">
            {TABS.map(({ path, label }) => (
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

      <div className="mx-auto max-w-[1100px] px-6 py-8">{children}</div>
    </AppShell>
  )
}
