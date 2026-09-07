/**
 * Zugriff aufs Admin-Werkzeug. Eigene Datei, eigene Typen.
 *
 * Bewusst getrennt von `src/api/directory.ts`: Das Admin sieht Felder, die im Produkt
 * niemand sehen darf — Kontaktadressen, ob ein Konto dranhängt, der Prüfstatus. Teilte
 * es sich die Typen mit dem öffentlichen Verzeichnis, würde ein dort ergänztes Feld
 * unbemerkt in die öffentliche Ansicht wandern.
 *
 * Nichts außerhalb von `src/admin/` importiert aus diesem Ordner (siehe
 * `tests/admin-grenze.test.ts`).
 */
import { apiClient } from '@/api/client'

export interface ListingRow {
  id: string
  slug: string
  display_name: string
  profession: string
  profession_label: string
  professions: string[]
  title: string | null
  city: string
  postal_code: string | null
  state: string | null
  tier: string
  published: boolean
  verified: boolean
  bills_insurance: boolean
  contact_email: string | null
  website: string | null
  phone: string | null
  claimed: boolean
  claim_sent_at: string | null
}

/** Ein Eintrag mit allen Profilfeldern — nur beim Öffnen des Editors geladen. */
export interface ListingDetail extends ListingRow {
  headline: string | null
  about: string | null
  approach: string | null
  fees: string | null
  focus_areas: string[]
  formats: string[]
  languages: string[]
  offers_free_intro: boolean
  booking_url: string | null
  photo_url: string | null
}

export interface ListingCreate {
  display_name: string
  profession: string
  city: string
  professions?: string[]
  title?: string
  postal_code?: string
  state?: string
  website?: string
  phone?: string
  contact_email?: string
}

/**
 * Nur mitgeschickte Felder werden geschrieben.
 *
 * Deshalb sind alle optional: Ein Umschalter, der nur `published` sendet, darf nicht
 * jedes andere Feld leeren. Wer ein Feld absichtlich leeren will, sendet es als "".
 */
export interface ListingUpdate {
  display_name?: string
  profession?: string
  professions?: string[]
  title?: string
  city?: string
  postal_code?: string
  state?: string
  website?: string
  phone?: string
  contact_email?: string
  tier?: string
  published?: boolean
  verified?: boolean
  bills_insurance?: boolean
  headline?: string
  about?: string
  approach?: string
  fees?: string
  focus_areas?: string[]
  formats?: string[]
  languages?: string[]
  offers_free_intro?: boolean
  booking_url?: string
}

/**
 * Ergebnis einer Konto-Bereitstellung ohne Mailversand.
 *
 * `password` kommt genau einmal und steht danach nirgends mehr — weder im Protokoll noch
 * in der Datenbank. Wer es verliert, muss den Weg über „Passwort vergessen" gehen.
 */
export interface ProvisionResult {
  ok: boolean
  email: string
  user_id: string | null
  password: string | null
  detail: string | null
}

/** Vorschlagstext für eine Einladung. `body` enthält die Marke `{LINK}`. */
export interface InviteDraft {
  email: string
  subject: string
  body: string
}

export interface InviteResult {
  ok: boolean
  email: string
  detail: string | null
}

export interface UserRow {
  user_id: string
  rolle: 'professional' | 'institute' | 'student'
  name: string | null
  email: string | null
  created_at: string
  /** Nur bei Fachpersonen gefüllt; `null` heißt „für diese Rolle ohne Bedeutung". */
  avv_accepted: boolean | null
  avv_version: string | null
  avv_accepted_at: string | null
  im_verzeichnis: boolean
}

export const adminApi = {
  listings: (status?: string) =>
    apiClient.get<ListingRow[]>('/admin/listings', { params: status ? { status } : {} })
      .then(r => r.data),
  listing: (id: string) =>
    apiClient.get<ListingDetail>(`/admin/listings/${id}`).then(r => r.data),
  create: (payload: ListingCreate) =>
    apiClient.post<ListingRow>('/admin/listings', payload).then(r => r.data),
  update: (id: string, payload: ListingUpdate) =>
    apiClient.patch<ListingRow>(`/admin/listings/${id}`, payload).then(r => r.data),
  remove: (id: string) =>
    apiClient.delete(`/admin/listings/${id}`).then(r => r.data),

  uploadPhoto: (id: string, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return apiClient
      .post<{ photo_url: string }>(`/admin/listings/${id}/photo`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60_000,
      })
      .then(r => r.data)
  },

  /** Konto anlegen, ohne dass die Fachperson etwas erhält. Gibt das Startpasswort zurück. */
  provision: (id: string, email?: string) =>
    apiClient.post<ProvisionResult>(`/admin/listings/${id}/provision`, { email })
      .then(r => r.data),

  /** Vorschlagstext holen. Legt nichts an und verschickt nichts. */
  inviteDraft: (id: string, email?: string) =>
    apiClient.get<InviteDraft>(`/admin/listings/${id}/invite/draft`, {
      params: email ? { email } : {},
    }).then(r => r.data),

  /** Verschickt die Einladung mit genau diesem Text und legt dabei das Konto an. */
  inviteSend: (id: string, payload: { email: string; subject: string; body: string }) =>
    apiClient.post<InviteResult>(`/admin/listings/${id}/invite`, payload).then(r => r.data),

  users: (params?: { rolle?: string; q?: string }) =>
    apiClient.get<UserRow[]>('/admin/users', { params: params ?? {} }).then(r => r.data),
}
