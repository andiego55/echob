/**
 * Echos Antwort in der Paar-Analyse lesen, während sie entsteht.
 *
 * Die Mechanik — Anfrage, Blöcke zusammensetzen, Ereignisse deuten — liegt in
 * `lib/sseLeser`; hier steht nur, was diesen Strom ausmacht: seine Adresse und sein
 * Ergebnistyp. Es ist der vierte Strom im Haus und der mit dem größten Kontext: Hier
 * liegen zwei freigegebene Fälle nebeneinander, und die Antworten sind entsprechend lang.
 */
import { stromAnfordern, stromLesen, type Einstufung } from '@/lib/sseLeser'
import type { EchoChatResult } from '@/api/professional'

export { StreamNichtMoeglich } from '@/lib/sseLeser'

export interface CoupleAnalyseAnfrage {
  message: string
  session_id?: string
  thread_type?: 'couple' | 'glossary'
  glossary_slug?: string
}

/**
 * Wirft `StreamNichtMoeglich`, wenn dieser Weg nicht geht — die Aufrufstelle nimmt dann
 * `professionalApi.coupleEchoChat`. Alle anderen Fehler werden weitergereicht.
 */
export async function coupleAnalyseStreamen(
  coupleId: string,
  daten: CoupleAnalyseAnfrage,
  onStueck: (text: string) => void,
  onEinstufung?: (safety: Einstufung) => void,
  signal?: AbortSignal,
): Promise<EchoChatResult> {
  const antwort = await stromAnfordern(
    `/professional/couples/${coupleId}/echo/chat/stream`, daten, signal)
  return stromLesen<EchoChatResult>(antwort, onStueck, onEinstufung)
}
