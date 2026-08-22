/**
 * Echos Antwort im Fall-Bereich lesen, während sie entsteht.
 *
 * Die Mechanik — Anfrage, Blöcke zusammensetzen, Ereignisse deuten — liegt in
 * `lib/sseLeser`; hier steht nur, was diesen Strom ausmacht: seine Adresse und sein
 * Ergebnistyp.
 */
import { stromAnfordern, stromLesen, type Einstufung } from '@/lib/sseLeser'
import type { EchoChatRequest, EchoChatResponse } from '@/types'

export { StreamNichtMoeglich } from '@/lib/sseLeser'

/**
 * Schickt eine Nachricht und ruft `onStueck` für jedes Textstück.
 *
 * Wirft `StreamNichtMoeglich`, wenn dieser Weg nicht geht — die Aufrufstelle nimmt dann
 * `echoApi.chat`. Alle anderen Fehler werden weitergereicht.
 */
export async function echoStreamen(
  caseId: string,
  daten: EchoChatRequest,
  onStueck: (text: string) => void,
  onEinstufung?: (safety: Einstufung) => void,
  signal?: AbortSignal,
): Promise<EchoChatResponse> {
  const antwort = await stromAnfordern(`/cases/${caseId}/echo/chat/stream`, daten, signal)
  return stromLesen<EchoChatResponse>(antwort, onStueck, onEinstufung)
}
