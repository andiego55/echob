/**
 * Die Echo-Wellen als Grundton des dunklen Hero.
 *
 * **Woher das Motiv kommt.** Es ist nicht neu erfunden, sondern die Bildmarke selbst:
 * derselbe gefüllte Kern und dieselben Ringe wie im Logo, nur fortgesetzt. Die Marke
 * heißt Echo — ein Ring, der sich ausbreitet und dabei schwächer wird, ist ihre wörtliche
 * Übersetzung.
 *
 * **Warum die Ringe abgeschnitten sind.** Vollständig sichtbar wäre es ein aufgeklebtes
 * Logo. Vom Rand angeschnitten wird daraus ein Feld, das über die Seite hinausreicht —
 * das Bild einer Welle, die weiterläuft.
 *
 * **Warum nichts pulsiert.** `echo-welle` in `index.css` pulsiert bereits — dort, wo Echo
 * nachdenkt. Das ist ein Zustand und darf sich bewegen. Ein Hero ist kein Zustand; eine
 * dauerhaft atmende Startseite lenkt vom Satz ab, der dort gelesen werden soll.
 *
 * **Warum erst ab `md`.** Auf dem Telefon füllt der Text die ganze Breite. Die Ringe
 * lägen dann hinter der Schrift statt neben ihr, und ein Hintergrund, der den Kontrast
 * frisst, ist schlechter als gar keiner.
 */
export default function EchoWellen() {
  // Radien in der Geometrie der Bildmarke: 2.6 / 5.8 / 9.5, geometrisch fortgesetzt.
  // Nach außen wird jeder Ring dünner und blasser — so entsteht Tiefe ohne Farbverlauf.
  const ringe = [
    { r: 5.8, w: 1.9, o: 0.5 },
    { r: 9.5, w: 1.5, o: 0.34 },
    { r: 14.5, w: 1.2, o: 0.22 },
    { r: 21, w: 1.0, o: 0.14 },
    { r: 29, w: 0.9, o: 0.09 },
    { r: 38.5, w: 0.8, o: 0.055 },
    { r: 49, w: 0.7, o: 0.035 },
  ]

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-0 hidden w-[62%] select-none md:block"
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
      >
        {/* Mittelpunkt bewusst rechts außerhalb der Mitte: Die äußeren Ringe laufen
            aus dem Bild, die inneren bleiben ganz. */}
        <g transform="translate(72 50)">
          {ringe.map(({ r, w, o }) => (
            <circle
              key={r}
              cx="0"
              cy="0"
              r={r}
              fill="none"
              stroke="#e07b54"
              strokeWidth={w}
              opacity={o}
            />
          ))}
          <circle cx="0" cy="0" r="2.6" fill="#e07b54" opacity="0.6" />
        </g>
      </svg>
    </div>
  )
}
