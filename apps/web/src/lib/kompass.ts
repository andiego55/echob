/**
 * Die Rechnerei des Kompasses — ohne React, ohne DOM, ohne Netz.
 *
 * **Warum das hier liegt und nicht in den Komponenten.** Eine Kurve, die in einer
 * Komponente entsteht, lässt sich nur prüfen, indem man sie rendert und Pixel anschaut.
 * Was hier steht, prüft ein Test mit drei Zeilen — und genau die Stellen, an denen sich
 * ein Verlauf still verrechnen kann (leere Liste, ein einziger Punkt, alle am selben Tag),
 * sind die, die man beim Hinsehen nie erwischt.
 *
 * Alles hier ist rein: gleiche Eingabe, gleiche Ausgabe, keine Uhr im Verborgenen. Wo eine
 * Zeit gebraucht wird, kommt sie als Argument — sonst hängt der Test von der Tageszeit ab,
 * zu der er läuft.
 */
import type { Puls } from '@/api/kompass'

// ── Die Farben der fünf Zustände ────────────────────────────────────────────

/**
 * Kühl nach warm, nicht rot nach grün.
 *
 * Eine Ampel würde den Zustand benoten: rot ist falsch, grün ist richtig. Ein schwerer Tag
 * ist aber kein Fehler, und wer ihn festhält, soll dafür kein Warnzeichen bekommen —
 * sonst hält er ihn beim nächsten Mal nicht mehr fest, und der Verlauf zeigt nur noch die
 * guten Tage.
 *
 * Deshalb eine Temperatur: schwer ist tief und kühl, leicht ist hell und warm. Dieselben
 * zwei Farben, aus denen die ganze Anwendung besteht — der Kompass bekommt keine eigene
 * Palette, er benutzt die vorhandene als Skala.
 *
 * **Die Mitte ist der blasseste Ton, und das ist kein Versehen.** Zu beiden Enden wird es
 * kräftiger: dunkel nach unten, warm nach oben. „Neutral" ist der am wenigsten geladene
 * Punkt und soll auch so aussehen — ein kräftiges Mittelgrau würde behaupten, dass
 * „weder noch" eine Aussage ist.
 */
export const ZUSTANDS_TON: Record<number, { hex: string; schrift: string }> = {
  1: { hex: '#1e3a55', schrift: '#1e3a55' },
  2: { hex: '#4d7091', schrift: '#3f6080' },
  // Die Mitte ist als Fläche hell genug für einen Punkt, aber zu hell für Text auf Weiß.
  3: { hex: '#8fb3cf', schrift: '#5b7f9b' },
  4: { hex: '#d99a76', schrift: '#b06a43' },
  5: { hex: '#e07b54', schrift: '#c8623c' },
}

const TON_UNBEKANNT = { hex: '#8fb3cf', schrift: '#4a6070' }

/** Nie undefined: Ein Zustand aus einer künftigen Katalogstufe bekommt einen stillen Ton. */
export function ton(wert: number | null | undefined) {
  return (wert != null && ZUSTANDS_TON[wert]) || TON_UNBEKANNT
}

// ── Die Kurve ───────────────────────────────────────────────────────────────

export interface KurvenPunkt {
  x: number
  y: number
  puls: Puls
}

export interface Kurve {
  /** Der Pfad der Linie. Leer, solange es weniger als zwei Punkte gibt. */
  linie: string
  /** Derselbe Pfad, unten geschlossen — für die Fläche darunter. */
  flaeche: string
  punkte: KurvenPunkt[]
}

const TAG_MS = 86_400_000

/**
 * Die Geometrie des Verlaufs.
 *
 * **Die x-Achse ist echte Zeit, keine Reihenfolge.** Das ist die unbequemere Wahl: Wer
 * heute drei Momente festhält und davor zwei Wochen nichts, sieht drei Punkte am rechten
 * Rand und davor eine Lücke. Genau das ist aber die Auskunft. Mit gleichverteilten
 * Punkten sähe dieselbe Woche aus wie ein gleichmäßiger Verlauf, den es nie gab.
 *
 * **Die Glättung kann nicht überschwingen.** Die Kontrollpunkte liegen waagerecht auf der
 * Höhe ihres eigenen Endpunkts; damit bleibt jedes Stück zwischen seinen beiden Werten.
 * Eine gewöhnliche Spline schießt über — und ein Punkt unterhalb von „belastet" behauptet
 * einen Zustand, den die Skala nicht kennt.
 */
export function kurve(
  pulse: Puls[],
  opt: { breite: number; hoehe: number; tage: number; rand?: number; jetzt?: number },
): Kurve {
  const { breite, hoehe, tage } = opt
  const rand = opt.rand ?? 10
  const jetzt = opt.jetzt ?? Date.now()

  if (pulse.length === 0) return { linie: '', flaeche: '', punkte: [] }

  const von = jetzt - Math.max(1, tage) * TAG_MS
  const spanne = Math.max(1, jetzt - von)
  const innenB = Math.max(1, breite - rand * 2)
  const innenH = Math.max(1, hoehe - rand * 2)

  const punkte: KurvenPunkt[] = pulse.map(p => {
    const t = new Date(p.created_at).getTime()
    const anteil = Math.min(1, Math.max(0, (t - von) / spanne))
    // 1 = unten, 5 = oben. Der Bildschirm läuft nach unten, die Stimmung nach oben.
    const stufe = Math.min(1, Math.max(0, (p.zustand - 1) / 4))
    return {
      x: rand + anteil * innenB,
      y: rand + (1 - stufe) * innenH,
      puls: p,
    }
  })

  if (punkte.length === 1) return { linie: '', flaeche: '', punkte }

  let linie = `M ${punkte[0].x.toFixed(2)} ${punkte[0].y.toFixed(2)}`
  for (let i = 1; i < punkte.length; i++) {
    const a = punkte[i - 1]
    const b = punkte[i]
    const halb = (b.x - a.x) / 2
    linie += ` C ${(a.x + halb).toFixed(2)} ${a.y.toFixed(2)},`
      + ` ${(b.x - halb).toFixed(2)} ${b.y.toFixed(2)},`
      + ` ${b.x.toFixed(2)} ${b.y.toFixed(2)}`
  }

  const letzter = punkte[punkte.length - 1]
  const flaeche = `${linie} L ${letzter.x.toFixed(2)} ${hoehe} L ${punkte[0].x.toFixed(2)} ${hoehe} Z`

  return { linie, flaeche, punkte }
}

// ── Zeit in Worten ──────────────────────────────────────────────────────────

const WOCHENTAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

const uhr = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

const tagesBeginn = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

/**
 * Wann das war, so wie ein Mensch es sagen würde.
 *
 * **Kalendertage, keine 24-Stunden-Schritte.** „Vor 20 Stunden" ist richtig und
 * unbrauchbar: Um acht Uhr morgens meint es gestern Mittag, und das muss niemand im Kopf
 * ausrechnen. Verglichen wird deshalb der Kalendertag.
 */
export function zeitWort(iso: string, jetzt: number = Date.now()): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''

  const n = new Date(jetzt)
  const minuten = Math.round((jetzt - d.getTime()) / 60_000)
  if (minuten >= 0 && minuten < 2) return 'gerade eben'
  if (minuten >= 0 && minuten < 60) return `vor ${minuten} Minuten`

  const tageAuseinander = Math.round((tagesBeginn(n) - tagesBeginn(d)) / TAG_MS)
  if (tageAuseinander === 0) return `heute, ${uhr(d)}`
  if (tageAuseinander === 1) return `gestern, ${uhr(d)}`
  if (tageAuseinander > 1 && tageAuseinander < 7) return `${WOCHENTAGE[d.getDay()]}, ${uhr(d)}`
  return `${d.getDate()}. ${MONATE[d.getMonth()]}`
}

export interface Tagesgruppe {
  /** Ortszeit-Datum als `JJJJ-MM-TT` — der Schlüssel, nicht die Beschriftung. */
  tag: string
  label: string
  pulse: Puls[]
}

/**
 * Die Momente nach Kalendertagen, neueste zuerst.
 *
 * **Warum nicht einfach eine flache Liste.** Wer an einem Tag dreimal antippt, sieht sonst
 * dreimal dasselbe Datum untereinander. Gruppiert liest sich derselbe Tag als das, was er
 * ist: ein Tag mit drei Momenten — und genau daran erkennt man die unruhigen.
 *
 * **Ortszeit, nicht UTC.** Ein Moment um 00:30 gehört zu der Nacht, in der er passiert
 * ist, und nicht zum Vortag, nur weil der Server in einer anderen Zone rechnet.
 */
export function nachTagen(pulse: Puls[], jetzt: number = Date.now()): Tagesgruppe[] {
  const gruppen = new Map<string, Puls[]>()
  for (const p of pulse) {
    const d = new Date(p.created_at)
    if (Number.isNaN(d.getTime())) continue
    const tag = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      + `-${String(d.getDate()).padStart(2, '0')}`
    const vorhanden = gruppen.get(tag)
    if (vorhanden) vorhanden.push(p)
    else gruppen.set(tag, [p])
  }

  const n = new Date(jetzt)
  return [...gruppen.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([tag, eintraege]) => {
      const d = new Date(eintraege[0].created_at)
      const abstand = Math.round((tagesBeginn(n) - tagesBeginn(d)) / TAG_MS)
      const label = abstand === 0
        ? 'Heute'
        : abstand === 1
          ? 'Gestern'
          : `${WOCHENTAGE[d.getDay()]}, ${d.getDate()}. ${MONATE[d.getMonth()]}`
      return {
        tag,
        label,
        pulse: [...eintraege].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
      }
    })
}

/**
 * Wie alt etwas ist, grob — „vor 3 Wochen", „vor 8 Monaten".
 *
 * **Wofür.** Ein bestätigter Satz über sich selbst ist eine Einschätzung von dem Tag, an
 * dem jemand zugestimmt hat, und kein Befund. Ohne sichtbares Alter liest er sich wie
 * eine Eigenschaft. „14. Februar" sagt dabei weniger als „vor sieben Monaten": Das eine
 * muss man ausrechnen, das andere trifft sofort.
 *
 * Grob ist Absicht. Auf den Tag genau wäre hier eine Genauigkeit, die es nicht gibt.
 */
export function altersWort(iso: string | null | undefined, jetzt: number = Date.now()): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''

  const tage = Math.round((tagesBeginn(new Date(jetzt)) - tagesBeginn(d)) / TAG_MS)
  if (tage <= 0) return 'heute'
  if (tage === 1) return 'gestern'
  if (tage < 14) return `vor ${tage} Tagen`
  if (tage < 56) return `vor ${Math.round(tage / 7)} Wochen`
  if (tage < 365) return `vor ${Math.round(tage / 30.4)} Monaten`
  const jahre = Math.floor(tage / 365)
  return jahre === 1 ? 'vor einem Jahr' : `vor ${jahre} Jahren`
}

/** Wie viele Momente in welchem Zeitraum — ohne Lob und ohne Mahnung. */
export function rhythmusSatz(anzahl: number, tage: number): string {
  const zeitraum = tage % 7 === 0 ? `${tage / 7} Wochen` : `${tage} Tagen`
  if (anzahl === 0) return `Noch nichts festgehalten in den letzten ${zeitraum}.`
  if (anzahl === 1) return `Ein Moment in den letzten ${zeitraum}.`
  return `${anzahl} Momente in den letzten ${zeitraum}.`
}

// ── Die Bewegung ────────────────────────────────────────────────────────────

export type Richtung = 'heller' | 'schwerer' | 'gleich'

/** Unter sechs Momenten wäre jede Aussage über eine Richtung geraten. */
const GENUG_FUER_RICHTUNG = 6
/** Eine halbe Stufe. Darunter ist es Rauschen und keine Bewegung. */
const SCHWELLE = 0.5

/**
 * Liegt die zweite Hälfte höher als die erste?
 *
 * **Warum das überhaupt da ist.** Ohne diesen Satz ist die Kurve ein Schaubild, das man
 * ansieht und wieder vergisst. Mit ihm ist sie eine Auskunft.
 *
 * **Warum sie beschreibt und nicht deutet.** „Es geht bergauf" wäre eine Behauptung über
 * ein Leben, die aus fünfzehn Antippern nicht folgt. „Die letzten Einträge liegen höher
 * als die davor" ist nachprüfbar — und die Deutung bleibt bei der Person.
 */
export function bewegung(pulse: Puls[]): { richtung: Richtung; satz: string } | null {
  if (pulse.length < GENUG_FUER_RICHTUNG) return null

  const mitte = Math.floor(pulse.length / 2)
  const mittel = (teil: Puls[]) => teil.reduce((s, p) => s + p.zustand, 0) / teil.length
  const unterschied = mittel(pulse.slice(mitte)) - mittel(pulse.slice(0, mitte))

  if (unterschied >= SCHWELLE) {
    return { richtung: 'heller', satz: 'Die letzten Einträge liegen höher als die davor.' }
  }
  if (unterschied <= -SCHWELLE) {
    return { richtung: 'schwerer', satz: 'Die letzten Einträge liegen tiefer als die davor.' }
  }
  return { richtung: 'gleich', satz: 'Die letzten Einträge liegen etwa wie die davor.' }
}

// ── Die Rückschau ───────────────────────────────────────────────────────────

/**
 * Ist eine Rückschau auf dieses Vorhaben fällig?
 *
 * **Warum das hier steht und nicht im Dienst.** Die Rechnung braucht eine Uhr, und der
 * Dienst hat bewusst keine: Was eine Uhr im Verborgenen hat, ist nur mit Mühe prüfbar.
 * Hier kommt sie als Argument herein, und ein Test kann jeden Grenzfall stellen.
 *
 * **Ohne festen Rhythmus wird nie etwas fällig.** Wer „ohne festen Rhythmus" wählt, hat
 * sich gegen Erinnerungen entschieden — das ist eine Antwort und keine fehlende Angabe.
 *
 * Gerechnet wird ab der letzten Rückschau, und wenn es keine gab, ab dem Anlegen.
 */
export function rueckschauFaellig(
  vorhaben: { rueckschau_am: string | null; rhythmus_tage: number; created_at: string },
  jetzt: number = Date.now(),
): boolean {
  if (!vorhaben.rhythmus_tage || vorhaben.rhythmus_tage <= 0) return false
  const basis = new Date(vorhaben.rueckschau_am || vorhaben.created_at)
  if (Number.isNaN(basis.getTime())) return false
  const vergangen = (tagesBeginn(new Date(jetzt)) - tagesBeginn(basis)) / TAG_MS
  return vergangen >= vorhaben.rhythmus_tage
}

// ── Der Krisenplan ──────────────────────────────────────────────────────────

/**
 * Ein Abschnitt als Liste von Zeilen.
 *
 * Der Inhalt kommt als `Record<string, unknown>` — das Schema des Servers hält die Form
 * bewusst offen, damit ein neuer Abschnitt keine Migration braucht. Den Preis dafür zahlt
 * diese Funktion: Was hier herauskommt, ist geprüft, und der Rest der Oberfläche muss
 * nicht mehr raten.
 */
export function planZeilen(
  inhalt: Record<string, unknown> | null | undefined,
  key: string,
): string[] {
  const roh = inhalt?.[key]
  if (!Array.isArray(roh)) return []
  return roh
    .filter((z): z is string => typeof z === 'string' && z.trim() !== '')
    .map(z => z.trim())
}

/** Hat der Plan überhaupt etwas? Ein leerer Plan ist kein Plan. */
export function planGefuellt(
  inhalt: Record<string, unknown> | null | undefined,
  keys: string[],
): boolean {
  return keys.some(k => planZeilen(inhalt, k).length > 0)
}

/**
 * Was gespeichert wird: getrimmt, ohne leere Zeilen, ohne leere Abschnitte.
 *
 * Ein Abschnitt, in dem nur noch drei leere Eingabefelder stehen, sähe in der Datenbank
 * aus wie ein ausgefüllter — und die Übersicht meldete einen Plan, den es nicht gibt.
 */
export function planZumSpeichern(entwurf: Record<string, string[]>): Record<string, string[]> {
  const sauber: Record<string, string[]> = {}
  for (const [key, zeilen] of Object.entries(entwurf)) {
    const gefiltert = zeilen.map(z => z.trim()).filter(z => z !== '')
    if (gefiltert.length > 0) sauber[key] = gefiltert
  }
  return sauber
}

/**
 * Eine Telefonnummer aus einer Zeile wie „Mama · 0170 1234567".
 *
 * **Wofür.** Im Notfall soll eine Nummer antippbar sein und nicht abgeschrieben werden
 * müssen. Findet sich keine, bleibt die Zeile schlicht Text — lieber kein Link als einer,
 * der irgendwo hinwählt.
 */
export function nummerAus(zeile: string): string | null {
  const treffer = zeile.match(/(\+?\d[\d\s/()-]{5,}\d)/)
  if (!treffer) return null
  const ziffern = treffer[1].replace(/[^\d+]/g, '')
  return ziffern.length >= 6 ? ziffern : null
}
