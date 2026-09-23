/**
 * Was seit dem Anfang eines Vorhabens dazugekommen ist — Spuren statt Fortschritt.
 *
 * **Der Ersatz für den Balken, den es hier mal gab.** Der Bauplan sagt: „Ein Balken bei
 * 40 % wäre erfunden. Vier Pulse und eine Szene sind wahr — und sie überzeugen mehr,
 * weil man sie nachlesen kann."
 *
 * **Was hier nicht behauptet wird: dass diese Spuren von diesem Vorhaben handeln.** Das
 * wüsste nur ein Modell, und es wüsste es nicht sicher. Deshalb steht in der Überschrift
 * „Seitdem hast du festgehalten" und nicht „Das spricht dafür". Der Unterschied ist der
 * zwischen einem Beleg und einer Behauptung — und eine Zahl, die Zugehörigkeit
 * behauptet, wäre der Balken in anderer Form.
 *
 * **Warum es erst auf Klick lädt.** Es sind fünf Abfragen; sie für jede Karte einer
 * Liste mitzuladen, wäre teuer für etwas, das man für ein Vorhaben nach dem anderen
 * liest. Und es ist auch als Geste richtig: Die Spur ist etwas, das man ansieht, wenn
 * man wissen will — nicht etwas, das einen auf der Übersicht anspringt.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Fehlermeldung from '@/components/Fehlermeldung'
import { kompassApi, type SpurEreignis } from '@/api/kompass'
import { altersWort, zeitWort } from '@/lib/kompass'

/** Einzahl und Mehrzahl. „1 Momente" ist der Satz, an dem man merkt, dass niemand liest. */
const WORT: Record<string, [string, string]> = {
  puls: ['Moment festgehalten', 'Momente festgehalten'],
  satz: ['Satz über dich bestätigt', 'Sätze über dich bestätigt'],
  szene: ['Szene erfasst', 'Szenen erfasst'],
  portrait: ['Selbstporträt geschrieben', 'Selbstporträts geschrieben'],
}

export default function VorhabenBelege({ vorhabenId }: { vorhabenId: string }) {
  const [offen, setOffen] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['kompass-belege', vorhabenId],
    queryFn: () => kompassApi.vorhabenBelege(vorhabenId),
    enabled: offen,
  })

  if (!offen) {
    return (
      <button
        type="button"
        onClick={() => setOffen(true)}
        className="mt-3 text-[0.8rem] text-brand-muted underline underline-offset-2 transition-colors hover:text-navy"
      >
        Was war seitdem?
      </button>
    )
  }

  const zeilen = Object.entries(data?.zaehlung ?? {})
    .filter(([art]) => art in WORT)
    .map(([art, anzahl]) => {
      const [eins, viele] = WORT[art]
      return `${anzahl} ${anzahl === 1 ? eins : viele}`
    })

  return (
    <div className="beitrag-neu mt-3 rounded-brand-sm border border-brand-border/70 bg-brand-bg px-3 py-2.5">
      {error ? (
        <Fehlermeldung error={error} />
      ) : isLoading || !data ? (
        <p className="text-[0.82rem] text-brand-muted">Wird zusammengetragen …</p>
      ) : zeilen.length === 0 ? (
        // Kein Vorwurf, keine Aufforderung. Dass seit gestern nichts da ist, ist normal.
        <p className="text-[0.82rem] leading-relaxed text-brand-muted">
          Seit {altersWort(data.seit)} ist noch nichts dazugekommen. Das sagt nichts über
          das Vorhaben — nur über den Zeitraum.
        </p>
      ) : (
        <>
          <p className="text-[0.82rem] leading-relaxed text-brand-text">
            <span className="font-semibold">Seitdem hast du festgehalten:</span>{' '}
            {zeilen.join(' · ')}.
          </p>
          <p className="mt-1 text-[0.74rem] leading-relaxed text-brand-muted">
            Ob das zu diesem Vorhaben gehört, liest du selbst — hier steht nur, was da
            ist.
          </p>

          {data.ereignisse.length > 0 && (
            <ul className="mt-2 space-y-1">
              {data.ereignisse.slice(0, 5).map((e, i) => (
                <li key={`${e.art}-${e.am}-${i}`}>
                  <Zeile ereignis={e} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <button
        type="button"
        onClick={() => setOffen(false)}
        className="mt-2 text-[0.78rem] text-brand-muted transition-colors hover:text-navy"
      >
        Zuklappen
      </button>
    </div>
  )
}

function Zeile({ ereignis: e }: { ereignis: SpurEreignis }) {
  const text = (
    <>
      <span className="text-brand-muted">{zeitWort(e.am)}</span>
      {e.detail && <> · {e.art === 'satz' ? `„${e.detail}“` : e.detail}</>}
    </>
  )
  return e.ziel ? (
    <Link
      to={e.ziel}
      className="block truncate text-[0.78rem] leading-snug text-brand-text no-underline hover:text-accent"
    >
      {text}
    </Link>
  ) : (
    <span className="block truncate text-[0.78rem] leading-snug text-brand-text">{text}</span>
  )
}
