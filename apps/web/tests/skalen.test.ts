/**
 * Die Skala der Beziehungsdynamiken — eine Zahl, eine Bedeutung.
 *
 * **Der Fehler, der hier festgenagelt wird.** Im Bericht stand unter der Überschrift
 * „Skala 0–100" ein Höchstwert als **„5/100"**, mit einem 5 % breiten Balken. Die
 * Datenbank speichert seit Migration 06 Werte von 0 bis 100; zwei Stellen im Backend
 * rechneten sie weiter auf 0–5 herunter, die Anzeige beschriftete aber mit „/100". Der
 * schlimmste Ausgang dieses Fehlers ist nicht die falsche Zahl, sondern die umgekehrte
 * Aussage: Eine maximal ausgeprägte Dynamik sah aus wie „kommt praktisch nicht vor".
 *
 * Deshalb prüft der erste Test genau das — ein Höchstwert muss wie ein Höchstwert
 * aussehen.
 */
import { describe, expect, it } from 'vitest'
import { SKALA_MAX, balkenBreite, skalenFarbe, skalenText, skalenwert } from '../src/lib/skalen'

describe('Ein Wert bedeutet, was er bedeutet', () => {
  it('zeigt einen Höchstwert als Höchstwert', () => {
    // Der eigentliche Fehler: 100 erschien als "5/100" mit 5 % Balken.
    expect(skalenText(100)).toBe('100/100')
    expect(balkenBreite(100)).toBe('100%')
  })

  it('zeigt einen niedrigen Wert als niedrigen Wert', () => {
    expect(skalenText(5)).toBe('5/100')
    expect(balkenBreite(5)).toBe('5%')
  })

  it('rundet auf ganze Zahlen — Nachkommastellen behaupten eine Genauigkeit, die es nicht gibt', () => {
    expect(skalenwert(72.4)).toBe(72)
    expect(skalenText(72.6)).toBe('73/100')
  })

  it('bleibt innerhalb der Spanne, auch wenn etwas Unmögliches ankommt', () => {
    // Ein Balken mit -30 % oder 340 % zerlegt das Layout; die Zahl daneben waere ohnehin
    // falsch. Lieber am Rand anstossen als die Seite zerreissen.
    expect(balkenBreite(-30)).toBe('0%')
    expect(balkenBreite(340)).toBe('100%')
    expect(skalenwert(340)).toBe(SKALA_MAX)
  })
})

describe('Die Farbstufen liegen auf derselben Skala', () => {
  it('färbt erst hoch, wenn der Wert wirklich hoch ist', () => {
    // Mit den alten Schwellen (4/3/2) war ab einem Wert von 4 alles rot - also immer.
    expect(skalenFarbe(4, 'dynamik')).toBe('bg-teal-300')
    expect(skalenFarbe(45, 'dynamik')).toBe('bg-yellow-300')
    expect(skalenFarbe(65, 'dynamik')).toBe('bg-amber-400')
    expect(skalenFarbe(85, 'dynamik')).toBe('bg-red-500')
  })

  it('nutzt für die andere Person eine eigene Farbfamilie', () => {
    // Die Werte zur anderen Person sind Wahrnehmungen, keine Messwerte - sie sollen
    // nicht wie ein Alarm aussehen.
    expect(skalenFarbe(85, 'person')).toBe('bg-blue-600')
    expect(skalenFarbe(4, 'person')).toBe('bg-blue-300')
  })
})
