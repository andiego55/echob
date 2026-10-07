/**
 * Wer der Anbieter ist — an einer Stelle, von Hand gepflegt.
 *
 * **Warum das ein eigenes Modul ist und nicht dreimal im JSX steht.** Name und Anschrift
 * werden an mindestens drei Stellen gebraucht: im Impressum (§ 5 DDG), in der
 * Widerrufsbelehrung und im Muster-Widerrufsformular. Bis zum 07.10.2026 standen sie nur
 * im Impressum; die beiden anderen Stellen verwiesen darauf („Anschrift siehe
 * Impressum"). Das ist **rechtlich nicht dasselbe**: Das gesetzliche Muster (Anlage 1 und
 * 2 zu Art. 246a § 1 Abs. 2 EGBGB) verlangt die EINGEFÜGTEN Angaben. Ein Querverweis ist
 * eine Abweichung und kostet die Gesetzlichkeitsfiktion (BGH; OLG Hamm 18 U 34/22) — und
 * bei fehlerhafter Belehrung läuft die Widerrufsfrist nach § 356 Abs. 3 BGB bis zu
 * **zwölf Monate und vierzehn Tage** statt vierzehn Tage.
 *
 * **Und warum das nicht einfach kopiert wird.** Sobald die UG eingetragen ist, ändern
 * sich Name, Rechtsform und Anschrift — an jeder dieser Stellen. Drei Kopien heißt: zwei
 * davon bleiben stehen und widersprechen der dritten. Ein Rechtstext, der zwei
 * verschiedene Anbieter nennt, ist schlimmer als einer mit einem Verweis.
 *
 * Geändert wird hier NICHTS automatisch. Ein Wächter (`anbieterangaben.test.ts`) besteht
 * darauf, dass Impressum und Widerrufsbelehrung ihre Angaben aus dieser Datei nehmen.
 */

export interface Anbieter {
  /** Vor- und Zuname, bei einer Gesellschaft Firma samt Rechtsform. */
  name: string
  strasse: string
  plz: string
  ort: string
  land: string
  email: string
  /**
   * Umsatzsteuer-Identifikationsnummer, § 5 Abs. 1 Nr. 6 DDG — **Pflicht, sobald eine
   * erteilt ist.** Das Fehlen ist abmahnfähig. `null` heißt: noch keine erteilt.
   *
   * Die **Steuernummer** gehört ausdrücklich NICHT hierher: Sie ist nicht verlangt und
   * erlaubt Dritten Auskunftsersuchen beim Finanzamt.
   */
  ustIdNr: string | null
  /**
   * § 5 Abs. 1 Nr. 2 DDG verlangt sie nicht zwingend, wenn eine schnelle Kontaktaufnahme
   * anders möglich ist (EuGH C-649/17). Für Verbraucherverträge verlangt Art. 246a § 1
   * Abs. 1 Nr. 2 EGBGB sie aber „soweit verfügbar", und das OLG Schleswig liest das
   * streng. `null` heißt: bewusst keine veröffentlicht.
   */
  telefon: string | null
}

export const ANBIETER: Anbieter = {
  name: 'Andreas Wygrabek',
  strasse: 'Diemelweg 8A',
  plz: '34317',
  ort: 'Habichtswald',
  land: 'Deutschland',
  email: 'kontakt@echo-b.de',
  ustIdNr: null,
  telefon: null,
}

/** Einzeilig — für das Widerrufsformular und überall, wo kein Umbruch passt. */
export const ANBIETER_ZEILE =
  `${ANBIETER.name}, ${ANBIETER.strasse}, ${ANBIETER.plz} ${ANBIETER.ort}, `
  + `${ANBIETER.land}, E-Mail: ${ANBIETER.email}`
