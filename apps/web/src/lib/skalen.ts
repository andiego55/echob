/**
 * Die Skala der Beziehungsdynamiken — eine Zahl, eine Bedeutung, überall dieselbe.
 *
 * **Warum das eine eigene Datei ist.** Dieselbe Skala wurde an vier Stellen unabhängig
 * ausgerechnet und beschriftet: Bericht, Druckansicht, Rückblick, Prompt. Genau dort ist
 * sie auseinandergelaufen — die Datenbank speichert seit Migration 06 Werte von 0 bis 100,
 * zwei Stellen rechneten sie aber weiter auf 0–5 herunter („normalize to 0–5"), und die
 * Anzeige im Bericht war trotzdem mit „/100" beschriftet.
 *
 * **Was das im Bericht anrichtete.** Ein Höchstwert von 100 erschien als **„5/100"** mit
 * einem 5 % breiten Balken — also als das genaue Gegenteil dessen, was er bedeutet. Der
 * Fehler war nicht sichtbar, weil beide Zahlen für sich plausibel aussehen; erst
 * nebeneinander fällt auf, dass „5" und „/100" nicht zusammengehören.
 *
 * Deshalb steht die Spanne hier genau einmal, und alles, was sie braucht, holt sie sich
 * hier ab.
 */

/** Das obere Ende. Die Datenbank prüft dieselbe Grenze (``scale_scores_score_check``). */
export const SKALA_MAX = 100

/** Die Zahl, wie sie dasteht — ohne Nachkommastellen, die nichts aussagen. */
export function skalenwert(score: number): number {
  return Math.round(Math.max(0, Math.min(SKALA_MAX, score)))
}

/** „72 von 100" — die Spanne gehört dazu, sonst ist die Zahl keine Auskunft. */
export function skalenText(score: number): string {
  return `${skalenwert(score)}/${SKALA_MAX}`
}

/**
 * Die Breite des Balkens in Prozent.
 *
 * Sie ist dieselbe Rechnung wie die Zahl daneben — deshalb steht sie hier und nicht
 * zweimal im JSX. Genau diese Trennung war der Fehler: Die Zahl kam aus einer Quelle,
 * die Breite aus einer anderen.
 */
export function balkenBreite(score: number): string {
  return `${(skalenwert(score) / SKALA_MAX) * 100}%`
}

/**
 * Die Farbstufen — Schwellen auf der 0–100-Skala.
 *
 * Vor der Korrektur standen hier 4 / 3 / 2: Werte aus der Zeit, als die Spalte wirklich
 * von 0 bis 5 ging. Seitdem war die oberste Stufe immer erfüllt und jede Skala rot.
 */
export function skalenFarbe(score: number, modus: 'dynamik' | 'person'): string {
  const wert = skalenwert(score)
  if (modus === 'person') {
    if (wert >= 80) return 'bg-blue-600'
    if (wert >= 60) return 'bg-blue-500'
    if (wert >= 40) return 'bg-blue-400'
    return 'bg-blue-300'
  }
  if (wert >= 80) return 'bg-red-500'
  if (wert >= 60) return 'bg-amber-400'
  if (wert >= 40) return 'bg-yellow-300'
  return 'bg-teal-300'
}
