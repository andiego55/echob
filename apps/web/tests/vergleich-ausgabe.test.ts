/**
 * Was der Vergleich ausgibt, muss jemand anzeigen.
 *
 * **Was passiert ist.** Der Prompt von „Wunsch und Wirklichkeit" verlangt vom Modell ein
 * Feld `hinweis` — es entsteht genau dann, wenn die Skizze so dünn war, dass der Text
 * darunter leidet, also genau dann, wenn jemand wissen müsste, warum sein Bericht kurz
 * ausfällt. Das Feld wurde erzeugt, verschlüsselt, gespeichert — und von keiner Anzeige
 * gelesen. Dasselbe galt für die Momentaufnahme der Skizze, die im Bericht liegt, damit er
 * in einem halben Jahr noch seine andere Hälfte hat.
 *
 * Kein Absturz, kein roter Build, keine Warnung. Nur ein Modell, das brav etwas schreibt,
 * das niemand je zu sehen bekommt — und ein Verdacht, es habe die Anweisung ignoriert.
 *
 * **Der Prompt ist der Vertrag.** Sein JSON-Block sagt, was zurückkommt. Dieser Test liest
 * ihn und verlangt für jedes Feld einen Leser in der Berichtsanzeige.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const hier = dirname(fileURLToPath(import.meta.url))
const PROMPT = readFileSync(
  resolve(hier, '../../../services/api/app/prompts/kompass_ideal_delta_prompt.md'), 'utf-8')
/**
 * Die Anzeige **ohne Kommentare**.
 *
 * Die erste Fassung dieses Tests suchte die Feldnamen im ganzen Quelltext — und wurde
 * damit sofort blind: Das Wort `hinweis` steht auch in dem Kommentar, der erklärt, warum
 * es angezeigt werden muss. Die Mutationsprobe lief grün durch, obwohl der Leser entfernt
 * war. Genau die Bauart Fehler, gegen die dieses Projekt schon einen eigenen Merksatz hat:
 * Ein Wächter, der auf eine Teilzeichenfolge prüft, prüft irgendwann nichts mehr.
 */
const ANZEIGE = readFileSync(
  resolve(hier, '../src/pages/app/ReportDetailPage.tsx'), 'utf-8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

/**
 * Wird das Feld wirklich GELESEN?
 *
 * Ein Zugriff (`.feld`) oder ein Schlüssel (`['feld']`) — nicht bloss das Wort irgendwo.
 * Eine Typangabe allein zählt nicht: `hinweis?: unknown` beschreibt, was ankommen kann,
 * und zeigt nichts an.
 */
function wirdGelesen(feld: string): boolean {
  // Ohne Escapes gebaut: Ein `\.` in einer Zeichenkette mit Gravis ist nur ein Punkt, und
  // ein Punkt im Suchmuster passt auf jedes Zeichen. Genau daran ist die zweite Fassung
  // dieses Tests gescheitert — und weil `[` dann eine Zeichenklasse aufmachte, war das
  // Muster sogar ungültig. Zeichenklassen statt Escapes sind hier das Einfachere.
  return new RegExp(`[.['"]${feld}[^A-Za-z0-9_]`).test(ANZEIGE)
}

/**
 * Felder, die die Anzeige nicht beim Namen nennen muss.
 *
 * `sections` rendert sie über denselben Weg wie jeden anderen Bericht — `heading` und
 * `text` sind die Teile darin und tauchen dort auf, nicht hier.
 */
const OHNE_EIGENEN_LESER = ['sections', 'heading', 'text']

/** Die Schlüssel der ersten Ebene aus dem JSON-Block des Prompts. */
function vertragsFelder(): string[] {
  const block = PROMPT.match(/```json\s*\n([\s\S]*?)```/)
  if (!block) throw new Error('Kein JSON-Block im Prompt gefunden')
  return [...new Set([...block[1].matchAll(/"([a-z_]+)"\s*:/g)].map(m => m[1]))]
}

describe('Der Vergleich: Ausgabe und Anzeige', () => {
  it('erkennt einen fehlenden Leser - und nicht bloss ein fehlendes Wort', () => {
    // Die Probe auf das eigene Suchmuster. Ohne sie waere dieser Test wieder das, was er
    // in seiner ersten Fassung war: ein Wort-Sucher, der jeden Kommentar fuer einen
    // Leser haelt.
    expect(wirdGelesen('sections')).toBe(true)
    expect(wirdGelesen('gibtesnichtimquelltext')).toBe(false)
  })

  it('findet den Vertrag ueberhaupt', () => {
    // Ohne diese Schranke prueft der Test nichts, sobald der Prompt umzieht oder seinen
    // Beispielblock verliert - und bleibt trotzdem gruen.
    const felder = vertragsFelder()
    expect(felder.length).toBeGreaterThan(2)
    expect(felder).toContain('sections')
  })

  it('zeigt jedes Feld an, das der Prompt zurueckgibt', () => {
    const ohneLeser = vertragsFelder()
      .filter(f => !OHNE_EIGENEN_LESER.includes(f))
      .filter(f => !wirdGelesen(f))
    expect(
      ohneLeser,
      'Diese Felder laesst sich der Prompt liefern, aber niemand zeigt sie:\n  '
        + ohneLeser.join('\n  '),
    ).toEqual([])
  })

  it('zeigt auch die Momentaufnahme, die der Server danebenlegt', () => {
    // Sie steht nicht im Prompt - der Dienst haengt sie an, damit der Vergleich spaeter
    // noch seine andere Haelfte hat. Ohne Anzeige waere das ein Vergleich ohne Grundlage.
    expect(wirdGelesen('skizze_damals')).toBe(true)
  })
})
