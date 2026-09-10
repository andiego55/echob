/**
 * Woher eine Szene zum Vorschlagen kommen darf.
 *
 * **Die Frage, die das hier beantwortet: „Und wenn wir gar keine Szene gemeinsam haben?"**
 * Dann geht es trotzdem — eine Runde braucht keine Überschneidung, sie braucht eine Szene,
 * über die beide reden wollen. Vorschlagen kann man aus beiden Regalen.
 *
 * Das war schon so, nur unsichtbar: Alle Szenen lagen in einer Reihe, und wessen Szene man
 * da anbot, sah man nicht. Jetzt stehen sie getrennt — und dieser Test hält fest, dass
 * ohne Überschneidung nicht plötzlich nichts mehr übrig bleibt.
 */
import { describe, expect, it } from 'vitest'
import { herkunftAusRegal } from '@/pages/couple/CoupleSzenenPage'
import type { RegalEintrag } from '@/api/paarSzenen'

const eintrag = (slug: string, verwaist = false): RegalEintrag => ({
  scene_slug: slug,
  title: `Titel ${slug}`,
  perspective: null,
  wirkungen: [],
  grund: null,
  verwaist,
})

describe('herkunftAusRegal', () => {
  it('lässt ohne Überschneidung beide Auswahlen vorschlagbar', () => {
    const h = herkunftAusRegal({
      meine: [eintrag('a')],
      ihre: [eintrag('b')],
      gemeinsam: [],
    })
    expect(h.beide).toHaveLength(0)
    expect(h.meine.map(p => p.scene_slug)).toEqual(['a'])
    expect(h.ihre.map(p => p.scene_slug)).toEqual(['b'])
    // Das Entscheidende: Es gibt etwas vorzuschlagen.
    expect(h.beide.length + h.meine.length + h.ihre.length).toBe(2)
  })

  it('zeigt eine doppelt gewählte Szene genau einmal, und zwar als gemeinsame', () => {
    // Sonst stünde derselbe Titel dreimal im Bild und man wüsste nicht, welcher gilt.
    const h = herkunftAusRegal({
      meine: [eintrag('a'), eintrag('x')],
      ihre: [eintrag('x'), eintrag('b')],
      gemeinsam: ['x'],
    })
    expect(h.beide.map(p => p.scene_slug)).toEqual(['x'])
    expect(h.meine.map(p => p.scene_slug)).toEqual(['a'])
    expect(h.ihre.map(p => p.scene_slug)).toEqual(['b'])
  })

  it('lässt verwaiste Einträge weg', () => {
    // Eine Szene, die es im Verzeichnis nicht mehr gibt, kann die andere Person nicht
    // öffnen — vorschlagen liefe in eine leere Runde.
    const h = herkunftAusRegal({
      meine: [eintrag('weg', true), eintrag('da')],
      ihre: [eintrag('auch-weg', true)],
      gemeinsam: [],
    })
    expect(h.meine.map(p => p.scene_slug)).toEqual(['da'])
    expect(h.ihre).toHaveLength(0)
  })

  it('kommt mit einem leeren Regal klar', () => {
    const h = herkunftAusRegal(undefined)
    expect(h.beide.length + h.meine.length + h.ihre.length).toBe(0)
  })
})
