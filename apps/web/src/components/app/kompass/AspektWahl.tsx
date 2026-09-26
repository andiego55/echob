/**
 * „Was zählt" — aus Familien heraus antippen, zweistufig.
 *
 * **Warum antippen und kein Textfeld.** Wer belastet ist, hat die Worte oft nicht; ein
 * leeres Feld liefe bei genau diesen Menschen leer. Dieselbe Bewegung wie im Gefühlsbild.
 *
 * **Warum zweistufig.** Fünfundzwanzig Aspekte nebeneinander sind eine Wand. Erst das
 * grobe Wort, dann die genaueren — und wer in einer Familie nichts findet, klappt sie zu,
 * ohne fünf Sätze gelesen zu haben.
 *
 * **Eine eigene Datei** (26.09.2026), weil es die Form an zwei Orten gibt: im ersten
 * Schritt der Skizze und an einer Szene („Was hättest du in dem Moment gebraucht?"). Dort
 * mit einer kleineren Obergrenze, sonst unverändert — eine zweite Kopie liefe auseinander,
 * und dann fühlten sich zwei Stellen verschieden an, die dasselbe tun.
 */
import { useState } from 'react'
import type { IdealAspektFamilie } from '@/api/kompassIdeal'

// ── Die Wahl ─────────────────────────────────────────────────────

export default function AspektWahl({ familien, gewaehlt, max, onWahl }: {
  familien: IdealAspektFamilie[]
  gewaehlt: { key: string; gewicht: number }[]
  max: number
  onWahl: (aspekte: { key: string; gewicht: number }[]) => void
}) {
  const [offen, setOffen] = useState<string | null>(familien[0]?.key ?? null)
  const keys = new Set(gewaehlt.map(a => a.key))

  const umschalten = (key: string) => {
    if (keys.has(key)) return onWahl(gewaehlt.filter(a => a.key !== key))
    if (gewaehlt.length >= max) return
    onWahl([...gewaehlt, { key, gewicht: 50 }])
  }

  const familie = familien.find(f => f.key === offen)

  return (
    <div>
      <p className="max-w-[60ch] text-[0.92rem] leading-relaxed text-brand-muted">
        Tipp erst das grobe Wort an — dann kommen die genaueren. Höchstens {max}: Wer alles
        anhakt, hat nichts gesagt, und das Auswählen ist hier die eigentliche Arbeit.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {familien.map(f => {
          const auf = offen === f.key
          const darin = f.aspekte.filter(a => keys.has(a.key)).length
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setOffen(auf ? null : f.key)}
              aria-expanded={auf}
              className={[
                'rounded-full border px-4 py-2 text-[0.9rem] font-medium transition-all',
                auf
                  ? 'border-navy bg-navy text-white'
                  : darin > 0
                    ? 'border-accent/50 bg-accent/[0.08] text-navy'
                    : 'border-brand-border bg-white text-brand-text hover:border-accent/50',
              ].join(' ')}
            >
              {f.label}
              {darin > 0 && <span className="ml-1.5 text-accent">·{darin}</span>}
            </button>
          )
        })}
      </div>

      {familie && (
        <div className="mt-4 rounded-brand border border-brand-border bg-brand-bg p-5">
          <p className="text-[0.8rem] text-brand-muted">{familie.hinweis}</p>
          <div className="mt-3 space-y-2">
            {familie.aspekte.map(a => {
              const an = keys.has(a.key)
              const gesperrt = !an && gewaehlt.length >= max
              return (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => umschalten(a.key)}
                  disabled={gesperrt}
                  aria-pressed={an}
                  className={[
                    'block w-full rounded-brand border px-3.5 py-2.5 text-left transition-all',
                    an
                      ? 'border-accent bg-accent text-white'
                      : 'border-brand-border bg-white hover:border-accent/60 disabled:opacity-40 disabled:hover:border-brand-border',
                  ].join(' ')}
                >
                  <span className="block text-sm font-medium leading-snug">{a.label}</span>
                  <span className={`mt-0.5 block text-[0.75rem] leading-snug ${
                    an ? 'text-white/80' : 'text-brand-muted'
                  }`}>
                    {a.hinweis}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <p className="mt-4 text-[0.78rem] text-brand-muted">
        {gewaehlt.length} von {max} gewählt
        {gewaehlt.length >= max && ' — nimm etwas weg, um Platz zu machen.'}
      </p>
    </div>
  )
}
