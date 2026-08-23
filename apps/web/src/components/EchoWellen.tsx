/**
 * Die Echo-Wellen als Grundton dunkler Hero-Baender.
 *
 * Liegt auf Markenebene, nicht bei der Startseite: Alle Marken-Seiten tragen dasselbe
 * Motiv. Rechtstexte und rein funktionale Seiten bewusst NICHT — der Unterschied ist,
 * was das Motiv ueberhaupt zu einem Signal macht.
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
   * **Der nutzbare Radiusbereich ist 33 bis 144** — nachgemessen, auf Telefon wie Desktop
   * fast gleich. Darunter liegt der Kreis rechts außerhalb des Bildes, darüber jenseits
   * der linken unteren Ecke. Drei frühere Ringe (180, 230, 290) wurden nie gezeichnet;
   * sie standen im Code und kosteten nichts als Verwirrung.
   *
   * Innerhalb dieses Bandes geometrisch verteilt (Faktor ~1,25): Der engste sitzt ganz in
   * der oberen rechten Ecke und berührt keinen Text, die weiteren öffnen sich nach links
   * unten über die Seite.
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
    // Der engste Bogen. Er bleibt ganz in der oberen rechten Ecke und berührt keinen
    // Text — nah an der Quelle liegen Wellen dichter, das ist hier nicht nur hübsch,
    // sondern richtig. Er gibt dem Motiv einen Anfang, statt es einfach beginnen zu lassen.
    { r: 40, w: 2.0, o: 0.42 },
    { r: 54, w: 1.8, o: 0.34 },
    { r: 70, w: 1.6, o: 0.27 },
    { r: 89, w: 1.45, o: 0.20 },
    { r: 110, w: 1.3, o: 0.145 },
    { r: 133, w: 1.15, o: 0.10 },
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
