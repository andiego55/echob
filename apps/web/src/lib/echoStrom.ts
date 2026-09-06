/**
 * Echos Antwort im Fall-Bereich lesen, während sie entsteht.
 *
 * Die ganze Mechanik — Strom, Rückfall, Takt, Übergabe — liegt seit dem
 * Fachpersonen-Dialog in `lib/antwortStrom` und ist dort ausführlich beschrieben. Hier
 * steht nur noch, was diesen Strom ausmacht: seine Adresse und sein Rückfall.
 *
 * **Warum die Hülle bleibt.** Vier Seiten rufen `useEchoStrom(caseId, …)` auf. Sie alle
 * auf den allgemeinen Baustein umzustellen hieße, an vier Stellen dieselben zwei
 * Funktionen hinzuschreiben — das ist genau die Doppelung, gegen die die Trennung
 * gemacht wurde.
 */
import { useCallback } from 'react'
import { echoApi } from '@/api/echo'
import { echoStreamen } from '@/api/echoStream'
import { useAntwortStrom, type AntwortStrom } from '@/lib/antwortStrom'
import type { Einstufung } from '@/lib/sseLeser'
import type { EchoChatRequest, EchoChatResponse } from '@/types'

export type EchoStrom = AntwortStrom<EchoChatRequest>

export interface EchoStromOptionen {
  /** Wird aufgerufen, wenn die Anzeige die fertige Antwort eingeholt hat. */
  onFertig: (data: EchoChatResponse) => void
  /** Bekommt die gescheiterte Anfrage — damit Geschriebenes zurück ins Feld kann. */
  onFehler?: (anfrage: EchoChatRequest) => void
}

/**
 * @param caseId  der Fall, in dem gesprochen wird
 */
export function useEchoStrom(caseId: string, optionen: EchoStromOptionen): EchoStrom {
  const streamen = useCallback(
    (
      anfrage: EchoChatRequest,
      onStueck: (t: string) => void,
      onEinstufung: (s: Einstufung) => void,
      signal: AbortSignal,
    ) => echoStreamen(caseId, anfrage, onStueck, onEinstufung, signal),
    [caseId],
  )
  const rueckfall = useCallback(
    (anfrage: EchoChatRequest) => echoApi.chat(caseId, anfrage),
    [caseId],
  )

  return useAntwortStrom<EchoChatRequest, EchoChatResponse>({
    streamen,
    rueckfall,
    onFertig: optionen.onFertig,
    onFehler: optionen.onFehler,
  })
}
