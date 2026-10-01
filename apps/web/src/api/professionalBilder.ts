import { apiClient } from './client'
import type { LegendenZeile } from './bilder'

/**
 * Freigegebene Bilder — für die Fachperson.
 *
 * **Ein eigenes Modul, weil es ein eigener Weg ist.** Die Bilder kommen nicht mit dem Bündel
 * des Falls, sondern über zwei Routen, die nur es gibt. Das ist die Bedingung, unter der es
 * diese Freigabe gibt: Was nicht im Bündel ist, kann nicht in das Kontextband geraten, das
 * daraus für das Gespräch mit Echo gebaut wird.
 *
 * Wer wissen will, wie ein Bild eine Fachperson erreicht, liest diese Datei und
 * `professional_bilder.py` — und sonst nichts.
 */

export interface FreigegebenesBild {
  id: string
  art: 'gerechnet' | 'erzeugt'
  einstellungen: { bildwelt?: string; handschrift?: string }
  /** Der Satz, den die Person unter ihr Bild geschrieben hat. */
  satz: string | null
  /**
   * Was im Bild wofür steht — so, wie es beim Entstehen gespeichert wurde.
   *
   * **Nicht Beigabe.** Ein Bild ohne Legende ist eine Projektionsfläche: Wer nicht weiß, dass
   * die Tür im Flur aus einer bestimmten Szene kommt, deutet sie — und deutet dann unser Bild
   * statt der Lage.
   */
  legende: LegendenZeile[] | null
  /** Nur bei alten Datenbildern: Das Bild liegt als SVG schon in dieser Antwort. */
  svg: string | null
  /** Nur bei gemalten: Es LIEGT eine Datei, die einzeln geholt wird. */
  hat_datei: boolean
  created_at: string
}

const basis = (caseId: string) => `/professional/cases/${caseId}/bilder`

export const professionalBilderApi = {
  /** Die Liste — Satz, Legende, Datum. Ohne die Bytes. */
  liste: (caseId: string) =>
    apiClient.get<FreigegebenesBild[]>(basis(caseId)).then(r => r.data),

  /**
   * Die Bytes eines Bildes.
   *
   * Über den API-Client und nicht über eine Adresse: Der Endpunkt verlangt eine Anmeldung,
   * und wovon es keine öffentliche Adresse gibt, kann auch keine in einem Browserverlauf
   * liegen bleiben — erst recht nicht auf einem Rechner, der in einer Praxis mehreren gehört.
   */
  datei: (caseId: string, bildId: string) =>
    apiClient
      .get<Blob>(`${basis(caseId)}/${bildId}/datei`,
        { responseType: 'blob', timeout: 120_000 })
      .then(r => r.data),
}
