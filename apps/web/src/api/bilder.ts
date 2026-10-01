import { apiClient } from './client'

/**
 * Die Bildwerkstatt.
 *
 * **Nur der Aufruf zum Malen hat eine eigene Frist**, und er braucht sie: Dort arbeiten zwei
 * Modelle hintereinander. Alles andere liefert Listen und Zahlen; dafür reicht die Vorgabe des
 * Clients.
 *
 * **Hier stand einmal auch der gerechnete Weg** — ein SVG, das der Browser aus Zahlen zeichnet
 * (`werte`, `aufheben`). Er ist draußen: Er zeigte die Daten exakt und half damit niemandem
 * weiter. Bilder dieser Art, die jemand aufgehoben hat, bleiben in seiner Galerie — sie
 * gehören ihm, und entstehen soll nur nichts Neues davon.
 */
const basis = (caseId: string) => `/cases/${caseId}/bilder`

export interface GespeichertesBild {
  id: string
  case_id: string
  art: 'gerechnet' | 'erzeugt'
  einstellungen: {
    palette?: string
    bildwelt?: string
    handschrift?: string
    abstraktion?: string
    /** Nur bei alten Bildern aus dem gerechneten Weg. */
    anordnung?: string
    dichte?: string
    schichten?: string[]
    gewichte?: Record<string, string>
    stimmungen?: string[]
  }
  /** Nur bei `art: 'gerechnet'` — alte Bilder aus dem Datenbild-Weg. */
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
   */
  legende?: LegendenZeile[] | null
  created_at: string
  updated_at: string
}

/** Ein Eintrag aus einem der Kataloge: Schlüssel, Etikett, ein Satz dazu. */
export interface Wahlmoeglichkeit {
  key: string
  label: string
  hinweis?: string
}

/** Eine Szene zum Auswählen — Titel und Datum, kein Text. */
export interface SzeneZurWahl {
  id: string
  nummer: number | null
  titel: string
  datum: string
}

/** Eine Zeile der Legende: was im Bild wofür steht. */
export interface LegendenZeile { was: string; wofuer: string }

/** Alles, was die Oberfläche zum Bauen des Menüs braucht. */
export interface BildKatalog {
  bildwelten: Wahlmoeglichkeit[]
  handschriften: Wahlmoeglichkeit[]
  paletten: Wahlmoeglichkeit[]
  symbolik: Wahlmoeglichkeit[]
  figur: Wahlmoeglichkeit[]
  haltungen: Wahlmoeglichkeit[]
  begleitungen: Wahlmoeglichkeit[]
  gewichte: Wahlmoeglichkeit[]
  elemente: Wahlmoeglichkeit[]
  abstraktion: Wahlmoeglichkeit[]
  stimmungen: Wahlmoeglichkeit[]
  max_stimmungen: number
}

/** Die Bestellung eines Bildes — alles, was die Person gewählt hat. */
export interface Bildwahl {
  /**
   * Woraus das Bild entsteht: „fall" oder „baukasten".
   *
   * Eine Wahl über die eigenen Texte, deshalb gehört sie der Person: Auf dem Weg „fall" liest
   * ein Sprachmodell den Fall und entwirft das Bild daraus.
   */
  quelle: string
  /** Die Metapher — was das Bild zeigt. */
  bildwelt: string
  /** Die Handschrift — wie gemalt wird. */
  handschrift: string
  palette: string
  /** Konkret · normal · abstrakt. */
  abstraktion: string
  /** Was wie schwer wiegt: {"szenen": "viel", "gefuehl": "aus", …} */
  gewichte: Record<string, string>
  /** Höchstens drei — darüber heben sie sich auf. */
  stimmungen: string[]
  /** Kennungen der Szenen, die auf jeden Fall ins Bild sollen. */
  szenen: string[]
  symbolik: string
  /**
   * Wer vorkommt: „keine", „ich" (von hinten) oder „ich_sichtbar" (mit Gesicht).
   *
   * Bei „ich_sichtbar" ist das Aussehen **frei erfunden** — aus der Selbstauskunft kommen nur
   * Altersspanne und Geschlecht. Die Person, um die es im Fall geht, kommt nie mit Gesicht und
   * nie nah vor.
   */
  figur: string
  /** „fall" (der Fall entscheidet) oder eine der fünf Haltungen. */
  haltung: string
  /** „keine", „fall" oder „freitext". */
  begleitung: string
  /** Nur mit `begleitung: 'freitext'`. Geht nie direkt an das Bildmodell. */
  begleitung_text: string
  /** Ein Wunsch zum Bild. Geht nie direkt an das Bildmodell. */
  wunsch: string
}

export const bilderApi = {
  galerie: (caseId: string) =>
    apiClient.get<GespeichertesBild[]>(basis(caseId)).then(r => r.data),

  satz: (caseId: string, bildId: string, satz: string) =>
    apiClient.patch<GespeichertesBild>(`${basis(caseId)}/${bildId}`, { satz })
      .then(r => r.data),

  /** Alle Kataloge auf einmal — eine Auskunft, kein Datenbankzugriff. */
  katalog: (caseId: string) =>
    apiClient.get<BildKatalog>(`${basis(caseId)}/handschriften`).then(r => r.data),

  /** Die bestätigten Szenen zum Auswählen — Titel und Datum, kein Text. */
  szenen: (caseId: string) =>
    apiClient.get<SzeneZurWahl[]>(`${basis(caseId)}/szenen`).then(r => r.data),

  /**
   * Lässt ein Bildmodell malen — **der einzige Aufruf hier, der etwas kostet und dauert.**
   *
   * Deshalb hat er als einziger eine eigene Frist: Die Vorgabe des Clients (15 Sekunden) würde
   * abbrechen, während der Server weiterarbeitet — das Bild entstünde, das Kontingent wäre
   * verbucht, und auf dem Schirm stünde ein Netzwerkfehler.
   *
   * **Auf dem Weg „fall" sind es ZWEI Modellaufrufe hintereinander:** Erst schreibt ein
   * Sprachmodell den Bildauftrag, dann malt das Bildmodell. Die vier Minuten sind dafür
   * gerechnet und nicht für einen.
   */
  malen: (caseId: string, wahl: Bildwahl) => apiClient
    .post<GespeichertesBild>(`${basis(caseId)}/malen`, wahl, { timeout: 240_000 })
    .then(r => r.data),

  /**
   * Die Bytes eines gemalten Bildes.
   *
   * Über den API-Client und nicht über eine Adresse: Der Endpunkt verlangt eine Anmeldung, und
   * wovon es keine öffentliche Adresse gibt, kann auch keine herumliegen.
   */
  datei: (caseId: string, bildId: string) =>
    apiClient
      .get<Blob>(`${basis(caseId)}/${bildId}/datei`,
        { responseType: 'blob', timeout: 120_000 })
      .then(r => r.data),

  loeschen: (caseId: string, bildId: string) =>
    apiClient.delete(`${basis(caseId)}/${bildId}`).then(() => undefined),
}
