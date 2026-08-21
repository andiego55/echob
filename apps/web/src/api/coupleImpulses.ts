import { apiClient } from './client'

/**
 * Impulse – kleine Übungen, die beide getrennt beantworten und danach nebeneinander sehen.
 *
 * Dieselbe Blindheitsregel wie beim Check-in: `visible: false` heißt ausgefüllt, aber noch
 * verdeckt, weil du selbst noch nicht dran warst. Der Katalog kommt vom Server, damit beide
 * Seiten denselben Wortlaut sehen.
 */
export interface CoupleImpulseEntry {
  user_id: string
  name: string
  is_own: boolean
  done: boolean
  answer: string | null
  visible: boolean
}

export interface CoupleImpulse {
  slug: string
  title: string
  question: string
  why: string
  duration: string
  group: string
  entries: CoupleImpulseEntry[]
  own_done: boolean
  both_done: boolean
}

export interface CoupleImpulseOverview {
  impulses: CoupleImpulse[]
  /** Der nächste, den noch nicht beide gemacht haben – ein Vorschlag, keine Pflicht. */
  suggested: string | null
  done_count: number
  total: number
}

export const coupleImpulsesApi = {
  list: (coupleId: string) =>
    apiClient.get<CoupleImpulseOverview>(`/couple/links/${coupleId}/impulse`).then(r => r.data),

  get: (coupleId: string, slug: string) =>
    apiClient.get<CoupleImpulse>(`/couple/links/${coupleId}/impulse/${slug}`).then(r => r.data),

  answer: (coupleId: string, slug: string, answer: string) =>
    apiClient.put<CoupleImpulse>(`/couple/links/${coupleId}/impulse/${slug}`, { answer }).then(r => r.data),
}
