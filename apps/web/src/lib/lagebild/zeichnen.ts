/**
 * Aus Marken wird ein SVG — die sechs Schichten, von hinten nach vorn.
 *
 * **Die Reihenfolge ist eine Aussage, nicht eine Umsetzungsfrage.** Der Grundton liegt
 * hinten, weil er Wetter ist und nichts behauptet. Die Durchgänge liegen hinter den Szenen,
 * weil ein Muster unter allem liegt und nicht darauf. Die Lichter liegen vorn, weil Einsicht
 * das Letzte ist, was dazukommt — und das Einzige, was ganz der Person gehört.
 *
 * **Kein Objekt für die andere Person, in keiner Schicht.** Der Druck verschiebt Koordinaten
 * (siehe `anordnung.ts`) und zeichnet hier nichts als einen Farbverlauf von der Kante. Eine
 * Figur wäre die Abbildung eines echten Menschen, erzeugt aus den Angaben einer Seite.
 */
import { mischen, palette as paletteFinden } from './paletten'
import { loch, saat } from './anordnung'
import {
  BREITE, HOEHE, RAND,
  type BildEinstellungen, type BildWerte, type Marke, type Schicht,
} from './typen'

/** Koordinaten: eine Nachkommastelle genügt und hält das SVG klein. */
const rund = (n: number) => Math.round(n * 10) / 10

/**
 * Kleine Zahlen: vier Nachkommastellen.
 *
 * **Hier stand erst `rund`, und das hat eine ganze Schicht stillgelegt.** Die
 * Turbulenz-Frequenz liegt bei 0,004 bis 0,024; auf eine Nachkommastelle gerundet wird daraus
 * `0`, und `feTurbulence` mit `baseFrequency="0"` erzeugt kein Rauschen. Das Bild sah
 * trotzdem gut aus — nur war der Grundton ein glatter Verlauf statt einer Textur, und niemand
 * hätte es je bemerkt. Gefunden habe ich es, indem ich das SVG gelesen habe statt es
 * anzusehen.
 */
const feinRund = (n: number) => Math.round(n * 10000) / 10000

/**
 * Der Pfad einer Marke: Kreis bei Härte 0, scharfe Raute bei Härte 1.
 *
 * **Die Form trägt die Härte, nie die Farbe.** Eine rote Marke würde „schlimm" sagen — ein
 * Urteil, das niemand gesprochen hat. Eine Kante ist eine Kante: Man sieht sie, und sie
 * behauptet nichts.
 *
 * Gerechnet als Superellipse: |x/r|^n + |y/r|^n = 1. Bei n = 2 ist das ein Kreis, bei n = 1
 * eine Raute — und alles dazwischen ein stufenloser Übergang.
 *
 * **Die erste Fassung war ein Bézier-Konstrukt, in dem der Rundungsfaktor mit Null
 * multipliziert wurde.** Jede Marke kam als scharfe Raute heraus, unabhängig von der Härte.
 * Das Bild sah gut aus; die einzige Eigenschaft, die die Härte trägt, fehlte vollständig.
 */
export function markePfad(m: Marke, punkte = 44): string {
  const h = Math.max(0, Math.min(1, m.haerte))
  const n = 2 - h            // 2 = Kreis, 1 = Raute
  const teile: string[] = []
  for (let i = 0; i < punkte; i++) {
    const t = (i / punkte) * Math.PI * 2
    const c = Math.cos(t)
    const s = Math.sin(t)
    const x = m.x + m.r * Math.sign(c) * Math.abs(c) ** (2 / n)
    const y = m.y + m.r * Math.sign(s) * Math.abs(s) ** (2 / n)
    teile.push(`${i === 0 ? 'M' : 'L'}${rund(x)} ${rund(y)}`)
  }
  teile.push('Z')
  return teile.join(' ')
}

/** Der Grundton: das Wetter. Eine Fläche, kein Objekt. */
function grundton(werte: BildWerte, pal: ReturnType<typeof paletteFinden>): string {
  if (!werte.grundton) return ''
  const { temperatur, unruhe } = werte.grundton
  const u = Math.max(0, Math.min(1, unruhe))
  const farbe = mischen(pal.feld[0], pal.feld[1], Math.max(0, Math.min(1, temperatur)))
  // Unruhe wird Rauheit, nicht Farbe: feTurbulence verschiebt die Fläche. Ein einziger
  // Filter im ganzen Bild — mehrere kosten auf dem Telefon merkbar Zeit.
  const rauheit = feinRund(0.004 + 0.02 * u)
  const staerke = rund(8 + 46 * u)
  return `
  <defs>
    <filter id="wetter" x="-14%" y="-14%" width="128%" height="128%">
      <feTurbulence type="fractalNoise" baseFrequency="${rauheit}" numOctaves="4"
        seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="${staerke}"
        xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <radialGradient id="feld" cx="50%" cy="46%" r="62%">
      <stop offset="0%" stop-color="${farbe}" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="${farbe}" stop-opacity="0.1"/>
    </radialGradient>
  </defs>
  <g filter="url(#wetter)">
    <ellipse cx="${BREITE / 2}" cy="${rund(HOEHE * 0.47)}" rx="${rund(BREITE * 0.46)}"
      ry="${rund(HOEHE * 0.44)}" fill="url(#feld)"/>
  </g>`
}

/**
 * Die Durchgänge: je Muster eine Linie, die durch das GANZE Bild läuft.
 *
 * Das ist die Aussage der Schicht: Ein Muster passiert nicht an einer Stelle — es geht durch
 * alles hindurch. Deshalb keine Balken und keine Punkte, sondern Kurven von Rand zu Rand.
 */
function durchgaenge(werte: BildWerte, pal: ReturnType<typeof paletteFinden>): string {
  const stark = werte.durchgaenge.filter(d => d.wert > 0.25)
  if (!stark.length) return ''
  return stark.map(d => {
    const s = saat(d.key)
    const lage = RAND + (HOEHE - 2 * RAND) * (0.1 + 0.8 * s)
    const amplitude = (HOEHE - 2 * RAND) * (0.06 + 0.16 * saat(`${d.key}#a`))
    const wellen = 1 + Math.round(saat(`${d.key}#w`) * 2)
    const dicke = rund(1 + 7 * Math.max(0, Math.min(1, d.wert)))
    const punkte: string[] = []
    const schritte = 40
    for (let i = 0; i <= schritte; i++) {
      const t = i / schritte
      const y = lage + Math.sin(t * Math.PI * 2 * wellen + s * 6.283) * amplitude
      punkte.push(`${i === 0 ? 'M' : 'L'}${rund(t * BREITE)} ${rund(y)}`)
    }
    return `<path d="${punkte.join(' ')}" fill="none" stroke="${pal.durchgang}" ` +
      `stroke-width="${dicke}" stroke-opacity="0.42" stroke-linecap="round"/>`
  }).join('\n  ')
}

/**
 * Die Leerstellen: was gewünscht ist und nicht vorkommt.
 *
 * **Ein Loch, kein Symbol.** Gefüllt mit der Grundfarbe, mit einem kaum sichtbaren Rand — es
 * soll nicht aussehen wie ein Gegenstand namens „Mangel", sondern wie eine Stelle, an der
 * nichts ist. Deshalb liegt es ÜBER den Durchgängen und UNTER den Marken: Es unterbricht das
 * Muster und verdeckt nichts, was jemand erlebt hat.
 *
 * Die Positionen kommen aus `loch()` — derselben Funktion, die die Marken aus dem Loch
 * heraushält. Zwei Stellen, die dasselbe berechnen, wären die nächste Fehlerquelle.
 */
function leerstellen(werte: BildWerte, pal: ReturnType<typeof paletteFinden>): string {
  if (!werte.leerstellen.length) return ''
  return werte.leerstellen.map((l, i) => {
    const { x, y, r } = loch(l)
    return `<circle cx="${rund(x)}" cy="${rund(y)}" r="${rund(r)}" fill="${pal.grund}" ` +
      `stroke="${pal.leerRand}" stroke-width="1.2" stroke-dasharray="5 7" ` +
      `data-leer="${i}"/>`
  }).join('\n  ')
}

/**
 * Die Lichter: Erkenntnisse. Das Einzige, was leuchtet.
 *
 * Gesetzt neben die Marke, die ZEITLICH am nächsten liegt: Eine Einsicht kommt aus dem
 * Erlebten und gehört daneben.
 *
 * **Die erste Fassung verglich Hashwerte statt Zeiten** und streute die Lichter dadurch
 * irgendwohin — bei der Probe lagen zwei am linken Rand, wo gar nichts war. Auch das fällt
 * beim Ansehen nicht auf: Ein Licht sieht überall gut aus.
 */
function lichter(
  werte: BildWerte, pal: ReturnType<typeof paletteFinden>, marken: Marke[],
): string {
  if (!werte.lichter.length) return ''
  const tagVon = new Map(werte.szenen.map(s => [s.id, s.tag]))
  return `
  <defs>
    <radialGradient id="glanz">
      <stop offset="0%" stop-color="${pal.licht}" stop-opacity="0.95"/>
      <stop offset="45%" stop-color="${pal.licht}" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="${pal.licht}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  ` + werte.lichter.map(l => {
    const nah = marken.length
      ? marken.reduce((a, b) =>
        Math.abs((tagVon.get(a.id) ?? 0) - l.tag) <= Math.abs((tagVon.get(b.id) ?? 0) - l.tag)
          ? a : b)
      : null
    // Versetzt, damit das Licht die Marke nicht verdeckt — und deterministisch versetzt.
    const winkel = saat(`${l.id}#w`) * Math.PI * 2
    const weg = nah ? nah.r + 22 : 0
    const x = nah ? nah.x + Math.cos(winkel) * weg : BREITE / 2
    const y = nah ? nah.y + Math.sin(winkel) * weg : HOEHE / 2
    const gx = rund(Math.max(RAND * 0.4, Math.min(BREITE - RAND * 0.4, x)))
    const gy = rund(Math.max(RAND * 0.4, Math.min(HOEHE - RAND * 0.4, y)))
    return `<circle cx="${gx}" cy="${gy}" r="26" fill="url(#glanz)"/>` +
      `<circle cx="${gx}" cy="${gy}" r="3.5" fill="${pal.licht}" data-licht="${l.id}"/>`
  }).join('\n  ')
}

/** Der Druck: ein Verlauf von der Kante. Er schiebt (in `anordnung.ts`) und zeigt sich hier. */
function druck(werte: BildWerte, pal: ReturnType<typeof paletteFinden>): string {
  if (werte.druck === null || werte.druck <= 0) return ''
  const kraft = Math.max(0, Math.min(1, werte.druck))
  return `
  <defs>
    <linearGradient id="druck" x1="100%" y1="0%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="${pal.marke[1]}" stop-opacity="${feinRund(0.3 * kraft)}"/>
      <stop offset="60%" stop-color="${pal.marke[1]}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${BREITE}" height="${HOEHE}" fill="url(#druck)"/>`
}

/** Die rechte Seite bei „zwei Seiten": die Wünsche als offene Ringe. */
function wunschSeite(werte: BildWerte, pal: ReturnType<typeof paletteFinden>): string {
  if (!werte.leerstellen.length) return ''
  return werte.leerstellen.map(l => {
    const s = saat(`${l.key}#w2`)
    const x = BREITE / 2 + RAND * 0.5 + (BREITE / 2 - RAND * 1.5) * (0.15 + 0.7 * s)
    const y = RAND + (HOEHE - 2 * RAND) * (0.1 + 0.8 * saat(`${l.key}#w3`))
    const r = 12 + 30 * Math.max(0, Math.min(1, l.wunsch))
    return `<circle cx="${rund(x)}" cy="${rund(y)}" r="${rund(r)}" fill="none" ` +
      `stroke="${pal.marke[0]}" stroke-width="1.6" stroke-dasharray="4 6" ` +
      `data-wunsch="${l.key}"/>`
  }).join('\n  ')
}

export function zeichnen(
  werte: BildWerte, einst: BildEinstellungen, marken: Marke[],
): string {
  const pal = paletteFinden(einst.palette)
  const an = (s: Schicht) => einst.schichten.includes(s)
  const zweiSeiten = einst.anordnung === 'zwei_seiten'

  const teile = [
    `<rect x="0" y="0" width="${BREITE}" height="${HOEHE}" fill="${pal.grund}"/>`,
    an('grundton') ? grundton(werte, pal) : '',
    an('durchgaenge') ? durchgaenge(werte, pal) : '',
    an('leerstellen') && !zweiSeiten ? leerstellen(werte, pal) : '',
    an('szenen')
      ? marken.map(m =>
        `<path d="${markePfad(m)}" fill="${mischen(pal.marke[0], pal.marke[1], m.ton)}" ` +
        `fill-opacity="0.88" data-szene="${m.id}"/>`).join('\n  ')
      : '',
    zweiSeiten && an('leerstellen') ? wunschSeite(werte, pal) : '',
    an('lichter') ? lichter(werte, pal, marken) : '',
    an('druck') ? druck(werte, pal) : '',
  ].filter(Boolean)

  // `role="img"` mit Titel: Ein Bild ohne Textalternative ist für einen Screenreader eine
  // leere Stelle. Der Titel bleibt bewusst nüchtern — er deutet nicht.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BREITE} ${HOEHE}" ` +
    `width="${BREITE}" height="${HOEHE}" role="img">\n  ` +
    `<title>Lagebild: ${marken.length} festgehaltene Momente, ` +
    `Anordnung ${einst.anordnung}</title>\n  ` +
    teile.join('\n  ') + '\n</svg>'
}
