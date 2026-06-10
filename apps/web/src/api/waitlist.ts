import { apiClient } from './client'

export interface WaitlistRequest {
  email: string
  interest?: 'app' | 'coaching' | 'fachperson' | 'alle' | null
  note?: string | null
}

export interface WaitlistResponse {
  message: string
  email: string
}

export async function joinWaitlist(data: WaitlistRequest): Promise<WaitlistResponse> {
  const response = await apiClient.post<WaitlistResponse>('/waitlist', data)
  return response.data
}
