/**
 * Wann darf das Fenster dem Text nachlaufen — und wann muss es den Leser in Ruhe lassen?
 *
 * Der Fehler war, dass bedingungslos nachgelaufen wurde: Wer während einer langen Antwort
 * nach oben blätterte, wurde beim nächsten Takt (alle 20 ms) wieder nach unten gerissen.
 * Nach außen sah es aus, als sei das Scrollen gesperrt.
 *
 * Geprüft wird deshalb genau die Unterscheidung, an der das hängt: „Der Text ist gewachsen"
 * gegen „jemand liest oben". Beides sieht in den Zahlen zunächst ähnlich aus — der
 * Unterschied liegt darin, ob sich `scrollTop` verändert hat.
 */
import { describe, expect, it } from 'vitest'
import { sollFolgen } from '../src/lib/mitlaufen'

/** Ein Behälter, in dem gerade unten gestanden wird. 600 sichtbar, 2000 hoch. */
const untenStehend = {
  scrollTop: 1400,
  scrollHeight: 2000,
  clientHeight: 600,
  zuletztGesetzt: 1400,
}

describe('Mitlaufen: folgen oder in Ruhe lassen', () => {
  it('folgt, solange unten gestanden wird', () => {
    expect(sollFolgen(untenStehend)).toBe(true)
  })

  it('folgt, wenn der Text gewachsen ist, ohne dass jemand geblättert hat', () => {
    // Der Kernfall beim Schreiben: neuer Text kommt unten dazu, `scrollTop` bleibt liegen.
    // Der Abstand zum Ende wächst dadurch - das ist KEIN Blättern.
    expect(sollFolgen({ ...untenStehend, scrollHeight: 2400 })).toBe(true)
  })

  it('folgt beim Sprung einer ganzen neuen Nachricht', () => {
    // Hier wächst der Inhalt auf einen Schlag um mehr als eine Bildschirmhöhe. Ohne die
    // Merkposition sähe das exakt aus wie jemand, der weit nach oben geblättert hat.
    expect(sollFolgen({ ...untenStehend, scrollHeight: 3200 })).toBe(true)
  })

  it('hört auf, sobald jemand nach oben blättert', () => {
    // Das ist der gemeldete Fehler. Nur ein Mensch verringert `scrollTop`.
    expect(sollFolgen({ ...untenStehend, scrollTop: 400 })).toBe(false)
  })

  it('bleibt still, während oben gelesen wird und der Text weiterwächst', () => {
    expect(sollFolgen({ ...untenStehend, scrollTop: 400, scrollHeight: 3000 })).toBe(false)
  })

  it('nimmt das Nachlaufen wieder auf, wenn jemand von selbst nach unten zurückkommt', () => {
    // Zurück ans Ende: `scrollTop` liegt jetzt zwar unter der alten Merkposition, aber der
    // Abstand zum Ende ist klein. Ohne diese zweite Bedingung bliebe das Fenster stehen.
    expect(
      sollFolgen({ scrollTop: 2380, scrollHeight: 3000, clientHeight: 600, zuletztGesetzt: 1400 }),
    ).toBe(true)
  })

  it('verwechselt Subpixel und Rundung nicht mit Blättern', () => {
    // Weit genug vom Ende weg, dass allein die Merkposition entscheidet: 2400 waere unten.
    const weitOben = { scrollHeight: 3000, clientHeight: 600, zuletztGesetzt: 1400 }
    expect(sollFolgen({ ...weitOben, scrollTop: 1399 })).toBe(true) // Rundung
    expect(sollFolgen({ ...weitOben, scrollTop: 1360 })).toBe(false) // echtes Blättern
  })

  it('lässt sich vom Blättern nach unten nicht beirren', () => {
    // Nach unten blättern ist nie ein Grund aufzuhören - die Bedingung ist einseitig.
    expect(
      sollFolgen({ scrollTop: 1800, scrollHeight: 3000, clientHeight: 600, zuletztGesetzt: 1400 }),
    ).toBe(true)
  })

  it('folgt, wenn es gar nichts zu blättern gibt', () => {
    // Kurzer Verlauf, alles sichtbar. Hier darf keine Rechnung mit negativen Werten
    // dazwischenkommen.
    expect(
      sollFolgen({ scrollTop: 0, scrollHeight: 400, clientHeight: 600, zuletztGesetzt: 0 }),
    ).toBe(true)
  })

  it('folgt beim allerersten Aufruf, wenn noch nie gesetzt wurde', () => {
    expect(
      sollFolgen({
        scrollTop: 0,
        scrollHeight: 3000,
        clientHeight: 600,
        zuletztGesetzt: Number.NEGATIVE_INFINITY,
      }),
    ).toBe(true)
  })
})
