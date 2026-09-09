/**
 * Resonanz — die beiden Welten, sauber getrennt.
 *
 * `oeffentlicheResonanzApi` läuft ohne Konto und kann genau zwei Dinge: Zahlen lesen und
 * eine Zahl erhöhen. Es gibt dort bewusst kein Lesen einer *eigenen* Reaktion — was ohne
 * Anmeldung getippt wurde, weiß nur der Browser (siehe `lib/resonanz.ts`).
 *
 * `resonanzApi` braucht eine Anmeldung und arbeitet auf dem, was einem Menschen gehört.
 */
import { apiClient } from './client'
import type { Reaktion, Zaehler } from '@/lib/resonanz'

export interface ResonanzEintrag {
  id: string
  scene_slug: string
  case_id: string | null
  reaction: Reaktion
  frequency: number | null
  distress: number | null
  note: string | null
  promoted_scene_id: string | null
  created_at: string
  updated_at: string
  title: string | null
  cluster: string | null
  perspective: string | null
  muster: string[]
  wirkungen: string[]
  /** Die Szene gibt es nicht mehr — die Karte bleibt, der Titel fehlt. */
  verwaist: boolean
  /** Die eigene Fassung: Antworten auf die gefuehrten Fragen. */
  ausarbeitung: Record<string, string>
  /**
   * Was noch fehlt, bis daraus eine Szene werden darf — lesbare Labels vom Server.
   *
   * Bewusst nicht im Frontend nachgerechnet: Stuende die Regel zweimal, liefen beide
   * auseinander, und der Knopf waere aktiv, waehrend der Endpunkt 422 antwortet.
   */
  fehlt_noch: string[]
}

/** Eine gefuehrte Frage. Kommt vom Server, damit sie nur an einer Stelle steht. */
export interface ResonanzFrage {
  key: string
  label: string
  hinweis: string | null
  pflicht: boolean
}

/** Eine Rueckfrage von Echo, verortet an dem Feld, um das es geht. */
export interface Nachfrage {
  feld: string
  frage: string
  /** geliehen · unschaerfe · deutung · eigene_bewegung */
  art: string | null
}

export interface NachfrageAntwort {
  fragen: Nachfrage[]
  hinweis: string | null
}

export interface WirkungsZeile {
  name: string
  hinweis: string
  anzahl: number
  /** `null` heißt „keine Angabe", nicht „nicht belastend". */
  belastung: number | null
}

export interface MusterGruppe {
  name: string
  anzahl: number
  klassen: { name: string; anzahl: number }[]
}

export interface ResonanzAuswertung {
  gesamt: number
  wiedererkannt: number
  je_reaktion: Record<string, number>
  wirkungen: WirkungsZeile[]
  mustergruppen: MusterGruppe[]
}

export interface ResonanzUeberblick {
  eintraege: ResonanzEintrag[]
  auswertung: ResonanzAuswertung
  /** Die gefuehrten Fragen — damit die Oberflaeche sie nicht ein zweites Mal fuehrt. */
  fragen: ResonanzFrage[]
}

export interface ResonanzEingabe {
  reaction: Reaktion
  frequency?: number | null
  distress?: number | null
  note?: string | null
  case_id?: string | null
  /** Wurde ohne Konto bereits anonym gezählt — beim Übernehmen nicht doppelt zählen. */
  schon_gezaehlt?: boolean
}

export const oeffentlicheResonanzApi = {
  zaehler: (slugs: string[]) =>
    apiClient
      .get<{ zaehler: Record<string, Zaehler> }>('/szenen/resonanz', {
        params: { slugs: slugs.join(',') },
      })
      .then(r => r.data.zaehler),

  reagieren: (slug: string, reaction: Reaktion) =>
    apiClient
      .post<Zaehler>(`/szenen/${slug}/resonanz`, { reaction })
      .then(r => r.data),
}

export const resonanzApi = {
  ueberblick: (caseId?: string) =>
    apiClient
      .get<ResonanzUeberblick>('/resonanz', { params: caseId ? { case_id: caseId } : {} })
      .then(r => r.data),

  setzen: (slug: string, eingabe: ResonanzEingabe) =>
    apiClient.put<ResonanzEintrag>(`/resonanz/${slug}`, eingabe).then(r => r.data),

  entfernen: (slug: string) => apiClient.delete(`/resonanz/${slug}`).then(() => undefined),

  zuordnen: (slug: string, caseId: string | null) =>
    apiClient
      .patch<ResonanzEintrag>(`/resonanz/${slug}/fall`, { case_id: caseId })
      .then(r => r.data),

  fassungSpeichern: (slug: string, ausarbeitung: Record<string, string>) =>
    apiClient
      .put<ResonanzEintrag>(`/resonanz/${slug}/fassung`, { ausarbeitung })
      .then(r => r.data),

  nachfragen: (slug: string) =>
    apiClient.post<NachfrageAntwort>(`/resonanz/${slug}/nachfragen`).then(r => r.data),

  zuSzeneMachen: (slug: string) =>
    apiClient
      .post<{ scene_id: string; scene_no: number; case_id: string }>(`/resonanz/${slug}/szene`)
      .then(r => r.data),
}
