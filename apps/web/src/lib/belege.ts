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

/** Belege mit stabiler Nummer: `Szene 12`, `Dokument 3`, `Erkenntnis 5`. */
export type NummerArt = 'szene' | 'dokument' | 'erkenntnis'

/**
 * Belege mit Namen statt Nummer: `Themendialog „Schuld“`, `Hypothese „Bindungsmuster“`.
 *
 * Davon gibt es je Fall höchstens einen pro Thema — eine Nummer wäre hier erfunden. Der
 * Name ist die Kennung, und genau so steht er auch im Prompt.
 */
export type NamensArt = 'themendialog' | 'hypothese' | 'selbsttest'

export type BelegArt = NummerArt | NamensArt | 'gefuehlsbild'

export type Beleg =
  | { art: NummerArt; nr: number }
  | { art: NamensArt; name: string }
  /** Das jüngste bestätigte Gefühlsbild — im Gespräch gibt es immer nur das eine. */
  | { art: 'gefuehlsbild' }

/** Das Wort, das Echo schreibt → die Art. Genau diese stehen auch im Prompt. */
const WOERTER: Record<string, NummerArt> = {
  Szene: 'szene',
  Dokument: 'dokument',
  Erkenntnis: 'erkenntnis',
}

const NAMENS_WOERTER: Record<string, NamensArt> = {
  Themendialog: 'themendialog',
  Hypothese: 'hypothese',
  Selbsttest: 'selbsttest',
}

const SCHEMA = 'echob:'

/**
 * Findet `Szene 12`, `Dokument 3`, `Erkenntnis 5` — und `Themendialog „…“`,
 * `Hypothese „…“`, `Selbsttest „…“`, `Gefühlsbild`.
 *
 * Höchstens drei Ziffern: Ein Fall trägt 50 Szenen, 10 Dokumente, 40 Erkenntnisse. Vier
 * Ziffern wären eine Jahreszahl („Szene 2026") und kein Beleg.
 *
 * Namen nur MIT Anführungszeichen: „die Hypothese, dass …" ist ein Gedanke, kein Verweis.
 * Erst die Anführung macht daraus den Namen eines gespeicherten Eintrags. Welche Zeichen
 * das Modell dafür nimmt, ist nicht verlässlich — deshalb alle üblichen.
 *
 * Ein Durchgang mit Alternativen statt drei nacheinander: Ein zweiter Durchgang suchte in
 * den Link-Texten des ersten weiter.
 */
const MUSTER =
  /\b(Szene|Dokument|Erkenntnis)\s+(\d{1,3})\b|\b(Themendialog|Hypothese|Selbsttest)\s+[„“"»]([^„“”"»«\n]{2,80})[“”"«]|\bGefühlsbild\b/g

/**
 * Code bleibt unberührt.
 *
 * In einem Codeblock ist `Szene 12` Text, kein Verweis — ihn dort zu verlinken zerstörte
 * das Beispiel. Erfasst Zaunblöcke (```) und Einzelzeichen (`).
 */
const CODE = /(```[\s\S]*?```|`[^`\n]*`)/g

/**
 * Ein Name als Teil eines Link-Ziels.
 *
 * `encodeURIComponent` lässt Klammern stehen — und eine Klammer im Ziel beendet den
 * Markdown-Link vorzeitig („Persönlichkeitsstruktur (Cluster-B-Spektrum)").
 */
function zielName(name: string): string {
  return encodeURIComponent(name).replace(/\(/g, '%28').replace(/\)/g, '%29')
}

/** Setzt Markdown-Links um alle erkannten Belege. Lässt alles andere, wie es ist. */
export function belegeVerlinken(text: string): string {
  return text
    .split(CODE)
    .map((teil, i) => (i % 2 === 1 ? teil : teil.replace(
      MUSTER,
      (treffer, wort?: string, nr?: string, namensWort?: string, name?: string) => {
        if (wort && nr) return `[${treffer}](${SCHEMA}${WOERTER[wort]}/${nr})`
        if (namensWort && name) {
          return `[${treffer}](${SCHEMA}${NAMENS_WOERTER[namensWort]}/${zielName(name.trim())})`
        }
        return `[${treffer}](${SCHEMA}gefuehlsbild)`
      },
    )))
    .join('')
}

/** Liest einen Beleg aus dem Ziel eines Links — oder gibt null für gewöhnliche Links. */
export function belegAusHref(href: string | undefined): Beleg | null {
  if (!href?.startsWith(SCHEMA)) return null
  const rest = href.slice(SCHEMA.length)
  if (rest === 'gefuehlsbild') return { art: 'gefuehlsbild' }

  const schnitt = rest.indexOf('/')
  if (schnitt < 0) return null
  const art = rest.slice(0, schnitt)
  const wert = rest.slice(schnitt + 1)

  if ((Object.values(NAMENS_WOERTER) as string[]).includes(art)) {
    let name: string
    try { name = decodeURIComponent(wert).trim() } catch { return null }
    return name ? { art: art as NamensArt, name } : null
  }
  if (!(Object.values(WOERTER) as string[]).includes(art)) return null
  const zahl = Number(wert)
  return Number.isInteger(zahl) && zahl > 0 ? { art: art as NummerArt, nr: zahl } : null
}

/**
 * Passt der Name, den Echo geschrieben hat, zum gespeicherten?
 *
 * Großzügig, aber nicht beliebig: Das Modell kürzt („Persönlichkeitsstruktur" statt
 * „Persönlichkeitsstruktur (Cluster-B-Spektrum)") oder setzt Satzzeichen anders. Gleich
 * ist, was ohne Satzzeichen und Groß-/Kleinschreibung übereinstimmt oder womit das andere
 * beginnt — ab vier Zeichen, damit ein Bruchstück nicht auf alles passt.
 */
export function namePasst(geschrieben: string, gespeichert: string): boolean {
  const glatt = (s: string) => s.toLocaleLowerCase('de-DE').replace(/[^\p{L}\p{N}]+/gu, '')
  const a = glatt(geschrieben)
  const b = glatt(gespeichert)
  if (!a || !b) return false
  if (a === b) return true
  return Math.min(a.length, b.length) >= 4 && (a.startsWith(b) || b.startsWith(a))
}

/**
 * Welche Ziele react-markdown durchlassen darf.
 *
 * **Der Fehler, gegen den das steht.** `defaultUrlTransform` wirft jedes Protokoll weg, das
 * nicht auf seiner Liste steht, und setzt `href=""`. Ein leeres href führt im Browser auf
 * die Seite, auf der man gerade steht — die Belege sahen also aus wie Links und führten
 * zurück in denselben Chat. Ein Fehler, den man nur bemerkt, wenn man klickt.
 *
 * Durchgelassen wird ausschließlich das eigene Schema. Für alles andere bleibt die Prüfung
 * von react-markdown zuständig; sie hält `javascript:` und Verwandtes heraus.
 */
export function belegUrlTransform(
  url: string,
  standard: (u: string) => string,
): string {
  return url.startsWith(SCHEMA) ? url : standard(url)
}
