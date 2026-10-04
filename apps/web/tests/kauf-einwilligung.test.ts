/**
 * Belegt der Nachweis, was auf dem Schirm stand?
 *
 * **Der Befund, der das erzwungen hat (Audit vom 04.10.2026).** Vor dem Kauf stand ein
 * Häkchen, geprüft wurde es im Browser — und dann war es weg: `CheckoutRequest` trug nur
 * das Produkt, nichts landete in einer Tabelle. Ein direkter Aufruf des Endpunkts ging
 * daran vorbei, und es gab **keinen Nachweis**. § 357 Abs. 8 BGB verlangt den aber für den
 * Wertersatz, und die Widerrufsbelehrung behauptete derweil, genau diese Zustimmung werde
 * eingeholt.
 *
 * **Was hier bewacht wird, ist die Deckungsgleichheit.** Der angezeigte Satz und der
 * nachgewiesene Satz sind zwei Texte an zwei Orten. Driften sie auseinander, belegt der
 * Nachweis etwas anderes als dastand — und das fällt niemandem auf, weil beide Texte für
 * sich richtig aussehen. Genau diese Sorte Fehler hat in diesem Projekt schon dreimal
 * zugeschlagen (Literal gegen CHECK-Bedingung, Service gegen `response_model`).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { KAUF_EINWILLIGUNG_TEXT, RECHTSSTAND } from '../src/lib/rechtsstand'

const SRC = join(__dirname, '..', 'src')
const lies = (...t: string[]): string => readFileSync(join(SRC, ...t), 'utf-8')

/**
 * Der sichtbare Text eines JSX-Abschnitts: Tags weg, `{' '}` weg, Leerraum normalisiert.
 *
 * Grob, aber ausreichend — und bewusst nicht klüger als nötig: Was hier übrig bleibt, ist
 * ungefähr das, was eine Person liest, und mehr muss der Vergleich nicht können.
 */
function sichtbarerText(jsx: string): string {
  return jsx
    .replace(/\{'\s*'\}/g, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

describe('Kauf-Einwilligung (§ 357 Abs. 8 BGB)', () => {
  it('der angezeigte Satz ist derselbe wie der nachgewiesene', () => {
    const seite = lies('pages', 'app', 'UpgradePage.tsx')
    const anfang = seite.indexOf('Ich akzeptiere die')
    expect(anfang, 'der Einwilligungssatz steht nicht mehr auf der Kaufseite')
      .toBeGreaterThan(-1)
    const ende = seite.indexOf('</span>', anfang)
    const angezeigt = sichtbarerText(seite.slice(anfang, ende))

    expect(angezeigt).toBe(KAUF_EINWILLIGUNG_TEXT)
  })

  it('der Satz nennt beides, was die Norm verlangt', () => {
    // Zustimmung zum sofortigen Beginn UND Kenntnis vom Erlöschen. Fehlt eines, ist der
    // Nachweis wertlos — und er sieht trotzdem vollständig aus.
    expect(KAUF_EINWILLIGUNG_TEXT).toContain('sofort beginnt')
    expect(KAUF_EINWILLIGUNG_TEXT).toContain('erlischt')
  })

  it('der Kauf-Aufruf schickt die Einwilligung und die Fassungen mit', () => {
    // **Genau die drei Dokumente, die neben dem Häkchen verlinkt sind** — nicht alle, die
    // es gibt. Die erste Fassung lief über `Object.keys(RECHTSSTAND)` und verlangte, als
    // die Praxis-AGB dazukamen, deren Fassung auch im Verbraucher-Kauf. Ein Nachweis soll
    // festhalten, was die Person gesehen hat, und sie hat diese drei gesehen.
    const api = lies('api', 'subscription.ts')
    expect(api).toContain('einwilligung')
    for (const schluessel of ['agb', 'widerruf', 'datenschutz'] as const) {
      expect(RECHTSSTAND, `"${schluessel}" fehlt in rechtsstand.ts`)
        .toHaveProperty(schluessel)
      expect(api, `Fassung "${schluessel}" wird nicht mitgeschickt`)
        .toContain(`RECHTSSTAND.${schluessel}.fassung`)
    }
  })

  it('der Server verlangt die Einwilligung, nicht nur die Oberfläche', () => {
    // Das ist der Kern des Befunds. Steht `einwilligung` nicht im Schema, entscheidet
    // wieder der Browser darüber, ob jemand informiert war.
    const schema = readFileSync(
      join(__dirname, '..', '..', '..', 'services', 'api', 'app', 'schemas',
           'subscription.py'), 'utf-8')
    expect(schema).toContain('class KaufEinwilligung')
    const kauf = schema.slice(schema.indexOf('class CheckoutRequest'))
    expect(kauf.slice(0, 400)).toContain('einwilligung: KaufEinwilligung')
    // Kein Vorgabewert: Ein `= None` machte das Pflichtfeld still zur Empfehlung.
    expect(kauf.slice(0, 400)).not.toContain('einwilligung: KaufEinwilligung | None')
  })
})
