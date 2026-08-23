/**
 * Die Echo-Wellen als Grundton des dunklen Hero.
 *
 * **Der Weg hierher, in drei Fehlern.**
 *
 * 1. Erst waren es konzentrische Ringe um einen sichtbaren Mittelpunkt — die hochskalierte
 *    Bildmarke. Bei Logogröße heißt das Echo, bei Herogröße Fadenkreuz.
 * 2. Dann offene Bögen mit der Quelle knapp im Bild. Kein Fadenkreuz mehr, aber die Quelle
 *    lag als Punkt mitten auf dem Schirm: ein hingelegtes Objekt, keine Welle.
 * 3. Jetzt liegt die Quelle **weit außerhalb**, oben rechts hinter der Ecke. Sichtbar ist
 *    nur, was durch das Bild läuft — flache Bögen, die von rechts hereinziehen und nach
 *    links unten auslaufen. Das ist der Unterschied zwischen „hier ist ein Kreis" und
 *    „hier geht etwas durch".
 *
 * **Warum wieder ganze Kreise.** Der Fadenkreuz-Effekt entstand nicht durch die Kreisform,
 * sondern durch den sichtbaren Mittelpunkt und die vollständig sichtbaren Ringe. Liegt das
 * Zentrum weit draußen, sieht man von jedem Kreis nur ein flaches Stück — und ein flaches
 * Kreisstück ist genau das, was eine Wellenfront ist. Weniger Code, natürlichere Form.
 *
 * **Warum `xMaxYMin slice`.** Das Motiv hängt damit an der oberen rechten Ecke des Hero,
 * unabhängig vom Seitenverhältnis. Auf dem Telefon zieht es über die Überschrift, auf dem
 * Desktop in den freien Raum rechts — dieselbe Geometrie, kein Breakpoint, keine Fallunter-
 * scheidung.
 *
 * **Nichts pulsiert.** `echo-welle` in `index.css` pulsiert bereits, dort wo Echo nachdenkt.
 * Das ist ein Zustand und darf sich bewegen. Ein Hero ist kein Zustand.
 */
export default function EchoWellen() {
  // Quelle deutlich außerhalb: rechts neben und über dem Bildfeld (viewBox 0…100).
  const cx = 128
  const cy = -18

  /**
   * Radien so gewählt, dass sich die sichtbaren Bögen über die Fläche verteilen:
   * Der linkeste Punkt eines Kreises liegt bei `cx - r`, also bei 53, 23, −12, −52, −102.
   * Die ersten beiden ziehen oben rechts durch, die weiten laufen quer über das Bild.
   *
   * `w` ist die Strichbreite in ECHTEN Bildschirmpixeln, nicht in viewBox-Einheiten —
   * dafür sorgt `vectorEffect="non-scaling-stroke"`. Ohne das war der Fehler, der das
   * ganze Motiv falsch aussehen ließ: Die viewBox von 100 wird auf 1280 px gedehnt, also
   * mit Faktor 12,8, und die Strichbreite dehnt sich mit. Aus 0,8 wurden 10 Pixel. Das
   * waren keine Wellen mehr, das waren Bänder — und Bänder liegen schwer auf einer Seite,
   * statt durch sie hindurchzuziehen.
   *
   * Deckkraft nimmt nach außen ab — näher an der Quelle ist die Welle stärker. Das setzt
   * das Kräftige nach oben rechts, wo kein Text steht, und lässt über der Schrift nur die
   * blassesten Bögen liegen.
   */
  const wellen = [
    { r: 75, w: 1.4, o: 0.38 },
    { r: 105, w: 1.2, o: 0.27 },
    { r: 140, w: 1.1, o: 0.19 },
    { r: 180, w: 1.0, o: 0.13 },
    { r: 230, w: 0.9, o: 0.085 },
    { r: 290, w: 0.8, o: 0.055 },
  ]

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMaxYMin slice"
      /* Auf schmalen Schirmen ist nur der rechte Ausschnitt des Motivs sichtbar - und den
         fuellt die Ueberschrift fast ganz aus. Selbst der staerkste Bogen laege dann ueber
         der Schrift. Statt das Motiv zu verschieben (geht nicht, die Geometrie gibt es
         nicht her) wird es dort auf die Haelfte gedaempft: hoechstens 15 Prozent statt 30. */
      className="pointer-events-none absolute inset-0 h-full w-full select-none opacity-50 md:opacity-100"
    >
      {wellen.map(({ r, w, o }) => (
        <circle
          key={r}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#e07b54"
          strokeWidth={w}
          vectorEffect="non-scaling-stroke"
          opacity={o}
        />
      ))}
    </svg>
  )
}
