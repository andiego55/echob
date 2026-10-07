/**
 * Liegt das Zwei-Faktor-Tor vor dem Fachpersonenbereich — und vor allem anderen?
 *
 * **Was hier bewacht wird, ist nicht der Schutz.** Der liegt im Backend an der
 * gemeinsamen Abhängigkeit `get_current_professional`; fiele diese Komponente weg, wäre
 * der Bereich immer noch dicht. Bewacht wird, dass niemand gegen eine Wand aus
 * 403-Meldungen läuft: Ohne das Tor in der Schale sähe eine Fachperson ohne zweiten
 * Faktor eine leere, kaputte Oberfläche und fände den Weg zum Einrichten nicht.
 *
 * **Und die Reihenfolge ist keine Geschmacksfrage.** Solange das Tor zu ist, antwortet
 * kein Endpunkt des Bereichs. Stünde der AVV-Hinweis davor, liefe er ins Leere — er
 * braucht Daten, die es in dem Zustand nicht gibt.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const SRC = join(__dirname, '..', 'src')
const lies = (...t: string[]): string => readFileSync(join(SRC, ...t), 'utf-8')

/** Kommentare zählen nicht — sie stehen nicht auf dem Schirm. Dritter Anlauf in dieser
 *  Sitzung, an dem das nötig war (siehe `gotcha_filter_eigenes_wort`). */
const ohneKommentare = (q: string): string =>
  q.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '')

describe('Zwei-Faktor-Tor (Fachpersonenbereich)', () => {
  const shell = () => ohneKommentare(lies('components', 'professional', 'ProfessionalShell.tsx'))

  it('die Schale zeigt das Tor, solange es nicht erfüllt ist', () => {
    const q = shell()
    // **`<MfaGate` und nicht `MfaGate`.** Die erste Fassung prüfte den blossen Namen —
    // und die Import-Zeile erfüllte sie. Die Mutationsprobe „Tor aus der Schale
    // entfernt" kam damit durch: Das Bauteil war importiert und nirgends benutzt.
    expect(q).toContain('<MfaGate')
    expect(q).toContain('mfa_eingerichtet')
    expect(q).toContain('mfa_bestaetigt')
  })

  it('das Tor achtet auf die Pflicht-Einstellung aus dem Backend', () => {
    // Sonst sperrt die Oberfläche weiter aus, nachdem der Notausgang im Backend
    // gezogen wurde — und niemand käme mehr hinein, obwohl das Tor offen ist.
    expect(shell()).toContain('mfa_pflicht')
  })

  it('das Tor liegt vor dem AVV-Hinweis', () => {
    const q = shell()
    expect(q.indexOf('<MfaGate')).toBeLessThan(q.lastIndexOf('<AvvBanner'))
  })

  it('beide Zustände haben ihren eigenen Bildschirm', () => {
    // Einrichten und Bestätigen sind zwei verschiedene Lagen. Ein gemeinsamer Text
    // schickte die Hälfte an die falsche Stelle.
    const gate = ohneKommentare(lies('components', 'professional', 'MfaGate.tsx'))
    expect(gate).toContain('einrichten')
    expect(gate).toContain('Bestätigung')
    expect(gate).toContain('mfa.enroll')
    expect(gate).toContain('mfa.verify')
  })

  it('es gibt einen sichtbaren Weg zurück, wenn das Gerät weg ist', () => {
    // Ohne ihn ist eine Fachperson ausgesperrt — und zwar genau dann, wenn sie Zugriff
    // auf fremde Fallakten braucht. Der Weg gehört auf den Schirm, nicht in eine Hilfe.
    const gate = ohneKommentare(lies('components', 'professional', 'MfaGate.tsx'))
    expect(gate).toContain('kontakt@echo-b.de')
    expect(gate.toLowerCase()).toContain('verloren')
  })

  it('nach der Bestätigung wird alles neu geholt', () => {
    // Die Anmeldung trägt danach eine höhere Stufe. Ohne das Neuholen arbeitet die
    // Oberfläche mit dem alten Zustand weiter und zeigt das Tor erneut.
    const gate = ohneKommentare(lies('components', 'professional', 'MfaGate.tsx'))
    expect(gate).toContain('invalidateQueries')
  })
})
