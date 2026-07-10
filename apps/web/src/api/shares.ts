import { apiClient } from './client'
import type { CaseShare, ShareCreate, Connection } from '@/types'

/** Nutzerseitige Freigaben eines Falls. */
export const sharesApi = {
  list: (caseId: string) =>
    apiClient.get<CaseShare[]>(`/cases/${caseId}/shares`).then(r => r.data),
  create: (caseId: string, data: ShareCreate) =>
    apiClient.post<CaseShare>(`/cases/${caseId}/shares`, data).then(r => r.data),
  update: (caseId: string, shareId: string, data: Omit<ShareCreate, 'professional_user_id'>) =>
    apiClient.patch<CaseShare>(`/cases/${caseId}/shares/${shareId}`, data).then(r => r.data),
  revoke: (caseId: string, shareId: string) =>
    apiClient.delete(`/cases/${caseId}/shares/${shareId}`),
}

/** Nutzerseitige Fachpersonen-Verbindungen. */
export const professionalsApi = {
  connections: () =>
    apiClient.get<Connection[]>('/professionals/connections').then(r => r.data),
  invite: (email: string) =>
    apiClient.post<Connection>('/professionals/invite', { email }).then(r => r.data),
  /** Verbindung auflösen: widerruft aktive Freigaben an die Fachperson + entfernt die Verbindung. */
  dissolve: (email: string) =>
    apiClient.delete('/professionals/connections', { params: { email } }),
}
