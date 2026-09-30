/**
 * Die fünf Paletten.
 *
 * **Keine heißt „schön", und keine ist ein Urteil.** Das ist die wichtigste Regel dieser
 * Datei. Würde „Nacht" automatisch für schwere Fälle gewählt, wäre die Farbe eine Diagnose —
 * und zwar eine, die niemand ausgesprochen hat und die sich nicht widerrufen lässt. Die
 * Person wählt, die Vorauswahl ist immer dieselbe, und die Anwendung hat keine Meinung dazu,
 * wie es bei jemandem aussieht.
 *
 * **Schwarzweiß ist absichtlich dabei.** Es ist die einzige Palette, die überhaupt keine
 * Gefühlsfarbe mitbringt — manche wollen genau das, und es ist auch die, die gedruckt
 * funktioniert.
 *
 * Jede Palette trägt dieselben Rollen, damit das Zeichnen nichts über Farben wissen muss.
 */

export interface Palette {
  key: string
  label: string
  /** Der Untergrund der ganzen Leinwand. */
  grund: string
  /** Zwei Stopps für das Grundton-Feld (Temperatur mischt zwischen ihnen). */
  feld: [string, string]
  /** Zwei Markentöne; `ton` einer Marke mischt zwischen ihnen. */
  marke: [string, string]
  /** Die Linien der Durchgänge. */
  durchgang: string
  /** Die Lichter — **der hellste Wert der Palette.** Einsicht ist das Einzige, was leuchtet. */
  licht: string
  /** Der Rand einer Leerstelle. Kaum sichtbar: Ein Loch soll ein Loch sein, kein Objekt. */
  leerRand: string
}

export const PALETTEN: Palette[] = [
  {
    key: 'kuehl', label: 'Kühl',
    grund: '#eef2f6',
    feld: ['#c7d7e4', '#9fb6cc'],
    marke: ['#5c7b96', '#24384a'],
    durchgang: '#7e99b0',
    licht: '#ffffff',
    leerRand: '#b9c8d6',
  },
  {
    key: 'warm', label: 'Warm',
    grund: '#f7f1ea',
    feld: ['#e8d3bd', '#d9b391'],
    marke: ['#a9764f', '#4d2f1c',],
    durchgang: '#c09268',
    licht: '#fffaf2',
    leerRand: '#dcc4ab',
  },
  {
    key: 'erdig', label: 'Erdig',
    grund: '#f1f0ea',
    feld: ['#cfd0bd', '#a6a98f',],
    marke: ['#6f7256', '#2f3226'],
    durchgang: '#8b8e70',
    licht: '#fdfdf5',
    leerRand: '#c2c4ae',
  },
  {
    key: 'nacht', label: 'Nacht',
    grund: '#12151c',
    feld: ['#1d2430', '#2c3a4d'],
    marke: ['#6f8399', '#c3d2e0'],
    durchgang: '#3c4d63',
    licht: '#f2f7ff',
    leerRand: '#2a3442',
  },
  {
    key: 'schwarzweiss', label: 'Schwarzweiß',
    grund: '#ffffff',
    feld: ['#e6e6e6', '#cfcfcf'],
    marke: ['#8a8a8a', '#111111'],
    durchgang: '#a8a8a8',
    licht: '#ffffff',
    leerRand: '#d4d4d4',
  },
]

export const STANDARD_PALETTE = 'kuehl'

export function palette(key: string): Palette {
  return PALETTEN.find(p => p.key === key) ?? PALETTEN[0]
}

/**
 * Mischt zwei Hex-Farben.
 *
 * Eigene kleine Funktion statt einer Bibliothek: Es sind sechs Zeilen, und eine
 * Farbbibliothek für sechs Zeilen wäre eine Abhängigkeit, die bei jedem `npm ci` mitkommt.
 */
export function mischen(a: string, b: string, t: number): string {
  const f = Math.max(0, Math.min(1, t))
  const zahl = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
  const [r1, g1, b1] = zahl(a)
  const [r2, g2, b2] = zahl(b)
  const hex = (n: number) => Math.round(n).toString(16).padStart(2, '0')
  return `#${hex(r1 + (r2 - r1) * f)}${hex(g1 + (g2 - g1) * f)}${hex(b1 + (b2 - b1) * f)}`
}
