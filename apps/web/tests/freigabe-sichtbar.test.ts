/**
 * Die fünfte Stelle: Freigegeben heißt noch nicht sichtbar.
 *
 * **Der Wächter daneben prüft vier Stellen** (`freigabe-elemente.test.ts`): die Bedingung
 * in der Datenbank, das Schema, die Etiketten und das Kästchen zum Ankreuzen. Sind alle
 * vier da, lässt sich ein Inhalt freigeben, er wird geladen, er landet im Bündel — und
 * genau dort kann er liegen bleiben.
 *
 * **Und das ist passiert.** Die einzeln freigegebenen Sätze über die eigene Person
 * erreichten die Fachperson lange ausschließlich über Echos Kontext: Das Modell wusste
 * davon, die Fallseite zeigte sie nirgends. Es gab keinen Fehler, nur eine Freigabe, die
 * jemand erteilt hatte und deren Ergebnis er nie zu Gesicht bekam. Bei einem Notfallplan
 * wäre dasselbe nicht unvollständig, sondern absurd: Einen Plan, den nur ein Modell lesen
 * kann, hat man im Ernstfall nicht.
 *
 * **Die Regel ist deshalb ohne Ausnahmeliste.** Jeder freigebbare Inhalt kommt in der
 * Fallansicht der Fachperson vor. Eine Liste mit Ausnahmen wäre wieder eine Stelle, die
 * jemand pflegen muss — und die erste Ausnahme, die dort steht, ist der nächste Inhalt,
 * den niemand sieht.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SHARE_ELEMENT_LABELS } from '@/types'
import type { ShareElementType } from '@/types'

const SRC = join(__dirname, '..', 'src')
const FALLSEITE = join(SRC, 'pages', 'professional', 'ProfessionalCaseDetailPage.tsx')
const KOMPASS = join(SRC, 'components', 'professional', 'KompassPanel.tsx')

const quelle = readFileSync(FALLSEITE, 'utf8')

/** Jedes `has('…')` der Fallansicht — so entscheidet sie, was sie zeigt. */
const gezeigt = new Set(
  [...quelle.matchAll(/has\(\s*'([a-z_]+)'\s*\)/g)].map(m => m[1]),
)

describe('Freigabe – was freigegeben ist, wird auch gezeigt', () => {
  it('zeigt jeden freigebbaren Inhalt in der Fallansicht', () => {
    const alle = Object.keys(SHARE_ELEMENT_LABELS) as ShareElementType[]
    const fehlend = alle.filter(e => !gezeigt.has(e))
    expect(fehlend, 'freigebbar, aber in der Fallansicht unsichtbar').toEqual([])
  })

  it('prüft nichts ab, was es gar nicht gibt', () => {
    // Ein `has('sazt')` liefe still ins Leere: immer falsch, immer leer, nie rot.
    for (const e of gezeigt) {
      expect(SHARE_ELEMENT_LABELS[e as ShareElementType], e).toBeTruthy()
    }
  })
})

/**
 * **Der Verlauf darf keinen Freitext anzeigen können.**
 *
 * Entschieden wird das im Server an der Abfrage — dort steht eine Spaltenliste und kein
 * Stern, und ein eigener Wächter prüft es über den echten Weg. Diese Prüfung hier ist die
 * zweite Hälfte davon: Käme der Text eines Tages doch mit, weil jemand die Abfrage
 * erweitert, soll ihn wenigstens keine fertige Zeile schon erwarten.
 *
 * Der Typ `PulsPunkt` kennt die Felder nicht, also bräche so ein Zugriff den Typcheck.
 * Dieser Test sagt zusätzlich, WARUM — ein Typfehler erklärt sich nicht von selbst.
 */
describe('Freigabe – der Verlauf ist eine Kurve, kein Tagebuch', () => {
  const kompass = readFileSync(KOMPASS, 'utf8')

  it('liest aus einem freigegebenen Punkt nie die Notiz', () => {
    expect(/\.notiz\b/.test(kompass)).toBe(false)
    expect(/\.geholfen\b/.test(kompass)).toBe(false)
  })

  it('sagt im Bild, dass die Notizen fehlen — nicht nur im Code', () => {
    // Eine Kurve ohne diesen Hinweis liest sich wie ein Auszug, bei dem die Notizen
    // gerade nicht geladen sind. Dass es sie gibt und dass sie bewusst nicht mitgehen,
    // ist die Auskunft.
    expect(kompass).toMatch(/nicht freigegeben/)
  })
})
