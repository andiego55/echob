/**
 * Anzeige-Regeln der Fall-FAQ — getrennt vom Bauteil, damit sie prüfbar sind.
 *
 * Hier steht das bisschen Logik, das zwischen einer verständlichen und einer irreführenden
 * Darstellung entscheidet. Im Bauteil wäre es dieselbe Rechnung, aber ungetestet: Die
 * Tests laufen in einer Node-Umgebung ohne Darstellung, sie können nur reine Funktionen
 * anfassen.
 */
import type { FaqAchse } from '@/types'

/**
 * Wie auffällig ist eine Achse — mit Rücksicht auf ihre Polung.
 *
 * **Der Fehler, den das verhindert.** Sortierte man die zwölf Achsen stumpf nach ihrer
 * Zahl, stünde „Reue und Wiedergutmachung: 90" ganz oben. Das ist aber der unauffälligste
 * mögliche Befund — bei den positiv gepolten Achsen ist ein NIEDRIGER Wert das, was eine
 * Fachperson zuerst sehen soll. Die Liste wäre nicht falsch, nur genau verkehrt herum
 * geordnet, und niemandem fiele es auf.
 *
 * Nicht belastbare Achsen (unter zwei Belegen) landen immer unten: Sie zeigen ohnehin
 * keine Zahl, und oben stünde dann ein leerer Balken vor den belegten.
 */
export function auffaelligkeit(a: Pick<FaqAchse, 'wert' | 'belastbar' | 'positiv_gepolt'>): number {
  if (!a.belastbar) return -1
  return a.positiv_gepolt ? 100 - a.wert : a.wert
}

/** Beschriftung der Belegdichte — dieselben Stufen wie im Backend. */
export const BELEGDICHTE_TEXT: Record<FaqAchse['belegdichte'], string> = {
  keine: 'ohne Belege',
  duenn: 'dünn belegt',
  tragfaehig: 'tragfähig belegt',
  gut: 'gut belegt',
}

/** Wie viele der drei Balken gefüllt sind. */
export function belegdichteStufe(stufe: FaqAchse['belegdichte']): number {
  return ['keine', 'duenn', 'tragfaehig', 'gut'].indexOf(stufe)
}
