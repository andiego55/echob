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
  DATENSCHUTZHINWEISE,
  EINWILLIGUNG_FASSUNG,
  FALL_FAQ_ERKLAERUNG,
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

describe('Das Fall-FAQ im Nachweis', () => {
  it('steht NICHT im Protokoll, wenn es nicht angehakt war', () => {
    // Der Nachweis soll belegen, was die Person erklaert hat - nicht, was ihr angeboten
    // wurde. Stuende der Absatz immer drin, belegte er bei jeder Freigabe eine
    // Uebermittlung, die meistens nicht stattgefunden hat.
    expect(einwilligungsProtokoll(NAME)).not.toContain(FALL_FAQ_ERKLAERUNG.titel)
    expect(einwilligungsProtokoll(NAME, false)).not.toContain(FALL_FAQ_ERKLAERUNG.titel)
  })

  it('steht im Wortlaut im Protokoll, wenn es angehakt war', () => {
    const protokoll = einwilligungsProtokoll(NAME, true)
    expect(protokoll).toContain(FALL_FAQ_ERKLAERUNG.titel)
    expect(protokoll).toContain(FALL_FAQ_ERKLAERUNG.text)
  })

  it('sagt den Satz, den man nicht erraten kann', () => {
    // Dass die Antworten bei der Fachperson landen und nicht bei der Person, die sie
    // ausloest, ist ungewoehnlich genug, dass es dastehen muss - es ist der einzige
    // Grund, aus dem jemand das Haekchen vielleicht doch nicht setzen will.
    expect(FALL_FAQ_ERKLAERUNG.text).toContain('sieht die Fachperson, nicht ich')
    expect(FALL_FAQ_ERKLAERUNG.text).toContain('Art. 15 DSGVO')
  })

  it('verspricht nicht mehr, als die Freigabe hergibt', () => {
    // Verarbeitet wird nur das Ausgewaehlte. Faellt dieser Satz weg, klingt das
    // Fragenpaket nach einem Zugriff auf den ganzen Fall.
    expect(FALL_FAQ_ERKLAERUNG.text).toContain('nur, was ich oben ausgewählt habe')
  })

  it('haengt nicht an den Pflicht-Erklaerungen', () => {
    // Das Fragenpaket ist eine Wahl, keine Bedingung: Ohne den Haken muss die Freigabe
    // trotzdem moeglich sein. Ein `every` ueber drei statt zwei Erklaerungen wuerde sie
    // sperren, und der Knopf saehe genauso aus.
    const ids = erklaerungen(NAME).map(e => e.id)
    expect(ids).not.toContain('fall_faq')
    expect(alleErklaerungenBestaetigt({ einwilligung: true, entbindung: true }, NAME)).toBe(true)
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

describe('Drei Ebenen, sauber getrennt', () => {
  it('haelt Information und Erklaerung auseinander', () => {
    // Die Hinweise sind KEINE Erklaerung: Sie werden nicht bestaetigt. Stuenden sie in
    // den Haken, taete derselbe Text beides halb - er informierte in einer Erklaerung,
    // die man abnickt.
    const ids = erklaerungen(NAME).map(e => e.id)
    expect(ids).not.toContain('hinweise')
    expect(DATENSCHUTZHINWEISE.length).toBeGreaterThanOrEqual(5)
  })

  it('beantwortet in den Hinweisen die Fragen des Art. 13', () => {
    const alles = DATENSCHUTZHINWEISE.map(h => h.was + ' ' + h.text).join(' ')
    expect(alles).toContain('Fachperson')          // Empfaenger
    expect(alles).toContain('Auftrag')             // Zweck und Rolle
    expect(alles).toContain('besondere Kategorien')
    expect(alles).toContain('USA')                 // Drittland
    expect(alles).toContain('widerrufst')          // Dauer und Widerruf
  })

  it('laesst die Erklaerungen trotzdem aus sich heraus bestimmt sein', () => {
    // Eine Einwilligung darf sich nicht darauf verlassen, dass jemand den Kasten
    // darueber gelesen hat. Die Wiederholung ist gewollt.
    for (const e of erklaerungen(NAME)) {
      expect(e.text).toContain(NAME)
      expect(e.text.length).toBeGreaterThan(200)
    }
  })
})
