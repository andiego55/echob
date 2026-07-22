import type { TestResult } from '@/selftests'

/** Kompakte, schreibgeschützte Darstellung eines Testergebnisses (Übersicht + Fachperson). */
const TONE: Record<'good' | 'mid' | 'watch' | 'alert', { bar: string; chip: string }> = {
  good: { bar: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-800' },
  mid: { bar: 'bg-amber-400', chip: 'bg-amber-100 text-amber-800' },
  watch: { bar: 'bg-orange-500', chip: 'bg-orange-100 text-orange-800' },
  alert: { bar: 'bg-red-500', chip: 'bg-red-100 text-red-700' },
}

export default function SavedTestResultView({ result }: { result: TestResult }) {
  const flags = result.flags ?? []
  return (
    <div className="space-y-3">
      {result.mode === 'dimensional' && result.overall && (
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-brand-border text-sm font-bold tabular-nums text-navy">
            {result.overall.score}
          </span>
          <div>
            {result.overall.band && (
              <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONE[result.overall.band.tone].chip}`}>
                {result.overall.band.label}
              </span>
            )}
            <p className="text-[11px] text-brand-muted">Gesamtwert {result.overall.score}/100</p>
          </div>
        </div>
      )}
      {result.mode === 'typology' && result.primary && (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-accent">Ergebnis-Typ</p>
          <p className="text-sm font-bold text-navy">{result.primary.name}</p>
        </div>
      )}

      {flags.length > 0 && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-1.5">
          <p className="text-[11px] font-semibold text-red-700">Kritische Angaben: {flags.join(', ')}</p>
        </div>
      )}

      <div className="space-y-2">
        {result.dimensions.map((d) => {
          const tone = d.band ? TONE[d.band.tone] : TONE.mid
          const isTypology = result.mode === 'typology'
          const barColor = isTypology ? (d.key === result.primary?.key ? 'bg-accent' : 'bg-brand-blue') : tone.bar
          return (
            <div key={d.key}>
              <div className="mb-0.5 flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-navy">{d.name}</span>
                <span className="flex items-center gap-1.5">
                  {d.band && <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${tone.chip}`}>{d.band.label}</span>}
                  <span className="text-[11px] tabular-nums text-brand-muted">{d.score}{isTypology ? '%' : ''}</span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-brand-border/60">
                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${d.score}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      {result.freeText?.length > 0 && (
        <div className="space-y-1.5 border-t border-brand-border pt-2">
          {result.freeText.map((ft, i) => (
            <div key={i}>
              <p className="text-[11px] font-medium text-navy">{ft.question}</p>
              <p className="text-[11px] italic leading-snug text-brand-muted">„{ft.answer}"</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
