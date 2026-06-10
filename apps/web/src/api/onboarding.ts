import { apiClient } from './client'

export interface OnboardingAnswers {
  person_name?: string | null
  relationship_description?: string | null
  main_burden?: string | null
  typical_scenes?: string | null
  significant_event?: string | null
  memorable_scenes?: string | null
  distress_score?: number | null
  safety_status?: string | null
}

export interface OnboardingResponse extends OnboardingAnswers {
  id: string
  case_id: string
  completed_at: string | null
}

export const onboardingApi = {
  get: (caseId: string) =>
    apiClient.get<OnboardingResponse | null>(`/cases/${caseId}/onboarding`).then(r => r.data),

  save: (caseId: string, data: OnboardingAnswers) =>
    apiClient.put<OnboardingResponse>(`/cases/${caseId}/onboarding`, data).then(r => r.data),
}
