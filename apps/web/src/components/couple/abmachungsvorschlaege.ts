/**
 * Aus Echos Zusammenfassung die vorgeschlagenen Abmachungen herausziehen.
 *
 * Der Zusammenfassungs-Prompt endet mit einem Abschnitt „Mögliche Abmachungen" und darunter
 * zwei bis vier Listenpunkten. Bisher wurde das als Fließtext angezeigt — wer eine der
 * Abmachungen wirklich wollte, musste sie abtippen. Genau dort riss der Faden.
 *
 * Deshalb hier ein bewusst konservativer Parser: Er sucht die Überschrift, nimmt die
 * folgenden Listenpunkte und hört beim nächsten Abschnitt auf. Findet er nichts, gibt er
 * nichts zurück — dann bleibt die Zusammenfassung einfach Text, wie vorher. Ein Parser, der
 * rät, wäre schlimmer als keiner: Er würde Sätze zur Abmachung erklären, die niemand
 * vorgeschlagen hat.
 */

/** Überschriften, unter denen Echo Abmachungen vorschlägt. */
const UEBERSCHRIFT = /^\s{0,3}#{1,6}\s*(mögliche\s+abmachungen|abmachungen|mögliche\s+vereinbarungen)\s*:?\s*$/i

/** Ein Listenpunkt: „- ", „* ", „• " oder „1. ". */
const LISTENPUNKT = /^\s{0,3}(?:[-*•]|\d{1,2}[.)])\s+(.*)$/

/** Anführungszeichen, in die Echo seine Beispiele setzt, plus fette Auszeichnung. */
function saeubern(text: string): string {
  let s = text.trim()
  s = s.replace(/^\*\*(.*)\*\*$/s, '$1').trim()
  s = s.replace(/^[»„"'‚‘]+/, '').replace(/[«"'‛’“”]+$/, '').trim()
  return s.replace(/\s+/g, ' ')
}

/**
 * Liefert die vorgeschlagenen Abmachungen — oder eine leere Liste, wenn der Abschnitt
 * fehlt. Höchstens sechs, damit ein ausufernder Vorschlagsblock die Seite nicht kapert.
 */
export function abmachungsvorschlaege(zusammenfassung: string | null | undefined): string[] {
  if (!zusammenfassung) return []
  const zeilen = zusammenfassung.split('\n')
  const start = zeilen.findIndex(z => UEBERSCHRIFT.test(z))
  if (start === -1) return []

  const treffer: string[] = []
  for (const zeile of zeilen.slice(start + 1)) {
    // Der nächste Abschnitt beendet die Liste — auch wenn danach noch Listen kämen.
    if (/^\s{0,3}#{1,6}\s/.test(zeile)) break
    const m = zeile.match(LISTENPUNKT)
    if (m) {
      const text = saeubern(m[1])
      // Zu kurz ist kein Vorschlag, sondern ein Rest. Zu lang passt in kein Feld.
      if (text.length >= 12 && text.length <= 500) treffer.push(text)
    }
  }
  return treffer.slice(0, 6)
}

/**
 * Ein knapper Titel aus einem längeren Text — für das Vorbefüllen von Gespräch und Thema.
 *
 * Nimmt den ersten Satz und kürzt ihn auf eine Zeile. Ein Titel, den man noch ändern kann,
 * ist besser als ein leeres Feld: Er zeigt, worum es gehen würde.
 */
export function titelVorschlag(text: string | null | undefined, max = 70): string {
  if (!text) return ''
  const erster = text
    .replace(/^#{1,6}\s.*$/gm, '')           // Überschriften raus
    .replace(/[*_`>]/g, '')
    .split(/(?<=[.!?])\s|\n/)
    .map(s => s.trim())
    .find(s => s.length > 10) ?? ''
  const sauber = saeubern(erster)
  if (sauber.length <= max) return sauber
  const schnitt = sauber.slice(0, max)
  const luecke = schnitt.lastIndexOf(' ')
  return (luecke > 30 ? schnitt.slice(0, luecke) : schnitt).replace(/[,;:]$/, '') + ' …'
}
