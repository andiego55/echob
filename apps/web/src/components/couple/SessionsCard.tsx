/**
 * Eure moderierten Gespräche: anlegen, wiederfinden, Stand sehen.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { coupleSessionsApi } from '@/api/coupleSessions'
import Avatar from '@/components/Avatar'
import { useCoupleFaces } from './useCoupleFaces'
import { ArtTisch } from './CoupleEmptyArt'
import Fehlermeldung from '@/components/Fehlermeldung'

const STATUS_LABELS: Record<string, string> = {
  draft: 'In Vorbereitung',
  proposed: 'Vorgeschlagen',
  open: 'Läuft',
  closed: 'Abgeschlossen',
}

// ── Sitzungen ─────────────────────────────────────────────────────────────────

export default function SessionsCard({ coupleId }: { coupleId: string }) {
  const qc = useQueryClient()
  const { faceFor } = useCoupleFaces(coupleId)
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
          <h2 className="card-title">Eure Gespräche</h2>
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
          <Fehlermeldung error={create.error} />
        </form>
      )}

      {sessions.length === 0 ? (
        <div className="mt-4 rounded-brand border border-dashed border-brand-border px-4 py-6 text-center">
          <ArtTisch />
          <p className="mt-4 text-sm font-semibold text-navy">Noch kein Gespräch</p>
          <p className="mx-auto mt-1.5 max-w-[52ch] text-sm leading-relaxed text-brand-muted">
            Ein Gespräch hat ein Thema und ein Ziel. Du bereitest es in Ruhe vor, schlägst es
            der anderen Person vor – und wenn sie zusagt, eröffnet Echo und moderiert.
          </p>
          <p className="mx-auto mt-2 max-w-[52ch] text-xs text-brand-muted">
            Fangt mit etwas Kleinem an, nicht mit dem größten Thema. Das Format übt sich
            leichter an „Wie wir Sonntage verbringen" als an der Grundsatzfrage.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {sessions.map(s => (
            <Link
              key={s.id}
              to={`/app/paar/sitzung/${s.id}`}
              className="flex items-center justify-between gap-3 rounded-brand border border-brand-border px-3.5 py-3 no-underline transition hover:border-accent/50"
            >
              <Avatar value={faceFor(s.created_by).avatar} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-navy">{s.title}</p>
                {s.scheduled_for
                  ? <p className="mt-0.5 truncate text-xs text-accent">
                      Verabredet: {new Date(s.scheduled_for).toLocaleString('de-DE')}
                    </p>
                  : s.goal && <p className="mt-0.5 truncate text-xs text-brand-muted">Ziel: {s.goal}</p>}
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold ${
                s.status === 'proposed' && !s.accepted_at
                  ? 'bg-accent/10 text-accent'
                  : 'bg-brand-bg text-brand-muted'
              }`}>
                {s.accepted_at && s.status === 'proposed' ? 'Zugesagt' : STATUS_LABELS[s.status] ?? s.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
