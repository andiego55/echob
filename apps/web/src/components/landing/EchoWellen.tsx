/**
 * Die Echo-Wellen als Grundton des dunklen Hero.
 *
 * **Warum keine Vollkreise.** Der erste Anlauf hat die Bildmarke aus der Kopfzeile
 * hochskaliert: konzentrische Ringe um einen sichtbaren Mittelpunkt. Bei Logogröße liest
 * sich das als Echo, bei Herogröße als **Fadenkreuz** — ein Ziel, auf das gezielt wird.
 * Das ist ungefähr die falscheste Bedeutung, die diese Seite haben kann.
 *
 * **Was stattdessen.** EchoB hat eine zweite Marke, die im Produkt längst benutzt wird:
 * ein Punkt mit offenen Bögen davor, im leeren Echo-Chat und im Info-Popover. Sie ist
 * GERICHTET statt zentriert — etwas geht von einem Punkt aus. Kein geschlossener Kreis,
 * kein Mittelpunkt zum Anvisieren.
 *
 * **Und sie ist gespiegelt.** In der kleinen Marke öffnen die Bögen nach rechts: Echo
 * sendet. Hier sitzt die Quelle rechts und die Bögen öffnen nach links, auf die
 * Überschrift zu. Ein Echo ist das, was zurückkommt — es läuft auf den Satz zu, nicht von
 * ihm weg.
 *
 * **Nichts pulsiert.** `echo-welle` in `index.css` pulsiert bereits, dort wo Echo
 * nachdenkt. Das ist ein Zustand und darf sich bewegen. Ein Hero ist kein Zustand.
 *
 * **Erst ab `md`.** Auf dem Telefon füllt der Text die Breite; die Bögen lägen hinter der
 * Schrift statt neben ihr.
 */

/** Ein Bogen von 120°, der sich nach links öffnet — als Pfad um (cx, cy). */
function bogen(cx: number, cy: number, r: number): string {
  // Start bei 240°, Ende bei 120°, über 180° (den linkesten Punkt) hinweg.
  // In SVG wächst der Winkel im Uhrzeigersinn, also läuft der Bogen gegen ihn: sweep 0.
  const x = cx - 0.5 * r
  const y1 = cy - 0.866 * r
  const y2 = cy + 0.866 * r
  return `M ${x.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 0 ${x.toFixed(2)} ${y2.toFixed(2)}`
}

export default function EchoWellen() {
  // Quelle rechts außerhalb der Bildmitte; die weiten Bögen laufen aus dem Bild.
  const cx = 86
  const cy = 50

  // Abstände wie in der kleinen Marke (16 / 28 / 40 ≈ Faktor 1,7), fortgesetzt.
  // Nach außen dünner und blasser — Tiefe ohne Farbverlauf.
  const boegen = [
    { r: 9, w: 1.5, o: 0.42 },
    { r: 15, w: 1.2, o: 0.28 },
    { r: 23, w: 1.0, o: 0.18 },
    { r: 33, w: 0.9, o: 0.115 },
    { r: 45, w: 0.8, o: 0.07 },
    { r: 59, w: 0.7, o: 0.045 },
    { r: 75, w: 0.6, o: 0.028 },
  ]

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-0 hidden w-[64%] select-none md:block"
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
      >
        {boegen.map(({ r, w, o }) => (
          <path
            key={r}
            d={bogen(cx, cy, r)}
            fill="none"
            stroke="#e07b54"
            strokeWidth={w}
            strokeLinecap="round"
            opacity={o}
          />
        ))}
        {/* Die Quelle: derselbe gefüllte Punkt wie in der Marke. */}
        <circle cx={cx} cy={cy} r="2.4" fill="#e07b54" opacity="0.55" />
      </svg>
    </div>
  )
}
