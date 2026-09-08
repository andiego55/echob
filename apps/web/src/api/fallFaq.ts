/**
 * Fall-FAQ — nur lesen.
 *
 * Hier fehlt absichtlich jede schreibende Funktion. Ausgelöst wird das Fragenpaket von
 * der Klient:in bei der Freigabe. Für Berufsgeheimnisträger:innen ist der Unterschied
 * nicht akademisch: Wer selbst fragt, offenbart im Sinne des § 203 StGB; wer liest, was
 * ihm übermittelt wurde, nicht.
 *
 * Ein `neuErzeugen` an dieser Stelle wäre also nicht bloß bequem — es verschöbe, wer
 * offenbart. Das Backend kennt den Endpunkt gar nicht erst.
 */
import { apiClient } from './client'
import type { FallFaq } from '@/types'

export const fallFaqApi = {
  get: (caseId: string) =>
    apiClient.get<FallFaq>(`/professional/cases/${caseId}/faq`).then(r => r.data),
}
