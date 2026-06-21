/**
 * /professional — Postfach: alle Eingänge der Klient:innen (beantwortete
 * Fragebögen, zusammengefasste Dialoge, Antworten) mit gelesen/ungelesen,
 * plus die aktiven Freigaben. Klick öffnet den Fall und markiert als gelesen.
 */
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import ProfessionalShell from '@/components/professional/ProfessionalShell'
import { professionalApi, type PostfachAttention } from '@/api/professional'

const KIND_ICON: Record<PostfachAttention['kind'], string> = {
  questionnaire_answered: '📋',
  dialog_summary: '💬',
  message_reply: '✉️',
}
const KIND_LABEL: Record<PostfachAttention['kind'], string> = {
  questionnaire_answered: 'Fragebogen beantwortet',
  dialog_summary: 'Dialog zusammengefasst',
  message_reply: 'Neue Antwort',
}

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default function ProfessionalInboxPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['prof-postfach'], queryFn: professionalApi.postfach })
  const markRead = useMutation({
    mutationFn: (id: string) => professionalApi.markAssignmentRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prof-postfach'] }),
  })

  const attention = data?.attention ?? []
  const shares = data?.shares ?? []
  const unreadCount = attention.filter(a => a.unread).length
  const isEmpty = !isLoading && attention.length === 0 && shares.length === 0

  return (
    <ProfessionalShell>
      <div className="mx-auto max-w-[1100px] px-6 py-10">
        <span className="label">Fachpersonenbereich</span>
        <h1 className="mt-1 text-2xl font-bold text-navy">
          Postfach
          {unreadCount > 0 && <span className="ml-2 text-sm font-semibold text-accent">{unreadCount} ungelesen</span>}
        </h1>
        <p className="mt-2 text-sm text-brand-muted max-w-2xl">
          Alles, was deine Klient:innen dir senden – beantwortete Fragebögen, zusammengefasste
          Dialoge, Antworten – sowie aktive Freigaben.
        </p>

        {isLoading && <p className="mt-6 text-sm text-brand-muted">Wird geladen …</p>}

        {isEmpty && (
          <div className="mt-6 card text-center py-12 max-w-md mx-auto">
            <div className="text-4xl mb-4">📭</div>
            <h2 className="text-lg font-semibold text-navy mb-2">Noch nichts da</h2>
            <p className="text-sm text-brand-muted">Sobald jemand etwas teilt oder sendet, erscheint es hier.</p>
          </div>
        )}

        {attention.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-muted mb-3">Braucht deine Aufmerksamkeit</h2>
            <div className="space-y-2">
              {attention.map(a => (
                <Link
                  key={a.assignment_id}
                  to={`/professional/cases/${a.case_id}`}
                  onClick={() => { if (a.unread) markRead.mutate(a.assignment_id) }}
                  className={`card flex items-center justify-between gap-3 no-underline transition-colors ${
                    a.unread ? 'border-accent bg-accent/[0.03]' : 'hover:border-accent/40'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {a.unread
                      ? <span className="w-2 h-2 rounded-full bg-accent shrink-0" aria-label="ungelesen" />
                      : <span className="w-2 h-2 shrink-0" />}
                    <span className="text-lg shrink-0">{KIND_ICON[a.kind]}</span>
                    <div className="min-w-0">
                      <p className={`text-sm truncate text-navy ${a.unread ? 'font-bold' : 'font-medium'}`}>
                        {a.client_display_name} · {a.title}
                      </p>
                      <p className="text-xs text-brand-muted">{KIND_LABEL[a.kind]} · {fmtDate(a.at)}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-accent shrink-0">{a.detail}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {shares.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-muted mb-3">Freigaben</h2>
            <div className="space-y-2">
              {shares.map(s => (
                <Link key={s.case_id} to={`/professional/cases/${s.case_id}`}
                  className="card flex items-center justify-between gap-3 no-underline hover:border-accent/40 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy truncate">{s.client_display_name}</p>
                    <p className="text-xs text-brand-muted">{s.case_title} · freigegeben {fmtDate(s.shared_at)}</p>
                  </div>
                  <span className="text-xs text-accent font-medium shrink-0">Öffnen →</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </ProfessionalShell>
  )
}
