/**
 * Was seit dem letzten Gespräch dazugekommen ist.
 *
 * **Warum das die nützlichste Frage zwischen zwei Terminen ist.** Eine Fachperson öffnet
 * diesen Chat selten, um bei null zu beginnen — sie war schon einmal hier und will
 * wissen, was sich seither bewegt hat. Diese Auskunft gab es bereits im Verlauf-Reiter,
 * zwei Klicks entfernt und ohne Bezug zum Gespräch.
 *
 * **Woher der Stichtag kommt.** Aus dem jüngsten Echo-Gespräch dieses Falls. Das ist
 * nicht dasselbe wie „zuletzt gesehen", aber es ist besser: Es markiert den Stand, auf
 * dem die letzte Einschätzung beruhte. Ohne ein früheres Gespräch gibt es nichts zu
 * vergleichen — dann erscheint das Band gar nicht.
 */
import { useQuery } from '@tanstack/react-query'
import { professionalApi } from '@/api/professional'

function datum(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'long' })
}

/** „2 Szenen, 1 Bericht" statt einer Aufzählung von acht Zeilen. */
function zusammenfassen(titel: string[]): string {
  const zaehler = new Map<string, number>()
  for (const t of titel) zaehler.set(t, (zaehler.get(t) ?? 0) + 1)
  return [...zaehler].map(([t, n]) => (n > 1 ? `${n}× ${t}` : t)).join(', ')
}

export default function NeuSeitBand({
  caseId, seit, onFragen, aus,
}: {
  caseId: string
  /** Stichtag — meist das jüngste Echo-Gespräch. `null`, wenn es keines gibt. */
  seit: string | null
  onFragen: (text: string) => void
  aus?: boolean
}) {
  const { data } = useQuery({
    queryKey: ['prof-neu-seit', caseId, seit],
    queryFn: () => professionalApi.caseNewShared(caseId, seit!),
    enabled: !!caseId && !!seit,
    staleTime: 60_000,
    retry: false,
  })

  const neue = (data?.items ?? []).filter(e => e.actor === 'client')
  if (!seit || neue.length === 0) return null

  return (
    <div className="mb-3 rounded-brand border border-accent/30 bg-accent/[0.05] px-3.5 py-2.5">
      <p className="text-sm text-brand-text">
        Seit deinem letzten Gespräch am {datum(seit)} ist dazugekommen:{' '}
        <b className="font-medium text-navy">{zusammenfassen(neue.map(e => e.title))}</b>.
      </p>
      <button
        onClick={() => onFragen(
          'Was ist seit meinem letzten Gespräch neu dazugekommen, und ändert es etwas an '
          + 'der bisherigen Einschätzung? Beziehe dich auf die konkreten Einträge.',
        )}
        disabled={aus}
        className="mt-1.5 rounded-full border border-accent px-2.5 py-1 text-[0.7rem] font-medium text-accent transition-colors hover:bg-accent/10 disabled:opacity-40"
      >
        Was heißt das?
      </button>
    </div>
  )
}
