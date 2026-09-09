/**
 * „Weiterdenken" — zwei Schreibimpulse an einer wiedererkannten Szene.
 *
 * **Warum das nicht in „Deine Fassung" steht.** Die Fassung hat einen engen Zweck: das
 * eigene Ereignis so präzise aufschreiben, dass daraus eine Fall-Szene werden darf. Was
 * hier geschrieben wird, ist das Gegenteil — es bleibt ausdrücklich bei der erfundenen
 * Geschichte. Beides in einem Formular hieße, dass eine ausgedachte Verbesserung im
 * Bericht über ein reales Ereignis landet.
 *
 * **Die Gegenszene ist der einzige helle Ort im Produkt.** Alles andere fragt nach dem, was
 * belastet. Diese eine Frage fragt, wie es gut ausgegangen wäre — und für viele ist genau
 * das der schwierigere Teil, weil man es sich erst wieder vorstellen können muss. Die
 * Oberfläche darf das zeigen: heller Rahmen, kein Warnton, keine Skala.
 */
import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { resonanzApi, type ResonanzEintrag, type ResonanzUebung } from '@/api/resonanz'

export default function ResonanzWeiterdenken({
  eintrag, uebungen, onSchliessen,
}: {
  eintrag: ResonanzEintrag
  uebungen: ResonanzUebung[]
  onSchliessen: () => void
}) {
  const qc = useQueryClient()
  const [werte, setWerte] = useState<Record<string, string>>(() => ({ ...eintrag.uebungen }))
  const [fehler, setFehler] = useState<string | null>(null)
  const gesichert = useRef<Record<string, string>>({ ...eintrag.uebungen })

  const speichern = useMutation({
    mutationFn: (daten: Record<string, string>) =>
      resonanzApi.uebungenSpeichern(eintrag.scene_slug, daten),
    onSuccess: (frisch) => {
      gesichert.current = { ...frisch.uebungen }
      setFehler(null)
      qc.invalidateQueries({ queryKey: ['resonanz-ueberblick'] })
    },
    onError: () => setFehler('Konnte nicht gespeichert werden. Versuch es gleich noch einmal.'),
  })

  function feldFertig() {
    const geaendert = Object.keys({ ...werte, ...gesichert.current })
      .some(k => (werte[k] ?? '') !== (gesichert.current[k] ?? ''))
    if (geaendert && !speichern.isPending) speichern.mutate(werte)
  }

  return (
    <div className="mt-4 rounded-brand-lg border border-brand-border bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[1.15rem] font-bold text-navy">Weiterdenken</h3>
          <p className="mt-1 max-w-[58ch] text-[0.88rem] leading-relaxed text-brand-muted">
            Zwei Fragen, die bei der erfundenen Geschichte bleiben. Nichts davon wird eine
            Szene in deinem Fall — Echo liest es als das, was es ist: eine Vorstellung.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { feldFertig(); onSchliessen() }}
          className="shrink-0 text-[0.84rem] text-brand-muted hover:text-navy hover:underline"
        >
          Schließen
        </button>
      </div>

      <div className="mt-5 space-y-5">
        {uebungen.map(u => {
          const hell = u.ton === 'hell'
          return (
            <div
              key={u.key}
              className={hell
                ? 'rounded-brand border border-green-200 bg-green-50/60 p-5'
                : ''}
            >
              <label htmlFor={`u-${u.key}`} className="text-[0.95rem] font-semibold text-navy">
                {u.label}
              </label>
              <p className="mt-1 text-[0.8rem] leading-snug text-brand-muted">{u.hinweis}</p>
              <textarea
                id={`u-${u.key}`}
                value={werte[u.key] ?? ''}
                onChange={e => setWerte(w => ({ ...w, [u.key]: e.target.value }))}
                onBlur={feldFertig}
                rows={4}
                maxLength={1500}
                placeholder={u.platzhalter}
                className="mt-2 w-full rounded-brand border border-brand-border bg-white px-3.5 py-2.5 text-[0.92rem] leading-relaxed text-brand-text placeholder:text-brand-muted/60 focus:border-accent focus:outline-none"
              />
            </div>
          )
        })}
      </div>

      {fehler && <p className="mt-4 text-[0.86rem] text-red-600">{fehler}</p>}

      <p className="mt-5 border-t border-brand-border pt-4 text-[0.78rem] leading-relaxed text-brand-muted/80">
        {speichern.isPending ? 'Wird gesichert …' : 'Wird beim Weiterklicken gesichert.'}
        {' '}Was hier steht, gehört zur Geschichte — nicht zu deinem Fall.
      </p>
    </div>
  )
}
