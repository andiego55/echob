/**
 * Der Takt des Vorlese-Modus — die Methode als Ablauf, nicht als Layout.
 *
 * **Warum das hier steht und nicht in der Komponente.** Zwischen zwei Mitteilungen liegt
 * eine Karte, auf der nichts steht außer der Aufforderung, nichts zu sagen. Diese Pause
 * ist kein Übergang und keine Animation — sie ist der Teil der Übung, den man zu zweit am
 * ehesten überspringt. Wer die Schrittfolge später „vereinfacht", nimmt sie heraus, ohne
 * dass irgendetwas rot wird: Der Modus liefe weiter, nur eben ohne das, wofür es ihn gibt.
 *
 * Als reine Funktion lässt sich das prüfen. In der Komponente nicht.
 */

/** intro → (lesen · stille) je Beitrag → ende */
export type Schritt =
  | { art: 'intro' }
  | { art: 'lesen'; i: number }
  | { art: 'stille' }
  | { art: 'ende' }

/**
 * Die Schrittfolge für eine Runde mit `anzahl` Mitteilungen.
 *
 * Auf **jede** Mitteilung folgt eine Stille — auch auf die letzte. Gerade danach ist die
 * Versuchung am größten, sofort ins Gespräch zu kippen.
 */
export function schritteBauen(anzahl: number): Schritt[] {
  const s: Schritt[] = [{ art: 'intro' }]
  for (let i = 0; i < anzahl; i++) s.push({ art: 'lesen', i }, { art: 'stille' })
  s.push({ art: 'ende' })
  return s
}

/**
 * Welche Mitteilung zuletzt gelesen wurde — für die Fortschrittsmarken am unteren Rand.
 *
 * Steht man in einer Stille, gilt die davorliegende Mitteilung als erledigt; sonst sähe
 * die Anzeige während der Pause aus, als wäre nichts geschehen.
 */
export function zuletztGelesen(schritte: Schritt[], nr: number): number {
  for (let i = nr - 1; i >= 0; i--) {
    const s = schritte[i]
    if (s.art === 'lesen') return s.i
  }
  return -1
}
