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
 */
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

export default function Waage({ paare, werte, onAendern }: {
  paare: IdealAbwaegung[]
  /** Schlüssel des Paares → 0–100. Fehlt der Schlüssel, ist die Frage offen. */
  werte: Record<string, number>
  onAendern: (werte: Record<string, number>) => void
}) {
  const setzen = (key: string, wert: number) => {
    const aktuell = werte[key]
    // Nochmal auf dieselbe Stufe tippen nimmt die Antwort zurück. Eine Frage, die man
    // beantwortet hat und nicht mehr offenlassen kann, ist eine Falle.
    const neu = { ...werte }
    if (aktuell === wert) delete neu[key]
    else neu[key] = wert
    onAendern(neu)
  }

  return (
    <ul className="space-y-3">
      {paare.map(p => {
        const gewaehlt = stufe(werte[p.key])
        // -1 links, 0 mitte, +1 rechts — daraus wird der Neigungswinkel des Balkens.
        const neigung = gewaehlt === 'links' ? -1 : gewaehlt === 'rechts' ? 1 : 0
        return (
          <li
            key={p.key}
            className={`rounded-brand border p-3 transition-colors ${
              gewaehlt ? 'border-accent/40 bg-accent/[0.04]' : 'border-brand-border bg-white'
            }`}
          >
            {/* Der Balken. Er ist die ganze Animation: Man sieht die Entscheidung kippen,
                bevor man sie liest. */}
            <div className="mb-2.5 flex h-6 items-center justify-center" aria-hidden="true">
              <span
                className="block h-[3px] w-24 rounded-full bg-accent/50 transition-transform duration-500 ease-out"
                style={{ transform: `rotate(${neigung * 7}deg)` }}
              />
              <span className="absolute h-2 w-2 translate-y-[9px] rounded-full bg-accent/30" />
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
              <Seite label={p.links} an={gewaehlt === 'links'} blass={gewaehlt === 'rechts'}
                onKlick={() => setzen(p.key, LINKS)} />
              <button
                type="button"
                onClick={() => setzen(p.key, MITTE)}
                aria-pressed={gewaehlt === 'mitte'}
                className={`grid place-items-center rounded-brand-sm px-2 text-[0.68rem] font-medium uppercase tracking-wider transition-colors ${
                  gewaehlt === 'mitte'
                    ? 'bg-accent text-white'
                    : 'text-brand-muted hover:bg-brand-bg hover:text-navy'
                }`}
              >
                beides
              </button>
              <Seite label={p.rechts} an={gewaehlt === 'rechts'} blass={gewaehlt === 'links'}
                onKlick={() => setzen(p.key, RECHTS)} />
            </div>

            <p className="mt-2 text-[0.7rem] leading-snug text-brand-muted">{p.hinweis}</p>
          </li>
        )
      })}
    </ul>
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
      className={`rounded-brand border px-3 py-2.5 text-left text-sm leading-snug transition-all ${
        an
          ? 'border-accent bg-accent text-white shadow-sm'
          : blass
            ? 'border-brand-border bg-white text-brand-muted/60'
            : 'border-brand-border bg-white text-brand-text hover:border-accent/50'
      }`}
    >
      {label}
    </button>
  )
}
