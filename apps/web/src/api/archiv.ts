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

  /** Eine Datei fuer die eigene Akte. `caseId` weglassen = alles auf einmal. */
  export: (caseId?: string) =>
    apiClient
      .get(caseId ? `/professional/archiv/${caseId}/export` : '/professional/archiv/export',
        { responseType: 'blob' })
      .then(r => r.data as Blob),
}

/**
 * Die heruntergeladene Datei speichern.
 *
 * Steht hier und nicht im Bauteil, weil derselbe Ablauf an zwei Knoepfen haengt - und
 * weil ein vergessenes revokeObjectURL ein Leck ist, das niemand bemerkt.
 */
export function speichern(blob: Blob, dateiname: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = dateiname
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
