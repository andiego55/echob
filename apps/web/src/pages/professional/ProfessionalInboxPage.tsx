/**
 * /professional — Postfach: alle Eingänge der Klient:innen (beantwortete
 * Fragebögen, zusammengefasste Dialoge, Antworten) mit gelesen/ungelesen,
 * plus die aktiven Freigaben. Klick öffnet den Fall und markiert als gelesen.
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import ProfessionalShell from '@/components/professional/ProfessionalShell'
import { professionalApi, type PostfachAttention } from '@/api/professional'
import { IconChat, IconClipboard, IconInbox, IconMail } from '@/components/professional/ProfIcons'
import { avatarBg } from '@/utils/avatars'

const KIND_ICON: Record<PostfachAttention['kind'], ReactNode> = {
  questionnaire_answered: <IconClipboard className="h-3 w-3" />,
  dialog_summary: <IconChat className="h-3 w-3" />,
  message_reply: <IconMail className="h-3 w-3" />,
}
const KIND_LABEL: Record<PostfachAttention['kind'], string> = {
  questionnaire_answered: 'Fragebogen beantwortet',
  dialog_summary: 'Dialog zusammengefasst',
  message_reply: 'Neue Antwort',
}
const KIND_TAB: Record<PostfachAttention['kind'], string> = {
  questionnaire_answered: 'questionnaire',
  dialog_summary: 'dialog',
  message_reply: 'message',
}

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}
function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (p.length === 0) return '·'
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase()
  return (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

/** Klient:innen-Kreis: Tier-Avatar (Emoji auf Pastell) oder Initialen als Fallback. */
function ClientAvatar({ avatar, name, className }: { avatar?: string | null; name: string; className?: string }) {
  if (avatar) {
    return (
      <span className={`grid h-9 w-9 place-items-center rounded-full text-lg leading-none ${avatarBg(avatar)} ${className ?? ''}`} aria-hidden="true">
        {avatar}
      </span>
    )
  }
  return (
    <span className={`grid h-9 w-9 place-items-center rounded-full bg-accent/10 text-[11px] font-bold text-accent ${className ?? ''}`}>
      {initials(name)}
    </span>
  )
}

/** Runder Akzent-„Öffnen"-Button (Pille) – identisch zum Dashboard. */
function OpenButton() {
  return (
    <span className="hidden items-center gap-1 rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-xs font-semibold text-accent transition-colors group-hover:bg-accent group-hover:text-white sm:inline-flex">
      Öffnen
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
    </span>
  )
}

export default function ProfessionalInboxPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['prof-postfach'], queryFn: professionalApi.postfach })
  const markRead = useMutation({
    mutationFn: (id: string) => professionalApi.markAssignmentRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prof-postfach'] }),
  })
  const markUnread = useMutation({
    mutationFn: (id: string) => professionalApi.markAssignmentUnread(id),
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
        <h1 className="mt-1 flex flex-wrap items-center gap-2.5 text-2xl font-bold text-navy">
          Postfach
          {unreadCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />{unreadCount} neu
            </span>
          )}
        </h1>
        <p className="mt-2 text-sm text-brand-muted max-w-2xl">
          Alles, was deine Klient:innen dir senden – beantwortete Fragebögen, zusammengefasste
          Dialoge, Antworten – sowie aktive Freigaben.
        </p>

        {isLoading && <p className="mt-6 text-sm text-brand-muted">Wird geladen …</p>}

        {isEmpty && (
          <div className="mt-6 card text-center py-12 max-w-md mx-auto">
            <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-accent/10 text-accent">
              <IconInbox className="h-7 w-7" />
            </span>
            <h2 className="text-lg font-semibold text-navy mb-2">Noch nichts da</h2>
            <p className="text-sm text-brand-muted">Sobald jemand etwas teilt oder sendet, erscheint es hier.</p>
          </div>
        )}

        {attention.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-muted mb-3">Braucht deine Aufmerksamkeit</h2>
            <div className="space-y-3">
              {attention.map(a => (
                <Link
                  key={a.assignment_id}
                  to={`/professional/cases/${a.case_id}?tab=${KIND_TAB[a.kind]}`}
                  onClick={() => { if (a.unread) markRead.mutate(a.assignment_id) }}
                  className={`group flex items-center justify-between gap-3 rounded-brand border p-4 no-underline shadow-brand transition-all duration-200 hover:-translate-y-0.5 hover:shadow-brand-lg ${
                    a.unread
                      ? 'border-accent/30 border-l-[3px] border-l-accent bg-gradient-to-r from-accent/[0.05] to-brand-card'
                      : 'border-brand-border bg-brand-card hover:border-accent/30'
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="relative shrink-0">
                      <ClientAvatar avatar={a.client_avatar} name={a.client_display_name} />
                      <span className="absolute -bottom-1 -right-1 grid h-[18px] w-[18px] place-items-center rounded-full bg-brand-card text-accent shadow-sm ring-1 ring-brand-border">
                        {KIND_ICON[a.kind]}
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className={`block truncate text-sm text-navy ${a.unread ? 'font-bold' : 'font-medium'}`}>
                        {a.client_display_name} · {a.title}
                      </span>
                      <span className="block text-xs text-brand-muted">{KIND_LABEL[a.kind]} · {fmtDate(a.at)}</span>
                    </span>
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    {!a.unread && (
                      <button
                        onClick={e => { e.preventDefault(); e.stopPropagation(); markUnread.mutate(a.assignment_id) }}
                        className="text-[11px] text-brand-muted hover:text-accent"
                      >
                        als ungelesen
                      </button>
                    )}
                    <span className="text-sm font-semibold text-accent">{a.detail}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {shares.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-muted mb-3">Freigaben</h2>
            <div className="space-y-3">
              {shares.map(s => (
                <Link key={s.case_id} to={`/professional/cases/${s.case_id}`}
                  className="group flex items-center justify-between gap-3 rounded-brand border border-brand-border bg-brand-card p-4 no-underline shadow-brand transition-all duration-200 hover:-translate-y-0.5 hover:shadow-brand-lg hover:border-accent/30">
                  <span className="flex items-center gap-3 min-w-0">
                    <ClientAvatar avatar={s.client_avatar} name={s.client_display_name} className="shrink-0" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-navy">{s.client_display_name}</span>
                      <span className="block text-xs text-brand-muted">{s.case_title} · freigegeben {fmtDate(s.shared_at)}</span>
                    </span>
                  </span>
                  <OpenButton />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </ProfessionalShell>
  )
}
