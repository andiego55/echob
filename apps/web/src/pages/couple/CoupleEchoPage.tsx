/**
 * /app/paar/:coupleId/echo — dein persönlicher Paar-Begleiter.
 *
 * Wie der Echo-Dialog im Fall: reden, zusammenfassen lassen, behalten. Echo kennt hier
 * BEIDE Welten – deinen eigenen Fallzusammenhang und den Stand eures gemeinsamen Raums.
 * Genau deshalb ist der Dialog privat: Fallinhalte dürfen nie in einen Raum, den beide lesen.
 *
 * Die Startpunkte links sind kein Zierrat: Vor einem leeren Eingabefeld weiß man selten,
 * was man fragen soll – vor einem Vorschlag schon.
 */
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import CoupleShell from '@/components/couple/CoupleShell'
import MarkdownMessage from '@/components/app/MarkdownMessage'
import { coupleCompanionApi } from '@/api/coupleCompanion'
import type { CoupleEchoConversation } from '@/api/coupleCompanion'
import { apiErrorMessage } from '@/api/errors'

/** Startpunkte, sortiert nach dem, was gerade los ist. */
const IMPULSE: { gruppe: string; eintraege: { label: string; text: string }[] }[] = [
  {
    gruppe: 'Wo anfangen?',
    eintraege: [
      { label: 'Worüber sollten wir reden?',
        text: 'Ich weiß nicht recht, wo wir anfangen sollen. Hilf mir herauszufinden, welches Thema bei uns gerade wirklich dran ist.' },
      { label: 'Was ist dringend, was kann warten?',
        text: 'Bei uns liegt gerade vieles gleichzeitig an. Hilf mir zu sortieren, was dringend ist und was warten kann.' },
      { label: 'Kleines Thema zum Üben',
        text: 'Ich würde gern mit etwas Kleinem anfangen, um das Format zu üben. Schlag mir ein überschaubares Thema vor.' },
    ],
  },
  {
    gruppe: 'Bevor ich es sage',
    eintraege: [
      { label: 'Wie sage ich das?',
        text: 'Ich möchte etwas ansprechen, weiß aber nicht, wie ich es sage, ohne dass es als Vorwurf ankommt. Ich erzähl dir, worum es geht.' },
      { label: 'Aus Wut ein Anliegen machen',
        text: 'Ich bin gerade wütend und will nichts kaputtmachen. Hilf mir, aus meiner Wut ein Anliegen zu formulieren.' },
      { label: 'Eine Bitte formulieren',
        text: 'Ich möchte um etwas bitten, ohne zu fordern. Hilf mir, eine konkrete, kleine Bitte zu finden.' },
    ],
  },
  {
    gruppe: 'Nach einem Streit',
    eintraege: [
      { label: 'Erst mal runterkommen',
        text: 'Wir hatten gerade Streit und ich bin noch aufgewühlt. Hilf mir, erst einmal herunterzukommen.' },
      { label: 'Was ist da passiert?',
        text: 'Ich verstehe nicht ganz, warum unser letztes Gespräch gekippt ist. Lass uns anschauen, was da passiert ist.' },
      { label: 'Wieder aufeinander zugehen',
        text: 'Wir reden gerade kaum. Wie können wir wieder aufeinander zugehen, ohne dass es sich erzwungen anfühlt?' },
    ],
  },
  {
    gruppe: 'Muster verstehen',
    eintraege: [
      { label: 'Warum wiederholt sich das?',
        text: 'Bei uns wiederholt sich immer dieselbe Schleife. Hilf mir zu verstehen, was sie am Laufen hält.' },
      { label: 'Mein eigener Anteil',
        text: 'Ich möchte ehrlich auf meinen eigenen Anteil schauen. Sei dabei freundlich, aber nicht schonend.' },
      { label: 'Was brauche ich eigentlich?',
        text: 'Ich merke, dass mir etwas fehlt, kann es aber nicht benennen. Hilf mir herauszufinden, was ich eigentlich brauche.' },
    ],
  },
  {
    gruppe: 'Konkret werden',
    eintraege: [
      { label: 'Drei kleine Rituale',
        text: 'Schlag mir drei kleine Rituale vor, die im Alltag realistisch sind und uns näherbringen könnten.' },
      { label: 'Was war zuletzt gut?',
        text: 'Ich will nicht nur auf Probleme schauen. Hilf mir zu benennen, was bei uns zuletzt gut lief.' },
      { label: 'Ein nächster Schritt',
        text: 'Was wäre ein einziger, machbarer nächster Schritt für uns – etwas, das ich noch diese Woche tun kann?' },
    ],
  },
]

const THEMEN = [
  'Nähe und Distanz', 'Zeit füreinander', 'Streitkultur', 'Geld', 'Haushalt und Fairness',
  'Sexualität', 'Kinder und Erziehung', 'Schwiegerfamilie', 'Eifersucht', 'Vertrauen',
  'Beruflicher Stress', 'Zukunftspläne', 'Anerkennung', 'Autonomie', 'Verlässlichkeit',
]

export default function CoupleEchoPage() {
  const { coupleId = '' } = useParams<{ coupleId: string }>()
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [ansicht, setAnsicht] = useState<'aktuell' | string>('aktuell')
  const endRef = useRef<HTMLDivElement>(null)

  const aktuell = useQuery({
    queryKey: ['couple-companion', coupleId],
    queryFn: () => coupleCompanionApi.current(coupleId),
    enabled: !!coupleId,
    retry: false,
  })
  const frueher = useQuery({
    queryKey: ['couple-companion-threads', coupleId],
    queryFn: () => coupleCompanionApi.threads(coupleId),
    enabled: !!coupleId,
  })
  const altes = useQuery({
    queryKey: ['couple-companion-thread', ansicht],
    queryFn: () => coupleCompanionApi.thread(ansicht),
    enabled: ansicht !== 'aktuell',
  })

  const send = useMutation({
    mutationFn: (content: string) => coupleCompanionApi.send(coupleId, content),
    onSuccess: (d: CoupleEchoConversation) => {
      qc.setQueryData(['couple-companion', coupleId], d)
      qc.invalidateQueries({ queryKey: ['couple-companion-threads', coupleId] })
      setText('')
    },
  })
  const abschliessen = useMutation({
    mutationFn: () => coupleCompanionApi.summarize(coupleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['couple-companion', coupleId] })
      qc.invalidateQueries({ queryKey: ['couple-companion-threads', coupleId] })
      qc.invalidateQueries({ queryKey: ['couple-dashboard', coupleId] })
      setAnsicht('aktuell')
    },
  })

  const gespraech = ansicht === 'aktuell' ? aktuell.data : altes.data
  const messages = gespraech?.messages ?? []
  const liest = ansicht !== 'aktuell'
  const busy = send.isPending || abschliessen.isPending

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  const start = (vorlage: string) => {
    if (busy) return
    setAnsicht('aktuell')
    send.mutate(vorlage)
  }

  const vergangene = (frueher.data ?? []).filter(t => t.closed_at)

  return (
    <CoupleShell subtitle="Nur für dich – Echo kennt deinen Fall und euren Raum.">
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* ── Startpunkte + Verlauf ──────────────────────────────── */}
        <div className="space-y-4">
          {vergangene.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-bold text-navy">Deine Gespräche</h2>
              <div className="mt-2.5 space-y-1.5">
                <button
                  onClick={() => setAnsicht('aktuell')}
                  className={`block w-full rounded-brand border px-3 py-2 text-left text-xs transition ${
                    ansicht === 'aktuell'
                      ? 'border-accent bg-accent/[0.06] font-medium text-accent'
                      : 'border-brand-border text-brand-text hover:border-accent/50'
                  }`}
                >
                  Laufendes Gespräch
                </button>
                {vergangene.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setAnsicht(t.id)}
                    className={`block w-full rounded-brand border px-3 py-2 text-left text-xs transition ${
                      ansicht === t.id
                        ? 'border-accent bg-accent/[0.06] font-medium text-accent'
                        : 'border-brand-border text-brand-muted hover:border-accent/50'
                    }`}
                  >
                    <span className="block truncate">{t.title || 'Ohne Titel'}</span>
                    <span className="mt-0.5 block text-[0.65rem] text-brand-muted/70">
                      {new Date(t.closed_at!).toLocaleDateString('de-DE')} · {t.message_count} Beiträge
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <h2 className="text-sm font-bold text-navy">Womit anfangen?</h2>
            <p className="mt-1 text-[0.7rem] text-brand-muted">
              Tippen genügt – du kannst danach frei weiterschreiben.
            </p>
            <div className="mt-3 space-y-3.5">
              {IMPULSE.map(g => (
                <div key={g.gruppe}>
                  <p className="text-[0.62rem] font-bold uppercase tracking-wide text-brand-muted">
                    {g.gruppe}
                  </p>
                  <div className="mt-1.5 space-y-1.5">
                    {g.eintraege.map(e => (
                      <button
                        key={e.label}
                        onClick={() => start(e.text)}
                        disabled={busy}
                        className="block w-full rounded-brand border border-brand-border px-3 py-2 text-left text-xs text-brand-text transition hover:border-accent/50 hover:bg-accent/[0.04] disabled:opacity-50"
                      >
                        {e.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-bold text-navy">Themenfeld</h2>
            <p className="mt-1 text-[0.7rem] text-brand-muted">
              Worum geht es bei euch? Tippe an, was passt.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {THEMEN.map(t => (
                <button
                  key={t}
                  onClick={() => start(
                    `Ich möchte über das Thema „${t}“ sprechen. Stell mir dazu erst ein paar `
                    + 'Fragen, damit klar wird, worum es bei uns konkret geht.',
                  )}
                  disabled={busy}
                  className="rounded-full border border-brand-border px-2.5 py-1 text-[0.7rem] text-brand-muted transition hover:border-accent hover:text-accent disabled:opacity-50"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Dialog ─────────────────────────────────────────────── */}
        <div className="card flex flex-col">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-brand-border pb-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-navy">
                {gespraech?.thread.title || (liest ? 'Früheres Gespräch' : 'Neues Gespräch')}
              </p>
              <p className="mt-0.5 text-[0.7rem] text-brand-muted">
                {liest
                  ? 'Abgeschlossen – zum Nachlesen.'
                  : 'Vertraulich. Nur du liest das hier.'}
              </p>
            </div>
            {!liest && messages.length > 0 && (
              <button
                onClick={() => abschliessen.mutate()}
                disabled={busy}
                className="btn-outline !py-1.5 !px-3.5 !text-xs shrink-0 disabled:opacity-50"
                title="Echo fasst zusammen, schließt das Gespräch ab und legt die Zusammenfassung auf die Übersicht."
              >
                {abschliessen.isPending ? 'Fasse zusammen …' : 'Zusammenfassen & abschließen'}
              </button>
            )}
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto py-4 pr-1" style={{ maxHeight: '52vh' }}>
            {(aktuell.isLoading || altes.isLoading) && (
              <p className="text-sm text-brand-muted">Lade …</p>
            )}

            {!aktuell.isLoading && messages.length === 0 && !liest && (
              <div className="rounded-brand border border-accent/30 bg-accent/[0.04] px-5 py-6">
                <p className="text-[1rem] font-bold text-navy">Was beschäftigt dich?</p>
                <p className="mt-2 text-sm leading-relaxed text-brand-muted">
                  Schreib einfach los – oder nimm links einen Startpunkt. Was hier steht,
                  bleibt bei dir. Wenn ihr fertig seid, lässt du das Gespräch zusammenfassen;
                  die Zusammenfassung findest du danach auf eurer Übersicht wieder.
                </p>
              </div>
            )}

            {messages.map(m => (
              <div key={m.id} className={m.role === 'user' ? 'rounded-brand bg-brand-bg px-3.5 py-2.5' : ''}>
                <div className="text-sm text-brand-text">
                  {m.role === 'echo'
                    ? <MarkdownMessage content={m.content} />
                    : <p className="whitespace-pre-wrap">{m.content}</p>}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {liest ? (
            <div className="border-t border-brand-border pt-4">
              <button
                onClick={() => setAnsicht('aktuell')}
                className="btn-outline !py-2 !px-4 !text-sm"
              >
                Zurück zum laufenden Gespräch
              </button>
            </div>
          ) : (
            <form
              onSubmit={e => { e.preventDefault(); if (text.trim()) send.mutate(text.trim()) }}
              className="border-t border-brand-border pt-4"
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
                placeholder="Schreib, was dich beschäftigt …"
                className="input w-full resize-y"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button type="submit" disabled={!text.trim() || busy} className="btn-primary !py-2 !px-5 !text-sm disabled:opacity-50">
                  {send.isPending ? 'Echo denkt nach …' : 'Senden'}
                </button>
                <span className="text-xs text-brand-muted">Vertraulich – nur du liest das hier.</span>
              </div>
              {(send.isError || abschliessen.isError) && (
                <p className="mt-2 text-sm text-red-600">
                  {apiErrorMessage(send.error ?? abschliessen.error)}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </CoupleShell>
  )
}
