/**
 * Dem Gespräch nachlaufen, ohne mit sich selbst und ohne mit dem Leser zu kämpfen.
 *
 * **Problem 1 — das Ruckeln.** Während Echo schreibt, wächst der Text 37- bis 60-mal pro
 * Sekunde (siehe `lib/textTakt`). Jede dieser Änderungen löste ein
 * `scrollIntoView({ behavior: 'smooth' })` aus — und jeder dieser Aufrufe **bricht die
 * laufende Animation ab und startet eine neue** zu einem Ziel, das sich inzwischen wieder
 * verschoben hat. Sechzigmal pro Sekunde eine 300-ms-Animation zu beginnen heißt: keine
 * davon läuft je zu Ende.
 *
 * Die Unterscheidung dagegen: Eine *neue Nachricht* ist ein Sprung — dorthin gleitet man.
 * Ein *wachsender Text* ist ein Nachrücken um wenige Pixel; dort ist `auto` richtig.
 *
 * **Problem 2 — der entrissene Bildlauf.** Auch mit `auto` wurde bei jedem Takt gescrollt,
 * und zwar bedingungslos. Wer während einer langen Antwort nach oben blätterte, um etwas
 * nachzulesen, wurde binnen 20 Millisekunden wieder nach unten gerissen. Nach außen sah es
 * aus, als sei das Scrollen gesperrt.
 *
 * **Die Regel dagegen.** Nachlaufen ist ein Angebot, keine Pflicht. Es gilt nur, solange
 * der Leser unten steht. Blättert er hoch, hört das Nachlaufen auf — bis er von selbst
 * wieder unten ankommt oder den Knopf aus `components/app/ZumEndeKnopf` drückt.
 *
 * **Woran wir das erkennen, ohne Ereignisse mitzuhören.** Zwei Beobachtungen genügen:
 *
 * 1. *Wachsender Inhalt verändert `scrollTop` nicht.* Neuer Text wird unten angehängt; die
 *    Blätterposition bleibt, wo sie war. **Nur ein Mensch verringert `scrollTop`.**
 *    Liegt der Wert noch dort, wo wir ihn zuletzt hingesetzt haben, hat niemand geblättert.
 * 2. *Wer nah am Ende steht, will mitlaufen.* Das fängt den Fall ab, dass eine ganze neue
 *    Nachricht auf einmal erscheint: Der Abstand zum Ende springt dann hoch, ohne dass
 *    jemand geblättert hätte — Beobachtung 1 trägt hier, Beobachtung 2 fängt den Rückweg.
 *
 * Beides zusammen kommt ohne `scroll`-Ereignisse aus, die man wieder abmelden müsste, und
 * unterscheidet zuverlässig zwischen „der Text ist gewachsen" und „jemand liest oben".
 */

/** Rundungs- und Subpixelspielraum beim Vergleich zweier Blätterpositionen. */
const TOLERANZ = 4

/** So nah am Ende gilt als unten — etwa zwei Zeilen. */
const NAH_AM_ENDE = 64

/** Was von einem Behälter gebraucht wird. Bewusst nur Zahlen: so bleibt es prüfbar. */
export interface Blaetterstand {
  scrollTop: number
  scrollHeight: number
  clientHeight: number
  /** Die Position, die dieses Modul zuletzt selbst gesetzt hat. */
  zuletztGesetzt: number
}

/**
 * Steht der Leser unten? Eine Schwelle, zwei Verwender: das Nachlaufen und der Knopf, der
 * zurück ans Ende führt. Getrennte Schwellen würden ein Loch erzeugen, in dem weder
 * nachgelaufen wird noch der Knopf erscheint.
 */
export function istNahAmEnde({
  scrollTop,
  scrollHeight,
  clientHeight,
}: Pick<Blaetterstand, 'scrollTop' | 'scrollHeight' | 'clientHeight'>): boolean {
  const unten = Math.max(0, scrollHeight - clientHeight)
  // Passt der Inhalt ganz hinein, steht man immer unten.
  return unten === 0 || unten - scrollTop <= NAH_AM_ENDE
}

/**
 * Darf jetzt nachgelaufen werden?
 *
 * Reine Funktion — die ganze Entscheidung steckt hier, damit sie ohne DOM prüfbar ist
 * (`vitest` läuft in diesem Projekt bewusst in `node`, siehe `vitest.config.ts`).
 */
export function sollFolgen({
  scrollTop,
  scrollHeight,
  clientHeight,
  zuletztGesetzt,
}: Blaetterstand): boolean {
  // Beobachtung 2: nah am Ende. Fängt auch den Rückweg ab, wenn jemand wieder herunterkommt —
  // und den Fall, dass es gar nichts zu blättern gibt.
  if (istNahAmEnde({ scrollTop, scrollHeight, clientHeight })) return true

  // Beobachtung 1: Niemand hat nach oben geblättert, seit wir zuletzt gesetzt haben.
  // Bewusst einseitig — nach unten blättern ist nie ein Grund aufzuhören.
  return scrollTop >= zuletztGesetzt - TOLERANZ
}

const zustaende = new WeakMap<Element, { zuletztGesetzt: number }>()

/**
 * Der nächste Vorfahre, in dem tatsächlich geblättert wird. Fällt auf das Dokument zurück,
 * wenn keiner gefunden wird — dann blättert die Seite selbst.
 */
function blaetterbehaelter(ziel: HTMLElement): Element | null {
  for (let p = ziel.parentElement; p; p = p.parentElement) {
    const ueberlauf = getComputedStyle(p).overflowY
    if (
      (ueberlauf === 'auto' || ueberlauf === 'scroll' || ueberlauf === 'overlay') &&
      p.scrollHeight > p.clientHeight
    ) {
      return p
    }
  }
  return document.scrollingElement
}

/**
 * @param ziel     das Element am Ende des Verlaufs
 * @param imFluss  läuft gerade ein Strom? Dann wird sofort nachgerückt statt animiert.
 */
export function mitlaufen(ziel: HTMLElement | null | undefined, imFluss: boolean): void {
  if (!ziel) return

  const behaelter = blaetterbehaelter(ziel)
  if (!behaelter) return

  // Beim ersten Mal gibt es nichts zu vergleichen: dann wird nachgelaufen.
  const zustand = zustaende.get(behaelter) ?? { zuletztGesetzt: Number.NEGATIVE_INFINITY }

  const { scrollTop, scrollHeight, clientHeight } = behaelter
  if (!sollFolgen({ scrollTop, scrollHeight, clientHeight, zuletztGesetzt: zustand.zuletztGesetzt })) {
    return
  }

  if (imFluss) {
    // Direkt setzen statt `scrollIntoView`: Nur so wissen wir hinterher genau, wo wir
    // hingesprungen sind — und genau das ist die Grundlage für Beobachtung 1.
    const unten = Math.max(0, scrollHeight - clientHeight)
    behaelter.scrollTop = unten
    zustand.zuletztGesetzt = unten
  } else {
    // Der Sprung zu einer neuen Nachricht darf gleiten. Gemerkt wird die Position VOR der
    // Animation: Während sie läuft, wächst `scrollTop` nur — und wachsen ist nie ein Grund
    // aufzuhören. Nach dem letzten Bild trägt der nächste Aufruf den Endwert nach.
    zustand.zuletztGesetzt = scrollTop
    ziel.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }

  zustaende.set(behaelter, zustand)
}
