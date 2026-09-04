/**
 * Personenbezug in einem beigelegten Text finden und schwärzen.
 *
 * **Warum das mehr ist als ein Hinweis.** „Bitte entferne Klarnamen" steht schnell in
 * einem Kasten und wird ebenso schnell überlesen — und wer einen Chatverlauf aus dem
 * Telefon kopiert, sieht die Telefonnummer im Kopf der Datei gar nicht mehr. Ein Hinweis,
 * der die Stellen ZEIGT und auf einen Klick ersetzt, ist etwas anderes als eine Bitte.
 *
 * **Was hier bewusst NICHT versucht wird: Namen raten.** Ein Text voller „Anna" und
 * „Papa" lässt sich nicht zuverlässig von einem ohne unterscheiden — jede Heuristik
 * darauf erzeugt entweder Fehlalarme oder, schlimmer, eine trügerische Sicherheit
 * („EchoB hat ja nichts gefunden"). Erkannt wird nur, was eine erkennbare FORM hat:
 * E-Mail-Adressen, Telefonnummern, IBANs. Für Namen gibt es den zweiten Weg — die Person
 * sagt selbst, welche Namen im Text stehen, und die werden ersetzt. Das weiß niemand
 * besser als sie.
 */

export type FundArt = 'email' | 'telefon' | 'iban'

export interface Fund {
  art: FundArt
  text: string
  /** Wie oft dieselbe Zeichenfolge vorkommt. */
  anzahl: number
}

export const FUND_LABELS: Record<FundArt, string> = {
  email: 'E-Mail-Adresse',
  telefon: 'Telefonnummer',
  iban: 'IBAN',
}

export const ERSATZ: Record<FundArt, string> = {
  email: '[E-Mail entfernt]',
  telefon: '[Telefonnummer entfernt]',
  iban: '[IBAN entfernt]',
}

/**
 * Die Muster.
 *
 * Telefon ist der heikle Fall: Zu gierig, und jedes Datum („12.03.2026") und jeder
 * Geldbetrag wird zur Nummer. Verlangt werden deshalb beide Hälften — ein Anführer
 * (Ländervorwahl, führende Null oder Klammer) UND danach eine Ziffernfolge, die für ein
 * Datum zu lang ist. So, wie Telefonnummern in Chatverläufen tatsächlich stehen.
 *
 * Die drei Anführer sind nicht austauschbar: `+49 30 …` lässt die führende Null weg,
 * `(030) …` klammert sie ein, `0171 …` schreibt sie aus. Ein Muster, das nur die
 * ausgeschriebene Null kennt, übersieht jede international notierte Nummer — was beim
 * Schreiben dieses Musters prompt passiert ist und der Test gefunden hat.
 */
const MUSTER: { art: FundArt; regex: RegExp }[] = [
  { art: 'email', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { art: 'iban', regex: /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){3,7}\b/g },
  {
    art: 'telefon',
    regex: /(?:\+\d{1,3}[ /-]?\d{2,5}|\(0\d{1,4}\)|0\d{2,5})[ /-]?\d{3,}(?:[ /-]?\d{2,})*/g,
  },
]

/** Was an personenbezogenen Formen im Text steht — ohne ihn zu verändern. */
export function findePersonenbezug(text: string): Fund[] {
  const gefunden = new Map<string, Fund>()
  // E-Mails zuerst: Sonst reisst das Telefonmuster Ziffernfolgen aus einer Adresse.
  let rest = text
  for (const { art, regex } of MUSTER) {
    for (const treffer of rest.match(new RegExp(regex)) ?? []) {
      const schluessel = `${art}:${treffer}`
      const da = gefunden.get(schluessel)
      if (da) da.anzahl += 1
      else gefunden.set(schluessel, { art, text: treffer, anzahl: 1 })
    }
    // Bereits Erkanntes aus dem Suchtext nehmen, damit das nächste Muster nicht
    // dieselbe Stelle noch einmal (falsch) greift.
    rest = rest.replace(new RegExp(regex), ' ')
  }
  return [...gefunden.values()]
}

/** Alle gefundenen Formen durch ihren Platzhalter ersetzen. */
export function schwaerzePersonenbezug(text: string): string {
  let out = text
  for (const { art, regex } of MUSTER) {
    out = out.replace(new RegExp(regex), ERSATZ[art])
  }
  return out
}

/**
 * Vom Nutzer benannte Namen ersetzen.
 *
 * Ganzwortweise und ohne Rücksicht auf Gross-/Kleinschreibung. Bewusst NICHT als
 * Teilzeichenkette: „Ana" darf nicht mitten aus „Analyse" verschwinden.
 *
 * @param namen  eine Zeile oder Kommaliste, wie sie jemand hintippt
 */
export function ersetzeNamen(text: string, namen: string, ersatz = '[Name]'): string {
  const liste = namen
    .split(/[,;\n]/)
    .map(n => n.trim())
    .filter(n => n.length >= 2)
    // Längere zuerst: Sonst macht „Anna" aus „Anna-Lena" ein „[Name]-Lena".
    .sort((a, b) => b.length - a.length)

  let out = text
  for (const name of liste) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    out = out.replace(new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'giu'), `$1${ersatz}`)
  }
  return out
}
