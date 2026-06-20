/**
 * /app/inbox — „Von deiner Fachperson": zugewiesene Items + anstehende Termine.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import { collabApi, type Assignment, type Appointment } from '@/api/collab'

const TYPE_META: Record<string, { icon: string; label: string }> = {
  dialog: { icon: '💬', label: 'Dialog-Vorschlag' },
  questionnaire: { icon: '📋', label: 'Fragebogen' },
  message: { icon: '✉️', label: 'Nachricht' },
  resource: { icon: '📎', label: 'Ressource' },
}

function fmt(dt: string): string {
  return new Date(dt).toLocaleString('de-DE', {
    weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default function InboxPage() {
  const { data, isLoading } = useQuery({ queryKey: ['inbox'], queryFn: collabApi.inbox })

  const assignments = data?.assignments ?? []
  const appointments = data?.appointments ?? []
  const isEmpty = !isLoading && assignments.length === 0 && appointments.length === 0

  return (
    <AppShell>
      <div className="mx-auto max-w-[760px] px-6 py-10">
        <h1 className="text-2xl font-bold text-navy">Von deiner Fachperson</h1>
        <p className="mt-1 text-sm text-brand-muted">
          Hier erscheinen Dialoge, Fragebögen, Nachrichten und Termine, die deine Fachperson für dich
          bereitstellt. Kein Notfallkanal – bei akuter Not wende dich an die Telefonseelsorge (0800 111 0 111).
        </p>

        {isLoading && <p className="mt-8 text-sm text-brand-muted">Wird geladen …</p>}

        {isEmpty && (
          <div className="mt-8 card text-center py-12">
            <div className="text-4xl mb-3">📭</div>
            <h2 className="text-lg font-semibold text-navy mb-1">Noch nichts da</h2>
            <p className="text-sm text-brand-muted">
              Sobald eine Fachperson dir etwas zuweist, erscheint es hier.
            </p>
          </div>
        )}

        {appointments.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-muted mb-3">Termine</h2>
            <div className="space-y-3">
              {appointments.map(a => <AppointmentCard key={a.id} appt={a} />)}
            </div>
          </section>
        )}

        {assignments.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-muted mb-3">Aufgaben & Nachrichten</h2>
            <div className="space-y-3">
              {assignments.map(a => <AssignmentCard key={a.id} item={a} />)}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  )
}

function AppointmentCard({ appt }: { appt: Appointment }) {
  const qc = useQueryClient()
  const m = useMutation({
    mutationFn: (status: 'confirmed' | 'cancelled') => collabApi.setAppointmentStatus(appt.id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inbox'] }),
  })
  const p = appt.payload as { location?: string; note?: string }
  return (
    <div className="card flex items-start justify-between gap-4 flex-wrap">
      <div>
        <p className="text-sm font-semibold text-navy">📅 {appt.title || 'Termin'}</p>
        <p className="mt-0.5 text-sm text-brand-text">{fmt(appt.start_at)}</p>
        {p.location && <p className="text-xs text-brand-muted mt-0.5">Ort: {p.location}</p>}
        {p.note && <p className="text-xs text-brand-muted mt-0.5">{p.note}</p>}
        <span className="mt-1 inline-block text-[11px] font-medium text-brand-muted">Status: {appt.status}</span>
      </div>
      {appt.status === 'proposed' && (
        <div className="flex gap-2">
          <button onClick={() => m.mutate('confirmed')} disabled={m.isPending}
            className="text-sm font-semibold px-3 py-1.5 rounded-brand bg-accent text-white hover:bg-accent/90 disabled:opacity-60">
            Bestätigen
          </button>
          <button onClick={() => m.mutate('cancelled')} disabled={m.isPending}
            className="text-sm px-3 py-1.5 rounded-brand border border-brand-border text-brand-muted hover:text-navy">
            Absagen
          </button>
        </div>
      )}
    </div>
  )
}

function AssignmentCard({ item }: { item: Assignment }) {
  const qc = useQueryClient()
  const meta = TYPE_META[item.type] ?? { icon: '•', label: item.type }
  const p = item.payload as Record<string, string>
  const [answer, setAnswer] = useState('')

  const seen = useMutation({
    mutationFn: () => collabApi.markSeen(item.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inbox'] }),
  })
  const respond = useMutation({
    mutationFn: () => collabApi.submitResponse(item.id, { text: answer }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inbox'] }),
  })

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3 mb-1">
        <span className="text-sm font-semibold text-navy">{meta.icon} {item.title || meta.label}</span>
        <span className="text-[11px] uppercase tracking-wide text-brand-muted">{meta.label}</span>
      </div>

      {item.type === 'message' && <p className="text-sm text-brand-text whitespace-pre-wrap">{p.body}</p>}

      {item.type === 'resource' && (
        <div className="text-sm text-brand-text">
          {p.text && <p className="whitespace-pre-wrap">{p.text}</p>}
          {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-accent font-medium hover:underline">{p.url}</a>}
        </div>
      )}

      {item.type === 'dialog' && (
        <div className="text-sm text-brand-text">
          {p.intention && <p className="mb-2">{p.intention}</p>}
          <Link to={`/app/cases/${item.case_id}/echo?assignment=${item.id}`} className="inline-block text-sm font-semibold px-4 py-2 rounded-brand bg-accent text-white hover:bg-accent/90 no-underline">
            Dialog mit Echo öffnen →
          </Link>
        </div>
      )}

      {item.type === 'questionnaire' && (
        item.status === 'completed' ? (
          <p className="text-sm text-green-700">✓ Beantwortet. Danke!</p>
        ) : (
          <div className="text-sm text-brand-text">
            {p.intro && <p className="mb-2">{p.intro}</p>}
            <textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={3}
              placeholder="Deine Antwort …"
              className="w-full rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />
            <button onClick={() => respond.mutate()} disabled={respond.isPending || !answer.trim()}
              className="mt-2 text-sm font-semibold px-4 py-2 rounded-brand bg-accent text-white hover:bg-accent/90 disabled:opacity-60">
              {respond.isPending ? 'Wird gesendet …' : 'Antwort senden'}
            </button>
          </div>
        )
      )}

      {item.status === 'sent' && item.type !== 'questionnaire' && (
        <button onClick={() => seen.mutate()} disabled={seen.isPending}
          className="mt-3 text-xs text-brand-muted hover:text-navy">Als gelesen markieren</button>
      )}
    </div>
  )
}
