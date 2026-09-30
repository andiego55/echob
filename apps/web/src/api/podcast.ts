import { apiClient } from './client'

/**
 * Das Podcast-Studio — der eigene Fall als gesprochene Nachricht.
 *
 * Eigene Datei neben `reports.ts`: Das Modul steht für sich, mit eigenem Katalog, eigenem
 * Dienst und eigenem Router. Wer es eines Tages herausnimmt, nimmt eine Handvoll Dateien
 * mit und lässt nichts zurück.
 */
/**
 * Der gemeinsame Pfad — aber **nicht für die beiden Aufrufe, die ein Modell anstoßen.**
 *
 * `anlegen` und `sprechen` schreiben ihren Pfad ausgeschrieben hin, obwohl es hier eine
 * Hilfe gibt. Der Fristen-Wächter (`tests/modell-fristen.test.ts`) liest nur wörtliche
 * Pfade als erstes Argument eines `post`; hinter einem Funktionsaufruf wird er blind. Er
 * bliebe dabei grün — und wer die Frist später entfernt, bekäme keinen roten Test, sondern
 * einen Knopf, der bei langen Antworten abbricht, während der Server weiterschreibt und
 * das Kontingent verbraucht.
 *
 * Die Wiederholung ist also Absicht. Wer sie „aufräumt", nimmt dem Wächter die Sicht.
 */
const basis = (caseId: string) => `/cases/${caseId}/podcasts`

export interface PodcastKapitelVorlage {
  key: string
  titel: string
  /** Der Auftrag ans Modell — die Oberfläche zeigt ihn NICHT. */
  auftrag?: string
  anteil: number
}

export interface PodcastFormat {
  key: string
  label: string
  beschreibung: string
  ansprachen: string[]
  elemente: string[]
  kapitel: PodcastKapitelVorlage[]
  braucht_traumbeziehung?: boolean
}

export interface PodcastElement { key: string; label: string; hinweis: string }
export interface PodcastGewichtung { key: string; label: string; anteil: number }
export interface PodcastLaenge {
  key: string; label: string; minuten: number; woerter: number; hinweis: string
}
export interface PodcastStimme {
  key: string; label: string; klang: string; hinweis: string
}
export interface PodcastAnsprache { key: string; label: string; hinweis: string }

/**
 * Eine Art von Kapitel im Baukasten.
 *
 * Ohne `auftrag`: Der fachliche Auftrag bleibt auf dem Server. Er liest sich wie eine
 * Beschreibung und ist eine Anweisung an ein Modell — auf einem Bildschirm gelesen klingt er
 * wie ein geprüftes Versprechen.
 */
export interface PodcastBaustein {
  key: string
  label: string
  titel_vorschlag: string
  hinweis: string
  braucht_szene?: boolean
}

export interface PodcastKapitelLaenge { key: string; label: string; gewicht: number }

export interface PodcastKatalog {
  formate: PodcastFormat[]
  max_folgen_je_fall?: number
  /** Nur gefüllt, wenn mit `?format=` geholt — sonst wären es fünf Listen auf Vorrat. */
  format?: PodcastFormat
  elemente?: PodcastElement[]
  ansprachen?: PodcastAnsprache[]
  gewichtungen?: PodcastGewichtung[]
  laengen?: PodcastLaenge[]
  stimmen?: PodcastStimme[]
  /** Der Baukasten — nur beim Abruf ohne `?format=`. */
  eigenes_format?: string
  bausteine?: PodcastBaustein[]
  kapitel_laengen?: PodcastKapitelLaenge[]
  max_eigene_kapitel?: number
  max_eigene_anweisung?: number
}

export interface PodcastKapitel {
  id: string
  nr: number
  kapitel_key: string
  titel: string
  text: string
  sekunden: number | null
  /** Nur bei selbstgebauten Kapiteln: was die Person bestellt hat. */
  auftrag?: string | null
  szene_id?: string | null
  kapitel_laenge?: string | null
  /** Ob dieses Kapitel schon eine Tonspur hat. Daran hängt die Wiederaufnahme. */
  gesprochen: boolean
}

export type PodcastStatus = 'entwurf' | 'skript' | 'spricht' | 'fertig' | 'fehler'

export interface Podcast {
  id: string
  case_id: string
  format: string
  format_label: string
  laenge: string
  stimme: string
  stimme_label: string
  ansprache: string
  gewichte: Record<string, string>
  titel: string | null
  /** Der Freitext für diese Folge, falls einer gesetzt wurde. */
  eigene_anweisung?: string | null
  status: PodcastStatus
  fehler: string | null
  sekunden: number | null
  created_at: string
  updated_at: string
  kapitel?: PodcastKapitel[]
}

export interface PodcastBestellung {
  format: string
  laenge: string
  stimme: string
  ansprache: string
  gewichte: Record<string, string>
  ohne_kapitel?: string[]
  /** Selbstgebaute Kapitel — nur bei `format: "eigenes"`. */
  kapitel?: {
    baustein: string
    titel: string
    eigener_auftrag: string
    kapitel_laenge: string
    szene_id: string | null
  }[]
  /** Freitext für diese Folge. Gilt für jedes Format. */
  eigene_anweisung?: string
}

export const podcastApi = {
  katalog: (caseId: string, format?: string) =>
    apiClient
      .get<PodcastKatalog>(`${basis(caseId)}/katalog`,
        { params: format ? { format } : undefined })
      .then(r => r.data),

  liste: (caseId: string) =>
    apiClient.get<Podcast[]>(basis(caseId)).then(r => r.data),

  holen: (caseId: string, podcastId: string) =>
    apiClient.get<Podcast>(`${basis(caseId)}/${podcastId}`).then(r => r.data),

  /**
   * Legt an und schreibt das Skript — **noch ohne eine Stimme.**
   *
   * Die Frist steht dabei, wie bei jedem Modellaufruf: Die Vorgabe von 15 Sekunden ist für
   * ein Skript von zweitausendachthundert Wörtern viel zu kurz, und ohne sie bricht der
   * Browser ab, während der Server weiterschreibt.
   */
  anlegen: (caseId: string, body: PodcastBestellung) =>
    apiClient
      .post<Podcast>(`/cases/${caseId}/podcasts`, body, { timeout: 180_000 })
      .then(r => r.data),

  /**
   * Erzeugt die Tonspuren — kapitelweise, und nimmt auf, wo es aufgehört hat.
   *
   * Die längste Frist im ganzen Projekt: Eine zwanzigminütige Folge sind sechs
   * Sprachaufrufe hintereinander. Bricht der Browser vorher ab, ist die Arbeit trotzdem
   * getan und bezahlt — die fertigen Kapitel stehen, und ein neuer Anlauf nimmt den Rest.
   */
  sprechen: (caseId: string, podcastId: string) =>
    apiClient
      .post<Podcast>(`/cases/${caseId}/podcasts/${podcastId}/sprechen`, undefined,
        { timeout: 600_000 })
      .then(r => r.data),

  umbenennen: (caseId: string, podcastId: string, titel: string) =>
    apiClient.patch<Podcast>(`${basis(caseId)}/${podcastId}`, { titel }).then(r => r.data),

  loeschen: (caseId: string, podcastId: string) =>
    apiClient.delete(`${basis(caseId)}/${podcastId}`).then(() => undefined),

  /**
   * Die Adresse einer Tonspur.
   *
   * Sie geht durch denselben API-Client wie alles andere — also mit Anmeldung. Ein
   * `<audio src>` kann das nicht, deshalb holt der Abspieler die Bytes und macht daraus
   * eine Objekt-URL. Umständlicher als ein Link, und genau darum geht es: Eine Aufnahme
   * über eine Beziehung ist nichts, wovon eine öffentliche Adresse herumliegen soll.
   */
  tonHolen: (caseId: string, podcastId: string, kapitelId: string) =>
    apiClient
      .get<Blob>(`${basis(caseId)}/${podcastId}/kapitel/${kapitelId}/ton`,
        { responseType: 'blob', timeout: 120_000 })
      .then(r => r.data),

  /**
   * Zwei gesprochene Sätze — ohne Fall, ohne Kontingent.
   *
   * Eigener Pfad ohne `case_id`: Die Probe hat mit einem Fall nichts zu tun, und nur so
   * lässt sich dieser eine Endpunkt eigens begrenzen (die Anfragebegrenzung arbeitet über
   * Pfad-Präfixe).
   */
  stimmprobe: (stimme: string) =>
    apiClient
      .get<Blob>(`/podcast/stimmprobe/${stimme}`,
        { responseType: 'blob', timeout: 60_000 })
      .then(r => r.data),

  ganzeFolgeHolen: (caseId: string, podcastId: string) =>
    apiClient
      .get<Blob>(`${basis(caseId)}/${podcastId}/ton`,
        { responseType: 'blob', timeout: 300_000 })
      .then(r => r.data),
}
