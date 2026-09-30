/**
 * Die vier Anordnungen — aus Werten werden Koordinaten.
 *
 * **Das ist die Stelle, an der dasselbe Material vier verschiedene Dinge sagt**, und der
 * eigentliche Reiz des Werkzeugs. Deshalb steht sie in reinen Funktionen und nicht in einer
 * Komponente: Ein Fehler hier erzeugt kein hässliches Bild und keine Fehlermeldung, sondern
 * ein überzeugendes Bild, das nicht stimmt. Sieben Szenen als sechs Marken. Zwei Momente
 * genau übereinander, also einer unsichtbar. Das findet nur ein Test.
 *
 * **Alles ist deterministisch.** Kein `Math.random()`: Dieselben Werte müssen dasselbe Bild
 * ergeben, sonst ist ein aufgehobenes Bild nicht mehr dasselbe, wenn man es wieder öffnet.
 * Wo Streuung nötig ist, kommt sie aus der Kennung der Szene.
 */
import {
  BREITE, HOEHE, RAND,
  type Anordnung, type BildLeerstelle, type BildSzene, type BildWerte, type Marke,
} from './typen'

/**
 * Eine Zahl 0..1 aus einer Zeichenkette — stabil über Sitzungen und Geräte hinweg.
 *
 * FNV-1a, sieben Zeilen. `Math.random()` wäre falsch (jedes Mal ein anderes Bild), und eine
 * Hash-Bibliothek wäre für sieben Zeilen eine Abhängigkeit zu viel.
 */
export function saat(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  // >>> 0 macht aus dem Vorzeichen-Int eine vorzeichenlose Zahl.
  return ((h >>> 0) % 100000) / 100000
}

/** Zwei unabhängige Streuwerte je Kennung — für x und y. */
const saat2 = (id: string): [number, number] => [saat(id), saat(`${id}#2`)]

const innen = (t: number, spanne = 1) =>
  RAND + (BREITE - 2 * RAND) * Math.max(0, Math.min(1, t)) * spanne

/**
 * Wo eine Szene liegt — je Anordnung.
 *
 * `null` heißt: In dieser Anordnung hat diese Szene keinen Platz. Kommt nur bei
 * „zwei_seiten" vor, wo die rechte Hälfte den Wünschen gehört.
 */
function ort(
  szene: BildSzene, anordnung: Anordnung, spanne: number,
): { x: number; y: number } {
  const t = spanne > 0 ? szene.tag / spanne : 0.5
  const [sx, sy] = saat2(szene.id)

  if (anordnung === 'zeit') {
    // Die Zeit läuft nach rechts, die Streuung hält die Wolke in einem Band. Ein Band und
    // keine Linie: Auf einer Linie verdecken sich Marken desselben Tages gegenseitig.
    return {
      x: innen(t),
      y: HOEHE / 2 + (sy - 0.5) * (HOEHE - 2 * RAND) * 0.62,
    }
  }

  if (anordnung === 'spirale') {
    // **Wiederkehr.** Der Winkel kommt vom Tag IM JAHR, der Radius von den Jahren seit
    // Beginn. Zwei Ereignisse im selben Monat verschiedener Jahre liegen damit auf demselben
    // Strahl — genau das, was man an einer Zeitachse nie sieht.
    const jahre = szene.tag / 365.25
    const winkel = (szene.tag % 365.25) / 365.25 * Math.PI * 2 - Math.PI / 2
    const maxJahre = Math.max(1, spanne / 365.25)
    const rMax = (Math.min(BREITE, HOEHE) / 2 - RAND)
    // 0.22 innen: Ein Kern ohne Marken, sonst drängt sich der Anfang in einem Punkt.
    const radius = rMax * (0.22 + 0.78 * (jahre / maxJahre)) + (sx - 0.5) * 14
    return {
      x: BREITE / 2 + Math.cos(winkel) * radius,
      y: HOEHE / 2 + Math.sin(winkel) * radius,
    }
  }

  if (anordnung === 'feld') {
    // **Ohne Zeit — nur Menge.** Phyllotaxis (goldener Winkel): die Verteilung, die in der
    // Natur Samen auf einem Blütenkorb setzt. Sie füllt gleichmäßig, ohne Raster und ohne
    // Lücken, und die Position hängt nur von der REIHENFOLGE ab, nicht vom Datum.
    // Der Index kommt über die Saat, damit dieselbe Szene immer denselben Platz hat.
    const n = 0.02 + 0.98 * sx
    const winkel = sx * 1000 * 2.39996323
    const radius = (Math.min(BREITE, HOEHE) / 2 - RAND) * Math.sqrt(n)
    return {
      x: BREITE / 2 + Math.cos(winkel) * radius,
      y: HOEHE / 2 + Math.sin(winkel) * radius,
    }
  }

  // zwei_seiten: Alles Erlebte steht links. Die rechte Hälfte gehört den Wünschen — der
  // Abstand dazwischen IST das Bild.
  return {
    x: RAND + (BREITE / 2 - RAND * 1.5) * (0.15 + 0.85 * sx),
    y: innen(t, 1) * (HOEHE - 2 * RAND) / (BREITE - 2 * RAND) + RAND * 0.2,
  }
}

/**
 * Wo eine Leerstelle liegt und wie groß sie ist.
 *
 * **Eine Funktion für zwei Zwecke, und das ist der Punkt.** Sie sagt dem Zeichnen, wo das
 * Loch hinkommt, und dem Entzerren, wo keine Marke liegen darf. Zwei Stellen, die dasselbe
 * berechnen, laufen beim ersten Umbau auseinander — und dann liegen Marken mitten in einem
 * Loch, das „hier ist nichts" bedeuten soll.
 */
export function loch(l: BildLeerstelle): { x: number; y: number; r: number } {
  const wunsch = Math.max(0, Math.min(1, l.wunsch))
  return {
    x: RAND + (BREITE - 2 * RAND) * (0.12 + 0.76 * saat(`${l.key}#x`)),
    y: RAND + (HOEHE - 2 * RAND) * (0.12 + 0.76 * saat(`${l.key}#y`)),
    r: 34 + 62 * wunsch,
  }
}

/**
 * Drückt Marken auseinander, die aufeinanderliegen.
 *
 * **Ohne das ist eine Szene unsichtbar und das Bild eine Lüge** — es zeigt sechs Momente, wo
 * sieben sind. Ein paar Durchläufe genügen; es muss nicht perfekt sein, nur ehrlich.
 *
 * Deterministisch, weil die Reihenfolge feststeht und nichts gewürfelt wird.
 */
function entzerren(
  marken: Marke[], loecher: { x: number; y: number; r: number }[] = [], laeufe = 26,
): void {
  for (let lauf = 0; lauf < laeufe; lauf++) {
    let bewegt = false

    // **Aus den Löchern heraus.** Eine Leerstelle heißt „hier ist nichts" — eine Marke
    // darin macht die Aussage zunichte, und im Bild sieht es aus wie ein Versehen.
    for (const m of marken) {
      for (const l of loecher) {
        const dx = m.x - l.x
        const dy = m.y - l.y
        const dist = Math.hypot(dx, dy) || 0.001
        const soll = l.r + m.r + 4
        if (dist >= soll) continue
        const nx = dist < 0.01 ? 1 : dx / dist
        const ny = dist < 0.01 ? 0 : dy / dist
        m.x = l.x + nx * soll
        m.y = l.y + ny * soll
        bewegt = true
      }
    }
    for (let i = 0; i < marken.length; i++) {
      for (let j = i + 1; j < marken.length; j++) {
        const a = marken[i]
        const b = marken[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.hypot(dx, dy) || 0.001
        const soll = a.r + b.r + 3
        if (dist >= soll) continue
        // Genau übereinander: in eine feste Richtung auseinander, nie zufällig.
        const nx = dist < 0.01 ? 1 : dx / dist
        const ny = dist < 0.01 ? 0 : dy / dist
        const schub = (soll - dist) / 2
        a.x -= nx * schub; a.y -= ny * schub
        b.x += nx * schub; b.y += ny * schub
        bewegt = true
      }
    }
    if (!bewegt) break
  }
  // Am Ende in den Rahmen zurückholen: Auseinanderdrücken kann über den Rand schieben.
  for (const m of marken) {
    m.x = Math.max(RAND * 0.55 + m.r, Math.min(BREITE - RAND * 0.55 - m.r, m.x))
    m.y = Math.max(RAND * 0.55 + m.r, Math.min(HOEHE - RAND * 0.55 - m.r, m.y))
  }
}

/**
 * Die Szenen, die bei dieser Dichte gezeichnet werden — **die stärksten zuerst.**
 *
 * „Karg" heißt nicht „die ersten zwanzig Prozent", sondern „die zwanzig Prozent, die am
 * meisten Gewicht haben". Sonst wäre die Dichtestufe eine Frage der Eingabereihenfolge.
 */
export function auswahl(szenen: BildSzene[], anteil: number): BildSzene[] {
  if (anteil >= 1) return szenen
  const wie_viele = Math.max(1, Math.round(szenen.length * anteil))
  const sortiert = [...szenen].sort((a, b) => b.gewicht - a.gewicht)
  const behalten = new Set(sortiert.slice(0, wie_viele).map(s => s.id))
  // In der ursprünglichen Reihenfolge zurückgeben: Die Zeichenreihenfolge bestimmt, was
  // oben liegt, und die soll nicht von der Gewichtung abhängen.
  return szenen.filter(s => behalten.has(s.id))
}

/** Aus Werten und Einstellungen werden Marken. */
export function marken(
  werte: BildWerte, anordnung: Anordnung, anteil: number,
): Marke[] {
  const gewaehlt = auswahl(werte.szenen, anteil)
  const liste: Marke[] = gewaehlt.map(s => {
    const p = ort(s, anordnung, werte.spanne)
    return {
      id: s.id,
      x: p.x,
      y: p.y,
      // 7..26: klein genug, dass vierzig Marken Platz haben, groß genug, dass eine einzelne
      // nicht wie ein Staubkorn wirkt.
      r: 7 + 19 * Math.max(0, Math.min(1, s.gewicht)),
      haerte: Math.max(0, Math.min(1, s.haerte)),
      ton: Math.max(0, Math.min(1, s.haerte * 0.55 + saat(s.id) * 0.45)),
    }
  })

  // **Der Druck: eine Kraft, nie eine Gestalt.** Er schiebt das Feld zur linken Kante
  // zusammen und zeichnet selbst nichts. Je weiter rechts eine Marke liegt, desto stärker
  // wird sie geschoben — so entsteht Verdichtung, keine Verschiebung.
  if (werte.druck !== null && werte.druck > 0) {
    const kraft = Math.max(0, Math.min(1, werte.druck))
    for (const m of liste) {
      const anteilRechts = (m.x - RAND) / (BREITE - 2 * RAND)
      m.x -= anteilRechts * (BREITE - 2 * RAND) * 0.3 * kraft
    }
  }

  // Die Löcher zuerst, dann die Marken gegeneinander: Beides im selben Lauf, damit eine
  // Marke, die aus einem Loch geschoben wird, nicht auf einer anderen landet.
  entzerren(liste, werte.leerstellen.map(loch))
  return liste
}
