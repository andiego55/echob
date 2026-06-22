/**
 * /professional/dashboard — Klient:innen/Fälle-Hub (ersetzt die frühere
 * „Klient:innen"-Seite). Oben 4 Kacheln (Klient:innen · Fälle · Braucht
 * Aufmerksamkeit → Postfach · Offene Aufgaben → Filter), darunter die Fall-Liste
 * mit Suche + Freigabe-Chips, je Fall aufklappbar mit den konkreten Punkten.
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import ProfessionalShell from '@/components/professional/ProfessionalShell'
import { Spinner } from '@/components/auth/ProfessionalRoute'
import { professionalApi, type DashboardItem } from '@/api/professional'
import { SHARE_ELEMENT_LABELS } from '@/types'

function fmtAppt(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', {
    weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}
function fmtDay(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: '2-digit' })
}
function fmtItem(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

const ITEM_ICON: Record<DashboardItem['kind'], string> = {
  questionnaire_answered: '📋', dialog_summary: '💬', message_reply: '✉️', open_task: '⏳',
}
const elLabel = (et: string) => (SHARE_ELEMENT_LABELS as Record<string, string>)[et] ?? et

export default function ProfessionalDashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ['prof-dashboard'], queryFn: professionalApi.dashboard })

  const [openCases, setOpenCases] = useState<Record<string, boolean>>({})
  const inited = useRef(false)
  useEffect(() => {
    if (data && !inited.current) {
      inited.current = true
      const init: Record<string, boolean> = {}
      data.cases.forEach(c => { if (c.unread_count > 0) init[c.case_id] = true })
      setOpenCases(init)
    }
  }, [data])

  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'open'>('all')

  if (isLoading) return <Spinner />

  const cases = data?.cases ?? []
  const totalUnread = data?.total_unread ?? 0
  const clientsCount = new Set(cases.map(c => c.client_display_name)).size
  const totalOpen = cases.reduce((n, c) => n + c.open_count, 0)

  const shown = cases.filter(c => {
    if (filter === 'open' && c.open_count === 0) return false
    if (q.trim() && !c.client_display_name.toLowerCase().includes(q.toLowerCase())) return false
    return true
  })

  return (
    <ProfessionalShell>
      <div className="mx-auto max-w-[1100px] px-6 py-10">
        <h1 className="text-2xl font-bold text-navy">Dashboard</h1>
        <p className="mt-1 text-sm text-brand-muted mb-6">Deine Klient:innen auf einen Blick.</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Tile label="Klient:innen" value={clientsCount} onClick={() => { setFilter('all'); setQ('') }} />
          <Tile label="Fälle" value={cases.length} onClick={() => setFilter('all')} />
          <Link to="/professional"
            className={`block rounded-brand border px-4 py-3 no-underline transition-colors ${
              totalUnread > 0 ? 'border-accent bg-accent/5' : 'border-brand-border bg-white hover:border-accent/40'
            }`}>
            <p className="text-xs text-brand-muted">Braucht Aufmerksamkeit</p>
            <p className={`text-2xl font-bold ${totalUnread > 0 ? 'text-accent' : 'text-navy'}`}>{totalUnread}</p>
          </Link>
          <Tile label="Offene Aufgaben" value={totalOpen} active={filter === 'open'} onClick={() => setFilter('open')} />
        </div>

        {cases.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-4xl mb-3">📋</div>
            <h2 className="text-lg font-semibold text-navy mb-1">Noch keine Klient:innen</h2>
            <p className="text-sm text-brand-muted">Sobald jemand einen Fall mit dir teilt, erscheint er hier.</p>
          </div>
        ) : (
          <>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Klient:in suchen …"
              className="w-full max-w-sm rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />
            {filter === 'open' && (
              <p className="mt-2 text-xs text-brand-muted">
                Gefiltert: nur Fälle mit offenen Aufgaben · <button onClick={() => setFilter('all')} className="text-accent hover:underline">alle zeigen</button>
              </p>
            )}

            <div className="space-y-2 mt-4">
              {shown.length === 0 && <p className="text-sm text-brand-muted">Nichts gefunden.</p>}
              {shown.map(c => {
                const isOpen = !!openCases[c.case_id]
                return (
                  <div key={c.case_id} className={`card ${c.unread_count > 0 ? 'border-accent/40' : ''}`}>
                    <div className="flex items-center justify-between gap-3">
                      <Link to={`/professional/cases/${c.case_id}`} className="flex items-center gap-2 min-w-0 no-underline group">
                        {c.unread_count > 0 && <span className="w-2 h-2 rounded-full bg-accent shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-navy truncate group-hover:text-accent transition-colors">
                            {c.client_display_name} · {c.case_title}
                          </p>
                          <p className="text-xs text-brand-muted">Zuletzt aktiv: {fmtDay(c.last_activity)}</p>
                        </div>
                      </Link>
                      <div className="flex items-center gap-2 text-xs shrink-0">
                        {c.unread_count > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent font-semibold">{c.unread_count} ungelesen</span>
                        )}
                        {c.open_count > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-brand-bg text-brand-muted">{c.open_count} offen</span>
                        )}
                        <Link to={`/professional/cases/${c.case_id}`}
                          className="hidden sm:inline text-accent font-medium no-underline hover:underline">Öffnen →</Link>
                        <button onClick={() => setOpenCases(o => ({ ...o, [c.case_id]: !o[c.case_id] }))}
                          aria-label={isOpen ? 'Zuklappen' : 'Aufklappen'} className="text-brand-muted hover:text-navy p-1">
                          <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="mt-3 border-t border-brand-border pt-3 space-y-1.5">
                        {c.element_types.length > 0 && (
                          <div className="flex flex-wrap gap-1 pb-1">
                            {c.element_types.map(et => (
                              <span key={et} className="text-[11px] px-2 py-0.5 rounded-full border border-brand-border text-brand-muted">
                                {elLabel(et)}
                              </span>
                            ))}
                          </div>
                        )}
                        {c.items.length === 0 && !c.next_appointment && (
                          <p className="text-xs text-brand-muted">Nichts Offenes.</p>
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
                              <span className="shrink-0">{ITEM_ICON[it.kind]}</span>
                              <span className="min-w-0">
                                <span className={`block text-sm truncate text-navy ${it.unread ? 'font-semibold' : ''}`}>{it.title}</span>
                                {it.at && <span className="block text-[11px] text-brand-muted">{fmtItem(it.at)}</span>}
                              </span>
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
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </ProfessionalShell>
  )
}

function Tile({ label, value, active, onClick }: {
  label: string; value: number; active?: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-brand border px-4 py-3 transition-colors ${
        active ? 'border-accent bg-accent/5' : 'border-brand-border bg-white hover:border-accent/40'
      }`}
    >
      <p className="text-xs text-brand-muted">{label}</p>
      <p className={`text-2xl font-bold ${active ? 'text-accent' : 'text-navy'}`}>{value}</p>
    </button>
  )
}
