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
  rolle: 'client' | 'professional' | 'institute' | 'student'
  name: string | null
  /** Bei Klient:innen immer `null`: Ihre Adresse liegt in Supabase und bleibt dort. */
  email: string | null
  created_at: string
  /** Nur bei Fachpersonen gefüllt; `null` heißt „für diese Rolle ohne Bedeutung". */
  avv_accepted: boolean | null
  avv_version: string | null
  avv_accepted_at: string | null
  im_verzeichnis: boolean
  /** Nur Klient:innen: Tarif und Laufzeitende. */
  tarif: string | null
  tarif_bis: string | null
  /** Letzte erkennbare Arbeit — `null` heißt „keine Spur", nicht „heute". */
  zuletzt_aktiv: string | null
  /** Zahlen statt Inhalte. Je Rolle gefüllt; `null` heißt „bedeutet hier nichts". */
  faelle: number | null
  szenen: number | null
  verbindungen: number | null
  /** Nur Fachpersonen. `unterliegt_203` hat drei Zustände — null heißt ungeklärt. */
  berufsgruppe: string | null
  berufsgruppe_label: string | null
  unterliegt_203: boolean | null
  hinweis_gelesen: boolean | null
  hinweis_at: string | null
}

/** Was eine Löschung getan hat — oder warum sie nicht stattgefunden hat. */
export interface LoeschErgebnis {
  ok: boolean
  grund: string | null
  user_id: string | null
  rollen: string[]
  zeilen: number
  /** geloescht | war_bereits_weg | fehlgeschlagen */
  auth_konto: string | null
  tabellen: Record<string, number>
}

/** Ein Konto, dessen Login es nicht mehr gibt: Daten ohne Zugang. */
export interface VerwaistesKonto {
  user_id: string
  rolle: UserRow['rolle']
  name: string | null
  created_at: string | null
  zuletzt_aktiv: string | null
  spuren: number
}

/** Ein Login ohne eine einzige Zeile hier — meist eine Anmeldung, die nie ankam. */
export interface LoginOhneProfil {
  user_id: string
  email: string | null
  angelegt: string | null
  letzter_login: string | null
}

export interface VerwaistReport {
  geprueft_am: string
  auth_konten: number
  db_konten: number
  /** Die Liste der Login-Konten war abgeschnitten — dann ist jeder Befund unzuverlässig. */
  unvollstaendig: boolean
  ohne_login: VerwaistesKonto[]
  ohne_profil: LoginOhneProfil[]
}

/**
 * Eine Organisation mit Tarif, Plaetzen und laufendem Verbrauch.
 *
 * `included_tarif` und `zusatz_faelle` stehen getrennt, nicht nur als Summe: Eine blosse
 * 9 waere eine Zahl, die niemand erklaeren koennte - und nach einem Tarifwechsel merkte
 * niemand, welcher Teil sich geaendert hat.
 */
export interface PlaetzeRow {
  id: string
  name: string | null
  plan: string | null
  subscription_status: string | null
  included_tarif: number
  zusatz_faelle: number
  included: number
  verbraucht: number
  zusatz_grund: string | null
  zusatz_gesetzt_am: string | null
}

export const adminApi = {
  plaetze: (suche?: string) =>
    apiClient.get<PlaetzeRow[]>('/admin/plaetze', { params: suche ? { suche } : {} })
      .then(r => r.data),

  /** Setzt den GESAMTBETRAG des Geschenks, nicht einen Zuwachs. */
  plaetzeSetzen: (orgId: string, zusatz: number, grund: string) =>
    apiClient.put<PlaetzeRow>(`/admin/plaetze/${orgId}`,
      { zusatz_faelle: zusatz, grund }).then(r => r.data),

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

  /** Vergleicht die Login-Konten bei Supabase mit den Konten hier. Fragt Supabase ab. */
  verwaist: () =>
    apiClient.get<VerwaistReport>('/admin/users/verwaist', { timeout: 60_000 })
      .then(r => r.data),

  /**
   * Ändert den angezeigten Namen eines Kontos — der Support-Fall.
   *
   * Fachpersonen können ihn selbst ändern (Profil → „Anzeigename in Echo"); das hier ist
   * der Weg für alle, die es nicht können oder nicht wollen.
   */
  renameUser: (userId: string, display_name: string) =>
    apiClient.patch<{ ok: boolean; grund: string | null; name: string | null }>(
      `/admin/users/${userId}/name`, { display_name }).then(r => r.data),

  /**
   * Löscht Daten und Login-Konto — endgültig, ohne Papierkorb.
   *
   * Ein abgelehnter Versuch kommt als `ok: false` mit Grund zurück, nicht als Fehler:
   * „Das ist das Admin-Konto" ist eine Antwort, die man lesen soll.
   */
  deleteUser: (userId: string) =>
    apiClient.delete<LoeschErgebnis>(`/admin/users/${userId}`).then(r => r.data),
}
