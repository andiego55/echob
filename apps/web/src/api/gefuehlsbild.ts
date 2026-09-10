/**
 * Das Gefühlsbild — Entwurf, Vorschlag, Bestätigung.
 *
 * **Zwei Schritte, nicht einer.** `schreiben` lässt Echo einen Text vorschlagen und
 * speichert nichts; erst `sichern` legt den bearbeiteten Text ab, und erst `bestaetigen`
 * macht daraus eine Momentaufnahme. Ein Text über die eigenen Gefühle, den jemand nicht
 * gelesen und gebilligt hat, gehört ihm nicht.
 */
import { apiClient } from './client'

export interface GbWort { key: string; label: string }
export interface GbWortFamilie { key: string; label: string; worte: GbWort[] }
export interface GbAchse { key: string; label: string; links: string; rechts: string }

export interface GbSzene {
  slug: string
  title: string | null
  wirkungen: string[]
}

export interface GbWortMitFamilie { key: string; label: string; familie: string }

export interface Gefuehlsbild {
  id: string
  status: 'entwurf' | 'bestaetigt'
  szenen: string[]
  feld: Record<string, number>
  woerter: string[]
  eigenes: string | null
  /** Echos Text nach der Bearbeitung. Was hier steht, hat die Person gebilligt. */
  bericht: string | null
  created_at: string
  updated_at: string
  bestaetigt_at: string | null
  szenen_titel: GbSzene[]
  woerter_labels: GbWortMitFamilie[]
  /** Der Name der Ecke, in der der Punkt liegt („angespannt, aufgebracht“). */
  ecke: string | null
}

export interface GefuehlsbildStand {
  entwurf: Gefuehlsbild
  verlauf: Gefuehlsbild[]
  wortfeld: GbWortFamilie[]
  achsen: GbAchse[]
  regler: GbAchse[]
  max_szenen: number
  max_worte: number
}

export interface GefuehlsbildVorschlag {
  bericht: string
  hinweis: string | null
}

/**
 * Was die Fall-Übersicht braucht — **und was `stand` dort verbieten würde.**
 *
 * `stand` legt einen Entwurf an. Die Übersicht wird bei jedem Besuch geöffnet; riefe sie
 * `stand`, entstünde für jeden Fall eine leere Momentaufnahme, nur weil jemand auf die
 * Startseite geschaut hat.
 */
export interface GefuehlsbildUeberblick {
  /** Das jüngste bestätigte — oder nichts. */
  aktuell: Gefuehlsbild | null
  /** Liegt ein angefangener Entwurf da? Macht aus „Öffnen“ ein „Weitermachen“. */
  entwurf_begonnen: boolean
  anzahl: number
}

/** `null`/weggelassen heißt „nicht angefasst" — sonst löscht ein Schritt die anderen. */
export interface GefuehlsbildTeil {
  szenen?: string[] | null
  feld?: Record<string, number> | null
  woerter?: string[] | null
  eigenes?: string | null
  bericht?: string | null
}

const basis = (caseId: string) => `/cases/${caseId}/gefuehlsbild`

export const gefuehlsbildApi = {
  stand: (caseId: string) =>
    apiClient.get<GefuehlsbildStand>(basis(caseId)).then(r => r.data),

  ueberblick: (caseId: string) =>
    apiClient
      .get<GefuehlsbildUeberblick>(`${basis(caseId)}/ueberblick`)
      .then(r => r.data),

  sichern: (caseId: string, teil: GefuehlsbildTeil) =>
    apiClient.put<Gefuehlsbild>(basis(caseId), teil).then(r => r.data),

  schreiben: (caseId: string) =>
    apiClient
      .post<GefuehlsbildVorschlag>(`${basis(caseId)}/schreiben`)
      .then(r => r.data),

  bestaetigen: (caseId: string) =>
    apiClient.post<Gefuehlsbild>(`${basis(caseId)}/bestaetigen`).then(r => r.data),
}
