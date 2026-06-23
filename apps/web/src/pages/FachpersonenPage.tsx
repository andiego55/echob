import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PageLayout from '@/components/layout/PageLayout'
import FachpersonenExplainer from '@/components/landing/FachpersonenExplainer'
import DirectoryWaitlistForm from '@/components/landing/DirectoryWaitlistForm'

const DIRECTORY_BENEFITS = [
  {
    icon: '🔎',
    title: 'Klient:innen finden Sie',
    text: 'Menschen sortieren mit EchoB ihre Beziehungsmuster – und suchen danach passende Begleitung. Das Verzeichnis bringt Sie gezielt mit ihnen zusammen.',
  },
  {
    icon: '🆓',
    title: 'Kostenlos & unverbindlich',
    text: 'Die Vormerkung und die Basis-Listung kosten nichts. Keine Vertragsbindung, kein Abo nötig – ein zusätzlicher Kanal, der nicht schaden kann.',
  },
  {
    icon: '🚀',
    title: 'Früh dabei = vorne dabei',
    text: 'Das Verzeichnis startet bald. Wer jetzt vorgemerkt ist, gehört zu den Ersten, die Klient:innen beim Start angezeigt bekommen.',
  },
  {
    icon: '🛡️',
    title: 'Sie behalten die Kontrolle',
    text: 'Nichts wird veröffentlicht, bevor wir Ihre Angaben mit Ihnen abgestimmt haben. Jederzeit widerrufbar.',
  },
]

const FEATURES = [
  {
    icon: '💬',
    title: 'Profi-Echo im Fallkontext',
    text: 'Besprechen Sie den freigegebenen Fall mit Echo – fachlich substanziell: Traitvergleiche zu Störungsbildern und Wahrscheinlichkeits-Einschätzungen, aber keine abschließende Diagnose.',
  },
  {
    icon: '📊',
    title: 'KI-Fallberichte auf Knopfdruck',
    text: 'Verlaufsbericht, Übergabe-/Überweisungsbericht und Fall-Standortbestimmung – oder eigene Vorlagen, die Echo aus Ihrer Beschreibung entwirft. Editierbar und als PDF druckbar.',
  },
  {
    icon: '🗒️',
    title: 'Sitzungsnotizen mit Verlauf',
    text: 'Strukturierte, datierte Notizen als Timeline – aus Vorlagen wie SOAP oder Erstgespräch, oder eigenen. Ihre Falldoku an einem Ort.',
  },
  {
    icon: '🧩',
    title: 'Arbeitshypothesen',
    text: 'Tastende Hypothesen zu Beziehungsdynamik, Bindung, Prägungen, Cluster-B-Spektrum und Eigenanteil – als Arbeitsgrundlage, ausdrücklich keine Diagnose.',
  },
  {
    icon: '🏛️',
    title: 'Praxis-Accounts',
    text: 'Mehrere Fachpersonen unter einem Dach: Rollen, gemeinsame Berichts- und Notiz-Vorlagen, zentrale Verwaltung. Vom Solo-Sitz bis zum Institut.',
  },
  {
    icon: '🗂️',
    title: 'Vollständiger Fallkontext',
    text: 'Szenen, Skalen, Onboarding, Themen-Reflexionen und Profile – sauber aufbereitet. Sie sehen ausschließlich, was Ihre Klient:in freigibt.',
  },
]

const TIERS = [
  { key: 'free', name: 'Gratis', price: '0 €', unit: '', cases: 'Beispielfall · Spielwiese', note: 'Alle Werkzeuge am Beispielfall testen. Ohne Kreditkarte.', cta: 'Kostenlos testen' },
  { key: 'solo', name: 'Solo', price: '59 €', unit: '/Mo.', cases: '1 aktiver Fall', note: 'Für Einzelpraxen. 14 Tage gratis.', cta: '14 Tage gratis' },
  { key: 'praxis', name: 'Praxis', price: '149 €', unit: '/Mo.', cases: '5 aktive Fälle', note: 'Bis 3 Fachpersonen, geteilte Vorlagen.', cta: '14 Tage gratis', featured: true },
  { key: 'institut', name: 'Institut', price: '249 €', unit: '/Mo.', cases: '10 aktive Fälle', note: 'Für Teams/Kliniken, zentrale Verwaltung.', cta: '14 Tage gratis' },
] as const

const TRUST = [
  { title: 'Nur Freigegebenes', text: 'Serverseitig erzwungen: Sie – und Echo – erhalten ausschließlich die Inhalte, die Ihre Klient:in gezielt freigibt.' },
  { title: 'Einwilligung bei der Klient:in', text: 'Kein ganzer Account, sondern einzelne Inhalte. Jede Freigabe ist jederzeit widerrufbar.' },
  { title: 'Pseudonym statt Klarname', text: 'Sie sehen ein Pseudonym – keine E-Mail-Adresse, keine Kontodaten der Klient:in.' },
  { title: 'EU-verschlüsselt, keine Diagnosen', text: 'Daten verschlüsselt auf EU-Servern. EchoB stellt keine Diagnosen und ersetzt keine Behandlung.' },
]

const AUDIENCE = [
  { icon: '🏥', title: 'Psychotherapeut:innen', text: 'Strukturierter Fallkontext + klinisch sortierte Berichte als Grundlage fürs Erstgespräch.' },
  { icon: '🧭', title: 'Berater:innen', text: 'Schneller in die Tiefe, wenn Klient:innen ihre Beobachtungen bereits sortiert haben.' },
  { icon: '🎯', title: 'Coaches', text: 'Konkrete Situationen und Muster benennen – als Basis für die Coaching-Arbeit.' },
  { icon: '🏛️', title: 'Praxen & Teams', text: 'Mehrere Fachpersonen, gemeinsame Vorlagen, klare Rollen und Abrechnung pro Fall.' },
]

export default function FachpersonenPage() {
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
          <span className="label">Für Fachpersonen · Therapie · Beratung · Coaching</span>
          <h1 className="mt-2 text-[clamp(1.9rem,4.2vw,2.8rem)] font-extrabold leading-[1.15] tracking-[-0.02em] max-w-3xl">
            Sie steigen <span className="text-accent">vorbereitet</span> ein.
          </h1>
          <p className="mt-5 text-[1.08rem] text-brand-blue max-w-[620px] leading-[1.75]">
            Ihre Klient:innen sortieren ihre Beziehungssituation strukturiert in EchoB. Sie erhalten
            den freigegebenen Fall – und einen Arbeitsplatz mit Profi-Echo, KI-Berichten,
            Sitzungsnotizen und Hypothesen. Ohne Diagnosen, streng einwilligungsbasiert.
          </p>
          <div className="mt-9 flex flex-wrap gap-3.5">
            <Link to="/auth?role=professional" className="btn-primary">
              Kostenlose Fallanalyse starten
            </Link>
            <a href="#erklaert" className="btn border-2 border-white/25 text-white hover:bg-white/10">
              So funktioniert's
            </a>
          </div>
          <p className="mt-4 text-xs text-white/40">
            Beispielfall inklusive · 14 Tage gratis · Keine Kreditkarte
          </p>

          {/* animierte Mini-Stat-Leiste */}
          <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
            {[['20+', 'Szenen je Beispielfall'], ['3', 'Standard-Berichte + eigene'], ['EU', 'verschlüsselt, keine Diagnose']].map(([n, t], i) => (
              <div key={t} className="rounded-brand border border-white/10 bg-white/[0.04] px-4 py-3"
                style={{ animation: 'fpp-up .6s ease-out both', animationDelay: `${0.15 + i * 0.12}s` }}>
                <div className="text-xl font-extrabold text-white">{n}</div>
                <div className="text-[11px] leading-tight text-white/55">{t}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Animierte Erklärung ──────────────────────────────────── */}
      <div id="erklaert"><FachpersonenExplainer /></div>

      {/* ── Funktionen ───────────────────────────────────────────── */}
      <section className="border-t border-brand-border px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <Reveal>
            <span className="label">Funktionen</span>
            <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy">
              Ein vollständiger Arbeitsplatz, kein Notizzettel
            </h2>
            <p className="mt-3 max-w-[600px] leading-[1.75] text-brand-muted">
              Alles, was Sie zur Vorbereitung und Dokumentation eines Falls brauchen – an einem Ort.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon, title, text }, i) => (
              <Reveal key={title} delay={(i % 3) * 0.08}>
                <div className="card h-full transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-md">
                  <div className="text-2xl mb-3" aria-hidden="true">{icon}</div>
                  <h3 className="font-bold text-navy mb-2">{title}</h3>
                  <p className="text-sm text-brand-muted leading-relaxed">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Gratis-Fallanalyse (das Angebot) ─────────────────────── */}
      <section className="border-t border-brand-border px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <Reveal>
            <div className="relative overflow-hidden rounded-[1.25rem] bg-navy px-6 py-10 text-white sm:px-10"
              style={{ backgroundImage: 'radial-gradient(ellipse 60% 70% at 85% 20%, rgba(59,106,154,0.30) 0%, transparent 70%)' }}>
              <span className="label">Gratis-Fallanalyse</span>
              <h2 className="mt-2 max-w-2xl text-[clamp(1.5rem,2.8vw,2.1rem)] font-extrabold leading-[1.15] tracking-[-0.01em]">
                Erleben Sie EchoB an einem echten Fall – kostenlos.
              </h2>
              <p className="mt-4 max-w-[620px] leading-[1.75] text-brand-blue">
                Jeder Fachpersonen-Account bekommt sofort einen <strong className="text-white">vollständigen
                Beispielfall</strong> als Spielwiese: über 20 Szenen, ausgefüllte Skalen, Hypothesen
                und Zusammenfassungen. Erzeugen Sie daran einen Bericht, schreiben Sie eine
                Sitzungsnotiz, sprechen Sie mit Echo – ganz ohne Kreditkarte.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  ['1', 'Anmelden', 'In 2 Minuten, kostenlos.'],
                  ['2', 'Spielwiese erkunden', 'Beispielfall + alle Werkzeuge.'],
                  ['3', 'Erster echter Fall', '14 Tage gratis testen.'],
                ].map(([n, t, d]) => (
                  <div key={t as string} className="rounded-brand border border-white/12 bg-white/[0.05] px-4 py-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/20 text-sm font-bold text-accent">{n}</div>
                    <p className="mt-2 text-sm font-semibold text-white">{t}</p>
                    <p className="text-[11px] text-white/55">{d}</p>
                  </div>
                ))}
              </div>
              <Link to="/auth?role=professional"
                className="mt-7 inline-flex rounded-brand bg-accent px-6 py-3 text-sm font-semibold text-white no-underline transition-colors hover:bg-accent/90">
                Jetzt kostenlos starten →
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Verzeichnis-Warteliste (Lead-Generierung) ────────────── */}
      <section id="verzeichnis" className="border-t border-brand-border px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.05fr]">
            {/* Pitch */}
            <Reveal>
              <span className="label inline-flex items-center gap-2">
                <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Neu</span>
                EchoB-Verzeichnis
              </span>
              <h2 className="mt-2 text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.2] text-navy">
                Werden Sie gefunden – lassen Sie sich kostenlos vormerken
              </h2>
              <p className="mt-3 leading-[1.75] text-brand-muted">
                Wir bauen ein Verzeichnis, in dem Klient:innen passende Fachpersonen, Praxen und
                Coaches finden. Tragen Sie sich jetzt unverbindlich ein – Sie sichern sich einen
                Platz, sobald es startet. Kostenlos, ohne Risiko.
              </p>
              <div className="mt-7 space-y-5">
                {DIRECTORY_BENEFITS.map(({ icon, title, text }, i) => (
                  <Reveal key={title} delay={(i % 4) * 0.06}>
                    <div className="flex gap-3.5">
                      <span className="mt-0.5 text-xl" aria-hidden="true">{icon}</span>
                      <div>
                        <h3 className="font-semibold text-navy">{title}</h3>
                        <p className="mt-0.5 text-sm leading-relaxed text-brand-muted">{text}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </Reveal>

            {/* Formular */}
            <Reveal delay={0.1}>
              <div className="rounded-[1.25rem] border border-brand-border bg-white p-6 shadow-sm sm:p-8">
                <h3 className="text-lg font-bold text-navy">Jetzt vormerken lassen</h3>
                <p className="mt-1 mb-6 text-sm text-brand-muted">
                  Nur Name und E-Mail sind nötig. Alles Weitere hilft uns, Sie passend zu listen –
                  ist aber freiwillig.
                </p>
                <DirectoryWaitlistForm />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Preise (Praxis-Tarife) ───────────────────────────────── */}
      <section className="border-t border-brand-border bg-navy/[0.02] px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <Reveal>
            <span className="label">Preise</span>
            <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy">
              Fair und planbar – Sie zahlen je aktivem Fall
            </h2>
            <p className="mt-3 max-w-[600px] leading-[1.75] text-brand-muted">
              Der Beispielfall ist immer frei. Werkzeuge schalten Sie pro echtem Fall frei – jeder
              Tarif startet mit 14 Tagen gratis.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TIERS.map((t, i) => (
              <Reveal key={t.key} delay={(i % 4) * 0.07}>
                <Link to="/auth?role=professional"
                  className={`card block h-full no-underline transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${'featured' in t && t.featured ? 'border-accent bg-accent/5' : 'hover:border-accent/40'}`}>
                  <div className="flex items-center justify-between">
                    <span className="label">{t.name}</span>
                    {'featured' in t && t.featured && (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Beliebt</span>
                    )}
                  </div>
                  <div className="mt-3 text-2xl font-extrabold text-navy">
                    {t.price}<span className="text-sm font-normal text-brand-muted">{t.unit}</span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-accent">{t.cases}</p>
                  <p className="mt-3 text-sm text-brand-muted leading-relaxed">{t.note}</p>
                  <span className="mt-4 block text-sm font-semibold text-accent">{t.cta} →</span>
                </Link>
              </Reveal>
            ))}
          </div>
          <p className="mt-5 text-xs text-brand-muted">
            Alle Preise inkl. gesetzlicher USt. Monatlich kündbar. Fälle jederzeit archivieren, um Sitze
            freizugeben. Es gelten die <Link to="/agb" className="underline hover:text-navy">AGB</Link>.
          </p>
        </div>
      </section>

      {/* ── Vertrauen ────────────────────────────────────────────── */}
      <section className="border-t border-brand-border px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <Reveal>
            <span className="label">Auf Einwilligung gebaut</span>
            <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy">
              Klient:innen behalten die Kontrolle
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {TRUST.map(({ title, text }, i) => (
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

      {/* ── Für wen ──────────────────────────────────────────────── */}
      <section className="border-t border-brand-border bg-navy/[0.02] px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <Reveal>
            <span className="label">Für wen</span>
            <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy">EchoB richtet sich an</h2>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {AUDIENCE.map(({ icon, title, text }, i) => (
              <Reveal key={title} delay={(i % 4) * 0.07}>
                <div className="card h-full transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-md">
                  <div className="text-2xl mb-3" aria-hidden="true">{icon}</div>
                  <h3 className="font-bold text-navy mb-2">{title}</h3>
                  <p className="text-sm text-brand-muted leading-relaxed">{text}</p>
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
            Starten Sie mit Ihrer kostenlosen Fallanalyse
          </h2>
          <p className="mt-4 mx-auto max-w-xl leading-[1.75] text-brand-blue">
            Profil anlegen, Beispielfall erkunden, erste echte Klient:in einladen – die Werkzeuge
            schalten Sie pro Fall frei. 14 Tage gratis, ohne Risiko.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/auth?role=professional" className="btn-primary">Kostenlose Fallanalyse starten</Link>
            <a href="mailto:coaching@echo-b.de?subject=Fachpersonenbereich"
              className="btn bg-white text-navy border-2 border-transparent hover:border-navy/20">
              Persönliche Demo anfragen
            </a>
          </div>
          <p className="mt-6 text-xs text-white/35">
            EchoB stellt keine Diagnosen und ersetzt keine professionelle Diagnostik oder Behandlung.
          </p>
        </div>
      </section>

      <style>{`
        @keyframes fpp-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
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
