import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PageLayout from '@/components/layout/PageLayout'
import ErstgespraechCTA from '@/components/coaching/ErstgespraechCTA'

const iconCls = 'h-6 w-6'

const STEPS = [
  {
    title: 'Übungsfälle anlegen',
    text: 'Das Institut legt geteilte Fallbeispiele an – eigene oder von EchoB kuratierte. Jeder Fall bringt Szenen, Skalen, Onboarding und Profile mit.',
  },
  {
    title: 'Studierende einladen',
    text: 'Jede:r Studierende erhält einen Fachpersonen-Platz und Zugriff auf dasselbe Fallmaterial – zentral verwaltet, mit klaren Rollen.',
  },
  {
    title: 'Am Fall arbeiten',
    text: 'Studierende durchlaufen den vollen Weg: Beobachtung von Deutung trennen, einschätzen, Hypothesen bilden, Bericht und Notiz erstellen, mit Echo besprechen.',
  },
  {
    title: 'Vergleichen & besprechen',
    text: 'Dozent:innen vergleichen die Ergebnisse, moderieren die Diskussion und nutzen die standardisierten Fälle für Supervision und Prüfung.',
  },
]

const SKILLS = [
  {
    // Auge: Beobachtung
    icon: (
      <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    title: 'Beobachtung vs. Deutung',
    text: 'An konkreten Szenen trennen, was tatsächlich passiert ist, vom Gefühl und der Interpretation – die Kernkompetenz jeder Fallarbeit.',
  },
  {
    // Balken: Einschätzen
    icon: (
      <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 20V10M12 20V4M19 20v-7" />
      </svg>
    ),
    title: 'Strukturiert einschätzen',
    text: 'Skalen zu Belastung, Beziehungsdynamik und Persönlichkeitsdimensionen lesen und die eigene Einschätzung begründen.',
  },
  {
    // Glühbirne: Hypothese
    icon: (
      <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3a6 6 0 0 1 4 10.4c-.7.6-1 1.2-1 2.1H9c0-.9-.3-1.5-1-2.1A6 6 0 0 1 12 3z" />
        <path d="M9.5 18h5M10.5 20.5h3" />
      </svg>
    ),
    title: 'Arbeitshypothesen bilden',
    text: 'Tastende Hypothesen zu Bindung, Prägung, Dynamik, Eigenanteil und Cluster-B-Spektrum entwickeln – ausdrücklich keine Diagnose.',
  },
  {
    // Bericht: Dokument mit Balken
    icon: (
      <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="3.5" width="14" height="17" rx="2" />
        <path d="M9 16v-3M12 16V9M15 16v-5" />
      </svg>
    ),
    title: 'Fallberichte schreiben',
    text: 'Verlaufs-, Übergabe- und Standortberichte erzeugen und redigieren – die Sprache der Falldokumentation einüben.',
  },
  {
    // Timeline: Notizen
    icon: (
      <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 4v16" />
        <circle cx="7" cy="7" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="7" cy="12" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="7" cy="17" r="1.4" fill="currentColor" stroke="none" />
        <path d="M11 7h7M11 12h7M11 17h5" />
      </svg>
    ),
    title: 'Sitzungsnotizen führen',
    text: 'Strukturierte, datierte Dokumentation aus Vorlagen wie SOAP oder Erstgespräch – sauberes Fallmanagement von Anfang an.',
  },
  {
    // Echo-Wellen
    icon: (
      <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6.5" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <path d="M10.5 8.5a5 5 0 0 1 0 7" />
        <path d="M13.8 6a9 9 0 0 1 0 12" />
      </svg>
    ),
    title: 'Mit Profi-Echo denken',
    text: 'Ein geduldiger Sparringspartner, der zurückfragt, Hypothesen anbietet und mit Störungsbildern vergleicht. Die Dozent:in bleibt die fachliche Instanz.',
  },
]

const CURRICULUM = [
  { title: 'Seminarübung', text: 'Beobachtung von Interpretation trennen – an denselben Szenen für alle.' },
  { title: 'Fallkonzeption', text: 'Von der Szene zur begründeten Arbeitshypothese – als geführtes Training.' },
  { title: 'Supervisionsvorbereitung', text: 'Studierende bringen sauber aufbereitete Fälle mit in die Sitzung.' },
  { title: 'Standardisierte Prüfung', text: 'Alle bearbeiten dasselbe Material – vergleichbar und fair bewertbar.' },
]

const AUSBILDUNGEN = [
  'Paar- & Sexualtherapie',
  'Systemische Beratung & Therapie',
  'Coaching-Ausbildungen',
  'Psychologische Berater:innen',
  'Eheberatung & Seelsorge',
]

const ETHIK = [
  { title: 'Keine echten Patient:innen nötig', text: 'Geübt wird an Fallbeispielen – kein Umgang mit realen, schützenswerten Falldaten in der Lehre.' },
  { title: 'Keine Diagnosen', text: 'EchoB bildet tastende Hypothesen, keine Diagnostik. Das passt zur Haltung verantwortungsvoller Ausbildung.' },
  { title: 'Sicher & pseudonym', text: 'Fallmaterial verschlüsselt auf EU-Servern, ohne Klarnamen. Der Rahmen bleibt geschützt.' },
  { title: 'Die Dozent:in bleibt die Instanz', text: 'Echo ist Übungspartner, nicht Prüfer. Die fachliche Bewertung liegt immer bei der Lehre.' },
]

export default function AusbildungPage() {
  return (
    <PageLayout>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section
        className="bg-navy text-white px-6 pt-[calc(60px+4.5rem)] pb-20"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 65% 55% at 80% 35%, rgba(59,106,154,0.28) 0%, transparent 70%)',
        }}
      >
        <div className="mx-auto max-w-[960px]">
          <span className="label">Für Ausbildungsinstitute</span>
          <h1 className="mt-2 text-[clamp(1.9rem,4.2vw,2.8rem)] font-extrabold leading-[1.15] tracking-[-0.02em] max-w-3xl">
            Ausbildung, die <span className="text-accent">am Fall</span> geschieht.
          </h1>
          <p className="mt-5 text-[1.08rem] text-brand-blue max-w-[640px] leading-[1.75]">
            Ihre angehenden Paar- und Beziehungstherapeut:innen üben den vollständigen Fallweg –
            Szenen lesen, Muster erkennen, Hypothesen bilden, Berichte schreiben – am selben,
            sicheren Fallmaterial. Ohne echte Patient:innen, ohne Diagnosen.
          </p>
          <div className="mt-9 flex flex-wrap gap-3.5">
            <ErstgespraechCTA
              className="btn-primary"
              label="Demo für Ihr Institut" heading="Demo für Ausbildungsinstitute anfragen"
              kind="demo" source="ausbildung_hero" />
            <a href="#preis" className="btn border-2 border-white/25 text-white hover:bg-white/10">
              Preis ansehen
            </a>
          </div>
          <p className="mt-4 text-xs text-white/40">
            Pilot mit einer Kohorte möglich · Übungsfälle inklusive · EchoB stellt keine Diagnosen
          </p>

          <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
            {[['1', 'Fallmaterial für die ganze Kohorte'], ['Voll', 'Fachpersonen-Werkzeuge je Platz'], ['EU', 'sicher, pseudonym, ohne Diagnose']].map(([n, t], i) => (
              <div key={t} className="rounded-brand border border-white/10 bg-white/[0.04] px-4 py-3"
                style={{ animation: 'ab-up .6s ease-out both', animationDelay: `${0.15 + i * 0.12}s` }}>
                <div className="text-xl font-extrabold text-white">{n}</div>
                <div className="text-[11px] leading-tight text-white/55">{t}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Warum ────────────────────────────────────────────────── */}
      <section className="border-t border-brand-border px-6 py-[64px]">
        <div className="mx-auto max-w-[820px]">
          <Reveal>
            <span className="label">Das Problem</span>
            <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy">
              Gute Ausbildung braucht gute Fälle
            </h2>
            <p className="mt-3 leading-[1.8] text-brand-muted">
              Aber echte Fälle sind heikel: Datenschutz, Vergleichbarkeit, Verfügbarkeit. Mit EchoB
              arbeiten alle Studierenden am selben, standardisierten Fallmaterial – <strong className="text-navy">reproduzierbar,
              sicher</strong> und im echten Werkzeugkasten einer Fachperson. Nicht Theorie über Fälle,
              sondern <strong className="text-navy">Handwerk am Fall</strong>.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Ablauf ───────────────────────────────────────────────── */}
      <section className="border-t border-brand-border bg-navy/[0.02] px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <Reveal>
            <span className="label">So läuft es im Institut</span>
            <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy">
              Vier Schritte von der Fallanlage bis zur Besprechung
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ title, text }, i) => (
              <Reveal key={title} delay={(i % 4) * 0.07}>
                <div className="card h-full">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                    {i + 1}
                  </div>
                  <h3 className="mt-4 font-bold text-navy mb-2">{title}</h3>
                  <p className="text-sm text-brand-muted leading-relaxed">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Was Studierende üben ─────────────────────────────────── */}
      <section className="border-t border-brand-border px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <Reveal>
            <span className="label">Was Studierende üben</span>
            <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy">
              Der volle Werkzeugkasten einer Fachperson
            </h2>
            <p className="mt-3 max-w-[620px] leading-[1.75] text-brand-muted">
              Kein isoliertes Wissen, sondern der zusammenhängende Arbeitsablauf – von der einzelnen
              Szene bis zum fertigen Bericht.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SKILLS.map(({ icon, title, text }, i) => (
              <Reveal key={title} delay={(i % 3) * 0.08}>
                <div className="group card h-full hover:border-accent/50">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors duration-200 group-hover:bg-accent group-hover:text-white">
                    {icon}
                  </div>
                  <h3 className="font-bold text-navy mb-2">{title}</h3>
                  <p className="text-sm text-brand-muted leading-relaxed">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Im Curriculum ────────────────────────────────────────── */}
      <section className="border-t border-brand-border bg-navy/[0.02] px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <Reveal>
            <span className="label">Im Curriculum</span>
            <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy">
              Wo EchoB in der Lehre andockt
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {CURRICULUM.map(({ title, text }, i) => (
              <Reveal key={title} delay={(i % 2) * 0.08}>
                <div className="flex gap-3">
                  <svg className="mt-0.5 h-5 w-5 shrink-0 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
                  <div>
                    <h3 className="font-bold text-navy mb-1">{title}</h3>
                    <p className="text-sm text-brand-muted leading-relaxed">{text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.1}>
            <div className="mt-10">
              <p className="text-sm font-semibold text-navy">Passend für Ausbildungen in:</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {AUSBILDUNGEN.map((a) => (
                  <span key={a} className="rounded-full border border-brand-border bg-white px-3.5 py-1.5 text-xs font-medium text-brand-muted">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Preis ────────────────────────────────────────────────── */}
      <section id="preis" className="border-t border-brand-border px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <Reveal>
            <span className="label">Preis</span>
            <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy">
              Sie zahlen je Studierenden-Platz, nicht pro Fall
            </h2>
            <p className="mt-3 max-w-[620px] leading-[1.75] text-brand-muted">
              Ein planbares Modell für Kohorten: eine schlanke Grundgebühr fürs Institut, dazu ein
              fairer Preis je aktivem Platz. Die Übungsfälle sind inklusive.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mt-8 overflow-hidden rounded-[1.25rem] border-2 border-accent/30 bg-accent/[0.04]">
              <div className="grid items-center gap-6 p-6 sm:p-8 lg:grid-cols-[1.25fr_1fr]">
                <div>
                  <span className="label">Tarif Ausbildung</span>
                  <ul className="mt-4 grid gap-2.5">
                    {[
                      'Übungsfälle inklusive – kein Pro-Fall-Preis',
                      'Volle Fachpersonen-Werkzeuge je Studierenden-Platz',
                      'Zentrale Verwaltung, Rollen und geteilte Vorlagen',
                      'Pilot mit einer Kohorte möglich',
                      'Ab ~30 Studierenden individuelle Konditionen',
                    ].map((p) => (
                      <li key={p} className="flex items-start gap-2.5 text-sm leading-relaxed text-brand-muted">
                        <svg className="mt-0.5 h-4 w-4 shrink-0 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-[1rem] border border-brand-border bg-white p-6 text-center">
                  <div className="text-3xl font-extrabold text-navy">99 €<span className="text-sm font-normal text-brand-muted">/Mo.</span></div>
                  <p className="text-xs text-brand-muted">Grundgebühr je Institut</p>
                  <div className="my-3 flex items-center gap-3 text-brand-border">
                    <span className="h-px flex-1 bg-brand-border" /><span className="text-xs font-semibold">plus</span><span className="h-px flex-1 bg-brand-border" />
                  </div>
                  <div className="text-3xl font-extrabold text-navy">12,99 €<span className="text-sm font-normal text-brand-muted">/Mo.</span></div>
                  <p className="text-xs text-brand-muted">je aktivem Studierenden-Platz</p>
                  <ErstgespraechCTA
                    className="btn-primary mt-5 w-full justify-center"
                    label="Demo anfragen" heading="Demo für Ausbildungsinstitute anfragen"
                    kind="demo" source="ausbildung_preis" />
                  <p className="mt-2 text-[11px] text-brand-muted">Unverbindlich · inkl. gesetzlicher USt.</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Ethik / Vertrauen ────────────────────────────────────── */}
      <section className="border-t border-brand-border bg-navy/[0.02] px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <Reveal>
            <span className="label">Sicher fürs Lehren</span>
            <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy">
              Ein geschützter Rahmen zum Üben
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {ETHIK.map(({ title, text }, i) => (
              <Reveal key={title} delay={(i % 2) * 0.08}>
                <div className="flex gap-3">
                  <span className="mt-0.5 text-accent" aria-hidden="true">✓</span>
                  <div>
                    <h3 className="font-bold text-navy mb-1">{title}</h3>
                    <p className="text-sm text-brand-muted leading-relaxed">{text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="bg-navy text-white px-6 py-[80px]"
        style={{ backgroundImage: 'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(59,106,154,0.25) 0%, transparent 70%)' }}>
        <div className="mx-auto max-w-[960px] text-center">
          <span className="label">Loslegen</span>
          <h2 className="mt-2 text-[clamp(1.5rem,2.8vw,2rem)] font-bold text-white">
            Bringen Sie EchoB in Ihre Ausbildung
          </h2>
          <p className="mt-4 mx-auto max-w-xl leading-[1.75] text-brand-blue">
            In einem kurzen Gespräch richten wir Ihre Übungsfälle ein und planen einen Pilot mit
            einer Kohorte. Danach entscheiden Sie in Ruhe.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ErstgespraechCTA
              className="btn-primary"
              label="Demo für Ihr Institut" heading="Demo für Ausbildungsinstitute anfragen"
              kind="demo" source="ausbildung_cta" />
            <Link to="/fachpersonen" className="btn bg-white text-navy border-2 border-transparent hover:border-navy/20">
              EchoB für Fachpersonen
            </Link>
          </div>
          <p className="mt-6 text-xs text-white/35">
            EchoB stellt keine Diagnosen und ersetzt keine professionelle Ausbildung, Diagnostik oder Behandlung.
          </p>
        </div>
      </section>

      <style>{`
        @keyframes ab-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @media print { * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      `}</style>
    </PageLayout>
  )
}

/** Scroll-Reveal: blendet Inhalt sanft ein, sobald er in den Viewport kommt. */
function Reveal({ children, delay = 0, className = '' }: {
  children: React.ReactNode; delay?: number; className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); obs.disconnect() } },
      { threshold: 0.15 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <div ref={ref} className={className} style={{
      opacity: shown ? 1 : 0,
      transform: shown ? 'none' : 'translateY(16px)',
      transition: `opacity .6s ease-out ${delay}s, transform .6s ease-out ${delay}s`,
    }}>
      {children}
    </div>
  )
}
