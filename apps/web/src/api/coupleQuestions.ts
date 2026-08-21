import { apiClient } from './client'

/**
 * Die offene Frage an die Partnerperson.
 *
 * Der leichteste Zug im Paarraum: keine Moderation, kein Termin, keine Zusage. Genau eine
 * Antwort je Frage – wer weiterreden will, macht daraus ein Gespräch. `waiting_for_me`
 * heißt: an dich gerichtet und noch offen.
 */
export interface CoupleQuestion {
  id: string
  couple_id: string
  question: string
  answer: string | null
  status: 'open' | 'answered' | 'withdrawn'
  is_mine: boolean
  waiting_for_me: boolean
  asked_by_name: string
  answered_at: string | null
  created_at: string
}

export interface CoupleQuestionList {
  questions: CoupleQuestion[]
  waiting_for_me: number
  waiting_for_partner: number
  /** Anstöße, falls einem die Frage nicht einfällt. */
  prompts: string[]
}

export const coupleQuestionsApi = {
  list: (coupleId: string) =>
    apiClient.get<CoupleQuestionList>(`/couple/links/${coupleId}/fragen`).then(r => r.data),

  ask: (coupleId: string, question: string) =>
    apiClient.post<CoupleQuestion>(`/couple/links/${coupleId}/fragen`, { question }).then(r => r.data),

  answer: (questionId: string, answer: string) =>
    apiClient.post<CoupleQuestion>(`/couple/fragen/${questionId}/antwort`, { answer }).then(r => r.data),

  withdraw: (questionId: string) =>
    apiClient.post<CoupleQuestion>(`/couple/fragen/${questionId}/zurueck`).then(r => r.data),
}
