/**
 * Mein Kompass — Puls, Verlauf, Krisenplan.
 *
 * **Der einzige Teil der Nutzer-API ohne Fall.** Alle anderen Aufrufe hier hängen unter
 * `/cases/{id}/…`; dieser nicht. Das ist das Versprechen des Raums: den eigenen Zustand
 * festhalten, ohne vorher einen Fall anzulegen.
 *
 * **Das Vokabular kommt vom Server.** Zustände, Wortfamilien und die Abschnitte des
 * Krisenplans stehen im Katalog des Backends, nicht hier. Sonst führt die Oberfläche eine
 * zweite Liste, die irgendwann von der ersten abweicht — und niemand merkt es, weil beide
 * für sich stimmig aussehen.
 */
import { apiClient } from './client'
import type { GbWortFamilie } from './gefuehlsbild'

/** Eine der fünf Stufen. Gespeichert wird `wert`, angezeigt `label`. */
export interface KompassZustand {
  wert: number
  label: string
  hinweis: string
}

export interface KompassAnspannung {
  label: string
  links: string
  rechts: string
  min: number
  max: number
}

export interface KrisenplanTeil {
  key: string
  label: string
  hinweis: string
  beispiel: string
}

export interface KompassKatalog {
  zustaende: KompassZustand[]
  /** Ab dieser Stufe fragt der Puls, was geholfen hat. */
  guter_zustand_ab: number
  anspannung: KompassAnspannung
  /** Dieselben Wortfamilien wie im Gefühlsbild — bewusst, nicht zufällig. */
  wortfamilien: GbWortFamilie[]
  krisenplan_teile: KrisenplanTeil[]
}

export interface Puls {
  id: string
  zustand: number
  zustand_label: string | null
  anspannung: number | null
  worte: string[]
  notiz: string | null
  geholfen: string | null
  case_id: string | null
  created_at: string
}

/** Nur `zustand` ist Pflicht. Alles andere darf fehlen — das ist der ganze Punkt. */
export interface PulsNeu {
  zustand: number
  anspannung?: number | null
  worte?: string[]
  notiz?: string | null
  geholfen?: string | null
  case_id?: string | null
}

export interface Krisenplan {
  /** Abschnitt → Zeilen. Die Schlüssel stehen im Katalog, nicht in diesem Typ. */
  inhalt: Record<string, unknown>
  updated_at: string | null
}

export interface KompassUebersicht {
  letzter_puls: Puls | null
  verlauf: Puls[]
  /** Wie viele Momente im Zeitraum — eine Zahl, keine Serie. */
  rhythmus: number
  verlauf_tage: number
  krisenplan_vorhanden: boolean
}

const basis = '/me/kompass'

export const kompassApi = {
  katalog: () =>
    apiClient.get<KompassKatalog>(`${basis}/katalog`).then(r => r.data),

  uebersicht: () =>
    apiClient.get<KompassUebersicht>(basis).then(r => r.data),

  pulsAnlegen: (puls: PulsNeu) =>
    apiClient.post<Puls>(`${basis}/puls`, puls).then(r => r.data),

  pulsLoeschen: (pulsId: string) =>
    apiClient.delete(`${basis}/puls/${pulsId}`).then(() => undefined),

  verlauf: (tage?: number) =>
    apiClient
      .get<Puls[]>(`${basis}/verlauf`, tage ? { params: { tage } } : undefined)
      .then(r => r.data),

  krisenplan: () =>
    apiClient.get<Krisenplan>(`${basis}/krisenplan`).then(r => r.data),

  krisenplanSpeichern: (inhalt: Record<string, string[]>) =>
    apiClient.put<Krisenplan>(`${basis}/krisenplan`, { inhalt }).then(r => r.data),
}
