import { apiClient } from './client'

/**
 * Öffentliche Verzeichnis-Warteliste (Lead-Generierung).
 * Fachpersonen/Praxen/Coaches tragen sich kostenfrei ein, um künftig im
 * EchoB-Verzeichnis für Klient:innen sichtbar zu werden.
 */
export interface DirectoryWaitlistRequest {
  name: string
  email: string
  consent: boolean
  organization?: string | null
  phone?: string | null
  website?: string | null
  profession?: string | null
  specialization?: string | null
  location?: string | null
  note?: string | null
}

export interface DirectoryWaitlistResponse {
  message: string
  email: string
}

export async function joinDirectoryWaitlist(
  data: DirectoryWaitlistRequest,
): Promise<DirectoryWaitlistResponse> {
  const response = await apiClient.post<DirectoryWaitlistResponse>('/directory-waitlist', data)
  return response.data
}
