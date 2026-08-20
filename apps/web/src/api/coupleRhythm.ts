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

/**
 * Wertschätzung – der zweite wiederkehrende Anlass.
 *
 * Bewusst ohne die Blindheitsregel des Check-ins: Sie geht sofort hinüber, auch wenn
 * nichts zurückkommt. Ein Geschenk, kein Zug im Wechselspiel.
 */
export interface CoupleAppreciation {
  id: string
  from_user_id: string
  from_name: string
  is_own: boolean
  body: string
  created_at: string
  seen_at: string | null
}

export interface CoupleAppreciationWall {
  received: CoupleAppreciation[]
  given: CoupleAppreciation[]
  unseen: number
  /** Anstöße für den leeren Zettel. */
  prompts: string[]
  partner_name: string | null
  max_chars: number
}

export const coupleAppreciationApi = {
  wall: (coupleId: string) =>
    apiClient.get<CoupleAppreciationWall>(`/couple/links/${coupleId}/wertschaetzung`)
      .then(r => r.data),

  leave: (coupleId: string, body: string) =>
    apiClient.post<CoupleAppreciation>(`/couple/links/${coupleId}/wertschaetzung`, { body })
      .then(r => r.data),

  markSeen: (coupleId: string) =>
    apiClient.post<{ seen: number }>(`/couple/links/${coupleId}/wertschaetzung/gesehen`)
      .then(r => r.data),
}
