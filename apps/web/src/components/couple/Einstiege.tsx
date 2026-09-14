/**
 * Der Einstieg nach Absicht — die Landkarte des Raums, ganz oben.
 *
 * **Das Problem, das diese Karte löst.** Der Paarraum hat sechs Wege, etwas zu sagen, und
 * jeder hat einen guten eigenen Grund: Im privaten Faden hört nur Echo zu, beim ehrlichen
 * Mitteilen antwortet ausdrücklich niemand, eine Frage bekommt genau eine Antwort, ein
 * Gespräch findet gleichzeitig statt, eine Mediation zeitversetzt, und nach einem Streit
 * kommt erst einmal gar keine KI. Diese Unterschiede sind sorgfältig gezogen — sie standen
 * bisher nur in den Modulköpfen der Dienste. In der Oberfläche gab es sechs Reiter, die
 * alle „reden" heißen könnten.
 *
 * Wer abends um halb elf hereinkommt, weil es gerade schwierig ist, soll nicht raten
 * müssen. Deshalb steht hier nicht, wie die Werkzeuge heißen, sondern was gerade los ist —
 * und der Halbsatz darunter sagt, was dort mit dem Gesagten passiert. Genau dieser Halbsatz
 * ist die Auskunft, die sonst fehlt.
 *
 * **Warum sie immer sichtbar ist und nicht einklappbar.** Eine Karte, die man wegklickt,
 * ist genau dann weg, wenn man sie braucht — niemand sucht im Streit nach der Landkarte.
 * Stattdessen zwei Spalten, damit sie flach bleibt: sechs Zeilen sind drei Reihen hoch und
 * drängen den Zustand darunter nicht weg.
 *
 * **Reihenfolge ist Absicht:** dringend zuerst, dann das Bedachte, am Ende das für sich
 * allein. Wer in Not ist, liest nicht bis Zeile sechs.
 */
import { Link } from 'react-router-dom'

interface Weg {
  /** Was gerade los ist — in der Sprache der Person, nicht des Systems. */
  lage: string
  /** Was dort mit dem Gesagten passiert. Der eigentliche Unterschied. */
  folge: string
  pfad: string
  /** Hebt die Notfall-Zeile hervor, ohne sie laut zu machen. */
  dringend?: boolean
}

const WEGE: Weg[] = [
  {
    lage: 'Wir haben uns gerade gestritten',
    folge: 'Erst ankommen, ohne Formular. Dann sortieren.',
    pfad: '/streit',
    dringend: true,
  },
  {
    lage: 'Ich will etwas loswerden, ohne dass sofort geantwortet wird',
    folge: 'Eine Runde, in der niemand antwortet. Keine KI liest mit.',
    pfad: '/mitteilen',
  },
  {
    lage: 'Ich will etwas fragen',
    folge: 'Eine Frage, eine Antwort. Kein Hin und Her.',
    pfad: '/fragen',
  },
  {
    lage: 'Wir kommen bei einem Thema nicht weiter',
    folge: 'Beide Seiten, auf Wunsch auch vertraulich. Echo macht einen Vorschlag.',
    pfad: '/mediation',
  },
  {
    lage: 'Wir wollen uns zusammen hinsetzen',
    folge: 'Beide gleichzeitig da. Echo moderiert, wenn ihr es ruft.',
    pfad: '/gespraeche',
  },
  {
    lage: 'Ich will erst für mich sortieren',
    folge: 'Dein eigener Faden mit Echo. Die andere Person sieht ihn nie.',
    pfad: '/echo',
  },
]

export default function Einstiege({ coupleId }: { coupleId: string }) {
  return (
    <div className="card">
      <h2 className="card-title">Was ist gerade?</h2>
      <p className="mt-0.5 text-xs text-brand-muted">
        Sechs Wege, und sie tun verschiedene Dinge. Such dir den, der zu jetzt passt.
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {WEGE.map(weg => (
          <Link
            key={weg.pfad}
            to={`/app/paar/${coupleId}${weg.pfad}`}
            className={`group block rounded-brand border px-3.5 py-2.5 no-underline transition hover:border-accent/50 hover:bg-accent/[0.03] ${
              weg.dringend ? 'border-accent/40' : 'border-brand-border'
            }`}
          >
            <p className="text-sm font-semibold leading-snug text-navy">
              {weg.lage}
              <span
                aria-hidden="true"
                className="ml-1 inline-block text-accent opacity-0 transition group-hover:opacity-100"
              >
                →
              </span>
            </p>
            <p className="mt-1 text-[0.74rem] leading-snug text-brand-muted">{weg.folge}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
