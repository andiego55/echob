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
import AgreementsCard from '@/components/couple/AgreementsCard'
import ProgressCard from '@/components/couple/ProgressCard'
import CoupleOnboarding from '@/components/couple/CoupleOnboarding'
import CoupleSafetyNote from '@/components/couple/CoupleSafetyNote'
import { coupleMediationApi } from '@/api/coupleMediation'
import { coupleTestsApi } from '@/api/coupleTests'
import { SELF_TESTS } from '@/selftests'
import { isCoupleSafe } from '@/selftests/couple'

const STATUS_LABELS: Record<string, string> = {
  draft: 'In Vorbereitung',
  proposed: 'Vorgeschlagen',
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

        <CoupleOnboarding coupleId={coupleId} />

        <ProgressCard coupleId={coupleId} />

        <SessionsCard coupleId={coupleId} />

        <TopicsCard coupleId={coupleId} />

        <TestsCard coupleId={coupleId} />

        <AgreementsCard coupleId={coupleId} />

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

        <CoupleSafetyNote />

        <p className="text-center text-[0.7rem] leading-relaxed text-brand-muted">
          EchoB ersetzt keine Paartherapie und keine Behandlung. Echo moderiert,
          stellt keine Diagnosen und spricht keine Schuld zu.
        </p>
      </div>
    </AppShell>
  )
}

// ── Tests zu zweit ────────────────────────────────────────────────────────────

function TestsCard({ coupleId }: { coupleId: string }) {
  const { data: started = [] } = useQuery({
    queryKey: ['couple-tests', coupleId],
    queryFn: () => coupleTestsApi.list(coupleId),
    enabled: !!coupleId,
  })

  const suitable = SELF_TESTS.filter(isCoupleSafe)
  const startedSlugs = new Set(started.map(s => s.slug))
  const offer = [
    ...suitable.filter(t => startedSlugs.has(t.slug)),
    ...suitable.filter(t => !startedSlugs.has(t.slug)).slice(0, 6),
  ]

  return (
    <div className="card">
      <h2 className="text-sm font-bold text-navy">Tests zu zweit</h2>
      <p className="mt-1 text-xs text-brand-muted">
        Beide füllen denselben Test aus, danach legt ihr die Ergebnisse nebeneinander. Das
        Ergebnis der anderen Person siehst du erst, wenn du selbst geantwortet hast.
      </p>

      <div className="mt-4 space-y-2">
        {offer.map(t => {
          const state = started.find(s => s.slug === t.slug)
          const label = !state ? 'Neu'
            : state.done >= 2 ? 'Beide fertig'
            : state.mine ? 'Du bist fertig' : 'Partner:in ist fertig'
          return (
            <Link
              key={t.slug}
              to={`/app/paar/${coupleId}/test/${t.slug}`}
              className="flex items-center justify-between gap-3 rounded-brand border border-brand-border px-3.5 py-3 no-underline transition hover:border-accent/50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-navy">{t.title}</p>
                <p className="mt-0.5 truncate text-xs text-brand-muted">{t.teaser}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold ${
                state?.done && state.done >= 2 ? 'bg-green-50 text-green-700' : 'bg-brand-bg text-brand-muted'
              }`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ── Mediation ─────────────────────────────────────────────────────────────────

function TopicsCard({ coupleId }: { coupleId: string }) {
  const qc = useQueryClient()
  const [title, setTitle] = useState('')

  const { data: topics = [] } = useQuery({
    queryKey: ['couple-topics', coupleId],
    queryFn: () => coupleMediationApi.list(coupleId),
    enabled: !!coupleId,
  })

  const create = useMutation({
    mutationFn: () => coupleMediationApi.create(coupleId, { title: title.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['couple-topics', coupleId] })
      setTitle('')
    },
  })

  return (
    <div className="card">
      <h2 className="text-sm font-bold text-navy">Mediation</h2>
      <p className="mt-1 text-xs text-brand-muted">
        Für Themen, bei denen ihr feststeckt. Jede:r schreibt eine offene und eine
        vertrauliche Sicht – Echo erarbeitet daraus einen Vorschlag.
      </p>

      <form
        onSubmit={e => { e.preventDefault(); if (title.trim()) create.mutate() }}
        className="mt-4 flex flex-wrap gap-2"
      >
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Strittiges Thema, z. B. „Wie wir mit Geld umgehen“"
          className="input flex-1 min-w-[220px] !text-sm"
        />
        <button type="submit" disabled={!title.trim() || create.isPending} className="btn-outline !py-2 !px-4 !text-sm disabled:opacity-50">
          {create.isPending ? 'Lege an …' : 'Thema anlegen'}
        </button>
      </form>

      {topics.length === 0 ? (
        <p className="mt-4 text-sm text-brand-muted">Noch kein Thema in Mediation.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {topics.map(t => (
            <Link
              key={t.id}
              to={`/app/paar/thema/${t.id}`}
              className="flex items-center justify-between gap-3 rounded-brand border border-brand-border px-3.5 py-3 no-underline transition hover:border-accent/50"
            >
              <p className="min-w-0 truncate text-sm font-semibold text-navy">{t.title}</p>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold ${
                t.status === 'resolved' ? 'bg-green-50 text-green-700' : 'bg-brand-bg text-brand-muted'
              }`}>
                {t.status === 'resolved' ? 'Geklärt' : 'Offen'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
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
