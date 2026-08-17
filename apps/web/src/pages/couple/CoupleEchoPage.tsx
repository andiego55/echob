/**
 * /app/paar/:coupleId/echo — dein persönlicher Paar-Begleiter.
 *
 * Wie der Echo-Dialog im Fall, aber für die Beziehungsarbeit zu zweit: Echo kennt hier
 * BEIDE Welten – deinen eigenen Fallzusammenhang und den Stand eures gemeinsamen Raums.
 * Genau deshalb ist der Dialog privat: Fallinhalte dürfen nie in einen Raum, den beide lesen.
 *
 * Die Startpunkte links sind kein Zierrat: Vor einem leeren Eingabefeld weiß man selten,
 * was man fragen soll – vor einem Vorschlag schon.
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import MarkdownMessage from '@/components/app/MarkdownMessage'
import { coupleApi } from '@/api/couple'
import type { CouplePrivateThread } from '@/api/couplePrivate'
import { apiErrorMessage } from '@/api/errors'

/** Startpunkte, nach dem sortiert, was gerade los ist. */
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

/** Themenfeld, das Echo kennt – als Einstieg für „darüber will ich reden“. */
const THEMEN = [
  'Nähe und Distanz', 'Zeit füreinander', 'Streitkultur', 'Geld', 'Haushalt und Fairness',
  'Sexualität', 'Kinder und Erziehung', 'Schwiegerfamilie', 'Eifersucht', 'Vertrauen',
  'Beruflicher Stress', 'Zukunftspläne', 'Anerkennung', 'Autonomie', 'Verlässlichkeit',
]

export default function CoupleEchoPage() {
  const { coupleId = '' } = useParams<{ coupleId: string }>()
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['couple-companion', coupleId],
    queryFn: () => coupleApi.companion(coupleId),
    enabled: !!coupleId,
    retry: false,
  })

  const send = useMutation({
    mutationFn: (content: string) => coupleApi.talkToCompanion(coupleId, content),
    onSuccess: (d: CouplePrivateThread) => {
      qc.setQueryData(['couple-companion', coupleId], d)
      setText('')
    },
  })

  const messages = data?.messages ?? []
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  const start = (vorlage: string) => {
    if (send.isPending) return
    send.mutate(vorlage)
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-[1100px] px-6 py-8">
        <div className="mb-5">
          <Link to="/app/paar" className="text-xs text-brand-muted hover:text-navy">← Zu zweit</Link>
          <span className="label mt-2 block">Nur für dich</span>
          <h1 className="mt-1 text-2xl font-bold text-navy">Dein Paar-Begleiter</h1>
          <p className="mt-2 max-w-2xl text-sm text-brand-muted">
            Echo kennt hier beides: was du für dich festgehalten hast und was in eurem
            gemeinsamen Raum läuft. Deine Partnerperson sieht diesen Dialog nicht.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* ── Startpunkte ──────────────────────────────────────── */}
          <div className="space-y-4 lg:order-1">
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
                          disabled={send.isPending}
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
                    disabled={send.isPending}
                    className="rounded-full border border-brand-border px-2.5 py-1 text-[0.7rem] text-brand-muted transition hover:border-accent hover:text-accent disabled:opacity-50"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Dialog ───────────────────────────────────────────── */}
          <div className="card flex flex-col lg:order-2">
            <div className="flex-1 space-y-4 overflow-y-auto pr-1" style={{ maxHeight: '58vh' }}>
              {isLoading && <p className="text-sm text-brand-muted">Lade …</p>}

              {!isLoading && messages.length === 0 && (
                <div className="rounded-brand border border-accent/30 bg-accent/[0.04] px-5 py-6">
                  <p className="text-[1rem] font-bold text-navy">Was beschäftigt dich?</p>
                  <p className="mt-2 text-sm leading-relaxed text-brand-muted">
                    Schreib einfach los – oder nimm links einen Startpunkt. Was hier steht,
                    bleibt bei dir. Wenn etwas davon in euren gemeinsamen Raum gehört, sagt
                    Echo es dir; den Schritt machst du selbst.
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
                placeholder="Schreib, was dich beschäftigt …"
                className="input w-full resize-y"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button type="submit" disabled={!text.trim() || send.isPending} className="btn-primary !py-2 !px-5 !text-sm disabled:opacity-50">
                  {send.isPending ? 'Echo denkt nach …' : 'Senden'}
                </button>
                <span className="text-xs text-brand-muted">Vertraulich – nur du liest das hier.</span>
              </div>
              {send.isError && (
                <p className="mt-2 text-sm text-red-600">{apiErrorMessage(send.error)}</p>
              )}
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
