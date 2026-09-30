/**
 * Die Bildsprache der Bildwerkstatt — was hineingeht.
 *
 * **Die Werte sind schon normalisiert, bevor sie hier ankommen.** Keine Szenentitel, keine
 * Texte, keine Skalennamen mit Bedeutung — nur Zahlen zwischen 0 und 1, Datumsangaben und
 * Schlüssel. Zwei Gründe:
 *
 * * **Die Bildsprache soll nichts deuten können.** Wüsste sie, dass eine Skala
 *   „Grenzverletzung" heißt, käme irgendwann jemand auf die Idee, sie deshalb rot zu
 *   zeichnen. Dann wäre die Farbe ein Urteil. Sie sieht nur einen Wert und eine Kennung.
 * * **Prüfbarkeit.** Ein Test über „sieben Szenen ergeben sieben Marken" braucht keine
 *   Fallakte, sondern sieben Zahlen.
 */

/** Eine Szene, so weit das Bild sie braucht. */
export interface BildSzene {
  /** Nur für Stabilität: gleiche Kennung, gleiche Position. Nie angezeigt. */
  id: string
  /** Tage seit der ersten Szene dieses Falls. Ganzzahlig, ≥ 0. */
  tag: number
  /**
   * Wie viel die Person zu diesem Moment geschrieben hat, 0..1.
   *
   * **Nicht „wie schlimm es war".** Das wüssten wir nicht. Was jemand ausführlich erzählt,
   * hat für ihn Gewicht — das ist eine Angabe, keine Bewertung.
   */
  gewicht: number
  /**
   * Wie hart der Moment war, 0..1 — aus den Skalenbeiträgen dieser Szene.
   *
   * Steuert allein die FORM (rund bis scharfkantig), nie die Farbe. Eine Farbe, die
   * „schlimm" bedeutet, wäre ein Urteil; eine Kante ist eine Kante.
   */
  haerte: number
}

/** Ein Muster, das durch alles hindurchläuft. */
export interface BildDurchgang {
  /** Der Skalenschlüssel — nur als Saat für die Kurvenform, nie zum Deuten. */
  key: string
  /** 0..1 */
  wert: number
}

/** Eine festgehaltene Erkenntnis. */
export interface BildLicht {
  id: string
  tag: number
}

/** Etwas, das gewünscht ist und im Fall nicht vorkommt. */
export interface BildLeerstelle {
  key: string
  /** Wie stark der Wunsch gewichtet ist, 0..1 — bestimmt die Größe des Lochs. */
  wunsch: number
}

export interface BildWerte {
  /** Das Wetter: Temperatur und Unruhe des jüngsten bestätigten Gefühlsbilds. */
  grundton: { temperatur: number; unruhe: number } | null
  szenen: BildSzene[]
  durchgaenge: BildDurchgang[]
  lichter: BildLicht[]
  leerstellen: BildLeerstelle[]
  /**
   * Druck von einer Kante, 0..1 — aus dem Personenprofil.
   *
   * **Nie eine Gestalt, immer eine Kraft.** Er schiebt das Feld zusammen und zeichnet selbst
   * nichts. `null`, wenn das Profil nicht mitgeht.
   */
  druck: number | null
  /** Spanne des Falls in Tagen — für die Anordnungen. */
  spanne: number
}

export type Anordnung = 'zeit' | 'spirale' | 'feld' | 'zwei_seiten'
export type Dichte = 'karg' | 'wenig' | 'normal' | 'alles'
export type Schicht =
  | 'grundton' | 'szenen' | 'durchgaenge' | 'lichter' | 'leerstellen' | 'druck'

export interface BildEinstellungen {
  palette: string
  anordnung: Anordnung
  dichte: Dichte
  schichten: Schicht[]
}

/** Was von einer Szene am Ende gezeichnet wird. */
export interface Marke {
  id: string
  x: number
  y: number
  r: number
  /** 0 = Kreis, 1 = scharfe Raute. Alles dazwischen ist ein Quadrat mit Rundung. */
  haerte: number
  /** 0..1 — mischt zwischen den beiden Markentönen der Palette. */
  ton: number
}

/** Die Leinwand. Quadratisch, damit die Galerie eine Wand wird und kein Flickenteppich. */
export const BREITE = 1000
export const HOEHE = 1000
/** Rand, in dem nichts liegt — ein Bild ohne Luft sieht aus wie ein Ausschnitt. */
export const RAND = 70

/** Wie viele Szenen je Dichtestufe höchstens gezeichnet werden (Anteil der stärksten). */
export const DICHTE_ANTEIL: Record<Dichte, number> = {
  karg: 0.2,
  wenig: 0.45,
  normal: 0.75,
  alles: 1,
}
