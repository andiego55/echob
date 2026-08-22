/**
 * Welcher Reiter im Fall leuchtet.
 *
 * **Warum geprüft.** Die Zuordnung von Unterpfad zu Gruppe ist die einzige echte
 * Entscheidung in der Fall-Navigation, und sie ist lautlos falsch, wenn sie danebengreift:
 * Es leuchtet der falsche Reiter, oder man steht auf „Überblick", während man in einem
 * Selbsttest arbeitet. Kein Absturz, keine Warnung, kein roter Build.
 *
 * Die Regel wurde beim Umbau von acht flachen Reitern auf vier Gruppen geschrieben und
 * bis hierhin nur im Kopf durchgespielt.
 */
import { describe, expect, it } from 'vitest'
import { GRUPPEN, gruppeFuer } from '@/components/app/caseNavGroups'

/** Kurzform: nur das Etikett der getroffenen Gruppe. */
const gruppe = (pfad: string) => gruppeFuer(pfad).label

describe('gruppeFuer – die geraden Fälle', () => {
  it('führt die leere Wurzel auf den Überblick', () => {
    expect(gruppe('')).toBe('Überblick')
  })

  it('ordnet jede Pille ihrer eigenen Gruppe zu', () => {
    for (const g of GRUPPEN) {
      for (const kind of g.kinder) {
        expect(gruppe(kind.path), `${kind.path} → ${g.label}`).toBe(g.label)
      }
    }
  })
})

describe('gruppeFuer – die Fälle, an denen es scheitern würde', () => {
  it('bleibt bei Unterseiten in der Gruppe', () => {
    expect(gruppe('/scenes/new')).toBe('Erfassen')
    expect(gruppe('/scenes/abc-123')).toBe('Erfassen')
    expect(gruppe('/reports/new')).toBe('Zeigen')
    expect(gruppe('/hypotheses/vermeidung')).toBe('Verstehen')
  })

  it('verwechselt /person-profile/echo nicht mit /echo', () => {
    // Der Grund für die Sortierung nach längster Kindroute: Beide Pfade enden auf „echo",
    // aber nur einer gehört zu „Verstehen".
    expect(gruppe('/person-profile/echo')).toBe('Erfassen')
    expect(gruppe('/echo')).toBe('Verstehen')
  })

  it('hält einen Selbsttest bei „Verstehen", obwohl er keine Pille hat', () => {
    expect(gruppe('/selbsttest/bindungsstil')).toBe('Verstehen')
  })

  it('hält einen Themendialog bei „Verstehen"', () => {
    expect(gruppe('/topics/topic_self')).toBe('Verstehen')
    expect(gruppe('/topics/topic_guilt')).toBe('Verstehen')
  })

  it('lässt sich von einem ähnlich beginnenden Pfad nicht täuschen', () => {
    // „/scenesomething" ist nicht „/scenes" — sonst würde ein neuer Pfad, der zufällig so
    // anfängt, den falschen Reiter aufleuchten lassen.
    expect(gruppe('/scenesomething')).toBe('Überblick')
    expect(gruppe('/reportsxyz')).toBe('Überblick')
  })

  it('fällt bei Unbekanntem auf den Überblick zurück, statt nichts zu markieren', () => {
    expect(gruppe('/gibtesnicht')).toBe('Überblick')
    expect(gruppe('/')).toBe('Überblick')
  })
})

describe('Die Gliederung selbst', () => {
  it('hat genau eine Gruppe ohne Unterreiter', () => {
    // Nur „Überblick" steht allein. Eine zweite solche Gruppe wäre ein Versehen: Sie
    // bekäme keine Pillenreihe und ihre Kinder wären unerreichbar.
    const allein = GRUPPEN.filter(g => g.kinder.length === 1)
    expect(allein.map(g => g.label)).toEqual(['Überblick'])
  })

  it('vergibt keinen Pfad zweimal', () => {
    const pfade = GRUPPEN.flatMap(g => g.kinder.map(k => k.path))
    expect(new Set(pfade).size).toBe(pfade.length)
  })

  it('bleibt bei vier Gruppen – mehr passt nicht nebeneinander', () => {
    expect(GRUPPEN).toHaveLength(4)
  })

  it('lässt keine Kindroute Präfix einer anderen sein', () => {
    // Das ist die Eigenschaft, auf der `gruppeFuer` steht: Solange kein Pfad unterhalb
    // eines anderen liegt, kann höchstens EINE Gruppe passen — und die erste gefundene
    // ist die richtige. Wer künftig `/reports` und `/reports/archiv` in verschiedene
    // Gruppen legt, bricht das, und diese Prüfung sagt es ihm.
    const pfade = GRUPPEN.flatMap(g => g.kinder.map(k => k.path)).filter(Boolean)
    const verschachtelt = pfade.flatMap(a =>
      pfade.filter(b => b !== a && b.startsWith(a + '/')).map(b => `${a} < ${b}`))
    expect(verschachtelt).toEqual([])
  })
})
