/**
 * Der Wortlaut der Einwilligung — angezeigt und gespeichert muss dasselbe sein.
 *
 * Art. 7 Abs. 1 DSGVO verlangt den Nachweis der Einwilligung, und der Nachweis ist eine
 * Aussage über den Text. Bisher wurden nur Fassungskennung und Zeitpunkt gespeichert; der
 * Text stand allein im Formular. Jetzt erzeugt eine Funktion ihn, das Formular zeigt genau
 * ihn, und genau er wird mitgeschickt.
 *
 * Diese Tests halten fest, was in dem Text stehen muss, damit die Einwilligung bestimmt
 * genug ist — und dass Anzeige und Nachweis nicht auseinanderlaufen können.
 */
import { describe, expect, it } from 'vitest'
import {
  EINWILLIGUNG_FASSUNG,
  einwilligungsAbsaetze,
  einwilligungsText,
} from '../src/lib/einwilligung'

describe('Wortlaut der Einwilligung', () => {
  it('nennt die Fachperson beim Namen', () => {
    // „Einwilligung an eine Fachperson" waere nicht bestimmt genug - die Erklaerung muss
    // sagen, WEM gegenueber sie gilt.
    expect(einwilligungsText('Dr. A. Muster')).toContain('Dr. A. Muster')
  })

  it('faellt ohne Namen nicht auf eine leere Stelle zurueck', () => {
    // Sonst stuende im Nachweis "... an  freigegeben werden".
    const text = einwilligungsText('')
    expect(text).not.toMatch(/an\s{2,}/)
    expect(text).toContain('die ausgewählte Fachperson')
  })

  it('nennt die vier Punkte, ohne die die Einwilligung nicht informiert waere', () => {
    const text = einwilligungsText('Dr. A. Muster')
    expect(text).toContain('Art. 9')           // besondere Kategorien
    expect(text).toContain('KI')               // Verarbeitung durch ein Modell
    expect(text).toContain('USA')              // Drittland
    expect(text).toContain('widerrufen')       // Widerruflichkeit
  })

  it('enthaelt die Entbindung von der Schweigepflicht', () => {
    // Die zweite, rechtlich eigenstaendige Erklaerung. Sie steht heute im selben Text;
    // die Trennung in zwei Bestaetigungen ist Massnahme M2. Faellt sie hier heraus, ist
    // der Einsatz bei Berufsgeheimnistraeger:innen ohne Grundlage.
    expect(einwilligungsText('Dr. A. Muster')).toContain('Schweigepflicht')
  })

  it('zeigt genau das an, was gespeichert wird', () => {
    // Der eigentliche Punkt: Anzeige und Nachweis kommen aus derselben Quelle. Liefen sie
    // auseinander, belegte der Nachweis eine Zustimmung zu einem anderen Text.
    const name = 'Praxis Sonnenhof'
    expect(einwilligungsAbsaetze(name).join('\n\n')).toBe(einwilligungsText(name))
  })

  it('ist in lesbare Absaetze geteilt', () => {
    // Ein Block aus sechs Zeilen liest niemand. Informiert ist eine Einwilligung nur,
    // wenn sie auch gelesen werden kann.
    const absaetze = einwilligungsAbsaetze('Dr. A. Muster')
    expect(absaetze.length).toBeGreaterThanOrEqual(3)
    for (const a of absaetze) expect(a.trim().length).toBeGreaterThan(40)
  })

  it('traegt eine Fassungskennung in der vereinbarten Form', () => {
    expect(EINWILLIGUNG_FASSUNG).toMatch(/^share-\d{4}-\d{2}$/)
  })
})
