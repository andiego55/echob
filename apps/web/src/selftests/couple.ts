import type { SelfTest, TestCategory } from './types'

/**
 * Welche Selbsttests im Paarraum vertretbar sind.
 *
 * Nur Beziehung, Persönlichkeit und Reflexion. Bewusst ausgeschlossen sind die Kategorien
 * „manipulation" und „trennung" sowie alle Tests mit Sicherheitshinweis: dort schätzt eine
 * Person die andere ein oder es geht um eigene Belastung. In einem Raum, den beide lesen,
 * wäre das schädlich statt hilfreich – solche Tests gehören in den privaten Fall.
 */
export const COUPLE_TEST_CATEGORIES: TestCategory[] = ['beziehung', 'persoenlichkeit', 'therapie']

export function isCoupleSafe(test: SelfTest): boolean {
  return COUPLE_TEST_CATEGORIES.includes(test.category) && !test.safety
}
