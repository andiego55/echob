/**
 * /professional/dashboard — fallzentriertes Cockpit.
 * Klient:innen/Fälle mit Status (ungelesen · offene Aufgaben · nächster Termin);
 * je Fall aufklappbar mit den konkreten Punkten + Sprung in den passenden Reiter.
 * „Braucht Aufmerksamkeit" (eingehend, gelesen/ungelesen) lebt im Postfach.
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import ProfessionalShell from '@/components/professional/ProfessionalShell'
import { Spinner } from '@/components/auth/ProfessionalRoute'
import { professionalApi, type DashboardItem } from '@/api/professional'

function fmtAppt(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', {
    weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}
function fmtDay(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: '2-digit' })
}

const ITEM_ICON: Record<DashboardItem['kind'], string> = {
  questionnaire_answered: '📋', dialog_summary: '💬', message_reply: '✉️', open_task: '⏳',
}

export default function ProfessionalDashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ['prof-dashboard'], queryFn: professionalApi.dashboard })

  // Fälle mit ungelesenen Eingängen einmalig aufgeklappt (danach steuert die Nutzer:in selbst).
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const inited = useRef(false)
  useEffect(() => {
    if (data && !inited.current) {
      inited.current = true
      const init: Record<string, boolean> = {}
      data.cases.forEach(c => { if (c.unread_count > 0) init[c.case_id] = true })
      setOpen(init)
    }
  }, [data])

  if (isLoading) return <Spinner />

  const cases = data?.cases ?? []
  const totalUnread = data?.total_unread ?? 0

  return (
    <ProfessionalShell>
      <div className="mx-auto max-w-[1100px] px-6 py-10">
        <h1 className="text-2xl font-bold text-navy">Dashboard</h1>
        <p className="mt-1 text-sm text-brand-muted mb-6">Deine Klient:innen auf einen Blick.</p>

        {totalUnread > 0 && (
          <Link to="/professional"
            className="inline-flex items-center gap-2 mb-6 text-sm font-semibold text-accent no-underline hover:underline">
            {totalUnread} ungelesen → zum Postfach
          </Link>
        )}

        {cases.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-4xl mb-3">📋</div>
            <h2 className="text-lg font-semibold text-navy mb-1">Noch keine Klient:innen</h2>
            <p className="text-sm text-brand-muted">Sobald jemand einen Fall mit dir teilt, erscheint er hier.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cases.map(c => (
              <details
                key={c.case_id}
                open={!!open[c.case_id]}
                onToggle={e => setOpen(o => ({ ...o, [c.case_id]: (e.target as HTMLDetailsElement).open }))}
                className={`card ${c.unread_count > 0 ? 'border-accent/40' : ''}`}
              >
                <summary className="flex items-center justify-between gap-3 cursor-pointer">
                  <div className="flex items-center gap-2 min-w-0">
                    {c.unread_count > 0 && <span className="w-2 h-2 rounded-full bg-accent shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-navy truncate">{c.client_display_name} · {c.case_title}</p>
                      <p className="text-xs text-brand-muted">Zuletzt aktiv: {fmtDay(c.last_activity)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs shrink-0">
                    {c.unread_count > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent font-semibold">{c.unread_count} ungelesen</span>
                    )}
                    {c.open_count > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-brand-bg text-brand-muted">{c.open_count} offen</span>
                    )}
                    {c.next_appointment && (
                      <span className="text-brand-muted hidden sm:inline">📅 {fmtAppt(c.next_appointment.start_at)}</span>
                    )}
                  </div>
                </summary>

                <div className="mt-3 space-y-1.5">
                  {c.items.length === 0 && !c.next_appointment && (
                    <p className="text-xs text-brand-muted">
                      Nichts Offenes. <Link to={`/professional/cases/${c.case_id}`} className="text-accent hover:underline">Fall öffnen →</Link>
                    </p>
                  )}
                  {c.items.map(it => (
                    <Link
                      key={it.assignment_id}
                      to={`/professional/cases/${c.case_id}?tab=${it.tab}`}
                      className={`flex items-center justify-between gap-3 rounded-brand border px-3 py-2 no-underline transition-colors ${
                        it.unread ? 'border-accent bg-accent/[0.03]' : 'border-brand-border hover:border-accent/40'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span>{ITEM_ICON[it.kind]}</span>
                        <span className={`text-sm truncate text-navy ${it.unread ? 'font-semibold' : ''}`}>{it.title}</span>
                      </span>
                      <span className="text-xs text-brand-muted shrink-0">{it.detail}</span>
                    </Link>
                  ))}
                  {c.next_appointment && (
                    <Link
                      to={`/professional/cases/${c.case_id}?tab=appointments`}
                      className="flex items-center justify-between gap-3 rounded-brand border border-brand-border px-3 py-2 no-underline hover:border-accent/40"
                    >
                      <span className="text-sm text-navy">📅 {c.next_appointment.title}</span>
                      <span className="text-xs text-brand-muted">{fmtAppt(c.next_appointment.start_at)}</span>
                    </Link>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </ProfessionalShell>
  )
}
