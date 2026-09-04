/**
 * Dem Gespräch nachlaufen, ohne mit sich selbst zu kämpfen.
 *
 * **Das Problem.** Während Echo schreibt, wächst der Text 37- bis 60-mal pro Sekunde
 * (siehe `lib/textTakt`). Jede dieser Änderungen löste ein
 * `scrollIntoView({ behavior: 'smooth' })` aus — und jeder dieser Aufrufe **bricht die
 * laufende Animation ab und startet eine neue** zu einem Ziel, das sich inzwischen wieder
 * verschoben hat. Sechzigmal pro Sekunde eine 300-ms-Animation zu beginnen heißt: keine
 * davon läuft je zu Ende. Das Ergebnis ruckelt, statt zu gleiten.
 *
 * **Die Unterscheidung.** Eine *neue Nachricht* ist ein Sprung — dorthin gleitet man, das
 * ist genau der Fall, für den `smooth` gemacht ist. Ein *wachsender Text* ist kein Sprung,
 * sondern ein Nachrücken um wenige Pixel; dort ist `auto` richtig. Weil die Schritte
 * winzig sind, sieht das ohnehin flüssig aus — nur eben ohne die Animation, die sich
 * selbst im Weg steht.
 */

/**
 * @param ziel     das Element am Ende des Verlaufs
 * @param imFluss  läuft gerade ein Strom? Dann wird sofort nachgerückt statt animiert.
 */
export function mitlaufen(ziel: HTMLElement | null | undefined, imFluss: boolean): void {
  ziel?.scrollIntoView({ behavior: imFluss ? 'auto' : 'smooth' })
}
