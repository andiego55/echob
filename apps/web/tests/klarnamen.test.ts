/**
 * Personenbezug finden und schwärzen.
 *
 * Warum das geprüft gehört: Ein Fehlalarm ist lästig, aber eine ÜBERSEHENE Nummer ist ein
 * Datenschutzversprechen, das nicht hält — und ein zu gieriges Muster, das aus „12.03.2026"
 * eine Telefonnummer macht, zerstört stillschweigend den Text, den jemand beilegen wollte.
 */
import { describe, expect, it } from 'vitest'
import {
  ersetzeNamen,
  findePersonenbezug,
  schwaerzePersonenbezug,
} from '../src/lib/klarnamen'

describe('findePersonenbezug', () => {
  it('findet eine E-Mail-Adresse', () => {
    const funde = findePersonenbezug('Schreib mir an anna.mueller@example.com, ok?')
    expect(funde).toHaveLength(1)
    expect(funde[0].art).toBe('email')
    expect(funde[0].text).toBe('anna.mueller@example.com')
  })

  it('findet eine Telefonnummer im Chatstil', () => {
    const funde = findePersonenbezug('Ruf durch: 0171 2345678')
    expect(funde.map(f => f.art)).toContain('telefon')
  })

  it('findet eine internationale Nummer', () => {
    expect(findePersonenbezug('+49 30 12345678').map(f => f.art)).toContain('telefon')
  })

  it('findet eine IBAN', () => {
    const funde = findePersonenbezug('Überweise auf DE89 3704 0044 0532 0130 00')
    expect(funde.map(f => f.art)).toContain('iban')
  })

  it('zählt Wiederholungen statt sie doppelt zu melden', () => {
    const funde = findePersonenbezug('a@b.de und nochmal a@b.de')
    expect(funde).toHaveLength(1)
    expect(funde[0].anzahl).toBe(2)
  })

  it('hält einen unauffälligen Text für unauffällig', () => {
    expect(findePersonenbezug('Er sagte, ich sei zu empfindlich. Das saß.')).toEqual([])
  })

  it('macht aus einem Datum keine Telefonnummer', () => {
    // Der haeufigste denkbare Fehlalarm — in jedem Brief steht ein Datum.
    expect(findePersonenbezug('Am 12.03.2026 kam der Brief.')).toEqual([])
  })

  it('macht aus einem Geldbetrag keine Telefonnummer', () => {
    expect(findePersonenbezug('Es ging um 1.250,00 Euro.')).toEqual([])
  })

  it('zerlegt eine E-Mail nicht zusätzlich in eine Telefonnummer', () => {
    const funde = findePersonenbezug('kontakt0815@example.com')
    expect(funde.map(f => f.art)).toEqual(['email'])
  })
})

describe('schwaerzePersonenbezug', () => {
  it('ersetzt, was gefunden wurde, und lässt den Rest stehen', () => {
    const raus = schwaerzePersonenbezug('Melde dich: anna@example.com oder 0171 2345678. Bitte.')
    expect(raus).not.toContain('anna@example.com')
    expect(raus).not.toContain('2345678')
    expect(raus).toContain('[E-Mail entfernt]')
    expect(raus).toContain('Bitte.')
  })

  it('lässt einen unauffälligen Text unverändert', () => {
    const text = 'Er sagte, ich sei zu empfindlich.'
    expect(schwaerzePersonenbezug(text)).toBe(text)
  })
})

describe('ersetzeNamen', () => {
  it('ersetzt einen benannten Namen', () => {
    expect(ersetzeNamen('Anna hat gesagt, Anna sei müde.', 'Anna'))
      .toBe('[Name] hat gesagt, [Name] sei müde.')
  })

  it('ist unabhängig von Groß- und Kleinschreibung', () => {
    expect(ersetzeNamen('ANNA und anna', 'Anna')).toBe('[Name] und [Name]')
  })

  it('nimmt eine Kommaliste', () => {
    expect(ersetzeNamen('Anna und Bernd', 'Anna, Bernd')).toBe('[Name] und [Name]')
  })

  it('greift nicht mitten in ein Wort', () => {
    // Der teuerste Fehler: „Ana" darf nicht aus „Analyse" verschwinden.
    expect(ersetzeNamen('Die Analyse von Ana', 'Ana')).toBe('Die Analyse von [Name]')
  })

  it('nimmt den längeren Namen zuerst', () => {
    expect(ersetzeNamen('Anna-Lena kam', 'Anna, Anna-Lena')).toBe('[Name] kam')
  })

  it('ignoriert zu kurze Eingaben', () => {
    // Ein einzelner Buchstabe wuerde den halben Text zerlegen.
    expect(ersetzeNamen('Ein a und ein b', 'a, b')).toBe('Ein a und ein b')
  })

  it('behandelt Sonderzeichen im Namen als Text, nicht als Muster', () => {
    expect(ersetzeNamen('Frag A. B. Meier', 'A. B. Meier')).toBe('Frag [Name]')
  })
})
