/**
 * Was nach einem Mediationsvorschlag kommt — drei Wege, in der Reihenfolge, in der sie
 * meistens Sinn ergeben:
 *
 *   1. Für dich sortieren   – privater Dialog mit Echo, die andere Person sieht ihn nie.
 *   2. Etwas davon teilen   – Echo entwirft, du änderst, erst dein Absenden macht es sichtbar.
 *   3. Gemeinsam besprechen – daraus wird eine ganz normale moderierte Sitzung, mit dem
 *                             Vorschlag auf dem Tisch.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import MarkdownMessage from '@/components/app/MarkdownMessage'
import { coupleMediationApi } from '@/api/coupleMediation'
import type { CoupleTopicDetail } from '@/api/coupleMediation'
import { apiErrorMessage } from '@/api/errors'

export default function MediationFollowUp({ topicId }: { topicId: string }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [step, setStep] = useState<'privat' | 'teilen' | null>(null)
  const [text, setText] = useState('')
  const [draft, setDraft] = useState('')
  const [shared, setShared] = useState(false)

  const { data: thread } = useQuery({
    queryKey: ['couple-topic-private', topicId],
    queryFn: () => coupleMediationApi.getPrivate(topicId),
    enabled: !!topicId && step === 'privat',
  })

  const send = useMutation({
    mutationFn: (content: string) => coupleMediationApi.sendPrivate(topicId, content),
    onSuccess: d => { qc.setQueryData(['couple-topic-private', topicId], d); setText('') },
  })
  const summarize = useMutation({
    mutationFn: () => coupleMediationApi.summarizePrivate(topicId),
    onSuccess: t => { setDraft(t); setStep('teilen') },
  })
  const share = useMutation({
    mutationFn: () => coupleMediationApi.share(topicId, draft.trim()),
    onSuccess: (d: CoupleTopicDetail) => {
      qc.setQueryData(['couple-topic', topicId], d)
      setShared(true); setDraft('')
    },
  })
  const toSession = useMutation({
    mutationFn: () => coupleMediationApi.createSession(topicId),
    onSuccess: r => navigate(`/app/paar/sitzung/${r.session_id}`),
  })

  const messages = thread?.messages ?? []

  return (
    <div className="card mt-6">
      <h2 className="text-sm font-bold text-navy">Wie weiter?</h2>
      <p className="mt-1 text-xs text-brand-muted">
        Ein Vorschlag ist ein Anfang, kein Ergebnis. Drei Wege, ihn zu etwas zu machen.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <button
          onClick={() => setStep(step === 'privat' ? null : 'privat')}
          className={`rounded-brand border p-3.5 text-left transition ${
            step === 'privat' ? 'border-accent bg-accent/[0.06]' : 'border-brand-border hover:border-accent/50'
          }`}
        >
          <p className="text-sm font-semibold text-navy">1. Für mich sortieren</p>
          <p className="mt-1 text-[0.72rem] leading-snug text-brand-muted">
            Mit Echo allein besprechen, was der Vorschlag bei dir auslöst.
          </p>
        </button>

        <button
          onClick={() => { setStep('teilen'); if (!draft) summarize.mutate() }}
          disabled={summarize.isPending}
          className={`rounded-brand border p-3.5 text-left transition disabled:opacity-60 ${
            step === 'teilen' ? 'border-accent bg-accent/[0.06]' : 'border-brand-border hover:border-accent/50'
          }`}
        >
          <p className="text-sm font-semibold text-navy">
            2. {summarize.isPending ? 'Entwurf entsteht …' : 'Etwas davon teilen'}
          </p>
          <p className="mt-1 text-[0.72rem] leading-snug text-brand-muted">
            Echo fasst zusammen, du änderst – dann sieht es die andere Person.
          </p>
        </button>

        <button
          onClick={() => toSession.mutate()}
          disabled={toSession.isPending}
          className="rounded-brand border border-brand-border p-3.5 text-left transition hover:border-accent/50 disabled:opacity-60"
        >
          <p className="text-sm font-semibold text-navy">
            3. {toSession.isPending ? 'Öffne Gespräch …' : 'Gemeinsam besprechen'}
          </p>
          <p className="mt-1 text-[0.72rem] leading-snug text-brand-muted">
            Moderiertes Gespräch über den Vorschlag – Echo hat ihn dabei.
          </p>
        </button>
      </div>

      {toSession.isError && (
        <p className="mt-3 text-sm text-red-600">{apiErrorMessage(toSession.error)}</p>
      )}

      {/* ── 1. Privater Dialog ───────────────────────────────────── */}
      {step === 'privat' && (
        <div className="mt-4 rounded-brand border border-brand-border p-3.5">
          <p className="text-xs font-semibold text-navy">Nur für dich</p>
          <p className="mt-1 text-[0.7rem] text-brand-muted">
            Echo kennt hier deinen eigenen Zusammenhang und deinen vertraulichen Beitrag –
            nicht den der anderen Person.
          </p>

          <div className="mt-3 space-y-3 overflow-y-auto pr-1" style={{ maxHeight: '34vh' }}>
            {messages.length === 0 && (
              <p className="text-xs text-brand-muted">
                Zum Beispiel: „Brücke zwei fühlt sich für mich unfair an – warum eigentlich?“
              </p>
            )}
            {messages.map(m => (
              <div key={m.id} className={m.role === 'user' ? 'rounded-brand bg-brand-bg px-3 py-2' : ''}>
                <div className="text-xs text-brand-text">
                  {m.role === 'echo'
                    ? <MarkdownMessage content={m.content} />
                    : <p className="whitespace-pre-wrap">{m.content}</p>}
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={e => { e.preventDefault(); if (text.trim()) send.mutate(text.trim()) }}
            className="mt-3 border-t border-brand-border pt-3"
          >
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={3}
              placeholder="Was löst der Vorschlag bei dir aus?"
              className="input w-full resize-y !text-xs"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="submit" disabled={!text.trim() || send.isPending} className="btn-primary !py-1.5 !px-3.5 !text-xs disabled:opacity-50">
                {send.isPending ? 'Echo denkt nach …' : 'Senden'}
              </button>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => summarize.mutate()}
                  disabled={summarize.isPending}
                  className="btn-quiet !py-1.5 !px-3.5 !text-xs disabled:opacity-50"
                >
                  {summarize.isPending ? 'Fasse zusammen …' : 'Daraus etwas teilen'}
                </button>
              )}
            </div>
            {send.isError && (
              <p className="mt-2 text-xs text-red-600">{apiErrorMessage(send.error)}</p>
            )}
          </form>
        </div>
      )}

      {/* ── 2. Teilen ────────────────────────────────────────────── */}
      {step === 'teilen' && (
        <div className="mt-4 rounded-brand border border-brand-border p-3.5">
          <p className="text-xs font-semibold text-navy">Das würde die andere Person sehen</p>
          <textarea
            value={draft}
            onChange={e => { setDraft(e.target.value); setShared(false) }}
            rows={7}
            placeholder="Noch kein Entwurf – sprich erst mit Echo, oder schreib selbst."
            className="input mt-2 w-full resize-y !text-xs"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={() => share.mutate()}
              disabled={!draft.trim() || share.isPending}
              className="btn-primary !py-1.5 !px-3.5 !text-xs disabled:opacity-50"
            >
              {share.isPending ? 'Sende …' : 'An Partner:in senden'}
            </button>
            <span className="text-[0.68rem] text-brand-muted">
              Wird an deine offene Sicht angehängt.
            </span>
          </div>
          {shared && (
            <p className="mt-2 text-xs text-accent">
              Gesendet. Dein privater Dialog bleibt dabei bei dir.
            </p>
          )}
          {(share.isError || summarize.isError) && (
            <p className="mt-2 text-xs text-red-600">
              {apiErrorMessage(share.error ?? summarize.error)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
