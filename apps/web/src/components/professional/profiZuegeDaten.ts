/**
 * Züge unter Echos Antwort — die fachliche Fassung.
 *
 * **Warum eigene und nicht dieselben wie im Nutzerbereich.** Dort heißen sie „Kürzer",
 * „Konkreter", „Aus ihrer Sicht", „Widersprich mir" — Bewegungen für jemanden, der über
 * sein eigenes Erleben spricht. Eine Fachperson steht anders zum Material: Sie fragt
 * nicht, wie es der anderen Person geht, sondern worauf eine Aussage beruht und was
 * fehlt, um sie zu beurteilen.
 *
 * **Vier, nicht mehr.** Unter einer Antwort, die man gerade liest, ist Platz für ungefähr
 * vier Wörter. Alles darüber wird überlesen und macht aus einem Angebot eine
 * Werkzeugleiste.
 *
 * Getrennt von der Darstellung, damit die einzige Entscheidung hier ohne React prüfbar
 * bleibt — dieselbe Aufteilung wie bei `antwortZuegeDaten.ts`.
 */
export interface ProfiZug {
  id: string
  label: string
  /** Was tatsächlich gesendet wird. */
  text: string
  titel: string
}

/** Form, Grundlage, Lücke, Haltung — vier Richtungen, die sich nicht überschneiden. */
export const PROFI_ZUEGE: ProfiZug[] = [
  {
    id: 'kuerzer',
    label: 'Kürzer',
    text: 'Fasse das in drei Sätzen zusammen – nur das, was für das nächste Gespräch zählt.',
    titel: 'Auf das Nötige gebracht',
  },
  {
    id: 'belege',
    label: 'Womit belegt?',
    text: 'Worauf stützt sich das genau? Nenne die konkreten Szenen, Dokumente oder '
        + 'Erkenntnisse mit Nummer und Titel – und sag ausdrücklich, wo du über das '
        + 'freigegebene Material hinausgehst.',
    titel: 'Die Grundlage jeder Aussage sichtbar machen',
  },
  {
    id: 'luecke',
    label: 'Was fehlt?',
    text: 'Was fehlt im freigegebenen Material, um das beurteilen zu können? '
        + 'Nenne die Lücken, nicht die Antworten.',
    titel: 'Die Lücken im Material benennen',
  },
  {
    id: 'widerspruch',
    label: 'Widersprich dir',
    text: 'Argumentiere gegen deine eigene letzte Antwort. Welche andere Lesart passt '
        + 'genauso gut zum Material, und was spräche dafür?',
    titel: 'Echo sucht die Gegenthese zur eigenen Antwort',
  },
]

/** Dieselbe Schreibweise wie in `lib/belege` — hier nur zum Erkennen, nicht zum Verlinken. */
const BELEG = /\b(Szene|Dokument|Erkenntnis)\s+\d{1,3}\b/

/**
 * Steht diese Antwort auf konkretem Material?
 *
 * **Warum das eine eigene Auskunft verdient.** Für eine Fachperson ist der Unterschied
 * zwischen einer Beobachtung und einem Eindruck der ganze Unterschied. Eine Antwort ohne
 * einen einzigen Bezug kann trotzdem richtig sein — aber sie ist eine Deutung ohne Beleg,
 * und das sollte man sehen, ohne es prüfen zu müssen.
 *
 * Bewusst keine Warnung, sondern eine Feststellung: Es gibt gute Antworten ohne Beleg,
 * etwa auf eine allgemeine Fachfrage.
 */
export function hatBeleg(text: string): boolean {
  return BELEG.test(text)
}
