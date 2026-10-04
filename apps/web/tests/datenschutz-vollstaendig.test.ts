/**
 * Kennt die Datenschutzerklärung die Verarbeitungen, die es wirklich gibt?
 *
 * **Der Befund, der diesen Wächter erzwungen hat (Audit vom 04.10.2026).** Die Erklärung war
 * auf dem Stand vom 15.07.2026. Seitdem waren dazugekommen: das Podcast-Studio (erzeugt und
 * speichert Tonspuren), die Bildwerkstatt (erzeugt und speichert Bilder samt Bildauftrag),
 * „Mein Kompass" (fallfreier Bereich mit Krisenplan) und das öffentliche
 * Fachpersonen-Verzeichnis (Daten über Menschen, die dem nicht zugestimmt haben). In der
 * veröffentlichten Erklärung stand von alldem **nichts**.
 *
 * Das ist der Fehler, der bei einem Produkt in Bewegung immer wieder entsteht, und er hat
 * keine Symptome: Ein Feature wird gebaut, getestet, deployt — und niemand öffnet dabei die
 * Datenschutzerklärung. Es gibt keinen Fehler, keinen roten Test, keine Spur. Nur ein
 * Dokument, das weniger beschreibt als die Anwendung tut.
 *
 * **Wie der Wächter das fasst.** Er hängt an einer Eigenschaft, die man beim Bauen nicht
 * umgehen kann: Wenn das Modul einer Verarbeitung im Quellbaum liegt, muss die Erklärung das
 * zugehörige Stichwort nennen. Wer ein Feature neu baut, legt eine Datei an — und dann wird
 * dieser Test rot, bis die Erklärung es kennt.
 *
 * Er prüft **Erwähnung, nicht Richtigkeit.** Dass der Abschnitt dann auch stimmt, kann kein
 * Test wissen; dass er überhaupt existiert, schon.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const WURZEL = join(__dirname, '..', '..', '..')
const WEB = join(__dirname, '..')

const erklaerung = (): string =>
  readFileSync(join(WEB, 'src', 'pages', 'DatenschutzPage.tsx'), 'utf-8')

/**
 * Verarbeitung → [Beleg im Quellbaum, Stichworte in der Erklärung].
 *
 * Der Beleg ist absichtlich das Modul auf dem SERVER: Dort entsteht die Verarbeitung, und
 * dort ist sie nicht wegzudiskutieren. Eine Oberfläche kann man abschalten, ohne dass die
 * Verarbeitung verschwindet.
 */
const VERARBEITUNGEN: ReadonlyArray<[string, string, readonly string[]]> = [
  ['Podcast-Studio', 'services/api/app/services/podcast_service.py', ['Podcast', 'Tonspur']],
  ['Bildwerkstatt', 'services/api/app/services/bildwerkstatt_service.py', ['Bildwerkstatt', 'Bild']],
  ['Mein Kompass', 'services/api/app/api/v1/routers/kompass.py', ['Kompass', 'Krisenplan']],
  ['Verzeichnis', 'services/api/app/services/directory_service.py', ['Verzeichnis', 'recherchiert']],
  ['Paarraum', 'services/api/app/services/couple_therapy_service.py', ['Paarraum']],
  ['Fall-Freigabe', 'services/api/app/services/sharing_service.py', ['Freigabe']],
  ['Zahlungen', 'services/api/app/services/billing_service.py', ['Stripe']],
  ['Kündigungsknopf', 'services/api/app/services/kuendigung_service.py',
    ['Kündigung', '§ 312k']],
  ['E-Mail-Versand', 'services/api/app/services/notify_service.py', ['Resend']],
]

describe('Datenschutzerklärung deckt die Verarbeitungen ab', () => {
  it.each(VERARBEITUNGEN)('%s steht in der Erklärung', (name, beleg, stichworte) => {
    if (!existsSync(join(WURZEL, beleg))) {
      // Das Modul ist weg — dann darf die Erklärung schweigen. Kein stilles Überspringen
      // ohne Grund: Der Beleg IST die Bedingung.
      return
    }
    const text = erklaerung()
    for (const wort of stichworte) {
      expect(text, `"${wort}" fehlt in der Datenschutzerklärung (${name} ist aber gebaut)`)
        .toContain(wort)
    }
  })

  it('nennt für die recherchierten Verzeichnis-Einträge Grundlage, Information und Widerspruch', () => {
    // Die drei Säulen, auf denen das Listen ohne Zustimmung steht. Fällt eine weg, ist die
    // Verarbeitung nicht mehr gedeckt — und das wäre die eine Stelle im Produkt, an der
    // Daten von Menschen verarbeitet werden, die nie gefragt wurden.
    const text = erklaerung()
    expect(text).toContain('Art. 6 Abs. 1 lit. f')
    expect(text).toContain('Art. 14 Abs. 5 lit. b')
    expect(text).toContain('Art. 21')
  })

  it('der versprochene Widerspruch steht auch wirklich an jedem Eintrag', () => {
    // Die Berufung auf Art. 14 Abs. 5 lit. b trägt nur, wenn die Information stattdessen
    // öffentlich an der Sache steht. Nimmt jemand den Baustein aus der Profilseite, wird
    // aus der Begründung eine Behauptung.
    const seite = readFileSync(
      join(WEB, 'src', 'pages', 'FachpersonProfilePage.tsx'), 'utf-8')
    expect(seite).toContain('EintragHinweis')

    const hinweis = readFileSync(
      join(WEB, 'src', 'components', 'directory', 'EintragHinweis.tsx'), 'utf-8')
    expect(hinweis).toContain('entfernen')
    expect(hinweis).toContain('kontakt@echo-b.de')
  })

  it('erzeugte Tonspuren und Bilder stehen in den Speicherfristen', () => {
    // Sie liegen als Bytes in der Datenbank. Eine Frist, die sie nicht nennt, ist
    // unvollständig — und Speicherfristen sind der Teil der Erklärung, den eine
    // Aufsichtsbehörde zuerst mit der Wirklichkeit vergleicht.
    const text = erklaerung()
    expect(text).toContain('Erzeugte Tonspuren und Bilder')
  })
})
