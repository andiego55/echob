import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

/**
 * Selbst-abspielender Erklär-„Stage" für die Landing Page.
 * Startet, sobald er in den Viewport scrollt; pausiert bei Hover; Szenen sind
 * über die Fortschrittsbalken anwählbar. Reine CSS/JS-Animation, kein Video.
 */

const SCENE_MS = 4200

const fade = (delay = 0): React.CSSProperties => ({
  animation: 'explainer-up 0.6s ease-out both',
  animationDelay: `${delay}s`,
})

const SCENES: { kicker: string; visual: React.ReactNode }[] = [
  {
    kicker: 'Bilde ich mir das ein – oder wiederholt sich da wirklich etwas?',
    visual: (
      <div className="relative h-32 w-full max-w-md">
        {['„Bilde ich mir das ein?"', '„Schon wieder dieser Streit."', '„Mal nah, dann kalt."'].map((t, i) => (
          <span
            key={t}
            className="absolute whitespace-nowrap rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/80"
            style={{
              left: `${[2, 40, 18][i]}%`,
              top: `${[8, 38, 68][i]}%`,
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
    kicker: 'EchoB ordnet es – Szene für Szene zu einer klaren Fallakte.',
    visual: (
      <div className="flex w-full max-w-xs flex-col gap-2">
        {['Szene 1 · Der Abend', 'Szene 2 · Das Gespräch', 'Szene 3 · Danach'].map((t, i) => (
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
    kicker: 'Echo trennt Beobachtung, Gefühl und Interpretation.',
    visual: (
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {[
          { label: 'Beobachtung', icon: (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" /><circle cx="12" cy="12" r="2.5" />
            </svg>
          ) },
          { label: 'Gefühl', icon: (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20.3C10 18.8 4 14.4 4 9.4A3.9 3.9 0 0 1 12 7a3.9 3.9 0 0 1 8 2.4c0 5-6 9.4-8 10.9z" />
            </svg>
          ) },
          { label: 'Interpretation', icon: (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a6 6 0 0 1 4 10.4c-.7.6-1 1.2-1 2.1H9c0-.9-.3-1.5-1-2.1A6 6 0 0 1 12 3z" /><path d="M9.5 18h5" />
            </svg>
          ) },
        ].map(({ label, icon }, i) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-medium text-white"
            style={{ animation: 'explainer-pop 0.5s ease-out both', animationDelay: `${i * 0.15}s` }}
          >
            {icon}{label}
          </span>
        ))}
      </div>
    ),
  },
  {
    kicker: 'Über mehrere Situationen werden Muster sichtbar – ohne Diagnose.',
    visual: (
      <svg viewBox="0 0 320 120" className="w-full max-w-sm">
        <polyline
          points="20,92 80,60 140,72 200,34 280,48"
          fill="none"
          className="stroke-accent"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ strokeDasharray: 420, strokeDashoffset: 420, animation: 'explainer-draw 1.4s ease-out forwards' }}
        />
        {[[20, 92], [80, 60], [140, 72], [200, 34], [280, 48]].map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="5"
            fill="#fff"
            style={{ animation: 'explainer-pop 0.4s ease-out both', animationDelay: `${0.3 + i * 0.18}s` }}
          />
        ))}
      </svg>
    ),
  },
  {
    kicker: 'Kein generischer Chatbot – strukturiert, vorsichtig, in der EU verschlüsselt.',
    visual: (
      <div className="grid w-full max-w-lg grid-cols-2 gap-3 text-left">
        <div className="rounded-xl border border-white/12 bg-white/[0.04] p-3.5" style={fade(0)}>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-white/45">Allgemeiner KI-Chat</p>
          {['Vergisst nach dem Chat', 'Urteilt über andere', 'Daten in die US-Cloud'].map((t) => (
            <p key={t} className="mb-1 flex gap-1.5 text-xs text-white/70">
              <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              {t}
            </p>
          ))}
        </div>
        <div className="rounded-xl border border-accent/40 bg-accent/10 p-3.5" style={fade(0.15)}>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-accent">EchoB</p>
          {['Strukturierte Fallakte', 'Keine Diagnosen', 'EU-verschlüsselt'].map((t) => (
            <p key={t} className="mb-1 flex gap-1.5 text-xs text-white">
              <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
              {t}
            </p>
          ))}
        </div>
      </div>
    ),
  },
  {
    kicker: 'Drei Tage kostenlos – ohne Kreditkarte.',
    visual: (
      <div className="flex flex-col items-center" style={{ animation: 'explainer-pop 0.6s ease-out both' }}>
        <span className="text-[2rem] font-extrabold tracking-tight text-white">
          Echo<span className="text-accent">B</span>
        </span>
        <p className="mt-1 text-sm text-white/70">Erkenne, was sich wiederholt.</p>
        <Link
          to="/auth"
          state={{ defaultTab: 'signup' }}
          className="mt-5 rounded-brand bg-accent px-5 py-2.5 text-sm font-semibold text-white no-underline transition-colors hover:bg-accent/90"
        >
          Kostenlos 3 Tage testen
        </Link>
      </div>
    ),
  },
]

export default function ExplainerSection() {
  const [active, setActive] = useState(0)
  const [inView, setInView] = useState(false)
  const [paused, setPaused] = useState(false)
  const [done, setDone] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Start, sobald die Stage in den Viewport kommt
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true)
          obs.disconnect()
        }
      },
      { threshold: 0.4 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Auto-Advance (respektiert prefers-reduced-motion)
  useEffect(() => {
    if (!inView || paused || done) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const t = setTimeout(() => {
      setActive((a) => {
        if (a + 1 >= SCENES.length) {
          setDone(true)
          return a
        }
        return a + 1
      })
    }, SCENE_MS)
    return () => clearTimeout(t)
  }, [inView, paused, done, active])

  const goTo = (i: number) => {
    setActive(i)
    setDone(false)
    setPaused(false)
  }

  const step = (dir: number) => {
    setActive((a) => (a + dir + SCENES.length) % SCENES.length)
    setDone(false)
  }

  return (
    <section className="border-t border-brand-border bg-navy/[0.02] px-6 py-[72px]">
      <div className="mx-auto max-w-[960px]">
        <span className="label">In 30 Sekunden erklärt</span>
        <h2 className="mb-2 text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy">
          Wie EchoB dir hilft – und was es von ChatGPT unterscheidet
        </h2>
        <p className="mb-8 max-w-[600px] leading-[1.75] text-brand-muted">
          Kein flüchtiger Chat, sondern ein strukturierter Reflexionsraum.
        </p>

        <div
          ref={ref}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          className="relative aspect-[4/3] overflow-hidden rounded-[1.25rem] bg-navy text-white shadow-xl sm:aspect-[16/9]"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 60% 60% at 75% 30%, rgba(59,106,154,0.30) 0%, transparent 70%)',
          }}
        >
          <div
            key={active}
            className="absolute inset-0 flex flex-col items-center justify-center px-6 pb-12 text-center"
            style={{ animation: 'explainer-in 0.6s ease-out' }}
          >
            {SCENES[active].visual}
            <p className="mt-6 max-w-md text-sm text-white/85 sm:text-base" style={{ animation: 'explainer-up 0.7s ease-out 0.1s both' }}>
              {SCENES[active].kicker}
            </p>
          </div>

          {/* Pfeile: links/rechts durch die Szenen */}
          <button type="button" onClick={() => step(-1)} aria-label="Vorherige Szene"
            className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/70 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white sm:left-3">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button type="button" onClick={() => step(1)} aria-label="Nächste Szene"
            className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/70 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white sm:right-3">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Fortschritt / Szenen-Navigation */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 px-6">
            {SCENES.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Szene ${i + 1}`}
                className="h-1.5 w-full max-w-[44px] overflow-hidden rounded-full bg-white/15"
              >
                <span
                  className={`block h-full rounded-full bg-accent transition-all duration-500 ${i <= active ? 'w-full' : 'w-0'}`}
                />
              </button>
            ))}
          </div>

          {done && (
            <button
              onClick={() => goTo(0)}
              className="absolute right-3 top-3 rounded-full bg-white/10 px-3 py-1 text-xs text-white/70 transition-colors hover:text-white"
            >
              ↻ Nochmal
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes explainer-in { from { opacity: 0; transform: translateY(14px) scale(.98); } to { opacity: 1; transform: none; } }
        @keyframes explainer-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @keyframes explainer-pop { from { opacity: 0; transform: scale(.85); } to { opacity: 1; transform: none; } }
        @keyframes explainer-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes explainer-draw { to { stroke-dashoffset: 0; } }
      `}</style>
    </section>
  )
}
