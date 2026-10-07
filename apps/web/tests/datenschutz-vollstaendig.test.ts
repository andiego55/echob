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

/**
 * Fehlerberichte an Sentry — die Verarbeitung, die heute nicht stattfindet.
 *
 * **Warum das hier steht, obwohl nichts passiert.** `@sentry/react` liegt im Quellbaum
 * und initialisiert sich in `main.tsx`, sobald `VITE_SENTRY_DSN` gesetzt ist. Im Build
 * steht keiner, also fliesst heute nichts — in der Datenschutzerklärung steht Sentry
 * deshalb zu Recht nicht. Aber es ist **eine Umgebungsvariable** bis zu einem
 * Drittlandtransfer an einen US-Anbieter, der in keiner Erklärung und in keinem
 * Auftragsverarbeitungsvertrag vorkommt. Wer die Variable setzt, denkt an das Monitoring,
 * nicht an Art. 13 und Art. 44 DSGVO.
 *
 * **Warum der grosse Wächter oben das nicht fängt.** Dessen Bedingung ist „Modul liegt im
 * Quellbaum" — und der Beleg ist dort absichtlich das Modul auf dem SERVER. Sentry ist
 * Frontend, und die Verarbeitung hängt nicht am Vorhandensein der Datei, sondern an der
 * Konfiguration. Dieselbe Prüfung hätte hier also ewig rot gestanden, ohne dass etwas
 * passiert. Die Bedingung muss die Konfiguration sein.
 *
 * **Was dieser Wächter NICHT kann:** Er sieht nur eingecheckte Dateien. Eine Variable, die
 * jemand direkt in der Cloudflare-Oberfläche setzt, erreicht er nicht. Dafür sichert er
 * die zweite Hälfte: dass die Initialisierung überhaupt an der Bedingung hängt und keine
 * personenbezogenen Daten mitschickt. Vor dem Scharfschalten gehören ausserdem ein
 * Auftragsverarbeitungsvertrag und ein Abschnitt in der Erklärung dazu — das kann ein
 * Test nicht prüfen, weil `__private/dpas` nicht im Repository liegt.
 */
describe('Fehlerberichte (Sentry)', () => {
  const haupt = (): string =>
    readFileSync(join(WEB, 'src', 'main.tsx'), 'utf-8')

  /** Eingecheckte Stellen, an denen ein DSN stehen könnte. */
  const KONFIGURATION = [
    join(WEB, '.env'),
    join(WEB, '.env.production'),
    join(WEB, '.env.local'),
    join(WURZEL, '.github', 'workflows', 'ci.yml'),
    join(WURZEL, 'apps', 'web', 'wrangler.toml'),
  ]

  const dsnGesetzt = (): string | null => {
    for (const pfad of KONFIGURATION) {
      if (!existsSync(pfad)) continue
      // Ein leerer Wert zählt nicht: `VITE_SENTRY_DSN=` schaltet nichts scharf.
      const treffer = readFileSync(pfad, 'utf-8')
        .match(/VITE_SENTRY_DSN\s*[:=]\s*["']?(\S+)/)
      if (treffer && treffer[1] && !/^["']?$/.test(treffer[1])) return pfad
    }
    return null
  }

  it('ist ein DSN eingecheckt, kennt die Erklärung auch Sentry', () => {
    const pfad = dsnGesetzt()
    if (!pfad) return  // Nichts scharf, nichts zu erklären.
    expect(erklaerung(), `DSN in ${pfad}, aber Sentry fehlt in der Erklärung`)
      .toContain('Sentry')
  })

  it('die Initialisierung hängt an der Bedingung', () => {
    // Fiele die Bedingung weg, liefe Sentry mit dem eingebauten Standard-DSN-Verhalten
    // los, sobald irgendwo einer auftaucht — und zwar ohne dass jemand es entscheidet.
    const q = haupt()
    expect(q).toContain('VITE_SENTRY_DSN')
    expect(q).toMatch(/if\s*\(\s*sentryDsn\s*\)/)
  })

  it('schickt keine personenbezogenen Daten mit', () => {
    // `sendDefaultPii: true` nimmt IP-Adresse, Cookies und Nutzerkennung mit. Das ist eine
    // Zeile, und sie verwandelt ein technisches Protokoll in eine Verarbeitung
    // personenbezogener Daten.
    const q = haupt()
    expect(q).toContain('sendDefaultPii: false')
    expect(q).toContain('delete event.request.data')
  })
})
