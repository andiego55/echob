/**
 * Die Echo-Wellen als Grundton des dunklen Hero.
 *
 * **Warum keine Vollkreise.** Der erste Anlauf hat die Bildmarke aus der Kopfzeile
 * hochskaliert: konzentrische Ringe um einen sichtbaren Mittelpunkt. Bei Logogröße liest
 * sich das als Echo, bei Herogröße als Fadenkreuz. Deshalb offene Bögen — dieselbe zweite
 * Marke, die im leeren Echo-Chat und im Info-Popover schon benutzt wird. Sie ist
 * gerichtet statt zentriert, hat also gar keinen Mittelpunkt zum Anvisieren.
 *
 * **Gespiegelt.** In der kleinen Marke öffnen die Bögen nach rechts: Echo sendet. Hier
 * sitzt die Quelle oben rechts und die Bögen öffnen nach links-unten, auf die Überschrift
 * zu. Ein Echo ist das, was zurückkommt.
 *
 * **Auf die Ecke gehängt, nicht in einen Kasten gerechnet.** Erst war das Motiv prozentual
 * breit und erst ab `md` sichtbar — auf dem Telefon also gar nicht. Jetzt wie auf
 * `/paartherapie`: feste Größe, an der oberen rechten Ecke aufgehängt, über den Rand
 * hinaus. Damit liegt es auf jedem Schirm hinter der Schrift statt daneben, und auf
 * schmalen Geräten sieht man den Teil, der am meisten hergibt — die weiten Bögen.
 *
 * **Nichts pulsiert.** `echo-welle` in `index.css` pulsiert bereits, dort wo Echo
 * nachdenkt. Das ist ein Zustand und darf sich bewegen. Ein Hero ist kein Zustand.
 */

/** Ein Bogen von 120°, geöffnet nach links, um (cx, cy). */
function bogen(cx: number, cy: number, r: number): string {
  // Start 240°, Ende 120°, über 180° (den linkesten Punkt). In SVG wächst der Winkel im
  // Uhrzeigersinn, der Bogen läuft also gegen ihn: sweep 0.
  const x = cx - 0.5 * r
  return `M ${x.toFixed(2)} ${(cy - 0.866 * r).toFixed(2)} `
       + `A ${r} ${r} 0 0 0 ${x.toFixed(2)} ${(cy + 0.866 * r).toFixed(2)}`
}

export default function EchoWellen() {
  // Quelle oben rechts im Kasten; der Kasten selbst hängt über die Ecke hinaus.
  const cx = 68
  const cy = 32

  // Abstände wie in der kleinen Marke (Faktor ~1,7), fortgesetzt. Nach außen dünner
  // und blasser — Tiefe ohne Farbverlauf.
  const boegen = [
    { r: 11, w: 1.6, o: 0.4 },
    { r: 18, w: 1.3, o: 0.27 },
    { r: 28, w: 1.1, o: 0.175 },
    { r: 41, w: 0.95, o: 0.115 },
    { r: 57, w: 0.85, o: 0.075 },
    { r: 76, w: 0.75, o: 0.048 },
    { r: 98, w: 0.65, o: 0.03 },
  ]

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -right-20 -top-20 h-[400px] w-[400px] select-none
                 sm:-right-24 sm:-top-24 sm:h-[560px] sm:w-[560px]
                 lg:-right-28 lg:-top-28 lg:h-[780px] lg:w-[780px]"
    >
      <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
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
        <circle cx={cx} cy={cy} r="2.2" fill="#e07b54" opacity="0.5" />
      </svg>
    </div>
  )
}
