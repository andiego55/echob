/**
 * Wenn eine Aktion schiefgeht.
 *
 * **Warum das ein eigener Baustein ist.** Im Paarraum stand diese Zeile 27-mal in leicht
 * unterschiedlicher Schreibweise — mal `text-sm`, mal `text-xs`, mal mit `mt-2`, mal ohne.
 * Im Nutzerbereich stand sie überhaupt nicht: Von 75 Aktionen dort zeigten 22 eine
 * Fehlermeldung, sechs Dateien hatten gar keine. Ein fehlgeschlagener Klick sah aus wie ein
 * Klick, der nicht angekommen ist — und das ist der Zustand, in dem Leute anfangen, dieselbe
 * Sache dreimal zu drücken.
 *
 * Ein Baustein für beide Welten löst beides auf einmal: dieselbe Stimme, dieselbe Form, und
 * er ist so kurz einzusetzen, dass es keinen Grund mehr gibt, ihn wegzulassen.
 *
 * Der Text kommt aus ``apiErrorMessage`` — die Begründung des Servers, wenn er eine
 * mitschickt, sonst eine verständliche Erklärung zum Statuscode.
 */
import { apiErrorMessage } from '@/api/errors'

export default function Fehlermeldung({
  error, className = 'mt-2',
}: {
  /** Der Fehler einer Mutation oder Abfrage. `null`/`undefined` rendert nichts. */
  error: unknown
  /** Nur für den Abstand — Farbe und Größe sind bewusst nicht überschreibbar. */
  className?: string
}) {
  if (!error) return null
  return (
    <p role="alert" className={`text-sm leading-snug text-red-600 ${className}`}>
      {apiErrorMessage(error)}
    </p>
  )
}
