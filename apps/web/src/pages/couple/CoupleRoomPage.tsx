/**
 * /app/paar/:coupleId — der gemeinsame Paarraum.
 *
 * Fundament (Phase 1): Raum-Kopf, Vertrauens-Hinweis, Verbindung lösen. Die Sitzungen,
 * die Vorbereitung und die Moderation durch Echo bauen in den Folgephasen darauf auf.
 */
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import { coupleApi } from '@/api/couple'
import { coupleSessionsApi } from '@/api/coupleSessions'
import IsolationNotice from '@/components/couple/IsolationNotice'

const STATUS_LABELS: Record<string, string> = {
  draft: 'In Vorbereitung',
  open: 'Läuft',
  closed: 'Abgeschlossen',
}

export default function CoupleRoomPage() {
  const { coupleId = '' } = useParams<{ coupleId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: room, isLoading, isError } = useQuery({
    queryKey: ['couple-link', coupleId],
    queryFn: () => coupleApi.get(coupleId),
    enabled: !!coupleId,
    retry: false,
  })

  const end = useMutation({
    mutationFn: () => coupleApi.end(coupleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['couple-links'] })
      navigate('/app/paar')
    },
  })

  if (isLoading) {
    return <AppShell><div className="mx-auto max-w-[900px] px-6 py-8 text-sm text-brand-muted">Lade …</div></AppShell>
  }

  if (isError || !room) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[900px] px-6 py-8">
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

  const partner = room.partner_display_name || 'deiner Partnerperson'

  return (
    <AppShell>
      <div className="mx-auto max-w-[900px] px-6 py-8 space-y-6">
        <div>
          <Link to="/app/paar" className="text-xs text-brand-muted hover:text-navy">← Paarräume</Link>
          <span className="label mt-2 block">Gemeinsamer Raum</span>
          <h1 className="mt-1 text-2xl font-bold text-navy">Mit {partner}</h1>
          <p className="mt-2 text-sm text-brand-muted">
            Hier bereitet ihr Gespräche vor und führt sie – begleitet von Echo als
            allparteilicher Moderation.
          </p>
        </div>

        <SessionsCard coupleId={coupleId} />

        <IsolationNotice />

        <div className="card">
          <h2 className="text-sm font-bold text-navy">Verbindung</h2>
          <p className="mt-2 text-sm text-brand-muted">
            Ihr seid seit {new Date(room.accepted_at ?? room.created_at).toLocaleDateString('de-DE')} verbunden.
          </p>
          <button
            onClick={() => {
              if (confirm('Verbindung wirklich beenden? Der gemeinsame Raum wird für euch beide geschlossen.')) end.mutate()
            }}
            disabled={end.isPending}
            className="mt-3 text-xs text-red-600 hover:underline disabled:opacity-50"
          >
            {end.isPending ? 'Beende …' : 'Verbindung beenden'}
          </button>
        </div>
      </div>
    </AppShell>
  )
}

// ── Sitzungen ─────────────────────────────────────────────────────────────────

function SessionsCard({ coupleId }: { coupleId: string }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(false)
  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState('')
  const [goal, setGoal] = useState('')

  const { data: sessions = [] } = useQuery({
    queryKey: ['couple-sessions', coupleId],
    queryFn: () => coupleSessionsApi.list(coupleId),
    enabled: !!coupleId,
  })

  const create = useMutation({
    mutationFn: () => coupleSessionsApi.create(coupleId, {
      title: title.trim(), topic: topic.trim() || null, goal: goal.trim() || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['couple-sessions', coupleId] })
      setTitle(''); setTopic(''); setGoal(''); setForm(false)
    },
  })

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-navy">Eure Gespräche</h2>
          <p className="mt-1 text-xs text-brand-muted">
            Ein Gespräch, ein Thema, ein Ziel – so bleibt es überschaubar.
          </p>
        </div>
        <button onClick={() => setForm(f => !f)} className="text-xs text-accent hover:underline shrink-0">
          {form ? 'Abbrechen' : '+ Neues Gespräch'}
        </button>
      </div>

      {form && (
        <form
          onSubmit={e => { e.preventDefault(); if (title.trim()) create.mutate() }}
          className="mt-4 space-y-2.5 rounded-brand border border-brand-border p-3.5"
        >
          <input
            value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Worum geht es? z. B. „Wie wir Sonntage verbringen“"
            className="input !text-sm"
          />
          <textarea
            value={topic} onChange={e => setTopic(e.target.value)} rows={3}
            placeholder="Kurze Beschreibung (optional)"
            className="input !text-sm resize-y"
          />
          <input
            value={goal} onChange={e => setGoal(e.target.value)}
            placeholder="Ziel: Was wollt ihr am Ende erreicht haben? (optional)"
            className="input !text-sm"
          />
          <button
            type="submit" disabled={!title.trim() || create.isPending}
            className="btn-primary !py-2 !px-5 !text-sm disabled:opacity-50"
          >
            {create.isPending ? 'Lege an …' : 'Gespräch anlegen'}
          </button>
        </form>
      )}

      {sessions.length === 0 ? (
        <p className="mt-4 text-sm text-brand-muted">
          Noch kein Gespräch. Fangt mit einem kleinen Thema an – nicht mit dem größten.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {sessions.map(s => (
            <Link
              key={s.id}
              to={`/app/paar/sitzung/${s.id}`}
              className="flex items-center justify-between gap-3 rounded-brand border border-brand-border px-3.5 py-3 no-underline transition hover:border-accent/50"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-navy">{s.title}</p>
                {s.goal && <p className="mt-0.5 truncate text-xs text-brand-muted">Ziel: {s.goal}</p>}
              </div>
              <span className="shrink-0 rounded-full bg-brand-bg px-2.5 py-0.5 text-[0.65rem] font-semibold text-brand-muted">
                {STATUS_LABELS[s.status] ?? s.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
