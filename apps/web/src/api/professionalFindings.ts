/**
 * Die Arbeitsmappe der Fachperson.
 *
 * Was sie von den beiden vorhandenen Ablagen unterscheidet: `professionalApi.notes` ist
 * EIN Formular mit festen Feldern, `echoSummaries` fasst GANZE Gespräche zusammen. Hier
 * liegt der einzelne Gedanke — datiert, mit Art, mit Herkunft, in beliebiger Zahl.
 */
import { apiClient } from './client'

export type FindingKind = 'hypothese' | 'beobachtung' | 'frage' | 'impuls' | 'achtung'
export type FindingStatus = 'offen' | 'bestaetigt' | 'verworfen'

export const FINDING_KIND_LABELS: Record<FindingKind, string> = {
  hypothese:   'Hypothese',
  beobachtung: 'Beobachtung',
  frage:       'Frage fürs Gespräch',
  impuls:      'Gesprächsimpuls',
  achtung:     'Achtung',
}

/** Ein Satz je Art — er erklärt, wofür man sie nimmt, nicht was sie heißt. */
export const FINDING_KIND_HINTS: Record<FindingKind, string> = {
  hypothese:   'Eine Annahme, die sich noch bewähren muss.',
  beobachtung: 'Etwas Konkretes im Material – gilt auch morgen noch.',
  frage:       'Was du beim nächsten Termin ansprechen willst.',
  impuls:      'Ein Angebot, das du machen könntest.',
  achtung:     'Sicherheit, Scham, heikles Thema – vorsichtig ansprechen.',
}

export const FINDING_STATUS_LABELS: Record<FindingStatus, string> = {
  offen:       'offen',
  bestaetigt:  'bestätigt',
  verworfen:   'verworfen',
}

export interface Finding {
  id: string
  case_id: string
  title: string
  body: string
  kind: FindingKind
  status: FindingStatus
  resolved_at: string | null
  source_session: string | null
  source_message: string | null
  /** Bezug in Echos Schreibweise, z. B. „Szene 12". */
  beleg: string | null
  created_at: string
  updated_at: string
}

export interface FindingCreate {
  title: string
  body: string
  kind?: FindingKind
  source_session?: string | null
  source_message?: string | null
  beleg?: string | null
}

export interface FindingUpdate {
  title?: string
  body?: string
  kind?: FindingKind
  status?: FindingStatus
  beleg?: string | null
}

export const findingsApi = {
  list: (caseId: string) =>
    apiClient.get<Finding[]>(`/professional/cases/${caseId}/findings`).then(r => r.data),
  create: (caseId: string, data: FindingCreate) =>
    apiClient.post<Finding>(`/professional/cases/${caseId}/findings`, data).then(r => r.data),
  update: (caseId: string, id: string, data: FindingUpdate) =>
    apiClient.patch<Finding>(`/professional/cases/${caseId}/findings/${id}`, data).then(r => r.data),
  remove: (caseId: string, id: string) =>
    apiClient.delete(`/professional/cases/${caseId}/findings/${id}`).then(r => r.data),
}
