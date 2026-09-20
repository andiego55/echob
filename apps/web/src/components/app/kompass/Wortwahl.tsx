/**
 * Ein Wort dazu — vom groben zum genauen.
 *
 * **Warum zweistufig.** Sieben Familien mit je einer Handvoll Wörtern sind über vierzig
 * Knöpfe. Alle auf einmal sind eine Wand, vor der man wieder weggeht. Erst die Familie
 * antippen, dann die genaueren Wörter: Genau die Bewegung, um die es geht — wer
 * „erschöpft" wählt und dann „ausgelaugt, stumpf, kraftlos" liest, trifft beim zweiten
 * Mal genauer.
 *
 * **Dieselben Wörter wie im Gefühlsbild**, und zwar dieselbe Liste aus demselben Katalog
 * des Servers. Zwei Vokabulare für dasselbe wären die schlechteste aller Lösungen: Man
 * lernt beide halb.
 *
 * **Warum das hier nochmal steht und nicht aus dem Gefühlsbild geholt wird.** Dort ist es
 * ein Schritt in einem geführten Ablauf, mit eigenen Überschriften und Erklärtexten. Hier
 * liegt es hinter „mehr" und muss klein sein. Gemeinsam ist die Datenquelle — und die ist
 * der Teil, der auseinanderlaufen würde.
 */
import { useState } from 'react'
import type { GbWortFamilie } from '@/api/gefuehlsbild'

export default function Wortwahl({
  familien, gewaehlt, max = 5, onWahl,
}: {
  familien: GbWortFamilie[]
  gewaehlt: string[]
  max?: number
  onWahl: (worte: string[]) => void
}) {
  const [offen, setOffen] = useState<string | null>(null)

  function umschalten(key: string) {
    if (gewaehlt.includes(key)) return onWahl(gewaehlt.filter(g => g !== key))
    if (gewaehlt.length >= max) return
    onWahl([...gewaehlt, key])
  }

  const offeneFamilie = familien.find(f => f.key === offen)

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {familien.map(f => {
          const auf = offen === f.key
          const darin = f.worte.filter(w => gewaehlt.includes(w.key)).length
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setOffen(auf ? null : f.key)}
              aria-expanded={auf}
              className={[
                'rounded-full border px-3 py-1.5 text-[0.8rem] font-medium transition-all',
                auf
                  ? 'border-navy bg-navy text-white'
                  : darin > 0
                    ? 'border-accent/50 bg-accent/[0.08] text-navy'
                    : 'border-brand-border bg-white text-brand-text hover:border-accent/50',
              ].join(' ')}
            >
              {f.label}
              {darin > 0 && <span className="ml-1 text-accent">·{darin}</span>}
            </button>
          )
        })}
      </div>

      {offeneFamilie && (
        <div className="beitrag-neu mt-2.5 rounded-brand border border-brand-border bg-brand-bg p-3">
          <div className="flex flex-wrap gap-1.5">
            {offeneFamilie.worte.map(w => {
              const an = gewaehlt.includes(w.key)
              const gesperrt = !an && gewaehlt.length >= max
              return (
                <button
                  key={w.key}
                  type="button"
                  onClick={() => umschalten(w.key)}
                  disabled={gesperrt}
                  aria-pressed={an}
                  className={[
                    'rounded-brand-sm border px-3 py-1.5 text-[0.82rem] transition-all',
                    an
                      ? 'border-accent bg-accent text-white'
                      : 'border-brand-border bg-white text-brand-text hover:border-accent/60 disabled:opacity-40 disabled:hover:border-brand-border',
                  ].join(' ')}
                >
                  {w.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Die Grenze erst nennen, wenn sie erreicht ist. Vorher wäre sie eine Vorgabe
          („fünf sollen es sein"), die niemand gestellt hat. */}
      {gewaehlt.length >= max && (
        <p className="mt-2 text-[0.75rem] text-brand-muted">
          Mehr als {max} Wörter werden unscharf. Nimm eines weg, um ein anderes zu wählen.
        </p>
      )}
    </div>
  )
}
