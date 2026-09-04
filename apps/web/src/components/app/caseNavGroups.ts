/**
 * Die Gliederung eines Falls — Daten und Zuordnung, ohne Darstellung.
 *
 * Steht getrennt von `CaseNav.tsx`, weil es die einzige echte Entscheidung dieser Ecke ist
 * und weil sie hier ohne React, ohne Router und ohne Auth-Kette geprüft werden kann.
 *
 * **Warum vier Gruppen.** Acht gleichrangige Reiter verlangen, dass man alle acht liest, um
 * einen zu finden — und sie sagen nichts darüber, wie die Arbeit an einem Fall abläuft.
 * Vier Gruppen sagen es: erfassen, was passiert ist · verstehen, was dahintersteckt ·
 * zeigen, was daraus geworden ist. Dieselbe Gliederung hat der Paarraum.
 */

export interface Reiter { path: string; label: string }
export interface Gruppe { label: string; kinder: Reiter[] }

/** „Überblick" steht allein: kein Schritt, sondern der Ort, an dem man ankommt. */
export const GRUPPEN: Gruppe[] = [
  { label: 'Überblick', kinder: [{ path: '', label: 'Überblick' }] },
  {
    label: 'Erfassen',
    kinder: [
      { path: '/scenes', label: 'Szenen' },
      { path: '/documents', label: 'Dokumente' },
      { path: '/person-profile', label: 'Die andere Person' },
      { path: '/onboarding', label: 'Grunddaten' },
    ],
  },
  {
    label: 'Verstehen',
    kinder: [
      { path: '/echo', label: 'Echo' },
      { path: '/scales', label: 'Muster' },
      { path: '/review', label: 'Verlauf' },
      { path: '/hypotheses', label: 'Hypothesen' },
    ],
  },
  {
    label: 'Zeigen',
    kinder: [
      { path: '/reports', label: 'Berichte' },
      { path: '/share', label: 'Freigaben' },
      { path: '/export', label: 'Zusammenfassung' },
    ],
  },
]

/**
 * Routen, die zu einer Gruppe gehören, aber keine eigene Pille bekommen.
 *
 * Ein Selbsttest ist kein Bereich, den man ansteuert — man landet dort aus „Muster" heraus.
 * Ohne diese Zuordnung fiele die Navigation dabei auf „Überblick" zurück, und man stünde
 * plötzlich woanders, als man gerade arbeitet.
 */
export const ANHAENGSEL: Record<string, string> = {
  '/selbsttest': 'Verstehen',
  '/topics': 'Verstehen',
}

/**
 * Welche Gruppe gehört zu diesem Unterpfad? (`rest` ist der Teil hinter `/app/cases/:id`.)
 *
 * Greift das daneben, leuchtet der falsche Reiter — kein Absturz, keine Warnung, nur eine
 * Person, die woanders steht, als sie arbeitet. Genau deshalb ist es geprüft.
 *
 * Zwei Feinheiten:
 *
 *   * Verglichen wird auf Gleichheit ODER auf Pfad-plus-Schrägstrich. Ein blosses
 *     `startsWith` wäre falsch: `/scenesomething` fängt mit `/scenes` an, gehört aber
 *     nirgendwohin.
 *   * `ANHAENGSEL` geht vor, damit ein Selbsttest sichtbar unter „Verstehen" bleibt.
 *
 * **Hier stand einmal eine Sortierung nach längster passender Route.** Sie sollte den Fall
 * abfangen, dass zwei Gruppen denselben Pfad beanspruchen. Eine Mutationsprobe hat gezeigt,
 * dass kein Test rot wird, wenn man sie entfernt — und der Grund war, dass es diesen Fall
 * gar nicht gibt: Keine Kindroute ist Präfix einer Kindroute in einer anderen Gruppe.
 *
 * Verteidigung gegen eine Lage, die nicht eintritt, ist kein Schutz, sondern Ballast: Sie
 * sieht nach Sorgfalt aus und ist ungeprüft. Statt ihrer sichert jetzt ein Test die
 * Eigenschaft, auf die es wirklich ankommt (siehe `tests/fall-navigation.test.ts`).
 */
export function gruppeFuer(rest: string): Gruppe {
  const angehaengt = Object.entries(ANHAENGSEL)
    .find(([pfad]) => rest === pfad || rest.startsWith(pfad + '/'))?.[1]

  return (angehaengt ? GRUPPEN.find(g => g.label === angehaengt) : undefined)
    ?? GRUPPEN.slice(1)
      .find(g => g.kinder.some(k => rest === k.path || rest.startsWith(k.path + '/')))
    ?? GRUPPEN[0]
}
