/**
 * Sortieren und Ausleiten der Nutzerübersicht — die Arbeit an der ganzen Liste.
 *
 * Steht getrennt von `nutzerzeile.ts` (dort: was in einer Zelle steht) und von der Seite
 * (dort: wie es aussieht), weil hier zwei Dinge stecken, die man einer Tabelle nicht
 * ansieht:
 *
 * **Fehlende Angaben wandern immer ans Ende** — in beide Richtungen. Ein Konto ohne
 * Aktivität ist nicht „das älteste", und eine Klient:in ohne Tarif ist nicht „die
 * günstigste". Sortiert man sie stumpf mit, steht beim ersten Klick oben, worüber man am
 * wenigsten weiß.
 *
 * **Eine CSV-Datei für Excel ist nicht dasselbe wie eine CSV-Datei.** Ohne Semikolon steht
 * alles in einer Spalte, ohne BOM werden aus Umlauten Kästchen. Beides fällt erst auf,
 * wenn die Datei schon beim Steuerberater liegt.
 */
import type { UserRow } from './api'
import { ROLLEN_LABEL, hinweisZustand, tarifText, zahlenText } from './nutzerzeile'

export type SortSpalte =
  | 'name' | 'rolle' | 'email' | 'tarif' | 'menge' | 'avv' | 'hinweis'
  | 'zuletzt_aktiv' | 'created_at'

export type Richtung = 'auf' | 'ab'

/**
 * Die Zahl, die in der Spalte „Zahlen" vorn steht — je Rolle eine andere Bedeutung.
 *
 * Nach dem angezeigten Text zu sortieren wäre Unsinn: „12 Studierende" käme vor
 * „4 Klient:innen", weil „1" vor „4" steht.
 */
function menge(row: UserRow): number | null {
  if (row.rolle === 'client' || row.rolle === 'student') return row.faelle
  return row.verbindungen
}

/** „offen" zuerst: Das ist die einzige Ausprägung, wegen der man hier klickt. */
const ZUSTAND_RANG = { offen: 0, gut: 1, egal: 2 } as const

function avvRang(row: UserRow): number {
  if (row.rolle !== 'professional' || row.avv_accepted === null) return ZUSTAND_RANG.egal
  return row.avv_accepted ? ZUSTAND_RANG.gut : ZUSTAND_RANG.offen
}

function zeit(iso: string | null | undefined): number | null {
  return iso ? new Date(iso).getTime() : null
}

/** Der Wert, nach dem verglichen wird. ``null`` heißt „fehlt" und landet immer hinten. */
function schluessel(row: UserRow, spalte: SortSpalte): string | number | null {
  switch (spalte) {
    case 'name': return row.name?.trim() || null
    case 'rolle': return ROLLEN_LABEL[row.rolle]
    case 'email': return row.email?.trim() || null
    case 'tarif': return row.tarif || null
    case 'menge': return menge(row)
    case 'avv': return avvRang(row)
    case 'hinweis': return ZUSTAND_RANG[hinweisZustand(row).ton]
    case 'zuletzt_aktiv': return zeit(row.zuletzt_aktiv)
    case 'created_at': return zeit(row.created_at)
  }
}

/**
 * Sortiert eine Kopie der Liste. Stabil, damit die Reihenfolge des Servers als zweites
 * Kriterium erhalten bleibt — sonst springen gleichwertige Zeilen bei jedem Klick.
 */
export function sortiere(rows: UserRow[], spalte: SortSpalte, richtung: Richtung): UserRow[] {
  const faktor = richtung === 'auf' ? 1 : -1
  return [...rows].sort((a, b) => {
    const x = schluessel(a, spalte)
    const y = schluessel(b, spalte)
    // Fehlt eine Angabe, steht sie hinten - unabhaengig von der Richtung.
    if (x === null && y === null) return 0
    if (x === null) return 1
    if (y === null) return -1
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * faktor
    return String(x).localeCompare(String(y), 'de') * faktor
  })
}

/**
 * Die Richtung, die der erste Klick meint.
 *
 * Bei „Name" will man A–Z, bei „Zuletzt aktiv" das Neueste zuerst, bei „Zahlen" das
 * Größte. Immer aufsteigend zu beginnen hieße: Jeder Klick auf eine Datumsspalte zeigt
 * zuerst die Karteileichen, und man klickt ein zweites Mal.
 */
export function ersteRichtung(spalte: SortSpalte): Richtung {
  return spalte === 'menge' || spalte === 'zuletzt_aktiv' || spalte === 'created_at'
    ? 'ab'
    : 'auf'
}

// ── Ausleiten ────────────────────────────────────────────────────────────────

/**
 * Die Spalten der Datei — mehr als die Tabelle zeigt, aber keine andere Art von Angabe.
 *
 * „Zahlen" steht als lesbarer Satz drin UND als drei einzelne Zahlen: Der Satz sagt, was
 * die Zahl bedeutet, die Zahl lässt sich summieren. Was hier nicht steht, steht auch nicht
 * in der Tabelle — kein Inhalt, keine E-Mail von Klient:innen.
 */
const SPALTEN: { titel: string; wert: (r: UserRow) => string }[] = [
  { titel: 'Kennung', wert: r => r.user_id },
  { titel: 'Rolle', wert: r => ROLLEN_LABEL[r.rolle] },
  { titel: 'Name', wert: r => r.name ?? '' },
  { titel: 'E-Mail', wert: r => r.email ?? '' },
  { titel: 'Tarif', wert: r => (r.tarif ? tarifText(r) : '') },
  { titel: 'Zahlen', wert: r => (zahlenText(r) === '—' ? '' : zahlenText(r)) },
  { titel: 'Fälle', wert: r => zahl(r.faelle) },
  { titel: 'Szenen', wert: r => zahl(r.szenen) },
  { titel: 'Verbindungen', wert: r => zahl(r.verbindungen) },
  { titel: 'Berufsgruppe', wert: r => r.berufsgruppe_label ?? '' },
  { titel: '§ 203', wert: r => jaNein(r.rolle === 'professional' ? r.unterliegt_203 : null) },
  { titel: 'AVV', wert: r => jaNein(r.avv_accepted) },
  { titel: 'AVV-Fassung', wert: r => r.avv_version ?? '' },
  { titel: 'AVV am', wert: r => datum(r.avv_accepted_at) },
  { titel: 'Hinweis gelesen', wert: r => jaNein(r.hinweis_gelesen) },
  { titel: 'Hinweis am', wert: r => datum(r.hinweis_at) },
  { titel: 'Im Verzeichnis', wert: r => (r.im_verzeichnis ? 'ja' : 'nein') },
  { titel: 'Zuletzt aktiv', wert: r => datum(r.zuletzt_aktiv) },
  { titel: 'Angelegt', wert: r => datum(r.created_at) },
]

function zahl(n: number | null | undefined): string {
  // Leer heisst "nicht erhoben", 0 heisst null. In einer Tabellenkalkulation ist der
  // Unterschied noch wichtiger als im Browser: Aus einer 0 rechnet man weiter.
  return n === null || n === undefined ? '' : String(n)
}

function jaNein(wert: boolean | null | undefined): string {
  return wert === null || wert === undefined ? '' : wert ? 'ja' : 'nein'
}

/** ISO, nicht deutsch: In dieser Form sortiert und filtert eine Tabellenkalkulation. */
function datum(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const zwei = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`
}

function feld(wert: string): string {
  // Anfuehrungszeichen, Semikolon und Umbruch brechen sonst die Spaltenstruktur.
  return /[";\n\r]/.test(wert) ? `"${wert.replace(/"/g, '""')}"` : wert
}

/**
 * Das Byte Order Mark, als Zeichencode geschrieben.
 *
 * Direkt in den Quelltext getippt wäre es ein unsichtbares Zeichen zwischen zwei
 * Anführungszeichen — niemand sieht es beim Lesen, und der erste Editor, der die Datei
 * aufräumt, entfernt es spurlos.
 */
const BOM = String.fromCharCode(0xfeff)

/**
 * Die Liste als CSV — Semikolon getrennt, damit Excel sie auf Deutsch öffnet.
 *
 * Der BOM am Anfang ist kein Schmutz, sondern der Unterschied zwischen „Fachperson" und
 * „FachpersonÃ¤": Ohne ihn rät Excel die Kodierung, und es rät falsch.
 */
export function alsCsv(rows: UserRow[]): string {
  const kopf = SPALTEN.map(s => feld(s.titel)).join(';')
  const zeilen = rows.map(r => SPALTEN.map(s => feld(s.wert(r))).join(';'))
  return BOM + [kopf, ...zeilen].join('\r\n') + '\r\n'
}

export function csvDateiname(jetzt: Date = new Date()): string {
  const zwei = (n: number) => String(n).padStart(2, '0')
  return `echob-konten-${jetzt.getFullYear()}-${zwei(jetzt.getMonth() + 1)}-${zwei(jetzt.getDate())}.csv`
}
