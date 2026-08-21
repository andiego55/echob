/**
 * Echos Brücken als verhandelbare Karten – plus der gemeinsame Diskussionsfaden.
 *
 * Jede Brücke kennt drei Handlungen: übernehmen (wird zur Abmachung, die die andere Person
 * bestätigt), ändern (das ist der Gegenvorschlag – man sieht, wer zuletzt daran war) und
 * verwerfen (mit einem Satz warum). Darunter reden die beiden darüber; mit „Echo, …“ oder
 * per Knopf holen sie die Moderation dazu.
 */
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import MarkdownMessage from '@/components/app/MarkdownMessage'
import { coupleMediationApi } from '@/api/coupleMediation'
import type { CoupleBridge, CoupleTopicDetail, CoupleTopicMessage } from '@/api/coupleMediation'
import Avatar from '@/components/Avatar'
import { useCoupleFaces } from './useCoupleFaces'
import EchoThinking from './EchoThinking'
import Fehlermeldung from '@/components/Fehlermeldung'

const STATUS_CHIP: Record<CoupleBridge['status'], { label: string; cls: string }> = {
  open:     { label: 'In Verhandlung', cls: 'bg-brand-bg text-brand-muted' },
  accepted: { label: 'Als Abmachung',  cls: 'bg-green-50 text-green-700' },
  dropped:  { label: 'Verworfen',      cls: 'bg-brand-bg text-brand-muted' },
}

export default function BridgeBoard({
  topicId, coupleId, bridges, messages,
}: {
  topicId: string
  coupleId: string
  bridges: CoupleBridge[]
  messages: CoupleTopicMessage[]
}) {
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const apply = (d: CoupleTopicDetail) => qc.setQueryData(['couple-topic', topicId], d)

  const send = useMutation({
    mutationFn: (content: string) => coupleMediationApi.postMessage(topicId, content),
    onSuccess: d => { apply(d); setText('') },
  })
  const callEcho = useMutation({
    mutationFn: () => coupleMediationApi.callEcho(topicId),
    onSuccess: apply,
  })

  const offen = bridges.filter(b => b.status === 'open')
  const erledigt = bridges.filter(b => b.status !== 'open')
  const busy = send.isPending || callEcho.isPending

  return (
    <div className="card mt-6">
      <h2 className="card-title">Echos Brücken</h2>
      <p className="mt-1 text-xs text-brand-muted">
        Nehmt an, was passt. Ändert, was fast passt – das ist euer Gegenvorschlag. Verwerft,
        was nicht trägt.
      </p>

      {bridges.length === 0 ? (
        <p className="mt-4 text-sm text-brand-muted">
          Noch keine Vorschläge. Sie entstehen, sobald Echo eine Mediation erarbeitet hat.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {[...offen, ...erledigt].map(b => (
            <BridgeCard key={b.id} bridge={b} topicId={topicId} coupleId={coupleId} />
          ))}
        </div>
      )}

      {/* ── Diskussion ───────────────────────────────────────────── */}
      <div className="mt-6 border-t border-brand-border pt-4">
        <h3 className="card-title">Darüber reden</h3>
        <p className="mt-1 text-xs text-brand-muted">
          Beide sehen diesen Verlauf. Er bleibt gespeichert.
        </p>

        {messages.length > 0 && (
          <div className="mt-3 space-y-3 overflow-y-auto pr-1" style={{ maxHeight: '36vh' }}>
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
          </div>
        )}

        <form
          onSubmit={e => { e.preventDefault(); if (text.trim()) send.mutate(text.trim()) }}
          className="mt-3"
        >
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={3}
            placeholder="Was denkst du zu den Vorschlägen? – oder beginne mit „Echo, …“ für eine Alternative."
            className="input w-full resize-y !text-sm"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="submit" disabled={!text.trim() || busy} className="btn-primary !py-2 !px-4 !text-sm disabled:opacity-50">
              {send.isPending ? 'Sende …' : 'Senden'}
            </button>
            <button
              type="button"
              onClick={() => callEcho.mutate()}
              disabled={busy}
              className="btn !py-2 !px-4 !text-sm border-2 border-accent text-accent hover:bg-accent hover:text-white disabled:opacity-50"
            >
              {callEcho.isPending
                ? <EchoThinking text="Echo denkt nach …" size={34} />
                : 'Echo dazuholen'}
            </button>
          </div>
          <Fehlermeldung error={send.error ?? callEcho.error} />
        </form>
      </div>
    </div>
  )
}

function BridgeCard({
  bridge, topicId, coupleId,
}: { bridge: CoupleBridge; topicId: string; coupleId: string }) {
  const qc = useQueryClient()
  const { user } = useAuth()
  const { faceFor } = useCoupleFaces(coupleId)
  const [edit, setEdit] = useState(false)
  const [body, setBody] = useState(bridge.body)
  const [note, setNote] = useState('')
  const [dropping, setDropping] = useState(false)

  const apply = (d: CoupleTopicDetail) => qc.setQueryData(['couple-topic', topicId], d)

  const save = useMutation({
    mutationFn: () => coupleMediationApi.updateBridge(bridge.id, { body: body.trim() }),
    onSuccess: d => { apply(d); setEdit(false) },
  })
  const accept = useMutation({
    mutationFn: () => coupleMediationApi.acceptBridge(bridge.id),
    onSuccess: apply,
  })
  const drop = useMutation({
    mutationFn: () => coupleMediationApi.dropBridge(bridge.id, note.trim() || null),
    onSuccess: d => { apply(d); setDropping(false) },
  })

  const chip = STATUS_CHIP[bridge.status]
  const geaendert = !!bridge.updated_by
  const vonMir = bridge.updated_by === user?.id
  const offen = bridge.status === 'open'

  return (
    <div className={`rounded-brand border px-4 py-3.5 ${
      bridge.status === 'accepted' ? 'border-green-200 bg-green-50/30'
      : bridge.status === 'dropped' ? 'border-brand-border opacity-60'
      : 'border-brand-border'
    }`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-sm font-semibold text-navy">
          {bridge.title || 'Vorschlag'}
        </p>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold ${chip.cls}`}>
          {chip.label}
        </span>
      </div>

      {edit ? (
        <>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={4}
            className="input mt-2 w-full resize-y !text-sm"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={() => save.mutate()}
              disabled={!body.trim() || save.isPending}
              className="btn-primary !py-1.5 !px-3.5 !text-xs disabled:opacity-50"
            >
              {save.isPending ? 'Speichere …' : 'Als Gegenvorschlag senden'}
            </button>
            <button
              onClick={() => { setBody(bridge.body); setEdit(false) }}
              className="text-xs text-brand-muted hover:text-navy"
            >
              Abbrechen
            </button>
          </div>
        </>
      ) : (
        <p className="mt-1.5 whitespace-pre-wrap text-sm text-brand-text">{bridge.body}</p>
      )}

      {geaendert && !edit && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[0.7rem] text-accent">
          <Avatar value={faceFor(bridge.updated_by).avatar} size="xs" />
          {vonMir ? 'Von dir geändert' : 'Von deiner Partnerperson geändert'}
        </p>
      )}

      {/* Der Weg dorthin — man sieht die Bewegung, nicht nur den Endstand. */}
      {bridge.versions.length > 1 && !edit && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[0.7rem] text-brand-muted hover:text-navy">
            Verlauf ansehen ({bridge.versions.length} Fassungen)
          </summary>
          <ol className="mt-2 space-y-2 border-l-2 border-brand-border pl-3">
            {bridge.versions.map((v, i) => {
              const wer = v.changed_by === null
                ? 'Echos Vorschlag'
                : v.changed_by === user?.id ? 'Deine Fassung' : 'Ihre Fassung'
              const aktuell = i === bridge.versions.length - 1
              return (
                <li key={i} className="relative">
                  <span className={`absolute -left-[1.05rem] top-1.5 h-2 w-2 rounded-full ${
                    aktuell ? 'bg-accent' : 'bg-brand-border'
                  }`} />
                  <p className={`flex items-center gap-1.5 text-[0.68rem] font-semibold ${
                    aktuell ? 'text-accent' : 'text-brand-muted'
                  }`}>
                    {v.changed_by && <Avatar value={faceFor(v.changed_by).avatar} size="xs" />}
                    {wer}
                    {aktuell && ' · gilt gerade'}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap text-xs text-brand-muted">{v.body}</p>
                </li>
              )
            })}
          </ol>
        </details>
      )}
      {bridge.note && (
        <p className="mt-1.5 text-[0.7rem] text-brand-muted">Notiz: {bridge.note}</p>
      )}

      {offen && !edit && !dropping && (
        <div className="mt-2.5 flex flex-wrap items-center gap-3">
          <button
            onClick={() => accept.mutate()}
            disabled={accept.isPending}
            className="btn-primary !py-1.5 !px-3.5 !text-xs disabled:opacity-50"
          >
            {accept.isPending ? 'Übernehme …' : 'Als Abmachung übernehmen'}
          </button>
          <button onClick={() => setEdit(true)} className="text-xs font-medium text-accent hover:underline">
            Ändern
          </button>
          <button onClick={() => setDropping(true)} className="text-xs text-brand-muted hover:text-navy">
            Verwerfen
          </button>
        </div>
      )}

      {dropping && (
        <div className="mt-2.5">
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Warum trägt das nicht? (optional)"
            className="input !text-xs"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={() => drop.mutate()}
              disabled={drop.isPending}
              className="btn-quiet !py-1.5 !px-3.5 !text-xs disabled:opacity-50"
            >
              {drop.isPending ? 'Verwerfe …' : 'Verwerfen'}
            </button>
            <button onClick={() => setDropping(false)} className="text-xs text-brand-muted hover:text-navy">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {bridge.status === 'accepted' && (
        <p className="mt-2 text-[0.7rem] text-green-700">
          Liegt jetzt bei den Abmachungen – dort bestätigt die andere Person sie.
        </p>
      )}

      <Fehlermeldung error={save.error ?? accept.error ?? drop.error} />
    </div>
  )
}
