/**
 * Fassung und Stand der Rechtstexte — an einer Stelle, von Hand gepflegt.
 *
 * **Warum das keine Kleinigkeit ist.** Bis zum 04.10.2026 stand unter jeder der drei Seiten
 * `Stand: {new Date()...}`. Damit behauptete jedes Dokument, in diesem Monat aktuell zu sein,
 * auch wenn der Text ein Jahr alt war — und es gab keine Möglichkeit, zu belegen, WELCHE
 * Fassung jemand gesehen hat, als er sein Häkchen gesetzt hat.
 *
 * Bei einwilligungsbasierter Verarbeitung ist das nicht nur ungenau, sondern schädlich: Der
 * Nachweis der Einwilligung (Art. 7 Abs. 1 DSGVO) ist nur so gut wie die Angabe, worauf sie
 * sich bezog. Dasselbe gilt für die Einbeziehung der AGB und für die Widerrufsbelehrung, bei
 * der die Fassung im Streitfall die eigentliche Frage ist.
 *
 * **Deshalb eine Fassung UND ein Datum, beide von Hand.** Das Muster kommt aus
 * `agreement_service.CURRENT_AVV_VERSION`, wo es sich bewährt hat: Bei jeder inhaltlichen
 * Änderung wird hochgezählt, und der Nachweis trägt die Zeichenkette. Ein Datum allein
 * reicht nicht — zwei Fassungen in einem Monat wären nicht unterscheidbar.
 *
 * Geändert wird hier NICHTS automatisch. Wer den Text einer Seite ändert, ändert auch ihre
 * Zeile hier; ein Wächter (`rechtsstand.test.ts`) besteht darauf, dass die Seiten ihren Stand
 * aus dieser Datei nehmen und nicht aus der Uhr.
 */

export interface Rechtsstand {
  /** Fassungs-Kennung für Nachweise. Format: `<dokument>-JJJJ-MM`, bei zweiter Fassung im
   *  selben Monat mit Buchstaben (`agb-2026-10b`). */
  fassung: string
  /** Was unter dem Dokument steht. Ausgeschrieben, weil es gelesen und nicht gerechnet wird. */
  stand: string
}

export const RECHTSSTAND: Record<'datenschutz' | 'agb' | 'widerruf', Rechtsstand> = {
  datenschutz: { fassung: 'datenschutz-2026-10', stand: '4. Oktober 2026' },
  agb: { fassung: 'agb-2026-10', stand: '4. Oktober 2026' },
  widerruf: { fassung: 'widerruf-2026-10', stand: '4. Oktober 2026' },
}
