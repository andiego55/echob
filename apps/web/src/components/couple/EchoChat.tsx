/**
 * Der private Echo-Dialog im Paarraum – als eigenständiger Baustein.
 *
 * **Warum es diesen Baustein gibt.** Zwei Seiten führen denselben Dialog: der Begleiter
 * („Reden → Echo") und der Einstieg nach einem Streit. Beide hatten eine eigene, leicht
 * abweichende Fassung, und beide litten am selben Problem: Eine 280–300 px breite
 * Seitenspalte trug Startpunkte und Hinweise mit sich, die nur am Anfang zählen — und
 * drückte das Gespräch für immer an den Rand.
 *
 * **Was sich geändert hat.** Das Gespräch bekommt die Breite. Der Verlauf früherer
 * Gespräche wandert in eine Auswahl in der Kopfzeile: einen Klick entfernt, statt eine
 * Spalte breit. Die Startpunkte erscheinen groß, solange nichts geschrieben ist, und
 * verschwinden, sobald geredet wird — dann sind sie beantwortet.
 *
 * **Frühere Gespräche bleiben.** Jeder Faden wird beim Abschließen zusammengefasst und
 * bleibt lesbar; die Auswahl oben führt zu allen. Nichts verschwindet mit dem Schließen
 * der Seite.
 */
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import MarkdownMessage from '@/components/app/MarkdownMessage'
import { coupleCompanionApi } from '@/api/coupleCompanion'
import type { CoupleEchoConversation, CoupleThreadKind } from '@/api/coupleCompanion'
import EchoThinking from './EchoThinking'
import Weiterfuehren from './Weiterfuehren'
import type { Zug } from './Weiterfuehren'
import { abmachungsvorschlaege } from './abmachungsvorschlaege'
import Fehlermeldung from '@/components/Fehlermeldung'

export interface Impulsgruppe {
  gruppe: string
  eintraege: { label: string; text: string }[]
}

export default function EchoChat({
  coupleId, kind, impulse, themen, leerTitel, leerText, platzhalter,
  abschlussZuege,
}: {
  coupleId: string
  kind: CoupleThreadKind
  impulse: Impulsgruppe[]
  themen?: string[]
  leerTitel: string
  leerText: string
  platzhalter: string
  /**
   * Welche Zuege nach dem Abschliessen angeboten werden. Ohne sie endete das Gespraech
   * frueher blind: Echo half beim Formulieren, und danach fuehrte kein Weg weiter.
   */
  abschlussZuege?: Zug[]
}) {
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [ansicht, setAnsicht] = useState<'aktuell' | string>('aktuell')
  const [auswahlOffen, setAuswahlOffen] = useState(false)
  const [festgehalten, setFestgehalten] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const schluessel = ['couple-chat', coupleId, kind]

  const aktuell = useQuery({
    queryKey: schluessel,
    queryFn: () => coupleCompanionApi.current(coupleId, kind),
    enabled: !!coupleId,
    retry: false,
  })
  const frueher = useQuery({
    queryKey: ['couple-chat-threads', coupleId, kind],
    queryFn: () => coupleCompanionApi.threads(coupleId, kind),
    enabled: !!coupleId,
    retry: false,
  })
  const altes = useQuery({
    queryKey: ['couple-chat-thread', ansicht],
    queryFn: () => coupleCompanionApi.thread(ansicht),
    enabled: ansicht !== 'aktuell',
    retry: false,
  })

  // Eigene Nachricht sofort zeigen – Stille nach dem Absenden fühlt sich an wie ein Fehler.
  const send = useMutation({
    mutationFn: (inhalt: string) => coupleCompanionApi.send(coupleId, inhalt, kind),
    onMutate: async (inhalt: string) => {
      await qc.cancelQueries({ queryKey: schluessel })
      const vorher = qc.getQueryData<CoupleEchoConversation>(schluessel)
      if (vorher) {
        qc.setQueryData<CoupleEchoConversation>(schluessel, {
          ...vorher,
          messages: [...vorher.messages, {
            id: `eigen-${Date.now()}`, role: 'user', kind: 'chat',
            content: inhalt, created_at: new Date().toISOString(),
          }],
        })
      }
      setText('')
      return { vorher, inhalt }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.vorher) qc.setQueryData(schluessel, ctx.vorher)
      if (ctx?.inhalt) setText(ctx.inhalt)
    },
    onSuccess: d => {
      qc.setQueryData(schluessel, d)
      qc.invalidateQueries({ queryKey: ['couple-chat-threads', coupleId, kind] })
    },
  })

  const abschliessen = useMutation({
    mutationFn: () => coupleCompanionApi.summarize(coupleId, kind),
    onSuccess: s => {
      qc.invalidateQueries({ queryKey: schluessel })
      qc.invalidateQueries({ queryKey: ['couple-chat-threads', coupleId, kind] })
      qc.invalidateQueries({ queryKey: ['couple-dashboard', coupleId] })
      setFestgehalten(s.summary_text)
      setAnsicht('aktuell')
    },
  })

  const gespraech = ansicht === 'aktuell' ? aktuell.data : altes.data
  const messages = gespraech?.messages ?? []
  const liest = ansicht !== 'aktuell'
  const busy = send.isPending || abschliessen.isPending
  const vergangene = (frueher.data ?? []).filter(t => t.closed_at)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const starten = (vorlage: string) => {
    if (busy) return
    setAnsicht('aktuell')
    setFestgehalten(null)
    send.mutate(vorlage)
  }

  // ── Nach dem Abschließen ────────────────────────────────────────
  if (festgehalten) {
    return (
      <div className="card card-static">
        <h2 className="card-title-lg">Festgehalten</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Das Gespräch ist abgeschlossen und bleibt gespeichert – du findest es oben unter
          „Frühere Gespräche" wieder. Die Zusammenfassung steht auch auf eurer Übersicht.
        </p>
        <div className="mt-4 rounded-brand bg-brand-bg px-4 py-3.5">
          <MarkdownMessage content={festgehalten} />
        </div>
        <button
          onClick={() => setFestgehalten(null)}
          className="btn-quiet mt-4 !py-2 !px-5 !text-sm"
        >
          Neues Gespräch beginnen
        </button>

        {/* Der wichtigste Schritt steht hier, nicht auf der naechsten Seite: Was du gerade
            sortiert hast, kann jetzt ein Gegenstand werden statt nur ein guter Vorsatz. */}
        {abschlussZuege && abschlussZuege.length > 0 && (
          <div className="mt-5">
            <Weiterfuehren
              coupleId={coupleId}
              vorschlaege={abmachungsvorschlaege(festgehalten)}
              saat={festgehalten}
              zuege={abschlussZuege}
              titel="Und daraus?"
              hinweis="Nichts davon muss sein – aber jetzt ist der Moment, in dem es leichtfällt."
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* ── Kopfzeile: Titel, Verlauf, Abschließen ─────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
        <div className="min-w-0">
          <p className="card-title">
            {gespraech?.thread.title || (liest ? 'Früheres Gespräch' : 'Neues Gespräch')}
          </p>
          <p className="mt-0.5 text-[0.7rem] text-brand-muted">
            {liest ? 'Abgeschlossen – zum Nachlesen.' : 'Vertraulich. Nur du liest das hier.'}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {vergangene.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setAuswahlOffen(o => !o)}
                className="btn-quiet !py-1.5 !px-3.5 !text-xs"
                aria-expanded={auswahlOffen}
              >
                Frühere Gespräche ({vergangene.length})
              </button>
              {auswahlOffen && (
                <div className="absolute right-0 top-9 z-30 w-[min(20rem,calc(100vw-2.5rem))] rounded-brand border border-brand-border bg-white p-2 shadow-brand-lg">
                  <button
                    onClick={() => { setAnsicht('aktuell'); setAuswahlOffen(false) }}
                    className={`block w-full rounded-brand px-3 py-2 text-left text-xs transition ${
                      ansicht === 'aktuell'
                        ? 'bg-accent/[0.08] font-medium text-accent'
                        : 'text-brand-text hover:bg-brand-bg'
                    }`}
                  >
                    Laufendes Gespräch
                  </button>
                  {vergangene.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setAnsicht(t.id); setAuswahlOffen(false) }}
                      className={`block w-full rounded-brand px-3 py-2 text-left text-xs transition ${
                        ansicht === t.id
                          ? 'bg-accent/[0.08] font-medium text-accent'
                          : 'text-brand-muted hover:bg-brand-bg'
                      }`}
                    >
                      <span className="block truncate text-brand-text">
                        {t.title || 'Ohne Titel'}
                      </span>
                      <span className="mt-0.5 block text-[0.65rem] text-brand-muted/70">
                        {new Date(t.closed_at!).toLocaleDateString('de-DE')} · {t.message_count} Beiträge
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!liest && messages.length > 1 && (
            <button
              onClick={() => abschliessen.mutate()}
              disabled={busy}
              className="btn-quiet !py-1.5 !px-3.5 !text-xs disabled:opacity-50"
              title="Echo fasst zusammen, schließt ab und legt die Zusammenfassung auf die Übersicht."
            >
              {abschliessen.isPending
                ? <EchoThinking text="Fasse zusammen …" size={30} />
                : 'Zusammenfassen & abschließen'}
            </button>
          )}
        </div>
      </div>

      {/* ── Der Dialog ─────────────────────────────────────────── */}
      <div className="card card-static flex flex-col">
        <div className="space-y-4 overflow-y-auto pr-1"
          style={{ maxHeight: messages.length === 0 ? undefined : '58vh' }}>
          {(aktuell.isLoading || altes.isLoading) && (
            <div className="animate-pulse space-y-3" aria-hidden>
              <div className="h-4 w-2/3 rounded bg-brand-border/60" />
              <div className="h-4 w-1/2 rounded bg-brand-border/60" />
            </div>
          )}

          {!aktuell.isLoading && messages.length === 0 && !liest && (
            <Leerzustand
              titel={leerTitel} text={leerText}
              impulse={impulse} themen={themen}
              onStart={starten} busy={busy}
            />
          )}

          {messages.map(m => <Blase key={m.id} role={m.role} content={m.content} safety={m.safety} />)}
          <div ref={endRef} />
        </div>

        {liest ? (
          <div className="mt-4 border-t border-brand-border pt-4">
            <button
              onClick={() => setAnsicht('aktuell')}
              className="btn-quiet !py-2 !px-4 !text-sm"
            >
              Zurück zum laufenden Gespräch
            </button>
          </div>
        ) : (
          <form
            onSubmit={e => { e.preventDefault(); if (text.trim()) send.mutate(text.trim()) }}
            className={messages.length > 0 ? 'mt-4 border-t border-brand-border pt-4' : 'mt-5'}
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
              placeholder={platzhalter}
              className="input w-full resize-y"
            />
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button type="submit" disabled={!text.trim() || busy}
                className="btn-primary !py-2 !px-5 !text-sm disabled:opacity-50">
                {send.isPending ? <EchoThinking text="Echo liest …" size={32} /> : 'Senden'}
              </button>
              <span className="text-xs text-brand-muted">
                Vertraulich – nur du liest das hier.
                <span className="ml-1 hidden sm:inline text-brand-muted/70">
                  Strg + Enter sendet.
                </span>
              </span>
            </div>
            <Fehlermeldung error={send.error ?? abschliessen.error} />
          </form>
        )}
      </div>
    </div>
  )
}

/** Echo bekommt ein Gesicht: Wellenmarke und eigene Kante. Du sprichst rechts. */
function Blase({ role, content, safety }: {
  role: string
  content: string
  /** Gesetzt, wenn die Sicherheits-Triage eingegriffen hat. */
  safety?: 'acute' | 'elevated' | null
}) {
  if (role === 'echo') {
    /**
     * Eine Krisenmeldung sieht anders aus als eine Deutung.
     *
     * Bei akuter Gefahr antwortet nicht Echo, sondern eine feste Hilfemeldung mit
     * Notrufnummern. Ungerahmt stünde sie da wie ein weiterer reflektierender Absatz —
     * und bei genau dieser Nachricht ist die Aufmachung Teil der Wirkung. Dieselbe
     * Rahmung wie im Fall-Echo, damit sie überall gleich erkannt wird.
     */
    if (safety === 'acute' || safety === 'elevated') {
      return (
        <div className={`beitrag-neu rounded-2xl border px-4 py-3.5 ${
          safety === 'acute' ? 'border-red-300 bg-red-50/70' : 'border-amber-300 bg-amber-50/60'
        }`}>
          <p className={`mb-2 flex items-center gap-2 text-[0.8rem] font-bold ${
            safety === 'acute' ? 'text-red-700' : 'text-amber-700'
          }`}>
            <span aria-hidden="true">{safety === 'acute' ? '🆘' : '⚠'}</span>
            {safety === 'acute'
              ? 'Sicherheit zuerst – Hilfe ist erreichbar'
              : 'Sicherheitshinweis'}
          </p>
          <div className="text-sm text-brand-text"><MarkdownMessage content={content} /></div>
        </div>
      )
    }
    return (
      <div className="beitrag-neu flex gap-3">
        <span className="mt-0.5 shrink-0 text-accent" aria-hidden>
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
            <circle cx="5" cy="10" r="2.2" fill="currentColor" />
            <path d="M9 6.4 A 5 5 0 0 1 9 13.6" stroke="currentColor" strokeWidth="1.7"
              strokeLinecap="round" />
            <path d="M12.4 4 A 8.4 8.4 0 0 1 12.4 16" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" opacity=".45" />
          </svg>
        </span>
        <div className="min-w-0 flex-1 text-sm text-brand-text lg:max-w-[74ch]">
          <MarkdownMessage content={content} />
        </div>
      </div>
    )
  }
  return (
    <div className="beitrag-neu flex justify-end">
      <p className="max-w-[85%] whitespace-pre-wrap rounded-brand bg-brand-bg px-4 py-2.5 text-sm text-brand-text lg:max-w-[52ch]">
        {content}
      </p>
    </div>
  )
}

/** Vor einem leeren Feld weiß man selten, was man fragen soll – vor einem Vorschlag schon. */
function Leerzustand({
  titel, text, impulse, themen, onStart, busy,
}: {
  titel: string
  text: string
  impulse: Impulsgruppe[]
  themen?: string[]
  onStart: (t: string) => void
  busy: boolean
}) {
  const [gruppe, setGruppe] = useState(0)
  const aktiv = impulse[gruppe]

  return (
    <div>
      <div className="text-center">
        <svg viewBox="0 0 96 64" className="mx-auto h-14 text-accent" fill="none" aria-hidden>
          <circle cx="18" cy="32" r="5" fill="currentColor" />
          <g stroke="currentColor" strokeLinecap="round">
            <path d="M28.6 21.4 A 16 16 0 0 1 28.6 42.6" strokeWidth="3" />
            <path d="M37.2 12.9 A 28 28 0 0 1 37.2 51.1" strokeWidth="2.5" opacity=".5" />
            <path d="M45.8 4.4 A 40 40 0 0 1 45.8 59.6" strokeWidth="2" opacity=".25" />
          </g>
        </svg>
        <h2 className="card-title-lg mt-4">{titel}</h2>
        <p className="mx-auto mt-2 max-w-[52ch] text-sm leading-relaxed text-brand-muted">
          {text}
        </p>
      </div>

      {/* ── Startpunkte ───────────────────────────────────────── */}
      <div className="mt-6">
        <div className="flex flex-wrap gap-1.5">
          {impulse.map((g, i) => (
            <button
              key={g.gruppe}
              onClick={() => setGruppe(i)}
              className={`rounded-full px-3 py-1.5 text-xs transition ${
                i === gruppe
                  ? 'bg-accent/10 font-semibold text-accent'
                  : 'text-brand-muted hover:bg-brand-bg hover:text-navy'
              }`}
            >
              {g.gruppe}
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {aktiv.eintraege.map(e => (
            <button
              key={e.label}
              onClick={() => onStart(e.text)}
              disabled={busy}
              className="rounded-brand border border-brand-border px-4 py-3 text-left text-sm text-brand-text transition hover:border-accent/50 hover:bg-accent/[0.04] disabled:opacity-50"
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {themen && themen.length > 0 && (
        <div className="mt-5 border-t border-brand-border pt-4">
          <p className="section-label">Oder ein Themenfeld</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {themen.map(t => (
              <button
                key={t}
                onClick={() => onStart(
                  `Ich möchte über das Thema „${t}" sprechen. Stell mir dazu erst ein paar `
                  + 'Fragen, damit klar wird, worum es bei uns konkret geht.',
                )}
                disabled={busy}
                className="rounded-full border border-brand-border px-3 py-1 text-xs text-brand-muted transition hover:border-accent hover:text-accent disabled:opacity-50"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
