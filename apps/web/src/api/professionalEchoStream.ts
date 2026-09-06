/**
 * Echos Antwort im Fachpersonen-Dialog lesen, während sie entsteht.
 *
 * Die Mechanik — Anfrage, Blöcke zusammensetzen, Ereignisse deuten — liegt in
 * `lib/sseLeser`; hier steht nur, was diesen Strom ausmacht: seine Adresse und sein
 * Ergebnistyp.
 */
import { stromAnfordern, stromLesen, type Einstufung } from '@/lib/sseLeser'
import type { EchoChatResult } from '@/api/professional'

export { StreamNichtMoeglich } from '@/lib/sseLeser'

export interface ProfessionalEchoAnfrage {
  message: string
  session_id?: string
  thread_type?: 'case' | 'glossary'
  glossary_slug?: string
}

/**
 * Wirft `StreamNichtMoeglich`, wenn dieser Weg nicht geht — die Aufrufstelle nimmt dann
 * `professionalApi.echoChat`. Alle anderen Fehler werden weitergereicht.
 */
export async function professionalEchoStreamen(
  caseId: string,
  daten: ProfessionalEchoAnfrage,
  onStueck: (text: string) => void,
  onEinstufung?: (safety: Einstufung) => void,
  signal?: AbortSignal,
): Promise<EchoChatResult> {
  const antwort = await stromAnfordern(
    `/professional/cases/${caseId}/echo/chat/stream`, daten, signal)
  return stromLesen<EchoChatResult>(antwort, onStueck, onEinstufung)
}
