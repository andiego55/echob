import { apiClient } from './client'

/**
 * Klient-Einladungen (Fachperson → Person).
 * Die Fachperson erzeugt Link + Code; die Person nimmt an und wird verbunden.
 */
export interface ClientInvite {
  id: string
  token: string
  code: string
  label: string | null
  status: 'pending' | 'accepted' | 'revoked'
  accepted_display_name: string | null
  created_at: string
  accepted_at: string | null
}

export interface ClientInvitePublic {
  valid: boolean
  status: string
  professional_display_name: string | null
  professional_title: string | null
  org_name: string | null
}

export interface ClientInviteAcceptResult {
  connected: boolean
  already: boolean
  professional_user_id: string | null
  professional_display_name: string | null
}

export const clientInvitesApi = {
  list: () =>
    apiClient.get<ClientInvite[]>('/professional/client-invites').then(r => r.data),
  create: (label?: string | null) =>
    apiClient.post<ClientInvite>('/professional/client-invites', { label: label ?? null }).then(r => r.data),
  revoke: (id: string) =>
    apiClient.delete(`/professional/client-invites/${id}`),
  public: (token: string) =>
    apiClient.get<ClientInvitePublic>(`/client-invites/${encodeURIComponent(token)}`).then(r => r.data),
  accept: (payload: { token?: string; code?: string }) =>
    apiClient.post<ClientInviteAcceptResult>('/client-invites/accept', payload).then(r => r.data),
}

/** 8-stelligen Code zur Anzeige mit Bindestrich gruppieren (XXXX-XXXX). */
export function formatInviteCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code
}

/** Vollständigen Einladungslink aus dem Token bauen. */
export function inviteLink(token: string): string {
  return `${window.location.origin}/einladung/${token}`
}
