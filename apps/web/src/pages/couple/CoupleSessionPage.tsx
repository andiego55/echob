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
import { apiErrorMessage } from '@/api/errors'
import type { CoupleSessionDetail } from '@/api/coupleSessions'
import ContextComposer from '@/components/couple/ContextComposer'
import PreparationWizard from '@/components/couple/PreparationWizard'
import PrivateEchoPanel from '@/components/couple/PrivateEchoPanel'
import ProposalBar from '@/components/couple/ProposalBar'

const MOOD_EMOJI: Record<string, string> = {
  ruhig: '🌤', hoffnungsvoll: '🌱', angespannt: '⚡',
  traurig: '🌧', wuetend: '🔥', erschoepft: '🌙',
}
import AgreementsCard from '@/components/couple/AgreementsCard'
import { coupleAgreementsApi } from '@/api/coupleAgreements'

export default function CoupleSessionPage() {
  const { sessionId = '' } = useParams<{ sessionId: string }>()
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [panel, setPanel] = useState<'prep' | 'private'>('prep')
  const [prepMode, setPrepMode] = useState<'wizard' | 'manual'>('wizard')
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

        <div className="mb-5">
          <ProposalBar session={session} />
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
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Kurze Pause einlegen? Beide sehen den Hinweis, und Echo greift auf.')) {
                        send.mutate('Ich brauche eine kurze Pause.')
                      }
                    }}
                    disabled={busy}
                    className="text-xs text-brand-muted hover:text-navy disabled:opacity-50"
                    title="Wenn es zu viel wird – weitermachen hilft dann niemandem."
                  >
                    Pause
                  </button>
                  <span className="text-xs text-brand-muted">Beide sehen alles hier.</span>
                </div>
                {(send.isError || moderate.isError) && (
                  <p className="mt-2 text-sm text-red-600">
                    {apiErrorMessage(send.error ?? moderate.error)}
                  </p>
                )}
              </form>
            )}
          </div>

          {/* ── Vorbereitung / privater Echo ─────────────────────── */}
          <div className="space-y-5">
            <div className="flex gap-1 rounded-brand border border-brand-border p-1">
              {([['prep', 'Vorbereitung'], ['private', 'Nur für dich']] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setPanel(key)}
                  className={`flex-1 rounded-brand-sm px-3 py-1.5 text-xs font-medium transition ${
                    panel === key ? 'bg-navy text-white' : 'text-brand-muted hover:text-navy'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {panel === 'private' && <PrivateEchoPanel sessionId={sessionId} />}

            {panel === 'prep' && <SummaryCard sessionId={sessionId} hasMessages={messages.length > 0} />}

            {panel === 'prep' && <>
            <div className="flex gap-1 rounded-brand border border-brand-border p-1">
              {([['wizard', 'Geführt'], ['manual', 'Selbst schreiben']] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setPrepMode(key)}
                  className={`flex-1 rounded-brand-sm px-3 py-1.5 text-[0.7rem] font-medium transition ${
                    prepMode === key ? 'bg-accent/10 text-accent' : 'text-brand-muted hover:text-navy'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {prepMode === 'wizard'
              ? <PreparationWizard sessionId={sessionId} />
              : <ContextComposer sessionId={sessionId} disabled={closed} />}

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
                      {c.mood && (
                        <p className="mt-0.5 text-[0.7rem] text-brand-muted">
                          Kommt {MOOD_EMOJI[c.mood] ?? ''} {c.mood} herein
                        </p>
                      )}
                      <p className="mt-1 whitespace-pre-wrap text-sm text-brand-muted">{c.text}</p>
                      {c.appreciation && (
                        <p className="mt-2 rounded-brand bg-accent/[0.06] px-2.5 py-1.5 text-xs text-brand-text">
                          <span className="font-medium text-navy">Schätzt an dir:</span> {c.appreciation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            </>}
          </div>
        </div>

        {panel === 'prep' && <div className="mt-6"><AgreementsCard coupleId={session.couple_id} sessionId={sessionId} /></div>}
      </div>
    </AppShell>
  )
}

// ── Zusammenfassung ───────────────────────────────────────────────────────────

function SummaryCard({ sessionId, hasMessages }: { sessionId: string; hasMessages: boolean }) {
  const qc = useQueryClient()
  const { data: summaries = [] } = useQuery({
    queryKey: ['couple-summaries', sessionId],
    queryFn: () => coupleAgreementsApi.listSummaries(sessionId),
    enabled: !!sessionId,
  })
  const create = useMutation({
    mutationFn: () => coupleAgreementsApi.createSummary(sessionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['couple-summaries', sessionId] }),
  })

  return (
    <div className="card">
      <h2 className="text-sm font-bold text-navy">Zusammenfassung</h2>
      <p className="mt-1 text-xs text-brand-muted">
        Echo hält fest, worum es ging, was deutlich wurde, was offen blieb – und schlägt
        Abmachungen vor.
      </p>

      <button
        onClick={() => create.mutate()}
        disabled={!hasMessages || create.isPending}
        className="btn-outline !py-1.5 !px-3.5 !text-xs mt-3 disabled:opacity-50"
      >
        {create.isPending ? 'Fasse zusammen …' : 'Sitzung zusammenfassen'}
      </button>

      {summaries.length > 0 && (
        <div className="mt-4 space-y-3">
          {summaries.map(s => (
            <div key={s.id} className="rounded-brand border border-brand-border px-3.5 py-3">
              <p className="text-[0.65rem] text-brand-muted">
                {new Date(s.created_at).toLocaleString('de-DE')}
              </p>
              <div className="mt-1.5 text-xs text-brand-text">
                <MarkdownMessage content={s.summary_text} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
