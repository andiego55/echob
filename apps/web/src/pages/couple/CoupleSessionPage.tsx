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
import { useAuth } from '@/contexts/AuthContext'
import Avatar from '@/components/Avatar'
import { coupleSessionsApi } from '@/api/coupleSessions'
import { apiErrorMessage } from '@/api/errors'
import type { CoupleSessionDetail } from '@/api/coupleSessions'
import ContextComposer from '@/components/couple/ContextComposer'
import PreparationWizard from '@/components/couple/PreparationWizard'
import PrivateEchoPanel from '@/components/couple/PrivateEchoPanel'
import ProposalBar from '@/components/couple/ProposalBar'
import EchoThinking from '@/components/couple/EchoThinking'
import { SessionSkeleton } from '@/components/couple/Skeleton'
import { MOOD_EMOJI } from '@/components/couple/moods'
import AgreementsCard from '@/components/couple/AgreementsCard'
import Weiterfuehren from '@/components/couple/Weiterfuehren'
import { abmachungsvorschlaege } from '@/components/couple/abmachungsvorschlaege'
import { coupleAgreementsApi } from '@/api/coupleAgreements'

export default function CoupleSessionPage() {
  const { sessionId = '' } = useParams<{ sessionId: string }>()
  const qc = useQueryClient()
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [panel, setPanel] = useState<'prep' | 'private'>('prep')
  const [prepMode, setPrepMode] = useState<'wizard' | 'manual'>('wizard')
  const endRef = useRef<HTMLDivElement>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['couple-session', sessionId],
    queryFn: () => coupleSessionsApi.get(sessionId),
    enabled: !!sessionId,
    retry: false,
    // Die andere Person schreibt in denselben Verlauf – regelmäßig nachladen.
    refetchInterval: 8000,
  })

  const apply = (d: CoupleSessionDetail) => qc.setQueryData(['couple-session', sessionId], d)

  // Eigene Nachricht sofort zeigen. Ohne das steht man nach dem Absenden vor einem
  // leeren Feld und wartet – das fühlt sich an wie ein Fehler, nicht wie Senden.
  const send = useMutation({
    mutationFn: (content: string) => coupleSessionsApi.send(sessionId, content),
    onMutate: async (content: string) => {
      const key = ['couple-session', sessionId]
      await qc.cancelQueries({ queryKey: key })
      const vorher = qc.getQueryData<CoupleSessionDetail>(key)
      if (vorher) {
        qc.setQueryData<CoupleSessionDetail>(key, {
          ...vorher,
          messages: [...vorher.messages, {
            id: `eigen-${Date.now()}`,
            role: 'partner',
            user_id: user?.id ?? null,
            speaker: 'Du',
            content,
            created_at: new Date().toISOString(),
          }],
        })
      }
      setText('')
      return { vorher, content }
    },
    onError: (_e, _v, ctx) => {
      // Zurückrollen und den Text zurückgeben – sonst ist er weg.
      if (ctx?.vorher) qc.setQueryData(['couple-session', sessionId], ctx.vorher)
      if (ctx?.content) setText(ctx.content)
    },
    onSuccess: apply,
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
    return (
      <AppShell>
        <div className="mx-auto max-w-[1100px] px-6 py-8"><SessionSkeleton /></div>
      </AppShell>
    )
  }
  if (isError || !data) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[1100px] px-6 py-8">
          <div className="card">
            <h1 className="text-sm font-bold text-navy">Gespräch lässt sich nicht öffnen</h1>
            <p className="mt-1.5 text-sm text-brand-muted">{apiErrorMessage(error)}</p>
            <Link to="/app/paar" className="btn-quiet !py-2 !px-4 !text-sm mt-4 inline-block">Zur Übersicht</Link>
          </div>
        </div>
      </AppShell>
    )
  }

  const { session, messages, contexts } = data
  const ownAvatar = data.members.find(m => m.user_id === user?.id)?.avatar ?? null
  const partnerAvatar = data.members.find(m => m.user_id !== user?.id)?.avatar ?? null
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
                className="btn-quiet !py-2 !px-4 !text-sm sm:shrink-0"
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
          <div className={`card flex flex-col lg:order-1 ${
            messages.length === 0 ? 'order-2' : 'order-1'
          }`}>
            {session.goal && (
              <div className="lg:sticky lg:top-0 z-10 -mx-5 -mt-5 mb-3 rounded-t-brand-lg border-b border-brand-border bg-white/95 px-5 py-2.5 backdrop-blur">
                <p className="text-[0.68rem] font-bold uppercase tracking-wide text-brand-muted">
                  Unser Ziel
                </p>
                <p className="mt-0.5 text-sm font-medium text-navy">{session.goal}</p>
              </div>
            )}
            <div className="max-h-[46vh] flex-1 space-y-4 overflow-y-auto pr-1 sm:max-h-[52vh] lg:max-h-[58vh]">
              {messages.length === 0 && !closed && (
                <div className="rounded-brand border border-accent/30 bg-accent/[0.04] px-5 py-6 text-center">
                  <p className="text-[1rem] font-bold text-navy">Bereit für euer Gespräch?</p>
                  <p className="mx-auto mt-2 max-w-[460px] text-sm leading-relaxed text-brand-muted">
                    Echo begrüßt euch, fasst Thema und Ziel zusammen, nennt kurz die
                    Gesprächsregeln und stellt die erste Frage. Danach redet ihr miteinander –
                    Echo meldet sich, wenn ihr es dazuholt – und von selbst, wenn der Ton kippt.
                  </p>

                  <button
                    onClick={() => moderate.mutate()}
                    disabled={busy}
                    className="btn-primary !px-6 !py-3 mt-5 disabled:opacity-50"
                  >
                    {moderate.isPending
                      ? <EchoThinking text="Echo eröffnet …" size={38} />
                      : 'Sitzung starten'}
                  </button>

                  {contexts.length === 0 && (
                    <p className="mx-auto mt-4 max-w-[460px] text-xs text-brand-muted">
                      Hinweis: Bisher hat niemand einen Kontext freigegeben. Echo kennt dann nur
                      Titel und Ziel und wird im Raum nachfragen. Rechts unter
                      „Vorbereitung“ könnt ihr vorher noch etwas mitgeben.
                    </p>
                  )}
                </div>
              )}
              {messages.map(m => {
                // Echo sitzt in der Mitte und sieht anders aus als ihr beide — die
                // Moderationsrolle soll man sehen, nicht lesen muessen.
                if (m.role === 'echo') {
                  return (
                    <div key={m.id} className="flex justify-center">
                      <div className="w-full max-w-[92%] rounded-brand-lg border border-accent/35 bg-accent/[0.05] px-4 py-3">
                        <p className="text-[0.65rem] font-bold uppercase tracking-wide text-accent">
                          Echo · Moderation
                        </p>
                        <div className="mt-1.5 text-sm text-brand-text">
                          <MarkdownMessage content={m.content} />
                        </div>
                      </div>
                    </div>
                  )
                }
                const meins = !!user?.id && m.user_id === user.id
                return (
                  <div key={m.id} className={`flex gap-2 ${meins ? 'justify-end' : 'justify-start'}`}>
                    {!meins && <Avatar value={partnerAvatar} size="sm" className="mt-0.5" />}
                    <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 ${
                      meins
                        ? 'rounded-br-sm bg-navy text-white'
                        : 'rounded-bl-sm bg-brand-bg text-brand-text'
                    }`}>
                      <p className={`text-[0.68rem] font-semibold ${meins ? 'text-white/70' : 'text-navy'}`}>
                        {m.speaker}
                      </p>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm">{m.content}</p>
                    </div>
                    {meins && <Avatar value={ownAvatar} size="sm" className="mt-0.5" />}
                  </div>
                )
              })}
              <div ref={endRef} />
            </div>

            {closed ? (
              /* Vorher stand hier nur "Diese Sitzung ist abgeschlossen." - eine Tuer, die
                 zufaellt. Ein Gespraech ist aber genau dann etwas wert, wenn danach etwas
                 damit passiert. */
              <div className="mt-4 border-t border-brand-border pt-4">
                <p className="text-sm text-brand-muted">
                  Dieses Gespräch ist abgeschlossen – es bleibt hier zum Nachlesen stehen.
                  Rechts kannst du es zusammenfassen lassen; daraus werden dann Abmachungen.
                </p>
              </div>
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
                  placeholder="Schreib, was du sagen möchtest … – oder beginne mit „Echo, …“, um die Moderation dazuzuholen."
                  className="input w-full resize-y"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button type="submit" disabled={!text.trim() || busy} className="btn-primary !py-2 !px-5 !text-sm disabled:opacity-50">
                    {send.isPending ? 'Sende …' : 'Senden'}
                  </button>
                  {messages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => moderate.mutate()}
                      disabled={busy}
                      className="btn !py-2 !px-4 !text-sm border-2 border-accent text-accent hover:bg-accent hover:text-white disabled:opacity-50"
                      title="Echo meldet sich einmal zu Wort und gibt das Gespräch dann zurück. Von selbst kommt es dazu, wenn der Ton kippt oder ihr länger ohne Moderation redet."
                    >
                      {moderate.isPending
                        ? <EchoThinking text="Echo denkt nach …" size={34} />
                        : 'Echo dazuholen'}
                    </button>
                  )}
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
                  <span className="text-xs text-brand-muted">
                    Beide sehen alles hier. Echo hört mit und meldet sich, wenn ihr es ruft.
                  </span>
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
          <div className={`space-y-5 lg:order-2 ${
            messages.length === 0 ? 'order-1' : 'order-2'
          }`}>
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

            {panel === 'prep' && <SummaryCard sessionId={sessionId} coupleId={session.couple_id} hasMessages={messages.length > 0} />}

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

function SummaryCard({ sessionId, coupleId, hasMessages }: {
  sessionId: string; coupleId: string; hasMessages: boolean
}) {
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
        className="btn-quiet !py-1.5 !px-3.5 !text-xs mt-3 disabled:opacity-50"
      >
        {create.isPending ? 'Fasse zusammen …' : 'Sitzung zusammenfassen'}
      </button>

      {summaries.length > 0 && (
        <div className="mt-4 space-y-4">
          {summaries.map((s, i) => (
            <div key={s.id}>
              <div className="rounded-brand border border-brand-border px-3.5 py-3">
                <p className="text-[0.65rem] text-brand-muted">
                  {new Date(s.created_at).toLocaleString('de-DE')}
                </p>
                <div className="mt-1.5 text-xs text-brand-text">
                  <MarkdownMessage content={s.summary_text} />
                </div>
              </div>

              {/* Echo schlaegt im letzten Abschnitt konkrete Abmachungen vor. Bisher stand
                  das nur da - wer eine wollte, musste sie abtippen. Nur bei der neuesten
                  Zusammenfassung, sonst stapeln sich alte Vorschlaege uebereinander. */}
              {i === 0 && (
                <div className="mt-3">
                  <Weiterfuehren
                    coupleId={coupleId}
                    sessionId={sessionId}
                    vorschlaege={abmachungsvorschlaege(s.summary_text)}
                    saat={s.summary_text}
                    titel="Was nehmt ihr mit?"
                    hinweis="Ein Klick, und aus dem Vorschlag wird eine Abmachung mit Nachfrage."
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
