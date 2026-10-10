/**
 * Darf Echo die Selbsttests mitlesen? — einmal gefragt, jederzeit änderbar.
 *
 * **Warum gefragt und nicht einfach eingeschaltet.** Von Juli bis Oktober 2026 stand unter
 * jedem gespeicherten Ergebnis: „Sie fließen nicht in Echos Kontext ein." Wer in dieser Zeit
 * einen Test gemacht hat, hat ihn im Vertrauen darauf abgelegt. Solange niemand gefragt
 * wurde, liest Echo deshalb nicht mit (Server: `user_profiles.echo_selbsttests`, zz_149).
 *
 * Zwei Formen, ein Zustand:
 * - `frage` erscheint nur, solange nie entschieden wurde und es Ergebnisse gibt — im
 *   Echo-Dialog und direkt nach einem Test, also dort, wo die Frage einen Anlass hat.
 * - `schalter` steht dauerhaft auf der Fall-Übersicht, bei den Ergebnissen selbst. Dort
 *   nimmt man eine Entscheidung zurück.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { testResultsApi } from '@/api/testResults'
import Fehlermeldung from '@/components/Fehlermeldung'

export const SELBSTTEST_ECHO_KEY = ['test-results-echo'] as const

export default function SelbsttestMitlesen({ form }: { form: 'frage' | 'schalter' }) {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: SELBSTTEST_ECHO_KEY,
    queryFn: () => testResultsApi.echoStand(),
    retry: false,
    // Bei jedem Erscheinen frisch: Direkt nach einem neuen Test stuende sonst noch die
    // alte Zahl (0) im Speicher, und die Frage bliebe gerade dort aus, wo sie hingehoert.
    staleTime: 0,
  })
  const setzen = useMutation({
    mutationFn: (mitlesen: boolean) => testResultsApi.echoSetzen(mitlesen),
    onSuccess: (stand) => {
      qc.setQueryData(SELBSTTEST_ECHO_KEY, stand)
      // Das Band zählt nur, was wirklich mitgeht - nach der Entscheidung neu zählen.
      qc.invalidateQueries({ queryKey: ['echo-kontext'] })
    },
  })

  if (!data || data.anzahl === 0) return null

  if (form === 'frage') {
    if (data.mitlesen !== null) return null
    const n = data.anzahl
    return (
      <div className="rounded-brand border border-accent/30 bg-accent/[0.05] px-3.5 py-3">
        <p className="text-xs font-semibold text-navy">
          Soll Echo deine {n === 1 ? 'Selbsttest-Ergebnis' : `${n} Selbsttest-Ergebnisse`} kennen?
        </p>
        <p className="mt-1 text-[0.72rem] leading-relaxed text-brand-muted">
          Dann kann Echo im Gespräch daran anknüpfen – und geht dafür, wie mit allem anderen,
          was Echo liest, an das Sprachmodell. Ergebnisse hängen an deinem Konto, nicht an
          einem Fall; Echo fragt nach, worauf sich ein Test bezog. Du kannst das jederzeit
          in der Fall-Übersicht wieder ändern.
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button type="button" className="btn-primary !px-3.5 !py-1.5 !text-xs"
            disabled={setzen.isPending} onClick={() => setzen.mutate(true)}>
            Ja, Echo darf mitlesen
          </button>
          <button type="button" className="btn-outline !px-3.5 !py-1.5 !text-xs"
            disabled={setzen.isPending} onClick={() => setzen.mutate(false)}>
            Nein, lieber nicht
          </button>
        </div>
        <Fehlermeldung error={setzen.error} />
      </div>
    )
  }

  const an = data.mitlesen === true
  return (
    <div className="flex items-start justify-between gap-3 rounded-brand border border-brand-border bg-white px-3.5 py-2.5">
      <p className="text-[0.72rem] leading-relaxed text-brand-muted">
        <span className="font-semibold text-navy">
          {an ? 'Echo liest deine Ergebnisse mit.' : 'Echo liest deine Ergebnisse nicht mit.'}
        </span>{' '}
        {an
          ? 'Im Gespräch kann Echo daran anknüpfen; einzelne Gespräche kannst du unter „Echo denkt mit“ auch ohne sie führen.'
          : 'Schaltest du es ein, kann Echo im Gespräch daran anknüpfen. Die Ergebnisse gehen dann wie alles, was Echo liest, an das Sprachmodell.'}
      </p>
      <button
        type="button"
        role="switch"
        aria-checked={an}
        aria-label="Echo darf meine Selbsttest-Ergebnisse mitlesen"
        disabled={setzen.isPending}
        onClick={() => setzen.mutate(!an)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${an ? 'bg-accent' : 'bg-brand-border'}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${an ? 'left-[1.125rem]' : 'left-0.5'}`} />
      </button>
      <Fehlermeldung error={setzen.error} />
    </div>
  )
}
