import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

/**
 * Selbst-abspielende Erklär-„Stage" für die Fachpersonen-Seite (Pendant zu
 * ExplainerSection). Zeigt, was die Fachperson erwartet: vom freigegebenen Fall
 * über Echo + KI-Bericht bis zur Spielwiese. Reine CSS/JS-Animation, kein Video.
 */

const SCENE_MS = 4600

const up = (delay = 0): React.CSSProperties => ({
  animation: 'fp-up 0.6s ease-out both',
  animationDelay: `${delay}s`,
})

const SCENES: { kicker: string; visual: React.ReactNode }[] = [
  {
    kicker: 'Ihre Klient:innen reflektieren strukturiert – und geben Ihnen gezielt frei.',
    visual: (
      <div className="relative h-32 w-full max-w-md">
        {['„Schon wieder dieser Streit."', '„Mal nah, dann kalt."', '„Bilde ich mir das ein?"'].map((t, i) => (
          <span
            key={t}
            className="absolute whitespace-nowrap rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/80"
            style={{
              left: `${[4, 42, 20][i]}%`,
              top: `${[6, 40, 70][i]}%`,
              animation: `fp-float ${3 + i * 0.6}s ease-in-out ${i * 0.3}s infinite`,
            }}
          >
            {t}
          </span>
        ))}
      </div>
    ),
  },
  {
    kicker: 'Sie öffnen einen vollständigen Fall: Szenen, Skalen, Muster.',
    visual: (
      <div className="flex w-full max-w-md flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          {['Szene 7 · Der abgesagte Geburtstag', 'Szene 13 · Der Riss', 'Szene 19 · Ein guter Tag'].map((t, i) => (
            <div key={t}
              className="rounded-lg border border-white/15 bg-white/[0.06] px-3.5 py-2 text-left text-xs text-white/85"
              style={up(i * 0.12)}>
              {t}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          {[['Schuldumkehr', 92], ['Wahrnehmungsverzerrung', 88], ['Grenzüberschreitung', 80]].map(([t, w], i) => (
            <div key={t as string} className="flex items-center gap-2">
              <span className="w-40 shrink-0 text-right text-[10px] text-white/55">{t}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full rounded-full bg-accent"
                  style={{ width: `${w}%`, transformOrigin: 'left', animation: 'fp-grow 0.9s ease-out both', animationDelay: `${0.3 + i * 0.15}s` }} />
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    kicker: 'Sie besprechen den Fall mit Echo – fachlich, ohne Diagnose.',
    visual: (
      <div className="flex w-full max-w-sm flex-col gap-2.5">
        <div className="self-end rounded-2xl rounded-br-sm bg-accent/20 px-3.5 py-2 text-xs text-white" style={up(0)}>
          Welche Muster sind hier zentral?
        </div>
        <div className="self-start rounded-2xl rounded-bl-sm border border-white/15 bg-white/[0.06] px-3.5 py-2 text-left text-xs text-white/85" style={up(0.25)}>
          Idealisierung → Abwertung → Liebesentzug, mit Schuldumkehr nach Konflikten …
        </div>
        <div className="self-start rounded-2xl rounded-bl-sm border border-accent/40 bg-accent/10 px-3.5 py-2 text-left text-[11px] text-white/80" style={up(0.5)}>
          Tastende Arbeitshypothese – keine Diagnose.
        </div>
      </div>
    ),
  },
  {
    kicker: 'Ein Klick → strukturierter Bericht (Standortbestimmung, Übergabe …).',
    visual: (
      <div className="w-full max-w-xs rounded-xl border border-white/15 bg-white/[0.05] p-4 text-left" style={{ animation: 'fp-in 0.6s ease-out both' }}>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-white">Fall-Standortbestimmung</span>
          <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent">PDF</span>
        </div>
        {['Ausgangslage und Kontext', 'Wiederkehrende Muster', 'Störungsbezogene Einschätzung', 'Ressourcen', 'Nächste Schritte'].map((t, i) => (
          <div key={t} className="mb-1.5" style={up(0.15 + i * 0.12)}>
            <p className="text-[10px] font-semibold text-white/80">{t}</p>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <span className="block h-full rounded-full bg-white/30"
                style={{ width: `${[70, 95, 88, 60, 80][i]}%`, transformOrigin: 'left', animation: 'fp-grow 0.7s ease-out both', animationDelay: `${0.25 + i * 0.12}s` }} />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    kicker: 'Sitzungsnotizen mit Verlauf – Ihre Falldoku an einem Ort.',
    visual: (
      <div className="relative w-full max-w-sm pl-5">
        <span className="absolute left-1.5 top-1 bottom-1 w-px bg-white/15" />
        {[['23. Juni', 'Erstgespräch'], ['30. Juni', 'Sitzung 2 – Stabilisierung'], ['7. Juli', 'Sitzung 3 – Grenzarbeit']].map(([d, t], i) => (
          <div key={t} className="relative mb-3 last:mb-0" style={up(i * 0.18)}>
            <span className="absolute -left-[14px] top-1 h-2.5 w-2.5 rounded-full border-2 border-navy bg-accent" />
            <p className="text-[10px] text-white/50">{d}</p>
            <p className="text-xs font-medium text-white/90">{t}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    kicker: 'Gratis ausprobieren – an einem vollständigen Beispielfall, ohne Kreditkarte.',
    visual: (
      <div className="flex flex-col items-center" style={{ animation: 'fp-pop 0.6s ease-out both' }}>
        <span className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[11px] font-semibold text-accent">
          Spielwiese · Beispielfall inklusive
        </span>
        <span className="mt-4 text-[1.9rem] font-extrabold tracking-tight text-white">
          Echo<span className="text-accent">B</span> <span className="text-white/70">für Fachpersonen</span>
        </span>
        <Link to="/auth?role=professional"
          className="mt-5 rounded-brand bg-accent px-5 py-2.5 text-sm font-semibold text-white no-underline transition-colors hover:bg-accent/90">
          Kostenlose Fallanalyse starten
        </Link>
      </div>
    ),
  },
]

export default function FachpersonenExplainer() {
  const [active, setActive] = useState(0)
  const [inView, setInView] = useState(false)
  const [paused, setPaused] = useState(false)
  const [done, setDone] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect() } },
      { threshold: 0.4 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!inView || paused || done) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const t = setTimeout(() => {
      setActive((a) => {
        if (a + 1 >= SCENES.length) { setDone(true); return a }
        return a + 1
      })
    }, SCENE_MS)
    return () => clearTimeout(t)
  }, [inView, paused, done, active])

  const goTo = (i: number) => { setActive(i); setDone(false); setPaused(false) }

  const step = (dir: number) => {
    setActive((a) => (a + dir + SCENES.length) % SCENES.length)
    setDone(false)
  }

  return (
    <section className="border-t border-brand-border bg-navy/[0.02] px-6 py-[72px]">
      <div className="mx-auto max-w-[960px]">
        <span className="label">In 30 Sekunden erklärt</span>
        <h2 className="mb-2 text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy">
          Was Sie als Fachperson erwartet
        </h2>
        <p className="mb-8 max-w-[600px] leading-[1.75] text-brand-muted">
          Vom freigegebenen Fall bis zum fertigen Bericht – ein durchdachter Arbeitsplatz statt
          loser Notizen.
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
            style={{ animation: 'fp-in 0.6s ease-out' }}
          >
            {SCENES[active].visual}
            <p className="mt-6 max-w-md text-sm text-white/85 sm:text-base" style={up(0.1)}>
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

          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 px-6">
            {SCENES.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} aria-label={`Szene ${i + 1}`}
                className="h-1.5 w-full max-w-[44px] overflow-hidden rounded-full bg-white/15">
                <span className={`block h-full rounded-full bg-accent transition-all duration-500 ${i <= active ? 'w-full' : 'w-0'}`} />
              </button>
            ))}
          </div>

          {done && (
            <button onClick={() => goTo(0)}
              className="absolute right-3 top-3 rounded-full bg-white/10 px-3 py-1 text-xs text-white/70 transition-colors hover:text-white">
              ↻ Nochmal
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fp-in { from { opacity: 0; transform: translateY(14px) scale(.98); } to { opacity: 1; transform: none; } }
        @keyframes fp-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @keyframes fp-pop { from { opacity: 0; transform: scale(.85); } to { opacity: 1; transform: none; } }
        @keyframes fp-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes fp-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
      `}</style>
    </section>
  )
}
