/**
 * Was in einer Zeile der Nutzerübersicht steht — und was bewusst nicht.
 *
 * **Warum getrennt von der Seite.** Das sind Entscheidungen, keine Darstellung: ob eine
 * fehlende Zahl als „0" erscheint, ob „nie aktiv" wie „heute" aussieht, ob ein Institut
 * einen Tarif hat. Jede davon kann still falsch sein — im JSX sieht man ihr das nicht an,
 * in einem Test schon.
 *
 * **Die Regel, die überall gilt:** Fehlt eine Angabe, steht „—". Eine 0 ist eine Aussage
 * („dieses Konto hat keine Fälle"), ein Strich ist keine. Sie zu verwechseln heißt, dem
 * Admin eine Zahl zu zeigen, die nie erhoben wurde.
 */
import type { UserRow } from './api'

export const ROLLEN_LABEL: Record<UserRow['rolle'], string> = {
  client: 'Klient:in',
  professional: 'Fachperson',
  institute: 'Institut',
  student: 'Studierend',
}

const TARIF_LABEL: Record<string, string> = {
  trial: 'Testzeit',
  early_bird: 'Early Bird',
  regular: 'Standard',
  annual: 'Jahr',
}

/** Tarif samt Laufzeitende — nur dort, wo es einen gibt. */
export function tarifText(row: Pick<UserRow, 'tarif' | 'tarif_bis'>): string {
  if (!row.tarif) return '—'
  const name = TARIF_LABEL[row.tarif] ?? row.tarif
  if (!row.tarif_bis) return name
  return `${name} · bis ${new Date(row.tarif_bis).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  })}`
}

/**
 * Die Zahlen einer Zeile — je Rolle das, was dort etwas bedeutet.
 *
 * „4 Klient:innen" bei einer Fachperson und „4 Fälle" bei einer Klient:in sind nicht
 * dieselbe Zahl in einer Spalte, sondern zwei verschiedene Auskünfte. Eine gemeinsame
 * Spalte „Anzahl" hätte beides verwechselbar gemacht.
 */
export function zahlenText(row: UserRow): string {
  const teile: string[] = []
  const zahl = (n: number | null | undefined, eins: string, viele: string) =>
    n === null || n === undefined ? null : `${n} ${n === 1 ? eins : viele}`

  if (row.rolle === 'client') {
    teile.push(zahl(row.faelle, 'Fall', 'Fälle') ?? '')
    teile.push(zahl(row.szenen, 'Szene', 'Szenen') ?? '')
    if (row.verbindungen) teile.push(zahl(row.verbindungen, 'Freigabe', 'Freigaben')!)
  } else if (row.rolle === 'professional') {
    teile.push(zahl(row.verbindungen, 'Klient:in', 'Klient:innen') ?? '')
  } else if (row.rolle === 'institute') {
    teile.push(zahl(row.verbindungen, 'Studierende:r', 'Studierende') ?? '')
  } else if (row.rolle === 'student') {
    teile.push(zahl(row.faelle, 'Fall', 'Fälle') ?? '')
  }

  const text = teile.filter(Boolean).join(' · ')
  return text || '—'
}

/**
 * „zuletzt aktiv" in Menschensprache.
 *
 * **Warum nicht einfach das Datum.** Im Betrieb lautet die Frage „lebt das Konto noch",
 * und darauf antwortet „vor 3 Tagen" schneller als „16.09.2026". Das genaue Datum steht
 * weiterhin im Titel-Attribut der Zelle.
 *
 * **Warum ``null`` nicht „heute" wird.** Ein Konto ohne jede Spur ist kein aktives Konto.
 * Ein Fehler in diese Richtung wäre der schlimmste: Man hielte ein totes Konto für lebendig
 * und ein stillgelegtes für in Arbeit.
 */
export function aktivText(iso: string | null | undefined, jetzt: Date = new Date()): string {
  if (!iso) return 'nie'
  const dann = new Date(iso)
  const tage = Math.floor((jetzt.getTime() - dann.getTime()) / 86_400_000)
  if (tage < 0) return 'gerade eben'
  if (tage === 0) return 'heute'
  if (tage === 1) return 'gestern'
  if (tage < 31) return `vor ${tage} Tagen`
  if (tage < 365) {
    const monate = Math.floor(tage / 30)
    return `vor ${monate} ${monate === 1 ? 'Monat' : 'Monaten'}`
  }
  return dann.toLocaleDateString('de-DE', { month: '2-digit', year: 'numeric' })
}

/** Ein Konto, das seit über 90 Tagen nichts getan hat — oder noch nie etwas. */
export function eingeschlafen(row: Pick<UserRow, 'zuletzt_aktiv'>, jetzt: Date = new Date()): boolean {
  if (!row.zuletzt_aktiv) return true
  return jetzt.getTime() - new Date(row.zuletzt_aktiv).getTime() > 90 * 86_400_000
}

/**
 * Der Stand des Schweigepflicht-Hinweises — mit derselben Dreiteilung wie beim AVV.
 *
 * `null` heißt „für diese Rolle ohne Bedeutung": Eine Klient:in liest keinen Hinweis zur
 * Schweigepflicht, und „offen" wäre dort eine Aufgabe, die niemand erledigen kann.
 */
export function hinweisZustand(row: Pick<UserRow, 'rolle' | 'hinweis_gelesen'>):
  { text: string; ton: 'gut' | 'offen' | 'egal' } {
  if (row.rolle !== 'professional' || row.hinweis_gelesen === null
      || row.hinweis_gelesen === undefined) {
    return { text: '–', ton: 'egal' }
  }
  return row.hinweis_gelesen
    ? { text: 'gelesen', ton: 'gut' }
    : { text: 'offen', ton: 'offen' }
}

/** Berufsgruppe mit dem Zusatz, auf den es ankommt: Schweigepflicht ja, nein, unklar. */
export function berufsgruppeText(row: UserRow): string {
  if (row.rolle !== 'professional') return '—'
  if (!row.berufsgruppe_label) return 'nicht angegeben'
  const zusatz = row.unterliegt_203 === true ? ' · § 203'
    : row.unterliegt_203 === false ? ''
      : ' · ungeklärt'
  return row.berufsgruppe_label + zusatz
}
