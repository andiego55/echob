/**
 * Die Balken einer Skizze — ein Bild, drei Orte.
 *
 * **Warum das eine eigene Datei ist.** Dieselbe Darstellung steht im eigenen Bereich
 * (`DeineSkizze`), bei der Fachperson (`KompassPanel`) und im Bericht „Wunsch und
 * Wirklichkeit". Drei Kopien wären nicht bloß mehr Code: Sie liefen auseinander, und dann
 * sähe dieselbe Skizze an drei Orten unterschiedlich aus — während alle drei glauben,
 * dasselbe zu zeigen. Ein Gespräch zwischen Klient:in und Fachperson über „das da oben"
 * ginge dann daneben.
 *
 * **Das Etikett steht ÜBER dem Balken, nicht darin.** Gelernt an einer Attrappe: Ein Aspekt
 * mit kleinem Gewicht bekommt einen schmalen Balken, und ausgerechnet dort wurde der Satz
 * abgeschnitten („Ich darf meiner Wahrnehmun…"). Wer wenig von etwas will, soll es trotzdem
 * lesen können.
 *
 * **Keine Rangzahlen.** Eine 1 neben dem obersten Wunsch machte daraus eine Bewertung. Die
 * Reihenfolge ist zu sehen, weil sie oben ist.
 */

/** Die kleinste Breite. Nicht 0 — ein Wunsch mit Gewicht 0 ist immer noch ein Wunsch. */
const MIN_BREITE = 34

export interface SkizzenBand {
  key: string
  label?: string | null
  gewicht: number
  /** Ausdrücklich in eine Reihenfolge gebracht — kräftig statt blass. */
  geordnet: boolean
}

/** Breite in Prozent aus einem Gewicht von 0 bis 100. */
export function bandBreite(gewicht: number): number {
  const g = Math.max(0, Math.min(100, Number.isFinite(gewicht) ? gewicht : 50))
  return MIN_BREITE + Math.round((100 - MIN_BREITE) * g / 100)
}

/**
 * Aus Aspekten und einer Reihenfolge die Balken — geordnete oben, der Rest nach Gewicht.
 *
 * Für die Orte, die nur die gespeicherten Felder haben (Fachperson, Bericht). Der eigene
 * Bereich rechnet über `gestalt` in `lib/skizzenbild`, weil dort noch der Katalog dazukommt.
 */
export function baenderAus(
  aspekte: { key: string; gewicht: number; label?: string | null }[],
  reihung: string[],
): SkizzenBand[] {
  const geordnet = new Set(reihung)
  const finde = (k: string) => aspekte.find(a => a.key === k)
  return [
    ...reihung.map(finde).filter(Boolean).map(a => ({ ...a!, geordnet: true })),
    ...aspekte.filter(a => !geordnet.has(a.key))
      .sort((x, y) => y.gewicht - x.gewicht)
      .map(a => ({ ...a, geordnet: false })),
  ]
}

export default function SkizzenBaender({ baender, bewegt = true }: {
  baender: SkizzenBand[]
  /**
   * Ob die Breite animiert mitzieht.
   *
   * Im eigenen Bereich ja — dort ändert sich das Gewicht gerade unter der Hand, und der
   * Übergang macht aus dem Schieben eines Reglers eine sichtbare Folge. In einem Bericht
   * und bei der Fachperson nein: Dort bewegt sich nichts, und eine Animation beim Aufbau
   * wäre Zierrat.
   */
  bewegt?: boolean
}) {
  if (baender.length === 0) return null
  return (
    <ul className="space-y-2.5">
      {baender.map(b => (
        <li key={b.key}>
          <span
            className={`block text-[0.78rem] leading-snug ${
              b.geordnet ? 'font-semibold text-navy' : 'text-brand-text'
            }`}
          >
            {b.label || b.key}
          </span>
          <span
            style={{ width: `${bandBreite(b.gewicht)}%` }}
            className={`mt-1 block h-2 rounded-full ${bewegt ? 'skizze-band ' : ''}${
              b.geordnet ? 'bg-accent' : 'bg-accent/30'
            }`}
            aria-hidden="true"
          />
        </li>
      ))}
    </ul>
  )
}

/** Der Satz, der die zwei Farben erklärt. Zwei Farben ohne Satz sind ein Rätsel. */
export function BaenderHinweis({ baender }: { baender: SkizzenBand[] }) {
  if (!baender.some(b => b.geordnet) || !baender.some(b => !b.geordnet)) return null
  return (
    <p className="mt-3 text-[0.7rem] leading-snug text-brand-muted">
      Kräftig: was in eine Reihenfolge gebracht wurde. Die Länge ist das Gewicht.
    </p>
  )
}
