import { apiClient } from './client'

/**
 * Der Paarraum aus Sicht der Fachperson.
 *
 * Alles hier steht nur zur Verfügung, weil **beide** Personen dieser Fachperson
 * namentlich zugestimmt haben. Was nicht freigegeben ist, liefert der Server als 404 –
 * die Oberfläche zeigt es trotzdem an, aber gesperrt. Ein fehlender Menüpunkt sähe nach
 * Fehler aus; ein gesperrter sagt die Wahrheit.
 */
export interface CoupleRoomMember { user_id: string; name: string }

export interface CoupleRoomSummary {
  id: string
  couple_id: string
  status: 'pending' | 'active' | 'revoked'
  origin: 'partner' | 'professional'
  message: string | null
  elements: string[]
  /** false = der Raum wurde beendet oder die Freigabe ruht noch. */
  readable: boolean
  members: CoupleRoomMember[]
  created_at: string
  updated_at: string
}

export interface CoupleRoomOverview {
  couple_id: string
  members: CoupleRoomMember[]
  since: string
  room_since: string
  elements: string[]
  catalogue: Record<string, string>
}

export const professionalRoomApi = {
  list: () =>
    apiClient.get<CoupleRoomSummary[]>('/professional/paarraeume').then(r => r.data),

  overview: (coupleId: string) =>
    apiClient.get<CoupleRoomOverview>(`/professional/paarraeume/${coupleId}`).then(r => r.data),

  element: <T = unknown>(coupleId: string, element: string) =>
    apiClient.get<T>(`/professional/paarraeume/${coupleId}/${element}`).then(r => r.data),

  /** Bittet um Zugang. Die Antwort ist immer dieselbe – auch wenn es gar keinen Raum gibt. */
  request: (caseId: string, elements: string[], message?: string | null) =>
    apiClient.post<{ requested: boolean }>(
      `/professional/klienten/${caseId}/paarraum-anfragen`, { elements, message }).then(r => r.data),
}
