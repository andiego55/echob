import { apiClient } from './client'

/**
 * Paartherapie (peer-to-peer): zwei Nutzer:innen verbinden sich zu einem Paarraum.
 *
 * Wichtig: Eine Kopplung ist KEINE Freigabe. Sie öffnet ausschließlich den gemeinsamen
 * Paarraum und gewährt keinerlei Zugriff auf Fall-Inhalte der anderen Person. Was Echo
 * im Paarraum weiß, stellt der Nutzer später ausdrücklich selbst zusammen.
 */
export interface CoupleLink {
  id: string
  status: 'pending' | 'active' | 'ended'
  role: 'initiator' | 'partner'
  /** Nur sichtbar, solange die eigene Einladung offen ist. */
  invite_code: string | null
  /** Eigener Anker-Fall (nur Bezug, kein Datenzugriff der anderen Person). */
  case_id: string | null
  partner_display_name: string | null
  partner_connected: boolean
  created_at: string
  accepted_at: string | null
}

export interface CoupleInvitePublic {
  valid: boolean
  status: string
}

export interface CoupleAcceptResult {
  connected: boolean
  already: boolean
  couple_id: string | null
}

/**
 * Fortschritt des Paarraums. Bewusst ohne Rangliste: eigene Punkte, gemeinsame Punkte,
 * Meilensteine – aber kein Sieger zwischen euch beiden.
 */
export interface CoupleProgress {
  total_points: number
  own_points: number
  members: { user_id: string; name: string; points: number }[]
  streak_weeks: number
  level: { name: string; next_at: number | null; next_name: string | null }
  milestones: { key: string; title: string; description: string; reached: boolean }[]
  recent: { kind: string; label: string; points: number; name: string; created_at: string }[]
}

export const coupleApi = {
  progress: (coupleId: string) =>
    apiClient.get<CoupleProgress>(`/couple/links/${coupleId}/progress`).then(r => r.data),

  list: () => apiClient.get<CoupleLink[]>('/couple/links').then(r => r.data),
  get: (coupleId: string) =>
    apiClient.get<CoupleLink>(`/couple/links/${coupleId}`).then(r => r.data),
  create: (caseId?: string | null) =>
    apiClient.post<CoupleLink>('/couple/links', { case_id: caseId ?? null }).then(r => r.data),
  accept: (code: string, caseId?: string | null) =>
    apiClient
      .post<CoupleAcceptResult>('/couple/links/accept', { code, case_id: caseId ?? null })
      .then(r => r.data),
  /** Ohne purge nur schließen; mit purge werden die Inhalte wirklich gelöscht. */
  end: (coupleId: string, purge = false) =>
    apiClient.delete(`/couple/links/${coupleId}`, { params: { purge } }),

  /** Löscht nur, was allein dir gehört – Geteiltes bleibt. */
  deleteMyPrivateContent: (coupleId: string) =>
    apiClient.delete(`/couple/links/${coupleId}/my-private-content`),
  checkCode: (code: string) =>
    apiClient
      .get<CoupleInvitePublic>(`/couple/invites/${encodeURIComponent(code)}`)
      .then(r => r.data),
}

/** 8-stelligen Kopplungscode zur Anzeige gruppieren (XXXX-XXXX). */
export function formatCoupleCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code
}

/** Einladungslink zum Teilen (Code steckt im Pfad). */
export function coupleInviteLink(code: string): string {
  return `${window.location.origin}/paar/beitreten/${code}`
}
