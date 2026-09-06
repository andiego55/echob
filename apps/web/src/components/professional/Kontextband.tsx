/**
 * Was Echo bei diesem Fall sieht — und was nicht.
 *
 * **Der zweite Teil ist der wichtigere.** Eine Antwort, die auf einer Lücke steht, ist
 * gefährlicher als keine Antwort: Echo sagt zwar, wenn eine Information nicht im
 * freigegebenen Material steht — aber es kann nicht sagen, dass eine ganze Kategorie
 * fehlt, von der es nie erfahren hat. Wer nicht weiß, dass die Skalen nicht freigegeben
 * sind, hält eine Einschätzung ohne sie für eine Einschätzung mit ihnen.
 *
 * **Warum es hier steht und nicht in der Fallansicht.** Dort steht es bereits, als Liste
 * der Freigaben. Aber es zählt im Moment des Lesens einer Antwort, nicht zwei Klicks
 * entfernt.
 */
import { SHARE_ELEMENT_LABELS, type SharedCaseBundle, type ShareElementType } from '@/types'

/**
 * Die Kategorien in der Reihenfolge, in der sie für die Arbeit zählen.
 *
 * `scene` (einzelne Szenen) fehlt bewusst: Es ist keine eigene Kategorie, sondern die
 * schmalere Fassung von `all_scenes`, und zwei Zeilen über dasselbe verwirren mehr, als
 * sie nützen.
 */
const REIHENFOLGE: ShareElementType[] = [
  'all_scenes', 'documents', 'artifacts', 'reports', 'scales',
  'hypotheses', 'topic_summaries', 'test_results',
  'onboarding', 'self_profile', 'person_profile', 'case_info',
]

/** Wie viele Einträge stecken dahinter? `null`, wo Zählen nichts aussagt. */
function anzahl(b: SharedCaseBundle, et: ShareElementType): number | null {
  switch (et) {
    case 'all_scenes':      return b.scenes.length
    case 'documents':       return b.documents?.length ?? 0
    case 'artifacts':       return b.artifacts?.length ?? 0
    case 'reports':         return b.reports.length
    case 'scales':          return b.scales.length
    case 'hypotheses':      return b.hypotheses.length
    case 'topic_summaries': return b.topic_summaries.length
    case 'test_results':    return b.test_results.length
    default:                return null
  }
}

/**
 * Was ist freigegeben, was nicht.
 *
 * Steht getrennt, weil hier die einzige Entscheidung dieser Ecke fällt — und ein Fehler
 * darin ist teuer: Eine Kategorie fälschlich als „nicht freigegeben" zu melden, lässt eine
 * Fachperson eine Lücke vermuten, die es nicht gibt. Der Fall, der das leicht kaputt
 * macht, ist `scene`: Einzelne freigegebene Szenen sind dieselbe Kategorie wie
 * `all_scenes` und dürfen nicht als Fehlstelle erscheinen.
 */
export function aufteilen(allowed: ShareElementType[]): {
  da: ShareElementType[]
  fehlt: ShareElementType[]
} {
  const hat = (et: ShareElementType) =>
    allowed.includes(et) || (et === 'all_scenes' && allowed.includes('scene'))
  return {
    da: REIHENFOLGE.filter(hat),
    fehlt: REIHENFOLGE.filter(et => !hat(et)),
  }
}

export default function Kontextband({ bundle }: { bundle: SharedCaseBundle | undefined }) {
  if (!bundle) return null

  const { da, fehlt } = aufteilen(bundle.allowed)

  return (
    <div className="mb-3 rounded-brand border border-brand-border bg-white px-3.5 py-2.5">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1.5">
        <span className="text-[0.68rem] font-semibold uppercase tracking-wide text-brand-muted">
          Echo sieht
        </span>
        {da.length === 0 && <span className="text-xs text-brand-muted">nichts – keine Freigabe.</span>}
        {da.map(et => {
          const n = anzahl(bundle, et)
          return (
            <span key={et} className="rounded-full bg-accent/10 px-2 py-0.5 text-[0.7rem] text-accent">
              {SHARE_ELEMENT_LABELS[et]}{n !== null && <span className="ml-1 opacity-70">{n}</span>}
            </span>
          )
        })}
      </div>

      {fehlt.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-brand-border pt-1.5">
          <span className="text-[0.68rem] font-semibold uppercase tracking-wide text-brand-muted/70">
            nicht freigegeben
          </span>
          {fehlt.map(et => (
            <span key={et} className="text-[0.7rem] text-brand-muted/80">
              {SHARE_ELEMENT_LABELS[et]}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
