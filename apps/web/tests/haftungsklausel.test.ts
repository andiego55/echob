/**
 * Steht in den Haftungsklauseln eine Summe — und wird „wesentliche Vertragspflicht" erklärt?
 *
 * **Warum eine Zahl in AGB gefährlich ist, nicht vorsichtig.** Die erste Fassung der
 * Fachpersonen-AGB begrenzte auf das Jahresentgelt, mindestens 2.500 €. Das ist aus der
 * Marktpraxis ausgehandelter Verträge gedacht und für AGB falsch: Eine summenmäßige
 * Begrenzung ist nach § 307 BGB nur wirksam, wenn der Betrag den vertragstypisch
 * vorhersehbaren Schaden **übersteigt**. Liegt er darunter, wird die Klausel nicht auf das
 * zulässige Maß zurückgeschnitten — es gibt im AGB-Recht keine geltungserhaltende
 * Reduktion. Sie fällt ganz weg (§ 306 Abs. 2 BGB), und dann gilt § 276 BGB: Haftung ohne
 * jede Grenze. Eine Zahl kauft Berechenbarkeit und setzt dafür die Begrenzung selbst
 * aufs Spiel.
 *
 * Die abstrakte Formel ohne Summe ist dagegen gebilligt: BGH VIII ZR 337/11 vom
 * 18.07.2012 hielt „beschränkt auf die bei Vertragsschluss vorhersehbaren und
 * vertragstypischen Schäden" für wirksam — gegenüber einem Verbraucher, also am
 * strengeren Maßstab. Eine Obergrenze gehört in einen ausgehandelten Einzelvertrag
 * (§ 305 Abs. 1 S. 3 BGB), nicht in vorformulierte Bedingungen.
 *
 * **Und der zweite, ältere Mangel.** „Wesentliche Vertragspflicht" und
 * „Kardinalpflicht" stehen nicht im Gesetz. Ohne Erläuterung verstoßen sie gegen das
 * Transparenzgebot (§ 307 Abs. 1 S. 2 BGB) — OLG Celle 11 U 78/08 vom 30.10.2008, und
 * das gilt auch gegenüber Unternehmen. Eine Haftungsklausel, die den Begriff benutzt
 * ohne ihn zu definieren, ist unwirksam, und auch dann gilt wieder § 276 BGB. Der Mangel
 * lag in BEIDEN Dokumenten; beide sind am 07.10.2026 nachgezogen.
 *
 * **Geprüft wird der angezeigte Text, nicht die Datei.** Der Kopf von
 * `AGBFachpersonenPage.tsx` begründet, warum keine Summe dasteht — und nennt dabei die
 * alten „2.500 €". Ein Wächter über die ganze Datei würde an dieser Begründung
 * scheitern. Dasselbe Muster wie mehrfach in diesem Projekt (vgl.
 * `gotcha_filter_eigenes_wort`): Ein Prüfmuster, das den Erklärtext mitliest, prüft sich
 * selbst statt der Sache.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const WURZEL = join(__dirname, '..', 'src', 'pages')

/** Die beiden Dokumente mit einer Haftungsklausel. */
const SEITEN = ['AGBPage.tsx', 'AGBFachpersonenPage.tsx'] as const

const ohneKommentare = (q: string): string =>
  q.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '')

/**
 * Der Text des Haftungsparagrafen — Zeilenumbrüche zu einfachen Leerzeichen geglättet.
 *
 * Das Glätten ist nicht Kosmetik: Im JSX bricht „die ordnungsgemäße\n Durchführung"
 * mitten in der Wendung um. Eine Prüfung auf die Wendung mit einem Leerzeichen fand sie
 * deshalb nicht — beim Schreiben dieses Wächters genau einmal passiert.
 */
function haftung(datei: string): string {
  const quelle = ohneKommentare(readFileSync(join(WURZEL, datei), 'utf-8'))
  const treffer = [...quelle.matchAll(
    /<Section title="[^"]*Haftung[^"]*">([\s\S]*?)<\/Section>/g)]
  // Genau einer. Bei null liefen alle Prüfungen unten gegen den leeren String und wären
  // stumm erfüllt; bei mehreren prüfte diese Datei nur den ersten Fund.
  expect(treffer, `genau ein Haftungs-Abschnitt in ${datei}`).toHaveLength(1)
  return treffer[0][1].replace(/\s+/g, ' ').trim()
}

/** Was in einer Haftungsklausel in AGB nichts zu suchen hat. */
const VERBOTEN: ReadonlyArray<readonly [string, RegExp]> = [
  ['ein Betrag in Euro', /\d[\d.,]*\s*(?:€|EUR\b)/],
  ['eine Obergrenze („höchstens")', /höchstens/i],
  ['eine Haftungshöchstsumme', /Haftungshöchst/i],
  ['der Begriff „Kardinalpflicht"', /Kardinalpflicht/i],
]

function beanstandet(text: string): string[] {
  return VERBOTEN.filter(([, muster]) => muster.test(text)).map(([was]) => was)
}

describe('Haftungsklauseln', () => {
  it.each(SEITEN)('%s begrenzt nicht auf eine Summe', (datei) => {
    expect(beanstandet(haftung(datei))).toEqual([])
  })

  it.each(SEITEN)('%s erklärt, was eine wesentliche Vertragspflicht ist', (datei) => {
    const text = haftung(datei)
    expect(text).toContain('wesentlichen Vertragspflicht')
    // Die Definition aus der Rechtsprechung. Ohne sie ist der Begriff intransparent.
    expect(text).toContain('ordnungsgemäße Durchführung')
    expect(text).toContain('vertrauen')
  })

  it.each(SEITEN)('%s begrenzt auf den vorhersehbaren, vertragstypischen Schaden', (datei) => {
    const text = haftung(datei)
    expect(text).toContain('vorhersehbaren')
    expect(text).toContain('vertragstypischen')
  })

  it.each(SEITEN)('%s hält die unabdingbare Haftung offen', (datei) => {
    // § 309 Nr. 7 BGB gilt zwischen Unternehmen nicht direkt, hat aber Indizwirkung über
    // § 307. Diese drei Fälle sind in beiden Dokumenten unbegrenzt — immer.
    const text = haftung(datei)
    expect(text).toContain('unbeschränkt')
    expect(text).toContain('Vorsatz')
    expect(text).toContain('grober Fahrlässigkeit')
    expect(text).toMatch(/Leben, Körper und Gesundheit/)
  })

  it('die Fachpersonen-AGB lassen Art. 82 DSGVO unberührt', () => {
    // Ein Anspruch der betroffenen Person richtet sich gegen den Verantwortlichen und
    // lässt sich durch einen Vertrag zwischen uns und der Praxis nicht kürzen.
    expect(haftung('AGBFachpersonenPage.tsx')).toContain('Art. 82 DSGVO')
  })

  // ── Das Prüfmuster selbst ──────────────────────────────────────────────────
  // Ein Wächter, dessen Muster nie an einem schlechten Fall gezeigt wurde, kann still
  // blind sein. Hier laufen die Fassungen durch, die es fangen soll — darunter die, die
  // bis zum 07.10.2026 wirklich dastand.

  it('das Prüfmuster erkennt die Fassungen, die es fangen soll', () => {
    const faelle: ReadonlyArray<readonly [string, string]> = [
      ['die alte Fassung mit Mindestsumme',
        'begrenzt auf den vertragstypisch vorhersehbaren Schaden, höchstens jedoch auf '
        + 'das in den vorangegangenen zwölf Monaten gezahlte Entgelt, mindestens aber 2.500 €.'],
      ['ein runder Betrag', 'Die Haftung ist auf 10.000 EUR begrenzt.'],
      ['eine Obergrenze ohne Zahl', 'höchstens jedoch auf das Jahresentgelt.'],
      ['eine Haftungshöchstsumme', 'Es gilt eine Haftungshöchstsumme je Schadensfall.'],
      ['der intransparente Begriff', 'nur bei Verletzung von Kardinalpflichten.'],
    ]
    for (const [was, text] of faelle) {
      expect(beanstandet(text), was).not.toEqual([])
    }
  })

  it('das Prüfmuster beanstandet die jetzige Fassung nicht', () => {
    // Die Gegenprobe: Ein Muster, das alles beanstandet, ist genauso nutzlos wie eines,
    // das nichts findet. „zwölf Monaten" darf etwa nicht als Betrag gelten.
    expect(beanstandet(
      'Bei einfacher Fahrlässigkeit haften wir nur bei der Verletzung einer wesentlichen '
      + 'Vertragspflicht. Wesentlich ist eine Pflicht, deren Erfüllung die ordnungsgemäße '
      + 'Durchführung dieses Vertrags überhaupt erst ermöglicht und auf deren Einhaltung '
      + 'die Kundin regelmäßig vertrauen darf. In diesem Fall ist die Haftung auf den bei '
      + 'Vertragsschluss vorhersehbaren, vertragstypischen Schaden begrenzt.',
    )).toEqual([])
  })
})
