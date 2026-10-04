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
// Hochgezaehlt am 04.10.2026: „sensible Inhalte" und „KI-Verarbeitung" sind ab
// hier getrennte Einwilligungen (vorher beide im Feld `sensitive_ai`). Wer
// hochzaehlt, holt alle Einwilligungen neu ein - das ist Absicht und der Grund,
// warum die Fassung ueberhaupt im Nachweis steht.
export const CONSENT_VERSION = '2026-10-04-v2'

export interface ConsentRecord {
  version: string
  privacy_policy: boolean
  /** Alte Fassungen (bis 2026-06-16-v1): Inhalte UND KI gebuendelt. Bleibt im Nachweis. */
  sensitive_ai: boolean
  /** Ab 2026-10-04-v2 getrennt. `null` bei aelteren Zeilen. */
  inhalte: boolean | null
  ki: boolean | null
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
  inhalte?: boolean
  ki?: boolean
  age_confirmed: boolean
  items?: Record<string, unknown>
}): Promise<ConsentRecord> {
  const res = await apiClient.post('/account/consent', body)
  return res.data
}

/**
 * Einwilligungen erteilen und widerrufen (Art. 7 Abs. 3 DSGVO).
 *
 * Der Widerruf muss so einfach sein wie die Erteilung — ein Aufruf, keine Rueckfrage,
 * keine Begruendung. Umgekehrt genauso: Wer wieder einwilligt, soll das in einem Klick
 * koennen.
 */
export interface EinwilligungsStand {
  ki_verarbeitung_widerrufen: boolean
  ki_verarbeitung_widerrufen_am: string | null
}

export const einwilligungenApi = {
  stand: () =>
    apiClient.get<EinwilligungsStand>('/account/einwilligungen').then(r => r.data),
  widerrufen: (was: string) =>
    apiClient.post('/account/einwilligungen/widerrufen', { was }).then(r => r.data),
  erteilen: (was: string) =>
    apiClient.post('/account/einwilligungen/erteilen', { was }).then(r => r.data),
}

/**
 * Die Audio-Einwilligung — beim ERSTEN Aufnahmeversuch, nicht an der Tuer.
 *
 * Eine Einwilligung soll fuer einen bestimmten Zweck und informiert sein (Art. 4 Nr. 11
 * DSGVO). Im Einwilligungs-Dialog abgefragt, wo niemand weiss, ob er je ein Mikrofon
 * benutzt, waere sie beides nicht. Sie ist ausserdem die einzige der vier, die man
 * folgenlos ablehnen kann: Wer nicht spricht, tippt.
 */
export const AUDIO_CONSENT_VERSION = 'audio-2026-10-04-v1'

export const audioEinwilligung = {
  stand: () =>
    apiClient.get<{ audio: boolean }>('/account/audio-einwilligung').then(r => r.data),
  erteilen: () =>
    apiClient.post('/account/audio-einwilligung', { version: AUDIO_CONSENT_VERSION })
      .then(r => r.data),
}
