/**
 * Dokumente zum Fallkontext — Briefe, Chatverläufe, Notizen.
 *
 * **Es wird keine Datei hochgeladen.** Die Oberfläche liest eine Textdatei im Browser aus
 * und schickt ihren Inhalt als gewöhnliches Feld. Damit gibt es keinen Dateispeicher,
 * keinen MIME-Typ, dem man trauen müsste, und nichts, was versehentlich wieder
 * ausgeliefert werden könnte.
 */
import { apiClient } from './client'

export type DocumentKind =
  | 'brief' | 'chatverlauf' | 'nachricht' | 'notiz' | 'protokoll' | 'sonstiges'

export interface CaseDocument {
  id: string
  case_id: string
  title: string
  kind: DocumentKind
  document_date: string | null
  description: string | null
  content: string
  char_count: number
  source_name: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface CaseDocumentList {
  documents: CaseDocument[]
  remaining_slots: number
  max_documents: number
  max_chars_per_document: number
}

export interface CaseDocumentCreate {
  title: string
  kind: DocumentKind
  document_date?: string | null
  description?: string | null
  content: string
  source_name?: string | null
}

export const caseDocumentsApi = {
  list: (caseId: string) =>
    apiClient.get<CaseDocumentList>(`/cases/${caseId}/documents`).then(r => r.data),

  create: (caseId: string, data: CaseDocumentCreate) =>
    apiClient.post<CaseDocument>(`/cases/${caseId}/documents`, data).then(r => r.data),

  /** Nur die Einordnung — der Text eines Belegs bleibt, wie er beigelegt wurde. */
  update: (
    caseId: string,
    documentId: string,
    data: Partial<Pick<CaseDocument, 'title' | 'kind' | 'document_date' | 'description' | 'active'>>,
  ) =>
    apiClient.patch<CaseDocument>(`/cases/${caseId}/documents/${documentId}`, data).then(r => r.data),

  delete: (caseId: string, documentId: string) =>
    apiClient.delete(`/cases/${caseId}/documents/${documentId}`),
}

export const KIND_LABELS: Record<DocumentKind, string> = {
  brief: 'Brief',
  chatverlauf: 'Chatverlauf',
  nachricht: 'Einzelne Nachricht',
  notiz: 'Eigene Notiz',
  protokoll: 'Protokoll / Mitschrift',
  sonstiges: 'Sonstiges',
}
