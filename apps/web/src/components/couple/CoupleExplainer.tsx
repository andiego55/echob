import { useEffect, useRef, useState } from 'react'

/**
 * Erklär-Stage für das Paartherapie-Modul — dieselbe Mechanik wie auf der Startseite
 * (selbst abspielend ab Viewport, Pause bei Hover, Szenen anwählbar) und dieselben
 * CSS-Keyframes `explainer-up` / `explainer-float`.
 *
 * Bewusst als eigene Komponente statt als Variante des Landing-Sliders: Die Szenen sind
 * hier inhaltlich etwas anderes, und die Startseite bleibt unangetastet. Wenn ein dritter
 * Slider dazukommt, lohnt es sich, die Mechanik einmal herauszuziehen.
 */

const SCENE_MS = 4600

const fade = (delay = 0): React.CSSProperties => ({
  animation: 'explainer-up 0.6s ease-out both',
  animationDelay: `${delay}s`,
})

const SCENES: { kicker: string; visual: React.ReactNode }[] = [
  {
    kicker: 'Derselbe Streit, immer wieder – und keiner kommt an.',
    visual: (
      <div className="relative h-32 w-full max-w-md">
        {['„Du hörst mir nie zu."', '„Immer das Gleiche."', '„Ich sag ja nichts mehr."'].map((t, i) => (
          <span
            key={t}
            className="absolute whitespace-nowrap rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/80"
            style={{
              left: `${[4, 42, 16][i]}%`,
              top: `${[6, 40, 70][i]}%`,
              animation: `explainer-float ${3 + i * 0.6}s ease-in-out ${i * 0.3}s infinite`,
            }}
          >
            {t}
          </span>
        ))}
      </div>
    ),
  },
  {
    kicker: 'Ihr verbindet euch – ohne eure eigenen Notizen zu teilen.',
    visual: (
      <div className="flex items-center gap-4">
        {['Du', 'Ihr', 'Sie'].map((t, i) => (
          <div
            key={t}
            className={`grid place-items-center rounded-2xl border text-xs ${
              i === 1
                ? 'h-20 w-24 border-accent/60 bg-accent/15 font-semibold text-white'
                : 'h-16 w-20 border-white/20 bg-white/[0.06] text-white/70'
            }`}
            style={fade(i * 0.18)}
          >
            {i === 1 ? 'gemeinsamer\nRaum'.split('\n').map(z => <div key={z}>{z}</div>) : t}
          </div>
        ))}
      </div>
    ),
  },
  {
    kicker: 'Ihr bereitet vor: Stimmung, Wertschätzung, ein Anliegen.',
    visual: (
      <div className="flex w-full max-w-xs flex-col gap-2">
        {['Wie komme ich rein?', 'Was schätze ich an dir?', 'Worum geht es mir?'].map((t, i) => (
          <div
            key={t}
            className="rounded-lg border border-white/15 bg-white/[0.06] px-4 py-2.5 text-left text-xs text-white/85"
            style={fade(i * 0.15)}
          >
            {t}
          </div>
        ))}
      </div>
    ),
  },
  {
    kicker: 'Echo moderiert – allparteilich, für euch beide gleichzeitig.',
    visual: (
      <div className="flex w-full max-w-sm flex-col gap-2">
        <div className="self-start rounded-2xl rounded-bl-sm bg-white/[0.08] px-3.5 py-2 text-xs text-white/85" style={fade(0)}>
          Mir fehlt gemeinsame Zeit.
        </div>
        <div className="self-center rounded-full border border-accent/50 bg-accent/15 px-3.5 py-1.5 text-[0.7rem] text-white" style={fade(0.2)}>
          Echo: Wie klingt das für dich?
        </div>
        <div className="self-end rounded-2xl rounded-br-sm bg-white/[0.08] px-3.5 py-2 text-xs text-white/85" style={fade(0.4)}>
          Ich dachte, dir reicht das so.
        </div>
      </div>
    ),
  },
  {
    kicker: 'Aus Vorschlägen werden Abmachungen, die ihr wirklich einhaltet.',
    visual: (
      <div className="flex w-full max-w-xs flex-col gap-2">
        {[
          { t: 'Sonntags 20 Minuten reden', ok: true },
          { t: 'Pause-Wort vereinbaren', ok: true },
          { t: 'Handy weg beim Essen', ok: false },
        ].map(({ t, ok }, i) => (
          <div
            key={t}
            className={`flex items-center gap-2.5 rounded-lg border px-4 py-2.5 text-left text-xs ${
              ok ? 'border-accent/50 bg-accent/10 text-white' : 'border-white/15 bg-white/[0.06] text-white/70'
            }`}
            style={fade(i * 0.15)}
          >
            <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
              ok ? 'border-accent bg-accent text-navy' : 'border-white/30'
            }`}>
              {ok && (
                <svg viewBox="0 0 12 12" className="h-2.5 w-2.5">
                  <path d="M2 6l3 3 5-6" fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            {t}
          </div>
        ))}
      </div>
    ),
  },
]

export default function CoupleExplainer() {
  const [index, setIndex] = useState(0)
  const [running, setRunning] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Erst loslaufen, wenn der Slider zu sehen ist – sonst ist er beim Ankommen durch.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setRunning(true),
      { threshold: 0.4 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!running) return
    const t = setTimeout(() => setIndex(i => (i + 1) % SCENES.length), SCENE_MS)
    return () => clearTimeout(t)
  }, [running, index])

  const step = (d: number) => {
    setRunning(false)
    setIndex(i => (i + d + SCENES.length) % SCENES.length)
  }

  const scene = SCENES[index]

  return (
    <section className="border-t border-brand-border bg-navy/[0.02] px-6 py-[72px]">
      <div className="mx-auto max-w-[960px]">
        <span className="label">In 30 Sekunden erklärt</span>
        <h2 className="mb-2 text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy">
          So läuft ein Gespräch zu zweit
        </h2>
        <p className="mb-8 max-w-[600px] leading-[1.75] text-brand-muted">
          Von der Schleife, aus der ihr nicht herauskommt, bis zu einer Abmachung, die hält –
          ohne dass einer von euch die Deutungshoheit bekommt.
        </p>

        <div
          ref={ref}
          onMouseEnter={() => setRunning(false)}
          onMouseLeave={() => setRunning(true)}
          className="relative aspect-[4/3] overflow-hidden rounded-[1.25rem] bg-navy text-white shadow-xl sm:aspect-[16/9]"
        >
          <div
            key={index}
            className="absolute inset-0 flex flex-col items-center justify-center px-6 pb-12 text-center"
          >
            {scene.visual}
            <p
              className="mt-6 max-w-md text-sm text-white/85 sm:text-base"
              style={{ animation: 'explainer-up 0.7s ease-out 0.1s both' }}
            >
              {scene.kicker}
            </p>
          </div>

          <button
            type="button" onClick={() => step(-1)} aria-label="Vorherige Szene"
            className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/70 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white sm:left-3"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button" onClick={() => step(1)} aria-label="Nächste Szene"
            className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/70 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white sm:right-3"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 px-6">
            {SCENES.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Szene ${i + 1}`}
                onClick={() => { setRunning(false); setIndex(i) }}
                className="h-1.5 w-full max-w-[44px] overflow-hidden rounded-full bg-white/15"
              >
                <span
                  className="block h-full rounded-full bg-accent transition-all"
                  style={{ width: i < index ? '100%' : i === index ? '100%' : '0%' }}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
