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
