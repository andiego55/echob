/**
 * Die Bildwerkstatt: aus Werten und Einstellungen wird ein Lagebild.
 *
 * Ein Aufruf, ein SVG. Kein Modell, kein Netz, kein Warten — deshalb können die Regler
 * sofort wirken, und deshalb sieht dasselbe Bild in einem Jahr genauso aus.
 */
import { marken as markenRechnen } from './anordnung'
import { zeichnen } from './zeichnen'
import {
  DICHTE_ANTEIL,
  type BildEinstellungen, type BildWerte, type Marke, type Schicht,
} from './typen'
import { STANDARD_PALETTE } from './paletten'

export * from './typen'
export { PALETTEN, palette, STANDARD_PALETTE } from './paletten'
export { auswahl, loch, saat } from './anordnung'
export { markePfad } from './zeichnen'

/** Die Schichten, die standardmäßig an sind. */
export const STANDARD_SCHICHTEN: Schicht[] = [
  'grundton', 'szenen', 'durchgaenge', 'lichter', 'leerstellen',
  // `druck` fehlt mit Absicht: Wer die andere Person im Bild haben will, wählt das —
  // es soll nicht voreingestellt sein.
]

export const STANDARD_EINSTELLUNGEN: BildEinstellungen = {
  palette: STANDARD_PALETTE,
  anordnung: 'zeit',
  dichte: 'normal',
  schichten: STANDARD_SCHICHTEN,
}

export interface Lagebild {
  svg: string
  /** Wie viele Marken wirklich gezeichnet wurden — für die Bildlegende und für Tests. */
  marken: Marke[]
}

export function lagebild(werte: BildWerte, einst: BildEinstellungen): Lagebild {
  const anteil = DICHTE_ANTEIL[einst.dichte] ?? 1
  const liste = einst.schichten.includes('szenen')
    ? markenRechnen(werte, einst.anordnung, anteil)
    : []
  return { svg: zeichnen(werte, einst, liste), marken: liste }
}

/**
 * Hat dieser Fall überhaupt genug für ein Bild?
 *
 * **Ein leerer Fall ergibt kein leeres Quadrat.** Ein Bild ohne einen einzigen Moment wäre
 * eine Fläche, die aussieht wie ein Fehler — und die Person würde denken, das Werkzeug sei
 * kaputt, statt zu erfahren, dass ihm noch der Stoff fehlt.
 */
export function genugFuerEinBild(werte: BildWerte): boolean {
  return werte.szenen.length >= 2
    || werte.durchgaenge.some(d => d.wert > 0.25)
    || werte.grundton !== null
}
