/**
 * /app/paar/sitzung/:sessionId — eine moderierte Sitzung.
 *
 * Links das gemeinsame Gespräch (beide Personen + Echo als Moderation), rechts die
 * Vorbereitung. Kernregel im UI sichtbar gemacht: Der Entwurf gehört dir allein –
 * erst das Freigeben macht ihn zum Kontext, den Echo kennt und beide sehen.
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import MarkdownMessage from '@/components/app/MarkdownMessage'
import { coupleSessionsApi } from '@/api/coupleSessions'
import type { CoupleSessionDetail } from '@/api/coupleSessions'
import ContextComposer from '@/components/couple/ContextComposer'

export default function CoupleSessionPage() {
  const { sessionId = '' } = useParams<{ sessionId: string }>()
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['couple-session', sessionId],
    queryFn: () => coupleSessionsApi.get(sessionId),
    enabled: !!sessionId,
    retry: false,
    // Die andere Person schreibt in denselben Verlauf – regelmäßig nachladen.
    refetchInterval: 8000,
  })

  const apply = (d: CoupleSessionDetail) => qc.setQueryData(['couple-session', sessionId], d)

  const send = useMutation({
    mutationFn: (content: string) => coupleSessionsApi.send(sessionId, content),
    onSuccess: d => { apply(d); setText('') },
  })
  const moderate = useMutation({
    mutationFn: () => coupleSessionsApi.moderate(sessionId),
    onSuccess: apply,
  })
  const close = useMutation({
    mutationFn: () => coupleSessionsApi.setStatus(sessionId, 'closed'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['couple-session', sessionId] }),
  })

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [data?.messages.length])

  if (isLoading) {
    return <AppShell><div className="mx-auto max-w-[1000px] px-6 py-8 text-sm text-brand-muted">Lade …</div></AppShell>
  }
  if (isError || !data) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[1000px] px-6 py-8">
          <div className="card">
            <h1 className="text-sm font-bold text-navy">Sitzung nicht gefunden</h1>
            <Link to="/app/paar" className="btn-outline !py-2 !px-4 !text-sm mt-4 inline-block">Zur Übersicht</Link>
          </div>
        </div>
      </AppShell>
    )
  }

  const { session, messages, contexts } = data
  const closed = session.status === 'closed'
  const busy = send.isPending || moderate.isPending

  return (
    <AppShell>
      <div className="mx-auto max-w-[1100px] px-6 py-8">
        <div className="mb-5">
          <Link to={`/app/paar/${session.couple_id}`} className="text-xs text-brand-muted hover:text-navy">← Paarraum</Link>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <span className="label">Moderierte Sitzung</span>
              <h1 className="mt-1 text-2xl font-bold text-navy">{session.title}</h1>
              {session.goal && (
                <p className="mt-1.5 text-sm text-brand-muted">
                  <span className="font-medium text-navy">Ziel:</span> {session.goal}
                </p>
              )}
            </div>
            {!closed && (
              <button
                onClick={() => { if (confirm('Sitzung abschließen? Danach kann niemand mehr schreiben.')) close.mutate() }}
                className="btn-outline !py-2 !px-4 !text-sm sm:shrink-0"
              >
                Sitzung abschließen
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* ── Gespräch ─────────────────────────────────────────── */}
          <div className="card flex flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto pr-1" style={{ maxHeight: '58vh' }}>
              {messages.length === 0 && (
                <p className="text-sm text-brand-muted">
                  Noch ist es still. Bereitet rechts euren Kontext vor – und lasst Echo dann
                  die Sitzung eröffnen.
                </p>
              )}
              {messages.map(m => (
                <div key={m.id} className={m.role === 'echo' ? '' : 'rounded-brand bg-brand-bg px-3.5 py-2.5'}>
                  <p className={`text-xs font-semibold ${m.role === 'echo' ? 'text-accent' : 'text-navy'}`}>
                    {m.speaker}
                  </p>
                  <div className="mt-1 text-sm text-brand-text">
                    {m.role === 'echo'
                      ? <MarkdownMessage content={m.content} />
                      : <p className="whitespace-pre-wrap">{m.content}</p>}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {closed ? (
              <p className="mt-4 border-t border-brand-border pt-4 text-sm text-brand-muted">
                Diese Sitzung ist abgeschlossen.
              </p>
            ) : (
              <form
                onSubmit={e => { e.preventDefault(); if (text.trim()) send.mutate(text.trim()) }}
                className="mt-4 border-t border-brand-border pt-4"
              >
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && text.trim()) {
                      e.preventDefault(); send.mutate(text.trim())
                    }
                  }}
                  rows={3}
                  placeholder="Schreib, was du sagen möchtest …"
                  className="input w-full resize-y"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button type="submit" disabled={!text.trim() || busy} className="btn-primary !py-2 !px-5 !text-sm disabled:opacity-50">
                    {send.isPending ? 'Sende …' : 'Senden'}
                  </button>
                  <button
                    type="button"
                    onClick={() => moderate.mutate()}
                    disabled={busy}
                    className="btn-outline !py-2 !px-4 !text-sm disabled:opacity-50"
                  >
                    {moderate.isPending
                      ? 'Echo denkt nach …'
                      : messages.length === 0 ? 'Echo eröffnen lassen' : 'Echo einbeziehen'}
                  </button>
                  <span className="text-xs text-brand-muted">Beide sehen alles hier.</span>
                </div>
              </form>
            )}
          </div>

          {/* ── Vorbereitung ─────────────────────────────────────── */}
          <div className="space-y-5">
            <ContextComposer sessionId={sessionId} disabled={closed} />

            <div className="card">
              <h2 className="text-sm font-bold text-navy">Was Echo weiß</h2>
              {contexts.length === 0 ? (
                <p className="mt-2 text-sm text-brand-muted">
                  Noch nichts. Echo kennt nur, was ihr hier ausdrücklich freigebt.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {contexts.map(c => (
                    <div key={c.user_id} className="rounded-brand border border-brand-border px-3.5 py-3">
                      <p className="text-xs font-semibold text-navy">Von {c.name}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-brand-muted">{c.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
