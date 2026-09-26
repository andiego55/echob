/**
 * Die Eingabeform „Waage" — zwei gute Seiten, und eine wiegt schwerer.
 *
 * **Die Schwester von `EntwederOder`, und der Unterschied ist Absicht.** Dort ist die
 * Antwort ein angetippter Pol; wer nichts antippt, hat nicht geantwortet. Hier muss
 * **„beides gleich" eine ausgesprochene Antwort sein** und nicht das Ausbleiben einer.
 *
 * Das ist keine Feinheit. In einer Traumbeziehung ist „Nähe und eigener Raum sind mir
 * gleich wichtig" eine echte, häufige und oft mühsam errungene Auskunft. Wäre sie
 * ununterscheidbar von „darüber habe ich nicht nachgedacht", ginge genau das verloren, was
 * jemand über sich herausgefunden hat.
 *
 * **Drei Stufen und kein stufenloser Regler.** Ein freier Regler lädt dazu ein, bei 50
 * stehen zu bleiben und sich nicht zu entscheiden — und ein Ideal ohne Entscheidungen ist
 * eine Wunschliste. Drei Stufen zwingen zu einer Aussage und lassen die mittlere zu. (Der
 * Server nimmt 0–100 entgegen; die Abstufung ist eine Entscheidung der Oberfläche, keine
 * des Datenmodells.)
 *
 * **Beide Seiten sind gut.** Das steht hier nicht als Beschwichtigung, sondern als
 * Bedingung: Ein Gegensatzpaar, bei dem eine Seite offensichtlich die richtige ist, ist
 * eine Prüfungsfrage — und wer eine Prüfungsfrage erkennt, antwortet nicht mehr ehrlich.
 * Deshalb sieht keine Seite wie die bessere aus, und die Waage neigt sich sichtbar dorthin,
 * wo das Gewicht liegt.
 *
 * **Eine Frage nach der anderen, nicht zwanzig auf einmal** (26.09.2026). Vorher standen
 * sechs Balken untereinander auf einer Seite; das war eine Liste, und eine Liste arbeitet
 * man ab. Seit der Katalog zwanzig Paare hat, ginge das ohnehin nicht mehr. Eine Frage,
 * groß, mit einer Fortschrittslinie, ist dagegen schnell — es sind nur Klicks — und man
 * kann jede einzeln wirken lassen. Dieselbe Bauart wie die Vorwahl, aus demselben Grund.
 *
 * **Und die Reihenfolge richtet sich danach, was jemand gewählt hat.** Wer aus der Familie
 * „Nähe und Abstand" nichts angetippt hat, bekommt die Frage nach gemeinsamer Zeit nicht als
 * erste. Weggelassen wird trotzdem nichts: Manchmal merkt man erst an der Frage, dass einem
 * etwas fehlt, das man vorher nicht benennen konnte.
 */
import { useMemo, useState } from 'react'
import type { IdealAbwaegung } from '@/api/kompassIdeal'

/** Die drei Stufen. Der Server speichert 0–100; hier sind es diese drei Werte. */
export const LINKS = 15
export const MITTE = 50
export const RECHTS = 85

/** Zu welcher Stufe ein gespeicherter Wert gehört. */
export function stufe(wert: number | undefined): 'links' | 'mitte' | 'rechts' | null {
  if (wert === undefined) return null
  if (wert <= 35) return 'links'
  if (wert >= 65) return 'rechts'
  return 'mitte'
}

/**
 * Die Paare in der Reihenfolge, in der gefragt wird.
 *
 * Erst was etwas Gewähltes berührt, dann die Spannungen ohne Bezug (die in jeder Beziehung
 * liegen), dann der Rest. Innerhalb der Gruppen bleibt die Ordnung des Katalogs — eine
 * Reihenfolge, die bei jedem Aufruf anders ist, macht aus einer Frage ein Glücksspiel.
 */
export function ordnen(paare: IdealAbwaegung[], bezug: string[]): IdealAbwaegung[] {
  const gewaehlt = new Set(bezug)
  const rang = (p: IdealAbwaegung) => {
    const f = p.familien ?? []
    if (f.some(x => gewaehlt.has(x))) return 0
    return f.length === 0 ? 1 : 2
  }
  return paare.map((p, i) => ({ p, i })).sort((a, b) => rang(a.p) - rang(b.p) || a.i - b.i)
    .map(x => x.p)
}

/** Bei welcher Frage es weitergeht — der ersten unbeantworteten, sonst am Ende. */
export function erstesOffene(paare: IdealAbwaegung[], werte: Record<string, number>): number {
  const i = paare.findIndex(p => werte[p.key] === undefined)
  return i === -1 ? paare.length : i
}

export default function Waage({ paare, werte, onAendern, bezug = [] }: {
  paare: IdealAbwaegung[]
  /** Schlüssel des Paares → 0–100. Fehlt der Schlüssel, ist die Frage offen. */
  werte: Record<string, number>
  onAendern: (werte: Record<string, number>) => void
  /** Familienschlüssel der gewählten Aspekte — sie bestimmen die Reihenfolge. */
  bezug?: string[]
}) {
  const sortiert = useMemo(() => ordnen(paare, bezug), [paare, bezug])
  const [index, setIndex] = useState(() => erstesOffene(sortiert, werte))
  // Wechselt bei jeder Antwort und laesst React die Karte neu bauen — ohne das liefe auf
  // demselben Element nie eine Animation, und ein Tipp saehe aus wie nichts.
  const [runde, setRunde] = useState(0)

  const beantwortet = sortiert.filter(p => werte[p.key] !== undefined).length

  const setzen = (key: string, wert: number) => {
    const neu = { ...werte }
    // Nochmal auf dieselbe Stufe tippen nimmt die Antwort zurück. Eine Frage, die man
    // beantwortet hat und nicht mehr offenlassen kann, ist eine Falle.
    if (neu[key] === wert) delete neu[key]
    else neu[key] = wert
    onAendern(neu)
    if (neu[key] !== undefined) weiter()
  }

  const weiter = () => { setIndex(i => i + 1); setRunde(r => r + 1) }
  const zurueck = () => { setIndex(i => Math.max(0, i - 1)); setRunde(r => r + 1) }

  if (sortiert.length === 0) {
    return <p className="text-sm text-brand-muted">Zu dieser Beziehungsart gibt es keine Abwägungen.</p>
  }

  // ── Alles durch: die Übersicht ─────────────────────────────────────────────
  if (index >= sortiert.length) {
    return (
      <div>
        <p className="max-w-[60ch] text-[0.92rem] leading-relaxed text-brand-muted">
          {beantwortet === sortiert.length
            ? 'Alle durch. Tipp eine Zeile an, wenn du es dir anders überlegt hast.'
            : `${beantwortet} von ${sortiert.length} beantwortet. Der Rest bleibt offen — das ist in Ordnung.`}
        </p>

        <ul className="mt-4 space-y-1.5">
          {sortiert.map((p, i) => {
            const s = stufe(werte[p.key])
            return (
              <li key={p.key}>
                <button
                  type="button"
                  onClick={() => { setIndex(i); setRunde(r => r + 1) }}
                  className={`flex w-full items-center gap-3 rounded-brand border px-3.5 py-2.5 text-left transition-colors ${
                    s ? 'border-accent/30 bg-accent/[0.04]' : 'border-brand-border bg-white'
                  } hover:border-accent/60`}
                >
                  <span className="min-w-0 flex-1 text-[0.84rem] leading-snug text-navy">
                    {s === 'links' ? p.links : s === 'rechts' ? p.rechts
                      : s === 'mitte' ? `${p.links} und ${p.rechts} gleich`
                      : <span className="text-brand-muted">{p.links} oder {p.rechts}?</span>}
                  </span>
                  <span className="shrink-0 text-[0.7rem] text-brand-muted">
                    {s ? 'ändern' : 'offen'}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        {beantwortet < sortiert.length && (
          <button
            type="button"
            onClick={() => { setIndex(erstesOffene(sortiert, werte)); setRunde(r => r + 1) }}
            className="btn-quiet !py-2 !px-4 !text-sm mt-4"
          >
            Offene Fragen weitermachen
          </button>
        )}
      </div>
    )
  }

  // ── Eine Frage ─────────────────────────────────────────────────────────────
  const paar = sortiert[index]
  const gewaehlt = stufe(werte[paar.key])
  const neigung = gewaehlt === 'links' ? -1 : gewaehlt === 'rechts' ? 1 : 0

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="label">Frage {index + 1} von {sortiert.length}</span>
        <button
          type="button"
          onClick={() => setIndex(sortiert.length)}
          className="text-xs text-brand-muted hover:text-navy"
        >
          Übersicht
        </button>
      </div>

      <div className="mt-2 h-1 overflow-hidden rounded-full bg-brand-border">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
          style={{ width: `${Math.round(index / sortiert.length * 100)}%` }}
        />
      </div>

      <div key={runde} className="vorwahl-herein mt-5">
        {/* Der Balken. Er ist die ganze Animation: Man sieht die Entscheidung kippen,
            bevor man sie liest. */}
        <div className="relative mb-4 flex h-8 items-center justify-center" aria-hidden="true">
          <span
            className="block h-[3px] w-32 rounded-full bg-accent/50 transition-transform duration-500 ease-out"
            style={{ transform: `rotate(${neigung * 7}deg)` }}
          />
          <span className="absolute h-2.5 w-2.5 translate-y-[11px] rounded-full bg-accent/30" />
        </div>

        {/* Am Telefon untereinander, ab `sm` nebeneinander.
            Gemessen: Bei drei Spalten auf 375px bleiben je 112px, und „Erst sacken lassen,
            dann reden" steht darin vierzeilig in einer Säule. Mit sechs kurzen Paaren ging
            das; seit es zwanzig sind und manche einen halben Satz lang, nicht mehr. Die
            Waage oben zeigt die Neigung weiterhin — das Bild bleibt, die Säulen gehen. */}
        <div className="grid grid-cols-1 items-stretch gap-2 sm:grid-cols-[1fr_auto_1fr] sm:gap-3">
          <Seite label={paar.links} an={gewaehlt === 'links'} blass={gewaehlt === 'rechts'}
            onKlick={() => setzen(paar.key, LINKS)} />
          <button
            type="button"
            onClick={() => setzen(paar.key, MITTE)}
            aria-pressed={gewaehlt === 'mitte'}
            className={`grid place-items-center rounded-brand-sm px-2 py-2 text-[0.68rem] font-medium uppercase tracking-wider transition-colors sm:py-0 ${
              gewaehlt === 'mitte'
                ? 'bg-accent text-white'
                : 'text-brand-muted hover:bg-brand-bg hover:text-navy'
            }`}
          >
            beides gleich
          </button>
          <Seite label={paar.rechts} an={gewaehlt === 'rechts'} blass={gewaehlt === 'links'}
            onKlick={() => setzen(paar.key, RECHTS)} />
        </div>

        <p className="mt-3 text-center text-[0.76rem] leading-snug text-brand-muted">
          {paar.hinweis}
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-brand-border pt-3">
        <button
          type="button"
          onClick={zurueck}
          disabled={index === 0}
          className="text-xs text-brand-muted hover:text-navy disabled:opacity-40"
        >
          ← Zurück
        </button>
        <button
          type="button"
          onClick={weiter}
          className="text-xs text-brand-muted hover:text-navy"
        >
          Überspringen →
        </button>
      </div>
    </div>
  )
}

function Seite({ label, an, blass, onKlick }: {
  label: string
  an: boolean
  /** Die andere Seite wurde gewählt — diese tritt zurück, verschwindet aber nicht. */
  blass: boolean
  onKlick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onKlick}
      aria-pressed={an}
      className={`rounded-brand border px-3 py-4 text-left text-[0.92rem] leading-snug transition-all ${
        an
          ? 'border-accent bg-accent text-white shadow-sm'
          : blass
            ? 'border-brand-border bg-white text-brand-muted/60'
            : 'border-brand-border bg-white text-brand-text hover:-translate-y-0.5 hover:border-accent hover:shadow-brand-sm motion-reduce:hover:translate-y-0'
      }`}
    >
      {label}
    </button>
  )
}
