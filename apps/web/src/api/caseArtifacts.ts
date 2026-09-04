/**
 * Artefakte — die Essenz aus einem Gespräch.
 *
 * **Zwei Schritte, nicht einer.** `extract` destilliert Vorschläge und speichert nichts;
 * erst `create` legt an, mit dem Text, den der Nutzer gesehen und bearbeitet hat. Deshalb
 * gibt es hier kein „bestätigen" — die Bestätigung steckt im Ablauf.
 */
import { apiClient } from './client'

export type ArtifactStatus = 'aktiv' | 'ueberholt'

export interface CaseArtifact {
  /** Stabile Nummer je Fall. */
  artifact_no: number | null
  id: string
  case_id: string
  title: string
  body: string
  source_thread: string | null
  source_session: string | null
  status: ArtifactStatus
  superseded_at: string | null
  created_at: string
  updated_at: string
}

export interface CaseArtifactList {
  artifacts: CaseArtifact[]
  active_count: number
  superseded_count: number
  remaining_slots: number
  max_artifacts: number
}

export interface ArtifactCandidate {
  /** „aktualisierung" löst ein vorhandenes Artefakt ab, statt danebenzutreten. */
  art: 'neu' | 'aktualisierung'
  replaces_id: string | null
  titel: string
  text: string
  /** Ein Satz, warum diese Notiz es wert ist. Wird nicht gespeichert. */
  begruendung: string | null
}

export interface ArtifactSuggestions {
  candidates: ArtifactCandidate[]
  /** Gesetzt, wenn nichts destilliert werden konnte — mit Grund. */
  hinweis: string | null
}

export const caseArtifactsApi = {
  list: (caseId: string) =>
    apiClient.get<CaseArtifactList>(`/cases/${caseId}/artifacts`).then(r => r.data),

  /** Destilliert Vorschläge aus einem Gespräch. Speichert nichts. */
  extract: (caseId: string, threadType: string, chatSessionId?: string | null) =>
    apiClient
      .post<ArtifactSuggestions>(
        `/cases/${caseId}/artifacts/extract`,
        { thread_type: threadType, chat_session_id: chatSessionId ?? null },
        { timeout: 90_000 },
      )
      .then(r => r.data),

  create: (caseId: string, data: {
    title: string
    body: string
    source_thread?: string | null
    source_session?: string | null
    replaces_id?: string | null
  }) => apiClient.post<CaseArtifact>(`/cases/${caseId}/artifacts`, data).then(r => r.data),

  update: (caseId: string, artifactId: string, data: {
    title?: string
    body?: string
    status?: ArtifactStatus
  }) => apiClient.patch<CaseArtifact>(`/cases/${caseId}/artifacts/${artifactId}`, data).then(r => r.data),

  delete: (caseId: string, artifactId: string) =>
    apiClient.delete(`/cases/${caseId}/artifacts/${artifactId}`),
}
