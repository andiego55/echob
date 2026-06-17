/** API: Konto & DSGVO-Datenrechte (/api/v1/account) */
import { apiClient } from './client'

/** Lädt alle bei EchoB gespeicherten eigenen Daten als JSON-Blob (Art. 15/20). */
export async function exportMyData(): Promise<Blob> {
  const res = await apiClient.get('/account/export', { responseType: 'blob' })
  return res.data as Blob
}

/** Löscht endgültig alle Daten und das Login-Konto (Art. 17). */
export async function deleteMyAccount(): Promise<{ deleted: boolean; rows: Record<string, number> }> {
  const res = await apiClient.delete('/account')
  return res.data
}

/** Aktuelle Version des Einwilligungstexts. Bei inhaltlicher Änderung erhöhen → erneute Einwilligung. */
export const CONSENT_VERSION = '2026-06-16-v1'

export interface ConsentRecord {
  version: string
  privacy_policy: boolean
  sensitive_ai: boolean
  age_confirmed: boolean
  accepted_at: string
}

/** Neueste erteilte Einwilligung der Person (oder null). */
export async function getConsent(): Promise<ConsentRecord | null> {
  const res = await apiClient.get('/account/consent')
  return (res.data as ConsentRecord | null) ?? null
}

/** Protokolliert eine erteilte Einwilligung (DSGVO Art. 7). */
export async function recordConsent(body: {
  version: string
  privacy_policy: boolean
  sensitive_ai: boolean
  age_confirmed: boolean
  items?: Record<string, unknown>
}): Promise<ConsentRecord> {
  const res = await apiClient.post('/account/consent', body)
  return res.data
}
