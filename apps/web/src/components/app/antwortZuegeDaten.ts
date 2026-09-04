/**
 * Welche Züge unter Echos Antwort stehen — Daten und die eine Regel, ohne Darstellung.
 *
 * Steht getrennt von `AntwortZuege.tsx`, aus demselben Grund wie `caseNavGroups.ts` neben
 * `CaseNav.tsx`: Hier fällt die einzige echte Entscheidung dieser Ecke, und sie lässt sich
 * so ohne React prüfen.
 */
import type { Einstufung } from '@/lib/sseLeser'

export interface Zug {
  id: string
  label: string
  /** Was tatsächlich gesendet wird. */
  text: string
  titel: string
}

/**
 * Vier Bewegungen, die sich nicht überschneiden: Form, Tiefe, Perspektive, Haltung.
 *
 * Mehr wären eine Werkzeugleiste. Unter einer Antwort, die man gerade liest, ist Platz
 * für ungefähr vier Wörter — alles darüber wird überlesen.
 */
export const ZUEGE: Zug[] = [
  {
    id: 'kuerzer',
    label: 'Kürzer',
    text: 'Sag mir das noch einmal kürzer – in zwei, drei Sätzen.',
    titel: 'Dasselbe, auf den Kern gebracht',
  },
  {
    id: 'konkreter',
    label: 'Konkreter',
    text: 'Das ist mir zu allgemein. Mach es konkret an dem fest, was ich dir erzählt habe.',
    titel: 'An deinen Szenen festmachen, statt allgemein zu bleiben',
  },
  {
    id: 'perspektive',
    label: 'Aus ihrer Sicht',
    text: 'Wie würde die andere Person dieselbe Situation schildern? '
        + 'Bleib dabei bei dem, was ich erzählt habe – erfinde nichts dazu.',
    titel: 'Dieselbe Situation von der anderen Seite',
  },
  {
    id: 'widerspruch',
    label: 'Widersprich mir',
    text: 'Widersprich mir. Wo könnte ich mich irren, und was spricht gegen meine Lesart?',
    titel: 'Echo sucht, was gegen deine Lesart spricht',
  },
]

/**
 * Welche Züge unter einer Antwort dieser Einstufung stehen dürfen.
 *
 * **„Widersprich mir" verschwindet, wenn die Sicherheits-Triage angeschlagen hat.** Dann
 * steht dort gerade keine Deutung, sondern eine Hilfemeldung — und wem es akut schlecht
 * geht, dem bietet man keinen Widerspruch an. Der Zug ist dann weg, nicht ausgegraut: Ein
 * ausgegrauter Knopf wirft die Frage auf, warum er nicht geht.
 *
 * Das ist eine Entscheidung, die man dem Bildschirm nicht ansieht und deren Fehler erst
 * auffiele, wenn es zu spät ist. Deshalb ist sie geprüft — siehe `tests/antwort-zuege.test.ts`.
 */
export function zuegeFuer(safety: Einstufung | undefined): Zug[] {
  const inNot = safety === 'acute' || safety === 'elevated'
  return inNot ? ZUEGE.filter(z => z.id !== 'widerspruch') : ZUEGE
}
