import { apiClient } from './client'
import type { Report } from '@/types'

/**
 * Meine Traumbeziehung — die Skizze einer gewünschten Beziehung, je Beziehungsart eine.
 *
 * Eigene Datei neben `kompass.ts`: Das Modul steht für sich, mit eigenem Katalog, eigenem
 * Dienst und eigenem Router. Wer es eines Tages herausnimmt, nimmt vier Dateien mit und
 * lässt nichts zurück.
 */
const basis = '/me/kompass/ideale'

export interface IdealArt {
  key: string
  label: string
  /** Die Frage, mit der der Raum anfängt — je Art eine andere. */
  frage: string
}

export interface IdealAspekt {
  key: string
  label: string
  hinweis: string
  /** Für welche Beziehungsarten der Aspekt überhaupt angeboten wird. */
  arten: string[]
}

export interface IdealAspektFamilie {
  key: string
  label: string
  hinweis: string
  aspekte: IdealAspekt[]
}

/**
 * Ein Gegensatzpaar. **Beide Seiten sind gut** — das ist keine Höflichkeit, sondern die
 * Bedingung dafür, dass jemand ehrlich antwortet.
 */
export interface IdealAbwaegung {
  key: string
  links: string
  rechts: string
  hinweis: string
  arten: string[]
}

export interface IdealKatalog {
  arten: IdealArt[]
  /** Nur gefüllt, wenn mit `?art=` geholt — sonst wären es dreißig Aspekte auf Vorrat. */
  aspekt_familien: IdealAspektFamilie[]
  abwaegungen: IdealAbwaegung[]
  max_aspekte: number
  max_reihung: number
  max_zeichen_eigenes: number
}

export interface AspektWahl {
  key: string
  /** 0–100: **wie viel** davon, nicht ob. 50 ist die unangetastete Mitte. */
  gewicht: number
  label?: string | null
}

export interface Ideal {
  id: string
  art: string
  art_label: string | null
  aspekte: AspektWahl[]
  reihung: string[]
  abwaegungen: Record<string, number>
  eigenes: string | null
  geprueft_at: string | null
  created_at: string
  updated_at: string
}

export interface IdealSpeichern {
  aspekte: { key: string; gewicht: number }[]
  reihung: string[]
  abwaegungen: Record<string, number>
  eigenes: string | null
}

/** Ob sich diese Skizze an diesen Fall halten lässt — und wenn nicht, warum. */
export interface Vergleichbar {
  moeglich: boolean
  grund: string | null
}

export const idealApi = {
  katalog: (art?: string) =>
    apiClient
      .get<IdealKatalog>(basis + '/katalog', { params: art ? { art } : undefined })
      .then(r => r.data),

  liste: () => apiClient.get<Ideal[]>(basis).then(r => r.data),

  /** Eine Skizze — oder `null`. Legt beim Ansehen nichts an. */
  holen: (art: string) =>
    apiClient.get<Ideal | null>(`${basis}/${art}`).then(r => r.data),

  /**
   * Der ganze Zustand, nicht einzelne Felder: Eine Skizze ist ein Bild und kein Formular,
   * und ein halb übertragenes Bild wäre ein anderes.
   */
  speichern: (art: string, body: IdealSpeichern) =>
    apiClient.put<Ideal>(`${basis}/${art}`, body).then(r => r.data),

  bestaetigen: (art: string) =>
    apiClient.post<Ideal | null>(`${basis}/${art}/bestaetigen`).then(r => r.data),

  loeschen: (art: string) =>
    apiClient.delete(`${basis}/${art}`).then(() => undefined),

  /**
   * Vorab fragen, statt den Knopf erklären zu lassen, warum er nicht geht.
   *
   * Dieselbe Prüfung wie später der Vergleich selbst — damit Anzeige und Ausführung nicht
   * auseinanderlaufen können.
   */
  vergleichbar: (art: string, caseId: string) =>
    apiClient.get<Vergleichbar>(`${basis}/${art}/vergleichbar/${caseId}`).then(r => r.data),

  /**
   * Der Vergleich selbst. Antwort ist ein **Bericht** — kein neues Ding.
   *
   * Ein Delta ist ein erzeugter Text über einen Fall, und genau das sind Berichte. Es
   * liegt danach am Fall, lässt sich freigeben, drucken, exportieren und löschen wie
   * jeder andere — ohne dass dafür eine einzige dieser Fähigkeiten ein zweites Mal
   * gebaut werden musste.
   *
   * Dauert bis zu einer Minute: Das Modell liest zwei Dinge und schreibt vier Abschnitte.
   */
  vergleich: (art: string, caseId: string) =>
    apiClient
      .post<Report>(`${basis}/${art}/vergleich/${caseId}`)
      .then(r => r.data),
}
