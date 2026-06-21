/**
 * /professional/dashboard — fallübergreifendes Cockpit der Fachperson.
 * „Braucht Aufmerksamkeit" (beantwortete Fragebögen, Antworten der Klient:innen),
 * nächste Termine, und alle Fälle mit Status. Nur aktiv freigegebene Fälle.
 */
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import ProfessionalShell from '@/components/professional/ProfessionalShell'
import { Spinner } from '@/components/auth/ProfessionalRoute'
import { professionalApi } from '@/api/professional'

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('de-DE', {
    weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function fmtDay(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: '2-digit' })
}

export default function ProfessionalDashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ['prof-dashboard'], queryFn: professionalApi.dashboard })

  if (isLoading) return <Spinner />

  const cases = data?.cases ?? []
  const attention = data?.attention ?? []
  const appointments = data?.appointments ?? []
  const isEmpty = cases.length === 0

  return (
    <ProfessionalShell>
      <div className="mx-auto max-w-[1100px] px-6 py-10">
        <h1 className="text-2xl font-bold text-navy">Dashboard</h1>
        <p className="mt-1 text-sm text-brand-muted mb-8">Dein Überblick über alle Klient:innen.</p>

        {isEmpty && (
          <div className="card text-center py-12">
            <div className="text-4xl mb-3">📋</div>
            <h2 className="text-lg font-semibold text-navy mb-1">Noch keine Klient:innen</h2>
            <p className="text-sm text-brand-muted">
              Sobald jemand einen Fall mit dir teilt, erscheint er hier.
            </p>
          </div>
        )}

        {!isEmpty && (
          <div className="grid gap-3 sm:grid-cols-3 mb-8">
            <Metric label="Fälle" value={cases.length} />
            <Metric label="Braucht Aufmerksamkeit" value={attention.length} accent={attention.length > 0} />
            <Metric label="Offene Aufgaben" value={cases.reduce((n, c) => n + c.open_count, 0)} />
          </div>
        )}

        {attention.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-muted mb-3">Braucht deine Aufmerksamkeit</h2>
            <div className="space-y-2">
              {attention.map((a, i) => (
                <Link
                  key={i}
                  to={`/professional/cases/${a.case_id}`}
                  className="card flex items-center justify-between gap-3 no-underline hover:border-accent/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg shrink-0">{a.kind === 'questionnaire_answered' ? '📋' : '✉️'}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-navy truncate">{a.client_display_name} · {a.title}</p>
                      <p className="text-xs text-brand-muted">
                        {a.kind === 'questionnaire_answered' ? 'Fragebogen beantwortet' : 'Hat dir geantwortet'} · {fmtDate(a.at)}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-accent shrink-0">{a.detail}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {!isEmpty && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-muted mb-3">Nächste Termine</h2>
            {appointments.length === 0 ? (
              <p className="text-sm text-brand-muted">Keine anstehenden Termine.</p>
            ) : (
              <div className="space-y-2">
                {appointments.map((a, i) => (
                  <Link
                    key={i}
                    to={`/professional/cases/${a.case_id}`}
                    className="card flex items-center justify-between gap-3 no-underline hover:border-accent/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-navy truncate">
                        📅 {a.client_display_name} · {a.title}{a.location ? ` · ${a.location}` : ''}
                      </p>
                      <p className="text-xs text-brand-muted">{fmtDate(a.start_at)}</p>
                    </div>
                    <span className="text-[11px] text-brand-muted shrink-0">{a.status}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {!isEmpty && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-muted mb-3">Deine Fälle</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {cases.map(c => (
                <Link
                  key={c.case_id}
                  to={`/professional/cases/${c.case_id}`}
                  className="card no-underline hover:border-accent/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-navy truncate">{c.client_display_name}</p>
                      <p className="text-xs text-brand-muted">{c.case_title}</p>
                    </div>
                    {c.open_count > 0 && (
                      <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                        {c.open_count} offen
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-[11px] text-brand-muted">Zuletzt aktiv: {fmtDay(c.last_activity)}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </ProfessionalShell>
  )
}

function Metric({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-brand border px-4 py-3 ${accent ? 'border-accent/40 bg-accent/5' : 'border-brand-border bg-white'}`}>
      <p className="text-xs text-brand-muted">{label}</p>
      <p className={`text-2xl font-bold ${accent ? 'text-accent' : 'text-navy'}`}>{value}</p>
    </div>
  )
}
