/**
 * Was beim ersten Betreten des Paarraums geklärt sein sollte.
 *
 * **Vorher eine Karte, jetzt hinter dem Fragezeichen.** Fünf Regeln liest man einmal und
 * danach nie wieder – als dauerhafte Karte oben im Raum haben sie jeden Tag Platz gekostet
 * und wurden trotzdem überblättert. Jetzt hängen sie am Fragezeichen neben dem Raumnamen:
 * sichtbar, wo man sie sucht, und stumm, solange man sie nicht braucht.
 *
 * Nichts wird mehr weggeklickt und nichts gemerkt – es gibt keinen Zustand, in dem die
 * Regeln unerreichbar wären.
 */

const RULES = [
  {
    title: 'Ihr redet miteinander, nicht mit Echo',
    text: 'Echo hält den Rahmen: erinnert ans Ziel, sorgt für faire Redeanteile, fragt nach. Die eigentliche Arbeit macht ihr.',
  },
  {
    title: 'Ein Gespräch, ein Thema',
    text: 'Nehmt euch nicht alles auf einmal vor. Ein kleines Thema, das ihr zu Ende bringt, bringt mehr als fünf angefangene.',
  },
  {
    title: 'Erst spiegeln, dann antworten',
    text: 'Sag in eigenen Worten, was angekommen ist, bevor du erwiderst. Das entschärft mehr als jedes Argument.',
  },
  {
    title: 'Pause ist erlaubt',
    text: 'Wenn es zu viel wird, drückt auf Pause. Weitermachen, wenn es hochkocht, hilft niemandem.',
  },
  {
    title: 'Kein Ersatz für Therapie',
    text: 'EchoB ist ein Werkzeug, keine Behandlung. Echo stellt keine Diagnosen und spricht keine Schuld zu.',
  },
]

/** Die fünf Regeln als Inhalt für das Fragezeichen. */
export default function CoupleOnboarding() {
  return (
    <>
      <p className="text-sm leading-relaxed text-brand-muted">
        Fünf Dinge, die euch das leichter machen:
      </p>
      <ul className="mt-2.5 space-y-2">
        {RULES.map(r => (
          <li key={r.title} className="text-sm leading-relaxed">
            <span className="font-medium text-navy">{r.title}.</span>{' '}
            <span className="text-brand-muted">{r.text}</span>
          </li>
        ))}
      </ul>
    </>
  )
}
