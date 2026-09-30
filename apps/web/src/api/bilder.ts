import { apiClient } from './client'
import type { BildWerte, Schicht } from '@/lib/lagebild'

/**
 * Die Bildwerkstatt.
 *
 * **Keine Frist auf diesen Aufrufen, und das ist kein Versehen.** Hier arbeitet kein Modell:
 * Der Server liefert Zahlen, gezeichnet wird im Browser. Damit greift die Vorgabe des Clients
 * (15 Sekunden), und sie ist reichlich — anders als bei jedem Podcast-Aufruf, der eine eigene
 * Frist braucht.
 */
const basis = (caseId: string) => `/cases/${caseId}/bilder`

export interface GespeichertesBild {
  id: string
  case_id: string
  art: 'gerechnet' | 'erzeugt'
  einstellungen: {
    palette?: string
    anordnung?: string
    dichte?: string
    schichten?: string[]
    handschrift?: string
  }
  /** Nur bei `art: 'gerechnet'`. */
  svg: string | null
  satz: string | null
  /**
   * Nur bei `art: 'erzeugt'`: Es LIEGT eine Datei.
   *
   * Die Bytes kommen nicht mit der Galerie — ein gemaltes Bild ist ein Megabyte, und zwanzig
   * davon in einer Antwort wären eine Ladezeit, die niemand versteht. Jedes wird einzeln
   * über `datei()` geholt.
   */
  hat_datei?: boolean
  /** Nur bei `art: 'erzeugt'`: woraus es entstanden ist. */
  prompt?: string | null
  /**
   * Was in DIESEM Bild wofür steht — mitgespeichert, nicht nachgerechnet.
   *
   * **Sonst erklärt die Legende irgendwann etwas, das nicht auf dem Bild ist.** Sie wäre
   * berechenbar, solange die Bildsprache unverändert bleibt, und genau das ist sie nicht.
   * Vorher kam sie nur mit der Antwort des Malens: Wer die Seite neu lud, hatte ein Bild
   * ohne Erklärung.
   */
  legende?: LegendenZeile[] | null
  created_at: string
  updated_at: string
}

export interface Handschrift {
  key: string
  label: string
  hinweis: string
}

/** Eine Zeile der Legende: was im Bild wofür steht. */
export interface LegendenZeile { was: string; wofuer: string }

export const bilderApi = {
  /**
   * Die Zahlen für ein Lagebild.
   *
   * `schichten` bestimmt, was der Server überhaupt abfragt — eine abgewählte Schicht wird
   * nicht geladen. Die Werkstatt fragt deshalb die Vereinigung aller je eingeschalteten
   * Schichten ab: Abschalten kostet dann keinen Abruf, und Einschalten genau einen.
   */
  werte: (caseId: string, schichten: Schicht[]) =>
    apiClient
      .get<BildWerte>(`${basis(caseId)}/werte`,
        { params: { schichten: [...schichten].sort().join(',') } })
      .then(r => r.data),

  galerie: (caseId: string) =>
    apiClient.get<GespeichertesBild[]>(basis(caseId)).then(r => r.data),

  aufheben: (caseId: string, body: {
    einstellungen: Record<string, unknown>
    svg: string
    satz: string
  }) => apiClient.post<GespeichertesBild>(basis(caseId), body).then(r => r.data),

  satz: (caseId: string, bildId: string, satz: string) =>
    apiClient.patch<GespeichertesBild>(`${basis(caseId)}/${bildId}`, { satz })
      .then(r => r.data),

  /** Bildwelten (was zu sehen ist) und Handschriften (wie gemalt wird). */
  bildwelten: (caseId: string) =>
    apiClient
      .get<{
        bildwelten: Handschrift[]
        handschriften: Handschrift[]
        symbolik: Handschrift[]
        figur: Handschrift[]
        haltungen: Handschrift[]
        /** Leer, wenn eine Begleitung fuer diesen Fall nicht in Frage kommt. */
        begleitungen: Handschrift[]
      }>(`${basis(caseId)}/handschriften`)
      .then(r => r.data),

  /**
   * Lässt ein Bildmodell malen — **der einzige Aufruf hier, der etwas kostet und dauert.**
   *
   * Deshalb hat er als einziger eine eigene Frist: Ein Bildmodell braucht eine halbe bis
   * ganze Minute, und die Vorgabe des Clients (15 Sekunden) würde abbrechen, während der
   * Server weiterarbeitet — das Bild entstünde, das Kontingent wäre verbucht, und auf dem
   * Schirm stünde ein Netzwerkfehler.
   *
   * **Auf dem Weg „fall" sind es ZWEI Modellaufrufe hintereinander:** Erst schreibt ein
   * Sprachmodell den Bildauftrag, dann malt das Bildmodell. Die vier Minuten sind dafür
   * gerechnet und nicht für einen — wer hier kürzt, kürzt an der Stelle, an der ein
   * bezahltes Bild entsteht, das niemand zu sehen bekommt.
   */
  malen: (caseId: string, body: {
    bildwelt: string
    handschrift: string
    palette: string
    schichten: string[]
    symbolik: string
    /** „keine" oder „ich". Die Person, um die es im Fall geht, wird nie eine Gestalt. */
    figur: string
    /** Was die Gestalt tut — eine Aussage der Person, keine Ableitung aus den Daten. */
    haltung: string
    /** „keine", „kind" oder „kinder". Der Server entscheidet, ob das geht. */
    begleitung: string
    /**
     * Woraus das Bild entsteht: „fall" oder „baukasten".
     *
     * Eine Wahl über die eigenen Texte, deshalb gehört sie der Person: Auf dem Weg „fall"
     * liest ein Sprachmodell den Fall und entwirft das Bild daraus — die Texte gehen dabei an
     * denselben Anbieter, der sie für Echo und die Berichte schon bekommt.
     */
    quelle: string
  }) => apiClient
    .post<GespeichertesBild & { legende: LegendenZeile[] }>(
      `${basis(caseId)}/malen`, body, { timeout: 240_000 })
    .then(r => r.data),

  /**
   * Die Bytes eines gemalten Bildes.
   *
   * Über den API-Client, also mit Anmeldung: Ein `<img src>` kann sich nicht anmelden, und
   * eine öffentliche Adresse soll es nicht geben — ein Bild reist weiter als Text.
   */
  datei: (caseId: string, bildId: string) =>
    apiClient
      .get<Blob>(`${basis(caseId)}/${bildId}/datei`,
        { responseType: 'blob', timeout: 120_000 })
      .then(r => r.data),

  loeschen: (caseId: string, bildId: string) =>
    apiClient.delete(`${basis(caseId)}/${bildId}`).then(() => undefined),
}
