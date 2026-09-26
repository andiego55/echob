/**
 * Was sich zwischen zwei Skizzen bewegt hat.
 *
 * **Warum das die interessanteste Stelle des Moduls ist.** Eine einzelne Skizze sagt, was
 * jemand sich wünscht. Zwei Skizzen im Abstand von Monaten sagen, **was mit ihm passiert
 * ist** — und das weiß er meistens selbst nicht. „Sicherheit stand damals an vierter Stelle
 * und steht heute an erster" ist eine Auskunft, die man sich nicht selbst geben kann.
 *
 * **Kein Prozentwert, keine Note, keine Richtung „besser".** Dieselbe Regel wie im ganzen
 * Modul: Wer seine Wunschbeziehung skizziert und dann „63 % Übereinstimmung mit früher"
 * liest, hat sich eine Waffe gebaut. Hier steht, WAS sich bewegt hat, und die Bewertung
 * bleibt bei der Person.
 *
 * **Und nichts davon ist erzeugt.** Kein Modell, keine Wartezeit, keine Kosten — es ist ein
 * Vergleich zweier Listen. Deshalb kann er sofort erscheinen, in dem Moment, in dem jemand
 * die zweite Skizze fertig hat und noch neugierig ist.
 */
import type { IdealAbwaegung, SkizzenInhalt } from '@/api/kompassIdeal'
import { stufe } from '@/components/app/kompass/Waage'

/** Ab welcher Änderung ein Gewicht als bewegt gilt. */
const GEWICHTS_SCHWELLE = 20

export interface Wandel {
  /** Wünsche, die vorher nicht dastanden. */
  neu: { key: string; label: string }[]
  /** Wünsche, die weggefallen sind. */
  weg: { key: string; label: string }[]
  /** In der Reihenfolge gewandert — nur, wer beide Male geordnet war. */
  gewandert: { key: string; label: string; vorher: number; jetzt: number }[]
  /** Deutlich mehr oder weniger davon. */
  gewicht: { key: string; label: string; vorher: number; jetzt: number }[]
  /** Abwägungen, bei denen die Antwort gekippt ist. */
  gedreht: { key: string; vorher: string; jetzt: string }[]
  /** Hat sich an den eigenen Worten etwas geändert? */
  eigenes: 'gleich' | 'geaendert' | 'neu' | 'weg'
  /** Nichts hat sich bewegt — auch das ist eine Auskunft. */
  ruhig: boolean
}

const leer: SkizzenInhalt = { aspekte: [], reihung: [], abwaegungen: {}, eigenes: null }

export function wandel(
  vorher: SkizzenInhalt | null | undefined,
  jetzt: SkizzenInhalt | null | undefined,
  paare: IdealAbwaegung[],
): Wandel {
  const a = vorher ?? leer
  const b = jetzt ?? leer

  const label = (inhalt: SkizzenInhalt, key: string) =>
    inhalt.aspekte.find(x => x.key === key)?.label || key
  const keysA = a.aspekte.map(x => x.key)
  const keysB = b.aspekte.map(x => x.key)

  const neu = keysB.filter(k => !keysA.includes(k)).map(k => ({ key: k, label: label(b, k) }))
  const weg = keysA.filter(k => !keysB.includes(k)).map(k => ({ key: k, label: label(a, k) }))
  const beide = keysB.filter(k => keysA.includes(k))

  // Gewandert ist nur, wer BEIDE Male in der Reihenfolge stand. Wer vorher ungeordnet war
  // und jetzt auf Platz zwei steht, ist nicht gewandert — über ihn wurde vorher nichts
  // gesagt, und „von nirgends nach zwei" ist keine Bewegung, sondern eine erste Aussage.
  const gewandert = beide
    .filter(k => a.reihung.includes(k) && b.reihung.includes(k))
    .map(k => ({
      key: k, label: label(b, k),
      vorher: a.reihung.indexOf(k) + 1,
      jetzt: b.reihung.indexOf(k) + 1,
    }))
    .filter(x => x.vorher !== x.jetzt)
    .sort((x, y) => Math.abs(y.jetzt - y.vorher) - Math.abs(x.jetzt - x.vorher))

  const gewichtVon = (inhalt: SkizzenInhalt, key: string) =>
    inhalt.aspekte.find(x => x.key === key)?.gewicht ?? 50
  const gewicht = beide
    .map(k => ({ key: k, label: label(b, k), vorher: gewichtVon(a, k), jetzt: gewichtVon(b, k) }))
    .filter(x => Math.abs(x.jetzt - x.vorher) >= GEWICHTS_SCHWELLE)
    .sort((x, y) => Math.abs(y.jetzt - y.vorher) - Math.abs(x.jetzt - x.vorher))

  // Verglichen werden die STUFEN, nicht die Zahlen: 15 und 20 sind dieselbe Antwort, und
  // ein Unterschied, den niemand angetippt hat, ist keiner.
  const wort = (paar: IdealAbwaegung, wert: number | undefined) => {
    const s = stufe(wert)
    return s === 'links' ? paar.links : s === 'rechts' ? paar.rechts
      : s === 'mitte' ? `${paar.links} und ${paar.rechts} gleich` : null
  }
  const gedreht = paare
    .map(p => ({ key: p.key, vorher: wort(p, a.abwaegungen[p.key]), jetzt: wort(p, b.abwaegungen[p.key]) }))
    .filter((x): x is { key: string; vorher: string; jetzt: string } =>
      // Beide Seiten müssen beantwortet sein. Eine Frage, die vorher offen war, ist jetzt
      // beantwortet — das ist eine neue Aussage, keine gedrehte.
      x.vorher !== null && x.jetzt !== null && x.vorher !== x.jetzt)

  const textA = (a.eigenes || '').trim()
  const textB = (b.eigenes || '').trim()
  const eigenes: Wandel['eigenes'] =
    textA === textB ? 'gleich' : !textA ? 'neu' : !textB ? 'weg' : 'geaendert'

  return {
    neu, weg, gewandert, gewicht, gedreht, eigenes,
    ruhig: neu.length === 0 && weg.length === 0 && gewandert.length === 0
      && gewicht.length === 0 && gedreht.length === 0 && eigenes === 'gleich',
  }
}

/**
 * Ein Satz über das Ganze — qualitativ, nie als Zahl.
 *
 * Ein Prozentwert über die eigene Veränderung wäre eine Note für ein Leben. Diese Sätze
 * beschreiben nur die Grössenordnung und überlassen die Deutung der Person; keiner von
 * ihnen sagt, ob viel oder wenig Bewegung gut ist.
 */
export function wandelSatz(w: Wandel): string {
  if (w.ruhig) {
    return 'Fast nichts hat sich verschoben. Du wolltest damals dasselbe wie heute.'
  }
  const bewegt = w.neu.length + w.weg.length + w.gewandert.length + w.gedreht.length
  if (bewegt === 0) {
    return 'Die Wünsche sind dieselben geblieben — nur ihr Gewicht hat sich verschoben.'
  }
  if (bewegt <= 2) {
    return 'Das meiste ist geblieben. Ein paar Dinge liegen heute anders.'
  }
  if (bewegt <= 5) {
    return 'Einiges hat sich bewegt — und einiges ist genau so geblieben.'
  }
  return 'Da hat sich viel verschoben. Was du heute aufgeschrieben hast, ist an vielen '
    + 'Stellen etwas anderes als damals.'
}
