/**
 * Der private, flankierende Echo-Dialog zur Sitzung.
 *
 * Hier kennt Echo deinen eigenen Fall und hilft dir, das gemeinsame Gespräch aus deinem
 * ganzen Zusammenhang zu sehen – vorbereiten, herunterkommen, nachbesprechen. Die andere
 * Person sieht davon nichts.
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import MarkdownMessage from '@/components/app/MarkdownMessage'
import { couplePrivateApi } from '@/api/couplePrivate'
import type { CouplePrivateThread } from '@/api/couplePrivate'
import Fehlermeldung from '@/components/Fehlermeldung'

export default function PrivateEchoPanel({ sessionId }: { sessionId: string }) {
  const qc = useQueryClient()
  const [text, setText] = useState('')

  const { data } = useQuery({
    queryKey: ['couple-private', sessionId],
    queryFn: () => couplePrivateApi.get(sessionId),
    enabled: !!sessionId,
  })

  const apply = (d: CouplePrivateThread) => qc.setQueryData(['couple-private', sessionId], d)

  const send = useMutation({
    mutationFn: (content: string) => couplePrivateApi.send(sessionId, content),
    onSuccess: d => { apply(d); setText('') },
  })
  const feedback = useMutation({
    mutationFn: () => couplePrivateApi.feedback(sessionId),
    onSuccess: apply,
  })

  const messages = data?.messages ?? []
  const busy = send.isPending || feedback.isPending

  return (
    <div className="card border-l-4 border-l-navy/30">
      <h2 className="text-sm font-bold text-navy">Nur für dich</h2>
      <p className="mt-1 text-xs text-brand-muted">
        Dieser Dialog ist vertraulich. Deine Partnerperson sieht ihn nicht – und Echo kennt
        hier deinen eigenen Zusammenhang.
      </p>

      <div className="mt-4 space-y-3 overflow-y-auto pr-1" style={{ maxHeight: '38vh' }}>
        {messages.length === 0 && (
          <p className="text-xs text-brand-muted">
            Frag hier, was du im Raum (noch) nicht sagen willst: Was will ich eigentlich?
            Wie sage ich das, ohne dass es eskaliert? Was hat mich gerade so getroffen?
          </p>
        )}
        {messages.map(m => (
          <div
            key={m.id}
            className={m.role === 'echo'
              ? (m.kind === 'feedback' ? 'rounded-brand bg-accent/[0.06] px-3 py-2.5' : '')
              : 'rounded-brand bg-brand-bg px-3 py-2'}
          >
            {m.kind === 'feedback' && (
              <p className="text-[0.65rem] font-bold uppercase tracking-wide text-accent">
                Dein Feedback
              </p>
            )}
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
          placeholder="Was beschäftigt dich gerade?"
          className="input w-full resize-y !text-xs"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="submit" disabled={!text.trim() || busy} className="btn-primary !py-1.5 !px-3.5 !text-xs disabled:opacity-50">
            {send.isPending ? 'Echo denkt nach …' : 'Senden'}
          </button>
          <button
            type="button"
            onClick={() => feedback.mutate()}
            disabled={busy}
            className="btn-quiet !py-1.5 !px-3.5 !text-xs disabled:opacity-50"
          >
            {feedback.isPending ? 'Werte aus …' : 'Feedback zu mir'}
          </button>
        </div>
        <Fehlermeldung error={send.error ?? feedback.error} />
      </form>
    </div>
  )
}
