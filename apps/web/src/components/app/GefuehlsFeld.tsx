/**
 * Das Feld — zwei Achsen, ein Punkt, ein Name.
 *
 * **Warum das hier steht und keine zwei Regler.** Zwei getrennte Schieber fragen nacheinander
 * nach zwei Zahlen. Ein Feld fragt nach einem Ort, und ein Ort hat einen Namen: Wer den Punkt
 * nach links oben zieht, liest „angespannt, aufgebracht" — und für manche ist genau das die
 * erste Unterscheidung, die sie treffen können. *Ich bin nicht traurig, ich bin angespannt.*
 * Der Name ist nicht die Zierde der Interaktion, er ist ihr Ergebnis.
 *
 * Die Achsen sind nicht ausgedacht: angenehm/unangenehm mal ruhig/aufgewühlt spannen den
 * emotionalen Grundzustand auf. Zwei Zahlen, aus denen sich kein Urteil ableiten lässt, aber
 * eine Richtung.
 *
 * **Bedienbar ohne Maus.** Mit Tab erreichbar, mit den Pfeiltasten in Fünferschritten
 * verschiebbar. Ein Werkzeug für Menschen, denen es schlecht geht, darf nicht daran scheitern,
 * dass jemand gerade kein Zeigegerät benutzt.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

const MITTE = 50

export default function GefuehlsFeld({
  valenz, aktivierung, ecke, onChange, achsen,
}: {
  valenz: number | undefined
  aktivierung: number | undefined
  ecke: string | null
  onChange: (valenz: number, aktivierung: number) => void
  achsen: { key: string; label: string; links: string; rechts: string }[]
}) {
  const flaeche = useRef<HTMLDivElement>(null)
  const [zieht, setZieht] = useState(false)

  const gesetzt = valenz !== undefined && aktivierung !== undefined
  const x = valenz ?? MITTE
  const y = aktivierung ?? MITTE

  const vAchse = achsen.find(a => a.key === 'valenz')
  const aAchse = achsen.find(a => a.key === 'aktivierung')

  // Der zuletzt ausgegebene Ort, unabhaengig vom Render.
  //
  // **Warum das noetig ist — ein Fehler, den erst das Ausprobieren gezeigt hat.** Drei
  // schnell nacheinander gedrueckte Pfeiltasten feuern, bevor React ein einziges Mal neu
  // rendert. Alle drei lasen dieselben Prop-Werte, rechneten von dort ihren Schritt und
  // riefen `onChange` — der letzte gewann, die ersten beiden waren weg. Gemessen: zweimal
  // links und einmal hoch bewegte den Punkt nur nach oben.
  //
  // Mit der Referenz baut jeder Schritt auf dem vorherigen auf, auch innerhalb eines
  // Durchlaufs. Der Effekt zieht sie nach, wenn die Werte von aussen kommen.
  const letzte = useRef({ x, y })
  useEffect(() => { letzte.current = { x, y } }, [x, y])

  const ausPosition = useCallback((clientX: number, clientY: number) => {
    const kasten = flaeche.current?.getBoundingClientRect()
    if (!kasten) return
    const nx = Math.round(((clientX - kasten.left) / kasten.width) * 100)
    // Oben = aufgewuehlt: Der Bildschirm laeuft nach unten, die Aktivierung nach oben.
    const ny = Math.round(((kasten.bottom - clientY) / kasten.height) * 100)
    const gx = Math.max(0, Math.min(100, nx))
    const gy = Math.max(0, Math.min(100, ny))
    letzte.current = { x: gx, y: gy }
    onChange(gx, gy)
  }, [onChange])

  function taste(e: React.KeyboardEvent) {
    const schritt = e.shiftKey ? 1 : 5
    const bewegung: Record<string, [number, number]> = {
      ArrowLeft: [-schritt, 0], ArrowRight: [schritt, 0],
      ArrowUp: [0, schritt], ArrowDown: [0, -schritt],
    }
    const b = bewegung[e.key]
    if (!b) return
    e.preventDefault()
    const nx = Math.max(0, Math.min(100, letzte.current.x + b[0]))
    const ny = Math.max(0, Math.min(100, letzte.current.y + b[1]))
    letzte.current = { x: nx, y: ny }
    onChange(nx, ny)
  }

  return (
    <div>
      {/* Die Achsenenden mittig ueber und unter dem Feld. Linksbuendig sahen sie aus wie
          Ueberschriften des linken Viertels statt wie das Ende einer Achse. */}
      <p className="pl-8 pr-8 text-center text-[0.72rem] font-bold uppercase tracking-[0.1em] text-brand-muted">
        {aAchse?.rechts ?? 'aufgewühlt'}
      </p>

      <div className="mt-2 flex items-stretch gap-3">
        <p className="flex w-5 shrink-0 items-center justify-center text-[0.72rem] font-bold uppercase tracking-[0.1em] text-brand-muted [writing-mode:vertical-rl] rotate-180">
          {vAchse?.links ?? 'unangenehm'}
        </p>

        <div
          ref={flaeche}
          role="application"
          tabIndex={0}
          aria-label={
            `${vAchse?.label ?? ''} und ${aAchse?.label ?? ''}. `
            + (gesetzt
              ? `Aktuell ${ecke}. Mit den Pfeiltasten verschieben.`
              : 'Noch nicht gesetzt. Tippe ins Feld oder nutze die Pfeiltasten.')
          }
          onKeyDown={taste}
          onPointerDown={e => {
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId)
            setZieht(true)
            ausPosition(e.clientX, e.clientY)
          }}
          onPointerMove={e => { if (zieht) ausPosition(e.clientX, e.clientY) }}
          onPointerUp={() => setZieht(false)}
          onPointerCancel={() => setZieht(false)}
          className="relative aspect-square flex-1 cursor-crosshair touch-none select-none rounded-brand-lg border border-brand-border bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {/* Die vier Viertel, sehr zurueckhaltend: Sie sollen den Raum gliedern, nicht
              den Punkt uebertoenen. */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-brand-lg">
            {/* Links kuehl, rechts warm; oben kraeftiger als unten. Deutlich genug, dass
                man vier Bereiche sieht, zurueckhaltend genug, dass der Punkt fuehrt. */}
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
              <div className="bg-navy/[0.10]" />
              <div className="bg-accent/[0.12]" />
              <div className="bg-navy/[0.05]" />
              <div className="bg-accent/[0.06]" />
            </div>
            <div className="absolute inset-x-0 top-1/2 h-px bg-brand-border" />
            <div className="absolute inset-y-0 left-1/2 w-px bg-brand-border" />
          </div>

          {/* Der Punkt. Vor dem ersten Setzen blass in der Mitte - er zeigt, dass es hier
              etwas zu tun gibt, ohne eine Angabe vorzutaeuschen, die niemand gemacht hat. */}
          <div
            className={[
              'pointer-events-none absolute -translate-x-1/2 translate-y-1/2 rounded-full',
              zieht ? '' : 'transition-all duration-150 motion-reduce:transition-none',
              gesetzt
                ? 'h-6 w-6 bg-accent shadow-[0_2px_10px_rgba(224,123,84,0.5)] ring-4 ring-accent/20'
                : 'h-5 w-5 border-2 border-dashed border-brand-muted/60 bg-white',
            ].join(' ')}
            style={{ left: `${x}%`, bottom: `${y}%` }}
          />

          {!gesetzt && (
            <p className="pointer-events-none absolute inset-x-0 bottom-5 text-center text-[0.78rem] text-brand-muted">
              Tipp hin, wo du gerade bist
            </p>
          )}
        </div>

        <p className="flex w-5 shrink-0 items-center justify-center text-[0.72rem] font-bold uppercase tracking-[0.1em] text-brand-muted [writing-mode:vertical-rl]">
          {vAchse?.rechts ?? 'angenehm'}
        </p>
      </div>

      <p className="mt-2 pl-8 pr-8 text-center text-[0.72rem] font-bold uppercase tracking-[0.1em] text-brand-muted">
        {aAchse?.links ?? 'ruhig'}
      </p>

      {/* Der Eckenname UNTER dem Feld, nicht daneben.
          Oben rechts stand er optisch ueber dem Viertel „lebendig, aufgedreht" und las sich
          wie dessen Beschriftung - auch wenn er gerade „angespannt, aufgebracht" sagte. Hier
          unten gehoert er sichtbar zum Ganzen und zum Punkt, nicht zu einem Viertel. */}
      <p
        className="mt-4 min-h-[1.6rem] text-center text-[1rem] font-semibold text-accent"
        aria-live="polite"
      >
        {gesetzt ? ecke : ''}
      </p>
    </div>
  )
}
