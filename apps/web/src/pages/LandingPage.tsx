import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageLayout from '@/components/layout/PageLayout'
import ExplainerSection from '@/components/landing/ExplainerSection'

const THOUGHTS = [
  '„Ich weiß nicht mehr, ob ich übertreibe."',
  '„Nach jedem Streit bin ich verwirrter als vorher."',
  '„Manchmal ist alles nah – und kurz danach wieder kalt."',
  '„Ich erkenne ein Muster, kann es aber nicht greifen."',
  '„Ich möchte meine Situation für Therapie sortieren."',
]

const svg = 'h-6 w-6'
const FEATURES = [
  {
    // Notiz/Dokument mit Zeilen – „festhalten"
    icon: (
      <svg className={svg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="3.5" width="14" height="17" rx="2" />
        <path d="M8.5 8h7M8.5 11.5h7M8.5 15h4.5" />
      </svg>
    ),
    title: 'Situationen strukturiert festhalten',
    text: 'Du beschreibst, was passiert ist – in eigenen Worten, im eigenen Tempo. EchoB verwandelt das Chaos in klare, geordnete Szenen.',
  },
  {
    // Echo-Wellen – „mit Echo reflektieren"
    icon: (
      <svg className={svg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6.5" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <path d="M10.5 8.5a5 5 0 0 1 0 7" />
        <path d="M13.8 6a9 9 0 0 1 0 12" />
      </svg>
    ),
    title: 'Mit Echo reflektieren',
    text: 'Echo stellt Fragen, fasst zusammen und hilft dir, Zusammenhänge zu sehen. Kein Ratschlag, keine Bewertung – ein Spiegel, der dir hilft zu denken.',
  },
  {
    // Verbundene Punkte / Verlauf – „Muster sichtbar"
    icon: (
      <svg className={svg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4,15 9,10 13,13 20,5" />
        <circle cx="4" cy="15" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="9" cy="10" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="13" cy="13" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="20" cy="5" r="1.4" fill="currentColor" stroke="none" />
      </svg>
    ),
    title: 'Muster sichtbar machen',
    text: 'Was sich wiederholt, zeigt sich erst über mehrere Situationen. EchoB macht Dynamiken wie Schuldumkehr, Kontrolle oder Nähe-Distanz-Wechsel sichtbar – ohne Diagnose.',
  },
  {
    // Dokument mit Balken – „Berichte"
    icon: (
      <svg className={svg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="3.5" width="14" height="17" rx="2" />
        <path d="M9 16v-3M12 16V9M15 16v-5" />
      </svg>
    ),
    title: 'Berichte für dich und Fachpersonen',
    text: 'Ob für dich selbst, fürs Coaching oder als Vorbereitung auf die Therapie – EchoB erstellt strukturierte Berichte, die das Wesentliche auf den Punkt bringen.',
  },
]

const FAQ = [
  {
    q: 'Ist EchoB eine Psychotherapie?',
    a: 'Nein. EchoB ist ein strukturiertes Reflexionswerkzeug. Es stellt keine Diagnosen und ersetzt keine professionelle Behandlung. Bei akuter Not wende dich bitte an eine Fachperson.',
  },
  {
    q: 'Wer sieht meine Eingaben?',
    a: 'Nur du. Deine Daten werden verschlüsselt und DSGVO-konform auf europäischen Servern gespeichert. Wir geben nichts weiter.',
  },
  {
    q: 'Wie funktioniert der kostenlose Testzugang?',
    a: '3 Tage, 1 Fall, 5 Szenen – ohne Kreditkarte. Du kannst Kurzbericht und Coaching-Vorbereitung erstellen. Danach kannst du upgraden oder einfach aufhören.',
  },
  {
    q: 'Was ist der Early-Bird-Tarif?',
    a: 'Solange das Early-Bird-Fenster (bis November) offen ist, bekommst du den vollen App-Zugang für 15,99 € statt 24,99 € im Monat – alle Funktionen und Berichte inklusive, monatlich kündbar.',
  },
]

export default function LandingPage() {
  return (
    <PageLayout>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section
        className="bg-navy text-white px-6 pt-[calc(60px+5rem)] pb-20 md:pb-28"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 65% 55% at 80% 40%, rgba(59,106,154,0.25) 0%, transparent 70%)',
        }}
      >
        <div className="mx-auto max-w-[960px]">
          <span className="label">Erkenne, was sich wiederholt.</span>
          <h1 className="mt-2 text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold leading-[1.2] tracking-[-0.02em] max-w-2xl">
            Wenn Beziehungen schwer einzuordnen sind.
          </h1>
          <p className="mt-5 text-[1.05rem] text-brand-blue max-w-[600px] leading-[1.75]">
            EchoB führt dich durch belastende Beziehungssituationen: Du hältst fest, was
            passiert – und Schritt für Schritt werden Muster sichtbar. KI-gestützt
            sortierst du deine Gedanken und siehst deine nächsten Schritte klarer.
          </p>
          <div className="mt-9 flex flex-wrap gap-3.5">
            <Link to="/auth" state={{ defaultTab: 'signup' }} className="btn-primary">
              Kostenlos 3 Tage testen
            </Link>
            <a href="#wie-es-funktioniert" className="btn-outline">
              Wie es funktioniert
            </a>
          </div>
          <p className="mt-4 text-xs text-white/40">
            Keine Kreditkarte · Kein Download · Jederzeit aufhören
          </p>
        </div>
      </section>

      <ExplainerSection />

      {/* ── Resonanz-Karten ───────────────────────────────────────── */}
      <section className="border-t border-brand-border px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <span className="label">Du bist nicht allein</span>
          <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy">
            Vielleicht kennst du diese Gedanken
          </h2>
          <p className="mt-3 text-brand-muted max-w-[600px] leading-[1.75]">
            Viele Menschen stecken in Situationen, die sich schwer in Worte fassen lassen.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:[&>*:last-child:nth-child(3n-2)]:col-start-2">
            {THOUGHTS.map((text) => (
              <div key={text} className="card italic text-brand-muted">
                {text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Was EchoB für dich tut ────────────────────────────────── */}
      <section id="wie-es-funktioniert" className="border-t border-brand-border bg-navy/[0.02] px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <span className="label">Funktionen</span>
          <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy">
            Was EchoB für dich tut
          </h2>
          <p className="mt-3 text-brand-muted max-w-[600px] leading-[1.75]">
            Kein Tagebuch. Kein Therapieersatz. Ein strukturiertes Werkzeug, das
            aus deinen Situationen Erkenntnisse macht.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {FEATURES.map(({ icon, title, text }) => (
              <div key={title} className="group card flex flex-col hover:border-accent/50">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors duration-200 group-hover:bg-accent group-hover:text-white">
                  {icon}
                </div>
                <h3 className="font-bold text-navy mb-1.5">{title}</h3>
                <p className="text-sm text-brand-muted leading-relaxed">{text}</p>
              </div>
            ))}
          </div>

          <div className="mt-11 flex flex-col items-center text-center">
            <p className="text-lg font-semibold text-navy">Sieh selbst, was sichtbar wird.</p>
            <Link to="/auth" state={{ defaultTab: 'signup' }} className="btn-primary mt-4">
              Kostenlos ausprobieren
            </Link>
            <p className="mt-3 text-xs text-brand-muted">3 Tage · 1 Fall · ohne Kreditkarte</p>
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────── */}
      <section className="border-t border-brand-border px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <span className="label">Preise</span>
          <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy">
            Transparent und fair.
          </h2>
          <p className="mt-3 text-brand-muted max-w-[600px] leading-[1.75]">
            3 Tage kostenlos testen — keine Kreditkarte erforderlich.
          </p>

          {/* Early Bird – prominent */}
          <div className="mt-10 rounded-brand border-2 border-accent bg-accent/5 p-6 max-w-2xl shadow-sm mb-6">
            <div className="flex items-start justify-between gap-3 mb-1">
              <span className="text-base font-bold text-navy">Early Bird</span>
              <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-accent text-white shrink-0">
                Nur bis November
              </span>
            </div>
            <div className="mb-1 flex items-baseline gap-2 flex-wrap">
              <span className="text-3xl font-extrabold text-navy">15,99 €</span>
              <span className="text-xs text-brand-muted">/ Monat</span>
              <span className="text-sm text-brand-muted line-through decoration-brand-muted/50">24,99 €</span>
            </div>
            <p className="text-sm text-brand-muted mb-4 max-w-lg leading-relaxed">
              Voller Zugang zu allen Funktionen und Berichten – zum Vorzugspreis, solange das
              Early-Bird-Fenster offen ist. Monatlich kündbar, keine Bindung.
            </p>
            <Link to="/auth" state={{ defaultTab: 'signup' }} className="inline-block text-sm font-semibold px-5 py-2.5 rounded-brand bg-accent text-white hover:bg-accent/90 transition-colors">
              Zum Early-Bird-Preis starten →
            </Link>
          </div>

          {/* Weitere Optionen */}
          <p className="text-xs font-semibold text-brand-muted uppercase tracking-wide mb-4">Weitere Optionen</p>
          <div className="grid gap-5 sm:grid-cols-3">
            <Link to="/auth" state={{ defaultTab: 'signup' }} className="card block no-underline transition hover:border-accent hover:shadow-md">
              <span className="label mb-3">Kostenlos</span>
              <div className="text-2xl font-extrabold text-navy mb-1">0 €</div>
              <p className="text-xs text-brand-muted mb-4">3 Tage · 1 Fall · 5 Szenen</p>
              <p className="text-sm text-brand-muted">
                Kurzbericht & Coaching-Vorbereitung inklusive. Keine Kreditkarte nötig.
              </p>
              <span className="mt-4 block text-sm font-semibold text-accent">Kostenlos testen →</span>
            </Link>
            <Link to="/auth" state={{ defaultTab: 'signup' }} className="card block no-underline transition hover:border-accent hover:shadow-md">
              <span className="label mb-3">Monatsabo</span>
              <div className="text-2xl font-extrabold text-navy mb-1">24,99 €<span className="text-sm font-normal text-brand-muted"> /Mo.</span></div>
              <p className="text-xs text-brand-muted mb-4">Vollzugang · Monatlich kündbar</p>
              <p className="text-sm text-brand-muted">Regulärer Preis nach Early Bird.</p>
              <span className="mt-4 block text-sm font-semibold text-accent">Auswählen →</span>
            </Link>
            <Link to="/auth" state={{ defaultTab: 'signup' }} className="card block no-underline transition hover:border-accent hover:shadow-md">
              <div className="flex items-start justify-between mb-2">
                <span className="label">Jahresabo</span>
                <span className="text-[10px] font-bold uppercase tracking-wide bg-navy text-white px-2 py-0.5 rounded-full">–33 %</span>
              </div>
              <div className="text-2xl font-extrabold text-navy mb-1">199 €<span className="text-sm font-normal text-brand-muted"> /Jahr</span></div>
              <p className="text-xs text-brand-muted mb-4">≈ 16,58 € / Monat</p>
              <p className="text-sm text-brand-muted">Vollzugang zum Vorzugspreis.</p>
              <span className="mt-4 block text-sm font-semibold text-accent">Auswählen →</span>
            </Link>
          </div>
          <p className="mt-5 text-xs text-brand-muted">
            Alle Preise inkl. gesetzlicher USt. Abos verlängern sich automatisch und sind jederzeit zum
            Laufzeitende kündbar. Es gelten die <Link to="/agb" className="underline hover:text-navy">AGB</Link>{' '}
            und die <Link to="/widerruf" className="underline hover:text-navy">Widerrufsbelehrung</Link>.
          </p>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────── */}
      <section className="border-t border-brand-border bg-navy/[0.02] px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <span className="label">Häufige Fragen</span>
          <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy mb-10">
            Deine Fragen, klar beantwortet.
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 max-w-3xl">
            {FAQ.map(({ q, a }) => (
              <FaqCard key={q} q={q} a={a} />
            ))}
          </div>
          <p className="mt-8 text-sm text-brand-muted">
            Weitere Fragen?{' '}
            <a href="mailto:kontakt@echo-b.de" className="text-accent font-medium hover:underline">kontakt@echo-b.de</a>
            {' '}·{' '}
            <a href="tel:+4917359089060" className="text-accent font-medium hover:underline">0173 5908906</a>
          </p>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <section className="bg-navy text-white px-6 py-[72px]">
        <div className="mx-auto max-w-[960px] text-center">
          <span className="label">Jetzt starten</span>
          <h2 className="mt-2 text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold text-white">
            3 Tage kostenlos erkunden.
          </h2>
          <p className="mt-4 text-brand-blue max-w-xl mx-auto leading-[1.75]">
            Kein Download, keine Kreditkarte. Einfach loslegen und schauen, ob EchoB dir hilft.
          </p>
          <Link to="/auth" state={{ defaultTab: 'signup' }} className="btn-primary mt-8 inline-flex">
            Jetzt kostenlos starten
          </Link>
          <p className="mt-4 text-xs text-white/30">
            EchoB ersetzt keine Psychotherapie und keine Notfallhilfe.
            Bei Fragen: <a href="tel:+4917359089060" className="underline">0173 5908906</a>
          </p>
        </div>
      </section>

    </PageLayout>
  )
}

function FaqCard({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <button
      type="button"
      onClick={() => setOpen(o => !o)}
      className="card text-left w-full hover:border-accent/40 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-navy">{q}</p>
        <span className={`text-accent text-lg leading-none shrink-0 transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
      </div>
      {open && (
        <p className="mt-3 text-sm text-brand-muted leading-relaxed border-t border-brand-border pt-3">
          {a}
        </p>
      )}
    </button>
  )
}
