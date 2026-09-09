/**
 * Beziehungsszenen im Paarraum — Regal und Runde.
 *
 * **Was hier auffällt und Absicht ist:** Es gibt keine Methode, die die Antworten der
 * anderen Person abruft. Vor dem Aufdecken gibt der Server sie nicht heraus, und danach
 * stehen sie im Rundenstand. Ein eigener Endpunkt dafür wäre ein zweiter Weg an der
 * Blindheit vorbei.
 */
import { apiClient } from './client'

export type PaarSzenenArt = 'getrennt' | 'geraten'
export type RundenStatus = 'vorgeschlagen' | 'laeuft' | 'aufgedeckt' | 'abgelehnt'

export interface RegalEintrag {
  scene_slug: string
  title: string | null
  perspective: string | null
  wirkungen: string[]
  grund: string | null
  verwaist: boolean
}

export interface RegalAntwort {
  meine: RegalEintrag[]
  ihre: RegalEintrag[]
  /** Slugs, die beide gewählt haben — der Punkt der Übung. */
  gemeinsam: string[]
  max: number
  empfohlen: number
}

export interface PaarFrageOption { key: string; label: string }

/** Bei `getrennt` mit `hinweis`/`platzhalter`, bei `geraten` mit `optionen`/`vermutung`. */
export interface PaarFrage {
  key: string
  label: string
  hinweis?: string
  platzhalter?: string
  zeilen?: number
  vermutung?: string
  optionen?: PaarFrageOption[]
}

export interface TrefferZeile {
  frage: string
  vermutet: string
  wirklich: string
  getroffen: boolean
}

export interface RundeAnsicht {
  id: string
  scene_slug: string
  title: string | null
  perspective: string | null
  art: PaarSzenenArt
  mit_bruecke: boolean
  status: RundenStatus
  ich_habe_vorgeschlagen: boolean
  fragen: PaarFrage[]
  meine_antworten: Record<string, unknown>
  /** Leer, solange nicht aufgedeckt ist — das entscheidet der Server. */
  ihre_antworten: Record<string, unknown>
  ich_bin_fertig: boolean
  /** Die einzige Auskunft über sie vor dem Aufdecken. Ohne sie wartet man vor nichts. */
  sie_ist_fertig: boolean
  treffer: TrefferZeile[]
  verwaist: boolean
}

export interface PaarSzenenStand {
  regal: RegalAntwort
  runde: RundeAnsicht | null
}

const basis = (coupleId: string) => `/couple/links/${coupleId}/szenen`

export const paarSzenenApi = {
  stand: (coupleId: string) =>
    apiClient.get<PaarSzenenStand>(basis(coupleId)).then(r => r.data),

  regalWaehlen: (coupleId: string, scene_slug: string, grund?: string | null) =>
    apiClient
      .put<RegalAntwort>(`${basis(coupleId)}/regal`, { scene_slug, grund: grund ?? null })
      .then(r => r.data),

  regalEntfernen: (coupleId: string, slug: string) =>
    apiClient.delete<RegalAntwort>(`${basis(coupleId)}/regal/${slug}`).then(r => r.data),

  vorschlagen: (
    coupleId: string, scene_slug: string, art: PaarSzenenArt, mit_bruecke: boolean,
  ) =>
    apiClient
      .post<RundeAnsicht>(`${basis(coupleId)}/runden`, { scene_slug, art, mit_bruecke })
      .then(r => r.data),

  annehmen: (coupleId: string, roundId: string) =>
    apiClient
      .post<RundeAnsicht>(`${basis(coupleId)}/runden/${roundId}/annehmen`)
      .then(r => r.data),

  ablehnen: (coupleId: string, roundId: string) =>
    apiClient.post(`${basis(coupleId)}/runden/${roundId}/ablehnen`).then(() => undefined),

  antwortenSichern: (
    coupleId: string, roundId: string,
    antworten: Record<string, unknown>, kommentar?: string | null,
  ) =>
    apiClient
      .put<RundeAnsicht>(`${basis(coupleId)}/runden/${roundId}/antworten`, {
        antworten, kommentar: kommentar ?? null,
      })
      .then(r => r.data),

  fertig: (coupleId: string, roundId: string) =>
    apiClient
      .post<RundeAnsicht>(`${basis(coupleId)}/runden/${roundId}/fertig`)
      .then(r => r.data),
}
