import { apiClient } from './client'

/**
 * Öffentliche Kontakt-/Lead-Anfrage (niedrigschwellig, kein Login).
 * E-Mail ODER Telefon genügt. Wird gespeichert + an kontakt@echo-b.de gemeldet.
 */
export interface ContactRequest {
  kind?: 'coaching' | 'demo' | 'general' | 'scene'
  name?: string | null
  email?: string | null
  phone?: string | null
  message?: string | null
  source?: string | null
  consent: boolean
  company?: string | null // Honeypot – muss leer bleiben
}

export interface ContactResponse {
  message: string
}

export async function submitContact(data: ContactRequest): Promise<ContactResponse> {
  const response = await apiClient.post<ContactResponse>('/contact', data)
  return response.data
}
