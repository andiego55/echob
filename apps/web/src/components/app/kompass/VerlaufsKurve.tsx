/**
 * Der Verlauf als Kurve.
 *
 * **Warum die Linie ihre Farbe wechselt.** Der Farbverlauf steht nicht an der Linie,
 * sondern an der SKALA: oben warm, unten kühl, fest im Koordinatenraum. Dadurch ist die
 * Linie dort warm, wo die Tage leicht waren, und kühl, wo sie schwer waren — man sieht
 * den Verlauf, bevor man ihn liest. Hinge der Verlauf am Umriss der Kurve (die
 * Voreinstellung von SVG), sähe eine flache Linie auf jeder Höhe gleich aus.
 *
 * **Warum keine Diagrammbibliothek.** Was hier gebraucht wird, sind zwei Pfade, ein paar
 * Kreise und ein Verlauf. Eine Bibliothek dafür brächte dreißig Kilobyte, ein eigenes
 * Farbsystem und eine Achsenbeschriftung, die nach Tabelle aussieht. Die Geometrie
 * kommt aus `lib/kompass`, ist dort geprüft, und diese Datei zeichnet nur noch.
 *
 * **Was sie NICHT tut.** Sie hält keine Auswahl und lädt nichts nach. Welcher Punkt
 * gewählt ist, weiß die Seite — sonst hätten zwei Kurven auf einer Seite zwei Meinungen
 * darüber, welcher Moment gerade offen ist.
 */
import { useId } from 'react'
import { kurve, ton, type PulsPunkt } from '@/lib/kompass'

/**
 * Nimmt alles, was Zeit und Zustand trägt — auch die beschnittenen Punkte, die eine
 * Fachperson sieht. `onWahl` gibt denselben Typ zurück, den die Seite hineingegeben hat.
 */
export default function VerlaufsKurve<T extends PulsPunkt>({
  pulse, tage, hoehe = 150, gewaehlt, onWahl, jetzt,
}: {
  pulse: T[]
  tage: number
  /** In der Koordinatenwelt der SVG. Die Breite ist immer 600 und skaliert mit. */
  hoehe?: number
  gewaehlt?: string | null
  onWahl?: (puls: T) => void
  /** Nur für Tests und Geschichten — sonst die echte Uhr. */
  jetzt?: number
}) {
  // Eigene Kennung je Instanz: Zwei Kurven auf einer Seite teilten sich sonst einen
  // Farbverlauf, und die zweite bekäme den der ersten.
  const verlaufId = useId()
  const BREITE = 600
  const RAND = 12

  const { linie, flaeche, punkte } = kurve(pulse, {
    breite: BREITE, hoehe, tage, rand: RAND, jetzt,
  })

  // Viele Punkte werden zu Rauschen; dann trägt die Linie, nicht der einzelne Tag.
  const dicht = punkte.length > 40
  const radius = dicht ? 3 : 5
  const zeitraum = tage % 7 === 0 ? `${tage / 7} Wochen` : `${tage} Tagen`

  return (
    <div>
      <svg
        viewBox={`0 0 ${BREITE} ${hoehe}`}
        className="w-full"
        style={{ height: 'auto' }}
        role="img"
        aria-label={
          punkte.length === 0
            ? 'Noch kein Verlauf.'
            : `Verlauf aus ${punkte.length} Momenten der letzten ${zeitraum}.`
        }
      >
        <defs>
          {/* Im Koordinatenraum, nicht am Umriss: Der Verlauf gehört zur Skala. */}
          <linearGradient
            id={`linie-${verlaufId}`}
            gradientUnits="userSpaceOnUse"
            x1="0" y1={RAND} x2="0" y2={hoehe - RAND}
          >
            <stop offset="0%" stopColor={ton(5).hex} />
            <stop offset="50%" stopColor={ton(3).hex} />
            <stop offset="100%" stopColor={ton(1).hex} />
          </linearGradient>
          <linearGradient
            id={`flaeche-${verlaufId}`}
            gradientUnits="userSpaceOnUse"
            x1="0" y1={RAND} x2="0" y2={hoehe}
          >
            <stop offset="0%" stopColor={ton(5).hex} stopOpacity="0.16" />
            <stop offset="100%" stopColor={ton(1).hex} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Die Mitte als Bezug: Ohne sie ist eine Linie nur eine Linie. */}
        <line
          x1="0" x2={BREITE}
          y1={hoehe / 2} y2={hoehe / 2}
          stroke="#e3e9f1" strokeWidth="1" strokeDasharray="3 5"
        />

        {flaeche && <path d={flaeche} fill={`url(#flaeche-${verlaufId})`} />}

        {linie && (
          <path
            d={linie}
            className="kompass-kurve"
            pathLength={1}
            fill="none"
            stroke={`url(#linie-${verlaufId})`}
            strokeWidth="2.5"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {punkte.map((p, i) => {
          const an = gewaehlt === p.puls.id
          const farbe = ton(p.puls.zustand).hex
          return (
            <g
              key={p.puls.id}
              className="kompass-punkt"
              style={{
                // Gestaffelt, damit die Punkte der Linie folgen statt gleichzeitig
                // aufzupoppen. Gedeckelt, damit 200 Momente nicht acht Sekunden brauchen.
                animationDelay: `${Math.min(900, 250 + i * 35)}ms`,
                transformOrigin: `${p.x}px ${p.y}px`,
              }}
            >
              <circle
                cx={p.x} cy={p.y} r={an ? radius + 3 : radius}
                fill={farbe}
                stroke="#fff"
                strokeWidth={an ? 3 : 2}
                style={an ? { filter: `drop-shadow(0 2px 6px ${farbe}88)` } : undefined}
              />
              {/* Die Trefferfläche ist größer als der Punkt — am Telefon trifft niemand
                  fünf Pixel. Bei dichten Kurven entfällt sie: Dort überlappen sich die
                  Flächen so stark, dass man doch nur den Nachbarn erwischt. */}
              {onWahl && !dicht && (
                <circle
                  cx={p.x} cy={p.y} r={16}
                  fill="transparent"
                  className="cursor-pointer focus:outline-none"
                  tabIndex={0}
                  role="button"
                  aria-label={`${p.puls.zustand_label ?? ''} — Moment ansehen`}
                  onClick={() => onWahl(p.puls)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onWahl(p.puls)
                    }
                  }}
                />
              )}
            </g>
          )
        })}
      </svg>

      <div className="mt-1 flex justify-between text-[0.7rem] text-brand-muted">
        <span>vor {zeitraum}</span>
        <span>heute</span>
      </div>
    </div>
  )
}
