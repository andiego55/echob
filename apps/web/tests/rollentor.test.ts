/**
 * Das Tor vor einem Rollenbereich: erlaubt, verboten, oder unbekannt.
 *
 * **Der Fehler, den das verhindert.** In allen drei Toren stand
 * `if (isError || !data) return <Navigate to="/app" replace />`. Der Server antwortet einer
 * Person ohne diesen Zugang mit 403 — daraus folgte richtig „nicht dein Bereich". Er
 * antwortet aber mit einem Fehler auch bei abgelaufenem Token, Neustart oder Funkloch, und
 * dann wurde einer Fachperson ihr Arbeitsplatz weggezogen, ohne eine Zeile Erklärung. Sie
 * stand im Nutzerbereich und musste glauben, sie habe den Zugang verloren.
 *
 * **Zwei Prüfungen, weil zwei Dinge schiefgehen können:**
 *
 * 1. Kein Tor entscheidet mehr an `isError` (Struktur).
 * 2. Die Einordnung der Statuscodes stimmt (Verhalten) — 403 heißt etwas anderes als 503.
 *
 * Die zweite ist die wichtigere und deshalb liegt die Einordnung in exportierten
 * Funktionen: Eine Regel, die nur im JSX steht, kann man nur prüfen, indem man einen
 * Router, einen falschen Server und drei Rollen aufbaut — also gar nicht.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { istNichtDeinBereich, istSitzungAbgelaufen } from '@/components/auth/RollenTor'

const AUTH = join(__dirname, '..', 'src', 'components', 'auth')
const TORE = ['ProfessionalRoute.tsx', 'InstituteRoute.tsx', 'StudentRoute.tsx']

const antwort = (status: number) => ({ response: { status } })

describe('RollenTor – 403 ist nicht dasselbe wie 503', () => {
  it('erkennt „diesen Zugang hast du nicht" an 403', () => {
    // Nicht geraten: get_current_professional/-institute/-student werfen alle drei
    // HTTP_403_FORBIDDEN mit „Kein …-Zugang.". In den Toren stand jahrelang der
    // Kommentar „404 → isError" — er war falsch, und `isError` fing es trotzdem ab.
    expect(istNichtDeinBereich(antwort(403))).toBe(true)
  })

  it('versteht auch 404 und 410 so', () => {
    expect(istNichtDeinBereich(antwort(404))).toBe(true)
    expect(istNichtDeinBereich(antwort(410))).toBe(true)
  })

  it('hält einen Serverfehler NICHT für ein Verbot', () => {
    // Der eigentliche Fehler. Bricht das, verliert eine Fachperson bei jedem Huepfer
    // ihren Bereich — und erfährt nicht, warum.
    for (const status of [500, 502, 503, 504, 429]) {
      expect(istNichtDeinBereich(antwort(status)), String(status)).toBe(false)
    }
  })

  it('hält ein Funkloch nicht dafür', () => {
    expect(istNichtDeinBereich({ code: 'ERR_NETWORK' })).toBe(false)
    expect(istNichtDeinBereich(undefined)).toBe(false)
  })

  it('trennt die abgelaufene Sitzung von allem anderen', () => {
    // 401 heißt: Der Nutzerbereich hilft auch nicht weiter, der Weg führt zur Anmeldung.
    // Der API-Client hat davor schon einmal nachgefasst und die Sitzung erneuert.
    expect(istSitzungAbgelaufen(antwort(401))).toBe(true)
    expect(istSitzungAbgelaufen(antwort(403))).toBe(false)
    expect(istSitzungAbgelaufen(antwort(503))).toBe(false)
    expect(istNichtDeinBereich(antwort(401))).toBe(false)
  })
})

describe('Rollentore – die Regel steht nur an einer Stelle', () => {
  for (const datei of TORE) {
    const quelle = readFileSync(join(AUTH, datei), 'utf8')

    it(`${datei} entscheidet nicht selbst an isError`, () => {
      expect(quelle).not.toMatch(/isError/)
    })

    it(`${datei} benutzt das gemeinsame Tor`, () => {
      // Sonst wächst die Regel wieder auseinander — sie stand dreimal da und war
      // dreimal gleich falsch.
      expect(quelle).toMatch(/<RollenTor/)
    })

    it(`${datei} schickt niemanden mehr selbst weg`, () => {
      expect(quelle).not.toMatch(/<Navigate/)
    })
  }
})
