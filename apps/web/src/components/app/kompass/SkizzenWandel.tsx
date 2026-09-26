/**
 * „Das hast du damals anders gesehen" — der Unterschied zwischen zwei Skizzen.
 *
 * **Warum das der Lohn für den blinden Weg ist.** Jemand hat gerade eine Skizze noch einmal
 * gemacht, ohne die alte zu sehen. In diesem Moment ist er neugierig — und genau jetzt
 * bekommt er die Auskunft, die er sich selbst nicht geben kann: nicht, was er sich wünscht,
 * sondern **was mit ihm passiert ist**.
 *
 * **Kein Prozentwert, keine Note, keine Richtung „besser".** Wer seine Wunschbeziehung
 * skizziert und dann „63 % Übereinstimmung mit früher" liest, hat sich eine Waffe gebaut.
 * Hier steht, was sich bewegt hat; die Bewertung bleibt bei der Person.
 *
 * **Und die Reihenfolge der Abschnitte ist eine Entscheidung.** Zuerst der Satz über das
 * Ganze, dann was NEU ist, dann was weggefallen ist. Umgekehrt läse man zuerst eine Liste
 * von Verlusten — und jeder weggefallene Wunsch sieht aus wie etwas, das man aufgegeben hat,
 * obwohl er oft etwas ist, das man nicht mehr braucht.
 */
import { wandel, wandelSatz } from '@/lib/skizzenwandel'
import type { IdealAbwaegung, SkizzenInhalt } from '@/api/kompassIdeal'
import { altersWort } from '@/lib/kompass'

export default function SkizzenWandel({ vorher, jetzt, vorherAt, paare }: {
  vorher: SkizzenInhalt | null
  jetzt: SkizzenInhalt | null
  vorherAt: string | null
  paare: IdealAbwaegung[]
}) {
  const w = wandel(vorher, jetzt, paare)
  const damals = vorherAt ? altersWort(vorherAt) : null

  return (
    <section className="rounded-brand-lg border border-accent/40 bg-accent/[0.04] p-6">
      <span className="label">
        {damals ? `Verglichen mit ${damals}` : 'Verglichen mit vorher'}
      </span>
      <h2 className="mt-1 text-[1.2rem] font-bold leading-snug text-navy">
        Was sich bewegt hat
      </h2>
      <p className="mt-2 max-w-[62ch] text-[0.95rem] leading-relaxed text-brand-text">
        {wandelSatz(w)}
      </p>

      {!w.ruhig && (
        <div className="mt-5 space-y-4">
          <Gruppe titel="Neu dazugekommen" ton="neu" punkte={w.neu.map(x => x.label)} />
          <Gruppe titel="Steht nicht mehr da" ton="weg" punkte={w.weg.map(x => x.label)}
            fussnote="Nicht jeder weggefallene Wunsch ist ein Verlust. Manche braucht man nicht mehr." />

          {w.gewandert.length > 0 && (
            <Block titel="In der Reihenfolge verschoben">
              {w.gewandert.map(x => (
                <li key={x.key} className="flex items-baseline gap-2">
                  <Pfeil hoch={x.jetzt < x.vorher} />
                  <span className="min-w-0">
                    <span className="font-medium text-navy">{x.label}</span>
                    <span className="text-brand-muted">
                      {' '}— von Platz {x.vorher} auf Platz {x.jetzt}
                    </span>
                  </span>
                </li>
              ))}
            </Block>
          )}

          {w.gewicht.length > 0 && (
            <Block titel="Anders gewichtet">
              {w.gewicht.map(x => (
                <li key={x.key} className="flex items-baseline gap-2">
                  <Pfeil hoch={x.jetzt > x.vorher} />
                  <span className="min-w-0">
                    <span className="font-medium text-navy">{x.label}</span>
                    <span className="text-brand-muted">
                      {' '}— davon willst du heute{' '}
                      {x.jetzt > x.vorher ? 'deutlich mehr' : 'deutlich weniger'}
                    </span>
                  </span>
                </li>
              ))}
            </Block>
          )}

          {w.gedreht.length > 0 && (
            <Block titel="Abwägungen, die gekippt sind">
              {w.gedreht.map(x => (
                <li key={x.key} className="leading-snug">
                  <span className="text-brand-muted line-through decoration-brand-muted/50">
                    {x.vorher}
                  </span>
                  <span className="mx-2 text-brand-muted">→</span>
                  <span className="font-medium text-navy">{x.jetzt}</span>
                </li>
              ))}
            </Block>
          )}

          {w.eigenes !== 'gleich' && (
            <Block titel="Deine eigenen Worte">
              <li className="leading-snug text-brand-text">
                {w.eigenes === 'neu' ? 'Damals hast du nichts dazu geschrieben, heute schon.'
                  : w.eigenes === 'weg' ? 'Damals stand hier ein eigener Satz, heute nicht mehr.'
                  : 'Du hast es heute anders formuliert als damals.'}
              </li>
            </Block>
          )}
        </div>
      )}
    </section>
  )
}

function Gruppe({ titel, ton, punkte, fussnote }: {
  titel: string
  ton: 'neu' | 'weg'
  punkte: string[]
  fussnote?: string
}) {
  if (punkte.length === 0) return null
  return (
    <Block titel={titel} fussnote={fussnote}>
      {punkte.map(p => (
        <li key={p} className="flex items-baseline gap-2">
          <span
            className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
              ton === 'neu' ? 'bg-accent' : 'bg-brand-muted/50'
            }`}
            aria-hidden="true"
          />
          <span className={ton === 'neu' ? 'font-medium text-navy' : 'text-brand-muted'}>
            {p}
          </span>
        </li>
      ))}
    </Block>
  )
}

function Block({ titel, children, fussnote }: {
  titel: string
  children: React.ReactNode
  fussnote?: string
}) {
  return (
    <div>
      <h3 className="text-[0.78rem] font-semibold uppercase tracking-wider text-brand-muted">
        {titel}
      </h3>
      <ul className="mt-2 space-y-1.5 text-[0.9rem]">{children}</ul>
      {fussnote && (
        <p className="mt-2 text-[0.75rem] leading-snug text-brand-muted/90">{fussnote}</p>
      )}
    </div>
  )
}

/** Klein und grau: Die Richtung ist eine Auskunft, keine Bewertung. */
function Pfeil({ hoch }: { hoch: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
      strokeLinecap="round" strokeLinejoin="round"
      className="mt-1 h-3 w-3 shrink-0 text-brand-muted"
      aria-hidden="true"
    >
      <path d={hoch ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} />
    </svg>
  )
}
