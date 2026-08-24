/**
 * Ehrliches Mitteilen — der einzige Bereich des Paarraums ohne KI.
 *
 * Kein Endpunkt hier ruft Echo auf. Was zwei Menschen einander mitteilen, verlässt den
 * Server nicht: kein Modellaufruf, kein Transfer, keine Deutung. Die Sicherheitsschicht
 * läuft trotzdem, aber mit dem deterministischen Stichwort-Boden, der lokal rechnet.
 */
import { apiClient } from './client'

/** „gehoert" = lies erst · „gegenueber" = die andere ist dran · null = du bist dran. */
export type HonestBlock = 'gehoert' | 'gegenueber' | null

export interface HonestShare {
  id: string
  is_own: boolean
  name: string
  impulse: string | null
  impulse_label: string | null
  body: string
  heard: boolean
  created_at: string
  /** Nur am eigenen Beitrag gesetzt – nie am fremden. */
  safety: { level?: string; source?: string } | null
}

export interface HonestRound {
  id: string
  status: 'arriving' | 'open' | 'closed'
  created_at: string
  closed_at: string | null
}

export interface HonestHistoryEntry {
  id: string
  created_at: string
  closed_at: string | null
  share_count: number
}

export interface HonestView {
  round: HonestRound | null
  arrival_own: { body: string; safety: Record<string, unknown> | null } | null
  arrival_other: { body: string; name: string | null } | null
  /** Dass sie da ist, sieht man immer. Was sie schrieb, erst wenn beide da sind. */
  arrival_other_done: boolean
  shares: HonestShare[]
  my_turn: boolean
  blocked_reason: HonestBlock
  impulses: Record<string, string>
  partner_name: string | null
  history: HonestHistoryEntry[]
  /** Sicherheitshinweis – nur an die schreibende Person, nur beim Absenden. */
  notice: string | null
}

export interface HonestClosedRound {
  round: HonestRound
  shares: { id: string; is_own: boolean; name: string; impulse_label: string | null
            body: string; created_at: string }[]
}

const basis = (coupleId: string) => `/couple/links/${coupleId}/mitteilen`

export const coupleHonestApi = {
  get: (coupleId: string) =>
    apiClient.get<HonestView>(basis(coupleId)).then(r => r.data),

  begin: (coupleId: string) =>
    apiClient.post<HonestView>(`${basis(coupleId)}/beginnen`).then(r => r.data),

  arrive: (coupleId: string, body: string) =>
    apiClient.post<HonestView>(`${basis(coupleId)}/ankommen`, { body }).then(r => r.data),

  share: (coupleId: string, body: string, impulse: string | null) =>
    apiClient.post<HonestView>(`${basis(coupleId)}/beitrag`, { body, impulse })
      .then(r => r.data),

  markHeard: (coupleId: string, shareId: string) =>
    apiClient.post<HonestView>(`${basis(coupleId)}/beitraege/${shareId}/gehoert`)
      .then(r => r.data),

  close: (coupleId: string) =>
    apiClient.post<HonestView>(`${basis(coupleId)}/abschliessen`).then(r => r.data),

  readRound: (coupleId: string, roundId: string) =>
    apiClient.get<HonestClosedRound>(`${basis(coupleId)}/runden/${roundId}`)
      .then(r => r.data),
}
