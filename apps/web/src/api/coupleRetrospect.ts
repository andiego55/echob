import { apiClient } from './client'

/**
 * Rückblick über Zeit – was sich verändert hat, nicht nur dass ihr arbeitet.
 *
 * Die Zahlen werden bei jedem Aufruf frisch gerechnet; gespeichert wird nur Echos Text.
 * `barometer_avg` ist der Durchschnitt BEIDER – die Tageskurve der anderen Person gibt der
 * Server bewusst nie heraus.
 */
export interface CoupleRetrospectStats {
  period_start: string
  period_end: string
  days: number
  barometer_avg: number | null
  barometer_avg_before: number | null
  barometer_delta: number | null
  moods: { mood: string; anzahl: number }[]
  /** Abgeschlossene Runden Ehrliches Mitteilen. Kein Ergebnis – eine Tatsache
   *  über die Praxis, wie die Check-in-Wochen daneben. */
  honest_rounds: number
  checkin_weeks: number
  sessions_started: number
  sessions_closed: number
  topics_opened: number
  topics_resolved: number
  agreements_made: number
  agreements_kept: number
  agreements_dropped: number
  appreciations: number
  /** Reicht die Datenlage für einen sinnvollen Text? */
  has_substance: boolean
}

export interface CoupleRetrospective {
  id: string
  created_by: string
  period_start: string
  period_end: string
  body: string
  created_at: string
}

export interface CoupleRetrospectView {
  stats: CoupleRetrospectStats
  retrospectives: CoupleRetrospective[]
}

export const coupleRetrospectApi = {
  get: (coupleId: string, days = 30) =>
    apiClient.get<CoupleRetrospectView>(`/couple/links/${coupleId}/rueckblick`, {
      params: { days },
    }).then(r => r.data),

  write: (coupleId: string, days = 30) =>
    apiClient.post<CoupleRetrospective>(`/couple/links/${coupleId}/rueckblick`, { days })
      .then(r => r.data),

  remove: (retroId: string) =>
    apiClient.delete(`/couple/rueckblick/${retroId}`),
}
