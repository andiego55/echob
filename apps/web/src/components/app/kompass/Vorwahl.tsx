/**
 * „Was fehlt dir mehr?" — der Einstieg für alle, die nicht wissen, wo sie anfangen sollen.
 *
 * **Warum es diesen Weg gibt.** Wer belastet ist, kann meistens sofort sagen, was ihm fehlt,
 * und braucht für das, was er *will*, sehr viel länger. Genau die standen bisher vor
 * fünfundzwanzig Aspekten in sieben Familien. Diese Frage kann fast jeder beantworten, auch
 * an einem schlechten Tag — und nach sechs davon steht eine Skizze da.
 *
 * **Der Regent bleibt oben liegen, der Herausforderer wechselt.** Das ist nicht Dekoration,
 * sondern die Anzeige selbst: Man sieht seinem eigenen Wunsch dabei zu, wie er sich
 * verteidigt oder abgelöst wird. Ein Raster aus Paarungen trüge dieselbe Information und
 * nichts davon. Die Karte, die verliert, geht; die, die bleibt, bleibt auch am Platz.
 *
 * **„Beide gleich" steht daneben, klein.** Dieselbe Entscheidung wie bei der Waage: Wer
 * wirklich nicht wählen kann, muss das sagen dürfen, sonst rät er — und ein geratener Wunsch
 * ist schlimmer als keiner. Klein, weil die Frage in den allermeisten Fällen beantwortbar
 * ist und ein gleich großer dritter Knopf zum Ausweichen einlädt.
 *
 * **Am Ende steht ein Vorschlag, kein Ergebnis.** „So hätte ich dich verstanden." Man kann
 * ihn übernehmen oder von vorn anfangen, und danach ist alles wie immer änderbar.
 */
import { useState } from 'react'
import {
  ergebnis, fertig, fortschritt, herausforderer, starten, zug,
  type Stand, type Vorbelegung, type Wahl,
} from '@/lib/vorwahl'
import type { IdealAspekt, IdealAspektFamilie } from '@/api/kompassIdeal'

export default function Vorwahl({ familien, onFertig, onAbbruch }: {
  familien: IdealAspektFamilie[]
  onFertig: (v: Vorbelegung) => void
  onAbbruch: () => void
}) {
  // Ein Kandidat je Familie. Zwei aus derselben Familie gegeneinander wären eine Feinheit,
  // und Feinheiten sind das, was jemand nicht beantworten kann, der noch nicht weiß, was er
  // will. Die Vorwahl sucht die Richtung; die Feinheiten kommen danach in Schritt 1.
  const [kandidaten] = useState<IdealAspekt[]>(
    () => familien.map(f => f.aspekte[0]).filter(Boolean),
  )
  const [stand, setStand] = useState<Stand>(() => starten(kandidaten.map(a => a.key)))
  // Woran die Animation hängt: Ein Schlüssel, der sich bei jeder Frage ändert, lässt React
  // die Karte neu bauen — sonst liefe auf demselben Element nie eine Animation.
  const [runde, setRunde] = useState(0)

  const aspekt = (key: string) => kandidaten.find(a => a.key === key)
  const gegner = herausforderer(stand)
  const schritt = fortschritt(stand)

  const antworten = (wahl: Wahl) => {
    setStand(s => zug(s, wahl))
    setRunde(r => r + 1)
  }

  if (kandidaten.length < 2) return null

  // ── Das Ergebnis ───────────────────────────────────────────────────────────
  if (fertig(stand)) {
    const vorschlag = ergebnis(stand)
    return (
      <section className="rounded-brand-lg border border-accent/40 bg-accent/[0.04] p-6">
        <span className="label">Fertig</span>
        <h2 className="mt-1 text-[1.2rem] font-bold leading-snug text-navy">
          So hätte ich dich verstanden
        </h2>
        <p className="mt-2 max-w-[60ch] text-[0.88rem] leading-relaxed text-brand-muted">
          Ein Anfang, kein Ergebnis. Du kannst danach alles ändern, etwas wegnehmen und
          vor allem noch viel mehr dazunehmen — hier standen nur sieben von fünfundzwanzig
          zur Wahl.
        </p>

        <ol className="mt-5 space-y-2">
          {vorschlag.aspekte.map((a, i) => (
            <li
              key={a.key}
              className="vorwahl-herein flex items-center gap-3 rounded-brand border border-brand-border bg-white px-4 py-3"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent/10 text-[0.8rem] font-bold tabular-nums text-accent">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-navy">
                {aspekt(a.key)?.label ?? a.key}
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onFertig(vorschlag)}
            className="btn-primary !py-2.5 !px-5 !text-sm"
          >
            Übernehmen und weiterarbeiten
          </button>
          <button
            type="button"
            onClick={() => { setStand(starten(kandidaten.map(a => a.key))); setRunde(r => r + 1) }}
            className="text-xs text-brand-muted hover:text-navy"
          >
            Noch einmal
          </button>
        </div>
      </section>
    )
  }

  // ── Die Frage ──────────────────────────────────────────────────────────────
  const oben = aspekt(stand.regent)
  const unten = gegner ? aspekt(gegner) : null
  if (!oben || !unten) return null

  return (
    <section className="rounded-brand-lg border border-brand-border bg-white p-6">
      <div className="flex items-baseline justify-between gap-3">
        <span className="label">Frage {schritt.frage} von {schritt.von}</span>
        <button type="button" onClick={onAbbruch}
          className="text-xs text-brand-muted hover:text-navy">
          Lieber selbst auswählen
        </button>
      </div>

      <h2 className="mt-1 text-[1.2rem] font-bold leading-snug text-navy">
        Was fehlt dir mehr?
      </h2>
      <p className="mt-1.5 max-w-[60ch] text-[0.86rem] leading-relaxed text-brand-muted">
        Nicht lange überlegen. Der erste Gedanke ist hier der ehrlichste, und du kannst
        danach alles ändern.
      </p>

      {/* Die Fortschrittslinie. Eine Zahl beruhigt, eine Linie beruhigt mehr. */}
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-brand-border">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
          style={{ width: `${Math.round((schritt.frage - 1) / schritt.von * 100)}%` }}
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {/* Der Regent steht links und bewegt sich nicht — er ist das, was gerade gilt. */}
        <Karte aspekt={oben} onKlick={() => antworten('regent')} bleibt />
        {/* Der Herausforderer bekommt bei jeder Runde einen neuen Schlüssel und kommt
            dadurch sichtbar herein. */}
        <Karte key={`h-${runde}`} aspekt={unten} onKlick={() => antworten('herausforderer')} />
      </div>

      <button
        type="button"
        onClick={() => antworten('gleich')}
        className="mt-3 w-full rounded-brand py-2 text-[0.8rem] text-brand-muted transition-colors hover:bg-brand-bg hover:text-navy"
      >
        Beide gleich
      </button>
    </section>
  )
}

/**
 * Eine der beiden Karten.
 *
 * Gleich groß, gleich hell, kein Unterschied in der Gestaltung: Sieht eine Seite wie die
 * bessere aus, ist die Frage eine Prüfungsfrage — und wer eine Prüfungsfrage erkennt,
 * antwortet nicht mehr ehrlich. Dasselbe Prinzip wie bei der Waage.
 */
function Karte({ aspekt, onKlick, bleibt = false }: {
  aspekt: IdealAspekt
  onKlick: () => void
  bleibt?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onKlick}
      className={`${bleibt ? '' : 'vorwahl-herein '}group rounded-brand border border-brand-border bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-brand motion-reduce:hover:translate-y-0`}
    >
      <span className="block text-[0.98rem] font-semibold leading-snug text-navy transition-colors group-hover:text-accent">
        {aspekt.label}
      </span>
      <span className="mt-1.5 block text-[0.8rem] leading-snug text-brand-muted">
        {aspekt.hinweis}
      </span>
    </button>
  )
}
