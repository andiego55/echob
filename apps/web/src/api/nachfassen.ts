/**
 * Die beiden Mechanismen hinter dem zweiten Versuch — ohne Netz, ohne Supabase, ohne Axios.
 *
 * **Warum sie hier liegen und nicht im `client`.** Im API-Client stecken sie zwischen einer
 * echten Axios-Instanz und einem echten Supabase-Client; prüfen ließen sie sich dort nur mit
 * einer Mock-Schicht, und die soll dieses Projekt ausdrücklich nicht haben (siehe
 * `vitest.config.ts`). Beide sind aber reine Logik. Also stehen sie getrennt, sind geprüft,
 * und im Client bleibt Verkabelung.
 *
 * **Das ist kein Selbstzweck.** Der Interceptor sitzt im zentralen Client — jede Anfrage der
 * ganzen Anwendung läuft dadurch. Die beiden Fehlerbilder, die er haben kann, sind teuer:
 * eine Schleife (jede Anfrage dreht endlos) und ein stiller Logout (ein Refresh-Token wird
 * mehrfach eingelöst und damit verbrannt). Genau diese zwei Dinge entscheiden die Funktionen
 * hier, und genau die prüft `tests/nachfassen.test.ts`.
 */

/**
 * Lohnt ein zweiter Versuch mit frischem Token?
 *
 * **Nur bei 401, und nur einmal.** Ein 403 heißt „darfst du nicht" und wird durch einen
 * neuen Token nicht anders; ein 500 wird es auch nicht. Und wäre der zweite Versuch nicht
 * gezählt, drehte eine wirklich abgelaufene Sitzung endlos: Jeder Versuch bekäme wieder 401
 * und stieße den nächsten an. Ist die Sitzung hin, muss der 401 durchkommen — sonst landet
 * niemand je auf der Anmeldung.
 */
export function darfNachfassen(status: number | undefined, schonVersucht: boolean): boolean {
  return status === 401 && !schonVersucht
}

/**
 * Ein Versuch für alle, die gleichzeitig fragen.
 *
 * **Warum das nötig ist.** Eine Seite mit sechs Abfragen bekommt sechs 401 im selben Moment.
 * Sechs Erneuerungen wären nicht bloß verschwendet: Ein Refresh-Token ist genau **einmal**
 * gültig. Die erste Erneuerung verbraucht es, die fünf anderen laufen ins Leere, und am Ende
 * ist die Sitzung kaputt — durch den Rettungsversuch.
 *
 * Nach dem Abschluss wird zurückgesetzt, damit ein späterer 401 wieder einen frischen
 * Versuch bekommt. Auch nach einem Fehlschlag: Sonst bliebe ein einmal misslungener Versuch
 * für den Rest der Sitzung als Antwort stehen.
 */
export function einmalGleichzeitig<T>(fn: () => Promise<T>): () => Promise<T> {
  let laufend: Promise<T> | null = null
  return () => {
    if (!laufend) {
      laufend = fn().finally(() => { laufend = null })
    }
    return laufend
  }
}
