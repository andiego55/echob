/**
 * Was Echo bei der nächsten Nachricht mitliest.
 *
 * Nur Zählungen, keine Inhalte — die stehen an ihren eigenen Orten und sind dort schon
 * lesbar. Hier geht es um die eine Frage: Was ist gerade dabei?
 */
import { apiClient } from './client'

export interface KontextTeil {
  key: string
  label: string
  hinweis: string
  /** Wie viele Einheiten dahinterstehen. 1 bei Profilen, 0 wenn nichts da ist. */
  anzahl: number
}

export interface KontextUebersicht {
  parts: KontextTeil[]
}

export const echoKontextApi = {
  uebersicht: (caseId: string) =>
    apiClient.get<KontextUebersicht>(`/cases/${caseId}/echo/context`).then(r => r.data),
}
