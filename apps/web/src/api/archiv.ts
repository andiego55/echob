/**
 * Archiv beendeter Fälle — nur lesen.
 *
 * Hier fehlt jede schreibende Funktion, und das ist keine Lücke. Nach dem Widerruf
 * arbeitet niemand mehr an dem Fall; was bleibt, ist die Dokumentationspflicht der
 * Fachperson (§ 630f BGB, zehn Jahre). Lesen ja, nachtragen nein.
 */
import { apiClient } from './client'

export interface ArchivFall {
  case_id: string
  client_display_name: string | null
  case_title: string | null
  freigegeben_am: string | null
  beendet_am: string | null
  beendet: boolean
  sitzungsnotizen: number
  vereinbarungen: number
  termine: number
}

export interface ArchivNotiz {
  id: string
  session_date: string
  title: string | null
  content: { sections?: { heading: string; text: string }[] }
}

export interface ArchivDetail {
  fall: ArchivFall
  ueberblick: Record<string, string> | null
  sitzungsnotizen: ArchivNotiz[]
  vereinbarungen: { id: string; type: string; title: string | null; status: string; created_at: string }[]
  termine: { id: string; title: string | null; start_at: string; status: string }[]
}

export const archivApi = {
  liste: () => apiClient.get<ArchivFall[]>('/professional/archiv').then(r => r.data),
  detail: (caseId: string) =>
    apiClient.get<ArchivDetail>(`/professional/archiv/${caseId}`).then(r => r.data),
}
