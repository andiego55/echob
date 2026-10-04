/**
 * Steht der Kündigungsknopf da, wo § 312k BGB ihn verlangt — und heißt er, wie er heißen muss?
 *
 * **Warum das ein Wächter ist und nicht nur ein erledigter Punkt.** Drei der Anforderungen
 * sehen wie Gestaltungsfragen aus und sind keine:
 *
 * * Die Schaltfläche darf mit **nichts anderem** als „Verträge kündigen" beschriftet sein
 *   (Abs. 2 S. 1). „Abo beenden", „Kündigung" oder „Mitgliedschaft verwalten" erfüllen das
 *   nicht — und genau das wäre die Änderung, die jemand aus Designgründen vornimmt.
 * * Die Bestätigungsschaltfläche darf mit **nichts anderem** als „Jetzt kündigen"
 *   beschriftet sein (Abs. 2 S. 2). Ein „Absenden" wäre ein Verstoß.
 * * Die Seite muss **ohne Anmeldung** erreichbar sein (Abs. 2 S. 1). Eine Route, die
 *   versehentlich in `ProtectedRoute` wandert, sieht im Diff harmlos aus.
 *
 * Die Folge eines Verstoßes steht in Abs. 6: Kunden können **jederzeit fristlos** kündigen.
 * Das ist nichts, was man an einer Textänderung merkt.
 *
 * **Jede Prüfung hier läuft auf der Quelle OHNE Kommentare.** Beide Richtungen sind in
 * den Mutationsproben aufgefallen: Mein Kommentar „kein ‚Bist du sicher?'“ löste den
 * Wächter aus, und mein Kommentar „muss ‚Jetzt kündigen' heißen“ erfüllte ihn, obwohl
 * der Knopf „Absenden“ hieß. Ein Kommentar darf eine Pflicht weder erfüllen noch
 * verletzen.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const SRC = join(__dirname, '..', 'src')

const lies = (...teile: string[]): string =>
  readFileSync(join(SRC, ...teile), 'utf-8')

/**
 * Die Quelle ohne Kommentare.
 *
 * **Warum das nötig ist, und es ist ein wiederkehrender Fehler in diesem Projekt.** Der
 * erste Lauf dieses Wächters schlug an — an meinem eigenen Kommentar in `KuendigenPage`,
 * der erklärt, dass dort KEIN „Bist du sicher?" stehen soll. Dasselbe Muster hat in
 * `bild_regie` schon einmal jeden Bildauftrag abgelehnt, weil das verbotene Wort im
 * eigenen Systemtext stand (siehe `gotcha_filter_eigenes_wort`).
 *
 * Ein Wächter, der nach verbotenen Formulierungen sucht, muss auf dem schauen, was die
 * Person SIEHT. Kommentare sieht sie nicht.
 */
const ohneKommentare = (quelle: string): string =>
  quelle.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('Kündigungsknopf (§ 312k BGB)', () => {
  it('die Schaltfläche heißt „Verträge kündigen" und steht im Fuß jeder Seite', () => {
    const footer = ohneKommentare(lies('components', 'layout', 'Footer.tsx'))
    expect(footer).toContain('Verträge kündigen')
    expect(footer).toContain('to="/kuendigen"')
  })

  it('die Bestätigungsschaltfläche heißt „Jetzt kündigen"', () => {
    expect(ohneKommentare(lies('pages', 'KuendigenPage.tsx'))).toContain('Jetzt kündigen')
  })

  it('die Route liegt NICHT hinter der Anmeldung', () => {
    const app = ohneKommentare(lies('App.tsx'))
    const zeile = app.split('\n').find(z => z.includes('path="/kuendigen"'))
    expect(zeile, 'Route /kuendigen fehlt').toBeDefined()
    // Das ist der Kern: Ein Login davor wäre genau die Hürde, die die Norm abschafft.
    expect(zeile).not.toContain('ProtectedRoute')
  })

  it('der Aufruf hängt nicht an einer funktionierenden Anmeldung', () => {
    // Der gemeinsame apiClient fragt vor jedem Aufruf die Supabase-Sitzung ab und fasst
    // bei 401 nach. Diese Seite muss aber gerade dann tragen, wenn die Anmeldung nicht
    // mehr geht — sonst kann wer sein Passwort verloren hat nicht kündigen.
    const api = ohneKommentare(lies('api', 'kuendigung.ts'))
    expect(api).not.toContain("from './client'")
    expect(api).toContain('axios.create')
  })

  it('das Formular erhebt alle fünf Angaben, die Abs. 2 S. 3 verlangt', () => {
    const seite = ohneKommentare(lies('pages', 'KuendigenPage.tsx'))
    for (const feld of ['art', 'grund', 'vertrag', 'email', 'wirkung']) {
      expect(seite, `Feld "${feld}" fehlt im Formular`).toContain(feld)
    }
    // Nr. 1: Art der Kündigung, beide Arten wählbar.
    expect(seite).toContain('ausserordentlich')
    // Nr. 4: Zeitpunkt der Wirkung.
    expect(seite).toContain('naechstmoeglich')
  })

  it('die Erklärung ist speicherbar (Abs. 3) und die Quittung nennt den Zeitpunkt (Abs. 4)', () => {
    const seite = ohneKommentare(lies('pages', 'KuendigenPage.tsx'))
    // Ein Wortlaut, der nur auf dem Schirm stand, ist nicht aufbewahrt.
    expect(seite).toContain('a.download')
    expect(seite).toContain('toLocaleString')
  })

  it('die Seite macht kein Rückhalteangebot', () => {
    // Abs. 2 verlangt „unmittelbar und leicht zugänglich". Ein „Bist du sicher?", ein
    // Rabattangebot oder eine Umfrage vor dem Knopf sind die Hürden, die die Norm meint.
    const seite = ohneKommentare(lies('pages', 'KuendigenPage.tsx'))
    for (const koeder of ['Bist du sicher', 'Wirklich kündigen', 'Rabatt', 'Pause statt']) {
      expect(seite, `"${koeder}" wäre eine Hürde vor dem Knopf`).not.toContain(koeder)
    }
  })
})
