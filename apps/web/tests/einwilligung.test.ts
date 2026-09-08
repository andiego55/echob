/**
 * Die beiden Erklärungen bei der Freigabe — Wortlaut und Trennung.
 *
 * Hier stecken zwei rechtlich verschiedene Dinge: die Einwilligung nach Art. 9 DSGVO und
 * die Entbindung von der Schweigepflicht (§ 203 StGB). Bis September 2026 standen sie in
 * einer einzigen Bestätigung — wer nur einer zustimmen wollte, konnte das nicht, und wer
 * zustimmte, konnte nicht erkennen, dass er zwei Dinge erklärt.
 *
 * Eine Entbindung muss außerdem **bestimmt** sein. „Ich entbinde die Fachperson gegenüber
 * einem Dienstleister" ist keine Erklärung, der man ansieht, was sie gestattet. Diese
 * Tests halten fest, dass die Beteiligten beim Namen genannt bleiben — sie sind der
 * Unterschied zwischen einer wirksamen und einer folgenlosen Erklärung.
 */
import { describe, expect, it } from 'vitest'
import {
  EINWILLIGUNG_FASSUNG,
  WIDERRUFSHINWEIS,
  alleErklaerungenBestaetigt,
  einwilligungsProtokoll,
  erklaerungen,
} from '../src/lib/einwilligung'
import { BETREIBER_VOLL, KI_DIENSTLEISTER } from '../src/lib/betreiber'

const NAME = 'Dr. A. Muster'

describe('Zwei getrennte Erklärungen', () => {
  it('sind genau zwei, mit eigener Kennung und Überschrift', () => {
    const e = erklaerungen(NAME)
    expect(e.map(x => x.id)).toEqual(['einwilligung', 'entbindung'])
    for (const x of e) expect(x.titel.trim().length).toBeGreaterThan(10)
  })

  it('nennen beide die Fachperson beim Namen', () => {
    // Eine Erklaerung "gegenueber der Fachperson" waere nicht bestimmt genug - und die
    // Entbindung ist genau die, bei der Unbestimmtheit teuer wird.
    for (const x of erklaerungen(NAME)) expect(x.text).toContain(NAME)
  })

  it('faellt ohne Namen nicht auf eine leere Stelle zurueck', () => {
    for (const x of erklaerungen('')) {
      expect(x.text).not.toMatch(/\s{2,}/)
      expect(x.text).toContain('die ausgewählte Fachperson')
    }
  })
})

describe('Die Entbindung von der Schweigepflicht', () => {
  const entbindung = () => erklaerungen(NAME).find(e => e.id === 'entbindung')!.text

  it('benennt alle, gegenüber denen entbunden wird', () => {
    // Betreiber, KI-Dienstleister und die Unterauftragnehmer - fehlt einer, deckt die
    // Entbindung genau diese Weitergabe nicht.
    expect(entbindung()).toContain(BETREIBER_VOLL)
    expect(entbindung()).toContain(KI_DIENSTLEISTER)
    expect(entbindung()).toContain('Unterauftragnehmer')
  })

  it('nennt die Vorschrift, um die es geht', () => {
    expect(entbindung()).toContain('§ 203 StGB')
  })

  it('begrenzt sich auf Zweck und Umfang', () => {
    // Eine unbegrenzte Entbindung waere weder erforderlich noch wirksam.
    expect(entbindung()).toContain('erforderlich')
    expect(entbindung()).toContain('nur für die von mir ausgewählten Inhalte')
  })
})

describe('Die Einwilligung nach Art. 9', () => {
  const einwilligung = () => erklaerungen(NAME).find(e => e.id === 'einwilligung')!.text

  it('nennt die besonderen Kategorien und das Drittland', () => {
    expect(einwilligung()).toContain('Art. 9')
    expect(einwilligung()).toContain('USA')
    expect(einwilligung()).toContain(KI_DIENSTLEISTER)
  })
})

describe('Widerruf und Nachweis', () => {
  it('nennt die Folgen des Widerrufs, wie sie wirklich eintreten', () => {
    // Berichte und Notizen haengen ebenso an der aktiven Freigabe wie die Inhalte -
    // deshalb darf hier stehen, dass auch sie unerreichbar werden.
    expect(WIDERRUFSHINWEIS).toContain('widerrufen')
    expect(WIDERRUFSHINWEIS).toContain('Berichte und Notizen')
  })

  it('speichert beide Erklärungen im Wortlaut', () => {
    // Der Nachweis nach Art. 7 Abs. 1 DSGVO ist eine Aussage ueber den Text. Faellt eine
    // Erklaerung aus dem Protokoll, ist genau sie spaeter nicht belegt.
    const protokoll = einwilligungsProtokoll(NAME)
    for (const x of erklaerungen(NAME)) {
      expect(protokoll).toContain(x.titel)
      expect(protokoll).toContain(x.text)
    }
    expect(protokoll).toContain(WIDERRUFSHINWEIS)
  })

  it('traegt eine Fassungskennung, die eine zweite Fassung im Monat zulaesst', () => {
    expect(EINWILLIGUNG_FASSUNG).toMatch(/^share-\d{4}-\d{2}[a-z]?$/)
  })
})

describe('Beide Haken, nicht einer', () => {
  it('laesst die Freigabe erst nach beiden Erklaerungen zu', () => {
    // Der Fehler, den das verhindert: ein `||` statt `&&`. Der Knopf saehe genauso aus,
    // und die Freigabe erfolgte nach nur einer der beiden Erklaerungen.
    expect(alleErklaerungenBestaetigt({ einwilligung: true }, NAME)).toBe(false)
    expect(alleErklaerungenBestaetigt({ entbindung: true }, NAME)).toBe(false)
    expect(alleErklaerungenBestaetigt({ einwilligung: true, entbindung: true }, NAME)).toBe(true)
  })

  it('laesst sich nicht mit einem fremden Haken taeuschen', () => {
    expect(alleErklaerungenBestaetigt({ einwilligung: true, irgendwas: true }, NAME)).toBe(false)
  })

  it('nimmt nur ein echtes Ja', () => {
    // undefined, null oder ein truthiger Fremdwert duerfen nicht genuegen.
    expect(alleErklaerungenBestaetigt({ einwilligung: true, entbindung: false }, NAME)).toBe(false)
    expect(alleErklaerungenBestaetigt({}, NAME)).toBe(false)
  })
})
