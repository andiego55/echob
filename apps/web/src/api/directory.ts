import { apiClient } from './client'

export interface DirectoryCard {
  slug: string
  display_name: string
  profession: string
  profession_label: string
  title: string | null
  city: string
  city_slug: string
  tier: string
  verified: boolean
  contactable: boolean
  photo_url: string | null
  headline: string | null
  focus_areas: string[]
  formats: string[]
  offers_free_intro: boolean
}

export interface DirectoryDetail extends DirectoryCard {
  postal_code: string | null
  state: string | null
  website: string | null
  phone: string | null
  about: string | null
  approach: string | null
  fees: string | null
  languages: string[]
  booking_url: string | null
  updated_at: string | null
}

export interface FacetItem {
  slug: string
  label: string
  count: number
}

export interface DirectoryFacets {
  total: number
  professions: FacetItem[]
  cities: FacetItem[]
}

export interface DirectorySearchResponse {
  total: number
  items: DirectoryCard[]
}

export interface DirectorySearchParams {
  q?: string
  profession?: string
  city?: string
  format?: string
  free_intro?: boolean
  page?: number
}

export interface DirectoryContactPayload {
  from_email: string
  from_name?: string
  from_phone?: string
  message?: string
  preferred_format?: string
  company?: string // Honeypot
}

export const directoryApi = {
  search: (params: DirectorySearchParams) =>
    apiClient.get<DirectorySearchResponse>('/directory/search', { params }).then((r) => r.data),
  facets: () => apiClient.get<DirectoryFacets>('/directory/facets').then((r) => r.data),
  detail: (slug: string) =>
    apiClient.get<DirectoryDetail>(`/directory/listings/${slug}`).then((r) => r.data),
  contact: (slug: string, payload: DirectoryContactPayload) =>
    apiClient
      .post<{ message: string }>(`/directory/listings/${slug}/contact`, payload)
      .then((r) => r.data),
}

// ── Selfservice-Profil (eingeloggte Fachperson) ──────────────────────────────

export interface MissingItem {
  key: string
  label: string
  points: number
}

export interface DirectoryMe {
  slug: string
  display_name: string
  profession: string
  title: string | null
  city: string
  postal_code: string | null
  state: string | null
  website: string | null
  phone: string | null
  contact_email: string | null
  photo_url: string | null
  headline: string | null
  about: string | null
  approach: string | null
  fees: string | null
  focus_areas: string[]
  formats: string[]
  languages: string[]
  offers_free_intro: boolean
  booking_url: string | null
  tier: string
  published: boolean
  completeness: number
  stars: number
  missing: MissingItem[]
  publishable: boolean
  missing_required: string[]
  public_url: string
}

export interface DirectoryProfilePayload {
  display_name: string
  profession: string
  title?: string | null
  city?: string | null
  postal_code?: string | null
  state?: string | null
  website?: string | null
  phone?: string | null
  contact_email?: string | null
  headline?: string | null
  about?: string | null
  approach?: string | null
  fees?: string | null
  focus_areas: string[]
  formats: string[]
  languages: string[]
  offers_free_intro: boolean
  booking_url?: string | null
  published: boolean
}

export const directoryProfileApi = {
  me: () => apiClient.get<DirectoryMe>('/directory/me').then((r) => r.data),
  save: (payload: DirectoryProfilePayload) =>
    apiClient.put<DirectoryMe>('/directory/me', payload).then((r) => r.data),
  uploadPhoto: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return apiClient
      .post<{ photo_url: string }>('/directory/me/photo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60_000,
      })
      .then((r) => r.data)
  },
}
