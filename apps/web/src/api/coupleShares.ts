import { apiClient } from './client'

/**
 * Freigabe eines Paarraums an eine Fachperson.
 *
 * Die eine Regel, die alles trägt: **Freigeben braucht beide, Widerrufen genügt einer.**
 * Deshalb trägt jede Freigabe mit sich, wer bereits zugestimmt hat – `status` ist
 * `pending`, solange eine Zustimmung fehlt.
 */
export interface CoupleShare {
  id: string
  couple_id: string
  professional_user_id: string
  /** Wer die Freigabe bekäme – steht an der Freigabe, damit auch die andere
   *  Person den Namen sieht und nicht einer Nummer zustimmt. */
  professional_name: string
  professional_title: string | null
  status: 'pending' | 'active' | 'revoked'
  /** 'partner' = jemand hat vorgeschlagen, 'professional' = die Fachperson hat gebeten. */
  origin: 'partner' | 'professional'
  initiated_by: string | null
  message: string | null
  elements: string[]
  consented_by: string[]
  consent_names: string[]
  revoked_by: string | null
  revoked_at: string | null
  created_at: string
  updated_at: string
}

export interface CoupleProfessionalOption {
  professional_user_id: string
  display_name: string
  title: string | null
}

export interface CoupleShareView {
  shares: CoupleShare[]
  professionals: CoupleProfessionalOption[]
  /** Schlüssel → was die Fachperson damit sieht. */
  catalogue: Record<string, string>
  defaults: string[]
  /** Was nie freigegeben werden kann – im Reiter sichtbar aufgezählt. */
  never: string[]
}

export const coupleSharesApi = {
  list: (coupleId: string) =>
    apiClient.get<CoupleShareView>(`/couple/links/${coupleId}/freigaben`).then(r => r.data),

  propose: (coupleId: string, body: {
    professional_user_id: string; elements: string[]; message?: string | null
  }) => apiClient.post<CoupleShare>(`/couple/links/${coupleId}/freigaben`, body).then(r => r.data),

  consent: (shareId: string) =>
    apiClient.post<CoupleShare>(`/couple/freigaben/${shareId}/zustimmen`).then(r => r.data),

  setElements: (shareId: string, elements: string[]) =>
    apiClient.patch<CoupleShare>(`/couple/freigaben/${shareId}`, { elements }).then(r => r.data),

  revoke: (shareId: string) =>
    apiClient.delete<CoupleShare>(`/couple/freigaben/${shareId}`).then(r => r.data),
}
