/**
 * Belege in Echos Antworten erkennbar machen.
 *
 * **Das Problem.** Echo schrieb: „Aus Szene 1, 25, 35, 36, 46 könnte sie ihre Lage so
 * deuten …" — für die Person, die das liest, nicht nachvollziehbar. Sie müsste erst
 * nachschlagen, was diese Szenen waren, und dabei geht der Faden verloren.
 *
 * **Der Weg.** Vor dem Markdown-Rendern wird aus `Szene 12` ein gewöhnlicher Markdown-Link
 * mit eigenem Schema: `[Szene 12](echob:szene/12)`. Die Markdown-Komponente erkennt das
 * Schema wieder und macht daraus einen anklickbaren Verweis mit dem Titel als Hinweis.
 *
 * **Warum über das natürliche Wort und nicht über eine Sondersyntax** wie `[[S12]]`: Eine
 * Syntax müsste das Modell diszipliniert einhalten. Das natürliche Wort funktioniert auch
 * dann, wenn es nachlässig ist — und rückwirkend auf allem, was schon geschrieben wurde.
 *
 * **Voraussetzung sind stabile Nummern** (Migration 98). Vorher war „Szene 25" die
 * POSITION in einer nach Datum sortierten Liste: Jede neue Szene verschob alle älteren.
 * Ein Verweis darauf hätte verlässlich zur falschen Szene geführt — schlimmer als keiner.
 */

export type BelegArt = 'szene' | 'dokument' | 'erkenntnis'

export interface Beleg {
  art: BelegArt
  nr: number
}

/** Das Wort, das Echo schreibt → die Art. Genau diese drei stehen auch im Prompt. */
const WOERTER: Record<string, BelegArt> = {
  Szene: 'szene',
  Dokument: 'dokument',
  Erkenntnis: 'erkenntnis',
}

const SCHEMA = 'echob:'

/**
 * Findet `Szene 12`, `Dokument 3`, `Erkenntnis 5`.
 *
 * Höchstens drei Ziffern: Ein Fall trägt 50 Szenen, 10 Dokumente, 40 Erkenntnisse. Vier
 * Ziffern wären eine Jahreszahl („Szene 2026") und kein Beleg.
 */
const MUSTER = /\b(Szene|Dokument|Erkenntnis)\s+(\d{1,3})\b/g

/**
 * Code bleibt unberührt.
 *
 * In einem Codeblock ist `Szene 12` Text, kein Verweis — ihn dort zu verlinken zerstörte
 * das Beispiel. Erfasst Zaunblöcke (```) und Einzelzeichen (`).
 */
const CODE = /(```[\s\S]*?```|`[^`\n]*`)/g

/** Setzt Markdown-Links um alle erkannten Belege. Lässt alles andere, wie es ist. */
export function belegeVerlinken(text: string): string {
  return text
    .split(CODE)
    .map((teil, i) => (i % 2 === 1 ? teil : teil.replace(
      MUSTER,
      (treffer, wort: string, nr: string) => `[${treffer}](${SCHEMA}${WOERTER[wort]}/${nr})`,
    )))
    .join('')
}

/** Liest einen Beleg aus dem Ziel eines Links — oder gibt null für gewöhnliche Links. */
export function belegAusHref(href: string | undefined): Beleg | null {
  if (!href?.startsWith(SCHEMA)) return null
  const [art, nr] = href.slice(SCHEMA.length).split('/')
  if (!Object.values(WOERTER).includes(art as BelegArt)) return null
  const zahl = Number(nr)
  return Number.isInteger(zahl) && zahl > 0 ? { art: art as BelegArt, nr: zahl } : null
}
