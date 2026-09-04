/**
 * Wo endet der fertige Teil einer entstehenden Antwort?
 *
 * **Warum das eine eigene Datei ist.** Hier fällt die Entscheidung, die das Flackern
 * beseitigt hat — und sie lässt sich ohne React prüfen. Liegt die Grenze falsch, ist
 * entweder das Flackern zurück (zu spät geschnitten) oder ein Absatz verschwindet (zu früh).
 *
 * **Der Hintergrund.** Während Echo schreibt, wächst der Text 37- bis 60-mal pro Sekunde
 * (siehe `textTakt`). Wurde er jedes Mal als Markdown geparst, kippte unfertige
 * Auszeichnung sichtbar hin und her: `**Wich` steht als Sternchen da und springt in
 * Fettschrift, sobald das Paar zugeht; eine Zeile mit `-` springt in eine Liste, ein `#`
 * in eine Überschrift. Jeder Sprung ist ein Umbruch.
 *
 * Bis zum letzten abgeschlossenen Absatz ist der Text dagegen fertig — dort gibt es keine
 * offene Auszeichnung mehr, und er ändert sich erst wieder, wenn der nächste Absatz steht.
 * Nur dieser Teil geht durch Markdown; der Rest läuft als Klartext mit.
 */

export interface Geteilt {
  /** Abgeschlossene Absätze — als Markdown zu rendern. */
  fertig: string
  /** Der Absatz, an dem gerade geschrieben wird — als Klartext zu rendern. */
  laufend: string
}

export function teilenImFluss(text: string): Geteilt {
  const grenze = text.lastIndexOf('\n\n')
  return grenze === -1
    ? { fertig: '', laufend: text }
    : { fertig: text.slice(0, grenze), laufend: text.slice(grenze + 2) }
}
