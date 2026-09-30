import { apiClient } from './client'
import type { BildWerte, Schicht } from '@/lib/lagebild'

/**
 * Die Bildwerkstatt.
 *
 * **Keine Frist auf diesen Aufrufen, und das ist kein Versehen.** Hier arbeitet kein Modell:
 * Der Server liefert Zahlen, gezeichnet wird im Browser. Damit greift die Vorgabe des Clients
 * (15 Sekunden), und sie ist reichlich — anders als bei jedem Podcast-Aufruf, der eine eigene
 * Frist braucht.
 */
const basis = (caseId: string) => `/cases/${caseId}/bilder`

export interface GespeichertesBild {
  id: string
  case_id: string
  art: 'gerechnet' | 'erzeugt'
  einstellungen: {
    palette?: string
    anordnung?: string
    dichte?: string
    schichten?: string[]
  }
  svg: string | null
  satz: string | null
  created_at: string
  updated_at: string
}

export const bilderApi = {
  /**
   * Die Zahlen für ein Lagebild.
   *
   * `schichten` bestimmt, was der Server überhaupt abfragt — eine abgewählte Schicht wird
   * nicht geladen. Die Werkstatt fragt deshalb die Vereinigung aller je eingeschalteten
   * Schichten ab: Abschalten kostet dann keinen Abruf, und Einschalten genau einen.
   */
  werte: (caseId: string, schichten: Schicht[]) =>
    apiClient
      .get<BildWerte>(`${basis(caseId)}/werte`,
        { params: { schichten: [...schichten].sort().join(',') } })
      .then(r => r.data),

  galerie: (caseId: string) =>
    apiClient.get<GespeichertesBild[]>(basis(caseId)).then(r => r.data),

  aufheben: (caseId: string, body: {
    einstellungen: Record<string, unknown>
    svg: string
    satz: string
  }) => apiClient.post<GespeichertesBild>(basis(caseId), body).then(r => r.data),

  satz: (caseId: string, bildId: string, satz: string) =>
    apiClient.patch<GespeichertesBild>(`${basis(caseId)}/${bildId}`, { satz })
      .then(r => r.data),

  loeschen: (caseId: string, bildId: string) =>
    apiClient.delete(`${basis(caseId)}/${bildId}`).then(() => undefined),
}
