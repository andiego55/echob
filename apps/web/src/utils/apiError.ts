/**
 * Fehler-Codes der API in lesbare Sätze übersetzen.
 *
 * **Nur noch eine Weiterleitung.** Bis zur Angleichung lagen hier eine eigene Code-Tabelle
 * und eine eigene Übersetzungslogik — parallel zu `apiErrorMessage` in `api/errors.ts`, die
 * der Paarraum benutzte. Zwei Übersetzer heißt zwei Wahrheiten: Diese hier kannte die Codes,
 * aber weder Netzwerkfehler noch Statuscodes; die andere kannte beides, aber keine Codes und
 * gab deshalb im Paarraum wörtlich „ECHO_LIMIT_REACHED“ aus.
 *
 * Die Tabelle steht jetzt an einer Stelle. Diese Datei bleibt, weil Institut- und
 * Studierendenbereich sie mit einer eigenen Rückfallsemantik verwenden — sie zieht ihre
 * Texte aber aus derselben Quelle, damit nichts mehr auseinanderlaufen kann.
 *
 * Für neuen Code: `apiErrorMessage` aus `@/api/errors` nehmen, oder gleich die Komponente
 * `<Fehlermeldung error={…} />`.
 */
import { CODE_TEXTS } from '@/api/errors'

function detailOf(error: unknown): string | null {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  return typeof detail === 'string' && detail.trim() ? detail : null
}

/** Bekannter Code → Text, sonst der Rückfalltext. Unbekannte Details werden verworfen. */
export function apiErrorText(error: unknown, fallback: string): string {
  const detail = detailOf(error)
  return (detail && CODE_TEXTS[detail]) || fallback
}

/** Wie `apiErrorText`, gibt aber auch unbekannte Klartext-Begründungen der API weiter. */
export function apiErrorDetail(error: unknown, fallback: string): string {
  const detail = detailOf(error)
  if (!detail) return fallback
  return CODE_TEXTS[detail] ?? detail
}
