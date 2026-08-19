import { apiClient } from './client'

/**
 * Der wöchentliche Check-in – das kleine feste Ritual des Paarraums.
 *
 * Drei Fragen, eine Antwort je Person und Woche. `visible: false` heißt: ausgefüllt, aber
 * noch verdeckt, weil du selbst noch nicht dran warst. Das ist Absicht, keine Panne.
 */
export interface CoupleCheckinEntry {
  user_id: string
  name: string
  is_own: boolean
  done: boolean
  mood: string | null
  highlight: string | null
  wish: string | null
  visible: boolean
}

export interface CoupleCheckinWeek {
  week_start: string
  entries: CoupleCheckinEntry[]
  own_done: boolean
  both_done: boolean
  /** Der Wortlaut der drei Fragen – kommt vom Server, damit beide Seiten dasselbe sagen. */
  questions: Record<string, string>
  moods: Record<string, string>
}

export interface CoupleCheckinHistoryWeek {
  week_start: string
  moods: { user_id: string; name: string; mood: string | null; is_own: boolean }[]
}

export const coupleRhythmApi = {
  getCheckin: (coupleId: string) =>
    apiClient.get<CoupleCheckinWeek>(`/couple/links/${coupleId}/checkin`).then(r => r.data),

  saveCheckin: (
    coupleId: string,
    body: { mood?: string | null; highlight?: string | null; wish?: string | null },
  ) => apiClient.put<CoupleCheckinWeek>(`/couple/links/${coupleId}/checkin`, body).then(r => r.data),

  history: (coupleId: string) =>
    apiClient.get<CoupleCheckinHistoryWeek[]>(`/couple/links/${coupleId}/checkin/history`)
      .then(r => r.data),
}
