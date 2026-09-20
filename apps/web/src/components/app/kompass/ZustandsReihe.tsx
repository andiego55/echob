/**
 * Die fünf Zustände als Reihe — der eine Griff, auf den es ankommt.
 *
 * **Warum Worte und keine Gesichter.** Eine Reihe 😣😟😐🙂😊 wäre schneller gebaut und
 * spräche eine andere Sprache als der Rest von EchoB. Ein Wort trifft außerdem genauer:
 * „unruhig" und „belastet" sind zwei verschiedene Auskünfte, die beide als besorgtes
 * Gesicht durchgingen.
 *
 * **Warum eine Linie hinter den Punkten liegt.** Ohne sie sind das fünf Knöpfe, aus denen
 * man einen wählt. Mit ihr ist es eine Skala, auf der man einen Ort findet — und der
 * Unterschied entscheidet, ob jemand beim zweiten Mal „unruhig" statt „belastet" antippt,
 * weil er merkt, dass das ein Stück weiter rechts liegt.
 *
 * **Bedienbar ohne Maus.** Eine Auswahlgruppe im Sinn der Barrierefreiheit: Mit Tab kommt
 * man hinein, mit den Pfeiltasten durch. Ein Werkzeug für Menschen, denen es schlecht
 * geht, darf nicht daran scheitern, dass gerade kein Zeigegerät da ist.
 */
import type { KompassZustand } from '@/api/kompass'
import { ton } from '@/lib/kompass'

export default function ZustandsReihe({
  zustaende, gewaehlt, onWahl,
}: {
  zustaende: KompassZustand[]
  gewaehlt: number | null
  onWahl: (wert: number) => void
}) {
  /** Der erste Punkt ist mit Tab erreichbar, solange nichts gewählt ist — so will es die
   *  Auswahlgruppe: EIN Halt im Tabulatorlauf, nicht fünf. */
  const tabZiel = gewaehlt ?? zustaende[0]?.wert

  function taste(e: React.KeyboardEvent) {
    const schritt = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key]
    if (!schritt) return
    e.preventDefault()
    const jetzt = zustaende.findIndex(z => z.wert === gewaehlt)
    // Ohne Wahl beginnt der erste Pfeiltastendruck in der Mitte und nicht am Rand: Wer
    // sich noch nicht entschieden hat, soll nicht bei „belastet" starten.
    const naechster = jetzt === -1
      ? Math.floor(zustaende.length / 2)
      : Math.min(zustaende.length - 1, Math.max(0, jetzt + schritt))
    onWahl(zustaende[naechster].wert)
  }

  const gewaehlterZustand = zustaende.find(z => z.wert === gewaehlt)

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Wie geht es dir gerade?"
        onKeyDown={taste}
        className="relative"
      >
        {/* Die Linie liegt auf Höhe der Punktmitten und endet innerhalb der äußeren
            Zellen — sonst sähe sie aus wie ein Rahmen statt wie eine Achse. */}
        <div
          className="pointer-events-none absolute inset-x-[10%] top-[26px] h-px bg-brand-border"
          aria-hidden="true"
        />

        <div className="relative flex">
          {zustaende.map(z => {
            const an = gewaehlt === z.wert
            const farbe = ton(z.wert).hex
            return (
              <button
                key={z.wert}
                type="button"
                role="radio"
                aria-checked={an}
                tabIndex={z.wert === tabZiel ? 0 : -1}
                onClick={() => onWahl(z.wert)}
                className="group flex flex-1 flex-col items-center gap-1.5 rounded-brand-sm py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span className="grid place-items-center h-[52px] w-[52px]">
                  <span
                    className={[
                      'rounded-full transition-all duration-300 ease-out motion-reduce:transition-none',
                      'h-5 w-5',
                      an
                        ? 'scale-[1.9]'
                        : 'scale-100 opacity-45 group-hover:scale-125 group-hover:opacity-80',
                    ].join(' ')}
                    style={{
                      backgroundColor: farbe,
                      // Der Hof statt eines Rahmens: Er wächst mit und drückt den
                      // gewählten Punkt nach vorn, ohne die Reihe zu verschieben.
                      boxShadow: an ? `0 0 0 6px ${farbe}22, 0 4px 14px ${farbe}55` : undefined,
                    }}
                  />
                </span>
                <span
                  className={[
                    'leading-none transition-colors',
                    'text-[0.72rem] sm:text-[0.78rem]',
                    an ? 'font-bold' : 'font-medium text-brand-muted group-hover:text-navy',
                  ].join(' ')}
                  style={an ? { color: ton(z.wert).schrift } : undefined}
                >
                  {z.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Der Beisatz bestätigt die Wahl mit anderen Worten („schwer, es drückt"). Die
          Höhe steht fest, damit die Knöpfe darunter nicht springen, sobald er erscheint. */}
      <p
        className="mt-1 min-h-[1.25rem] text-center text-[0.82rem] italic text-brand-muted transition-opacity duration-300 motion-reduce:transition-none"
        aria-live="polite"
      >
        {gewaehlterZustand?.hinweis ?? ''}
      </p>
    </div>
  )
}
