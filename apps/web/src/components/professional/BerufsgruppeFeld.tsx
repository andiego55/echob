/**
 * Die Berufsgruppe der Fachperson — und was rechtlich daran hängt.
 *
 * **Warum das keine Beschriftung ist.** An der Berufsgruppe entscheidet sich, ob § 203 StGB
 * gilt: Psychotherapeut:innen und Berufspsycholog:innen unterliegen der strafbewehrten
 * Schweigepflicht, Coaches und Berater:innen nicht. Daran hängen unterschiedliche
 * Vertragsbausteine — deshalb kommt die Liste vom Server und steht nicht im Formular.
 *
 * **Drei Zustände, nicht zwei.** `unterliegt_203` kann `true`, `false` oder `null` sein.
 * `null` heißt „nicht abschließend geklärt" — der Fall der Heilpraktiker:innen für
 * Psychotherapie, die eine staatliche Erlaubnis brauchen, aber keine staatlich geregelte
 * Ausbildung. Eine offene Frage als beantwortet darzustellen wäre schlimmer als sie offen
 * zu zeigen, deshalb bekommt sie hier eine eigene Farbe und einen eigenen Satz.
 *
 * **Warum die Angabe freiwillig bleibt.** Bestandskonten haben sie nicht, und wer ein Konto
 * bereitstellt, kennt sie nicht. Eine erfundene Voreinstellung wäre eine Behauptung über
 * jemandes Beruf — die fehlende Angabe ist ehrlicher und nachholbar.
 */
import { useQuery } from '@tanstack/react-query'
import { professionalApi } from '@/api/professional'

export default function BerufsgruppeFeld({ wert, onAendern, disabled }: {
  wert: string | null | undefined
  onAendern: (gruppe: string | null) => void
  disabled?: boolean
}) {
  const { data: gruppen = [] } = useQuery({
    queryKey: ['berufsgruppen'],
    queryFn: professionalApi.berufsgruppen,
    staleTime: Infinity,
    retry: false,
  })

  const gewaehlt = gruppen.find(g => g.id === wert)

  return (
    <div>
      <label htmlFor="berufsgruppe" className="mb-1.5 block text-sm font-medium text-brand-text">
        Berufsgruppe
      </label>
      <select
        id="berufsgruppe"
        value={wert ?? ''}
        disabled={disabled || gruppen.length === 0}
        onChange={e => onAendern(e.target.value || null)}
        className="w-full rounded-brand border border-brand-border bg-white px-4 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-50"
      >
        <option value="">Bitte wählen …</option>
        {gruppen.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
      </select>

      {gewaehlt ? (
        <p className={`mt-2 text-xs leading-relaxed ${
          gewaehlt.unterliegt_203 === true ? 'text-amber-800'
            : gewaehlt.unterliegt_203 === null ? 'text-brand-muted'
              : 'text-brand-muted'
        }`}>
          {gewaehlt.unterliegt_203 === true && (
            <><strong>Schweigepflicht nach § 203 StGB.</strong>{' '}</>
          )}
          {gewaehlt.unterliegt_203 === null && (
            <><strong>Nicht abschließend geklärt.</strong>{' '}</>
          )}
          {gewaehlt.begruendung}
        </p>
      ) : (
        <p className="mt-2 text-xs leading-relaxed text-brand-muted">
          An der Berufsgruppe hängt, welche Vereinbarungen für die Zusammenarbeit nötig sind —
          insbesondere, ob die strafbewehrte Schweigepflicht nach § 203 StGB gilt.
        </p>
      )}
    </div>
  )
}
