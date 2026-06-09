import { Link } from 'react-router-dom'
import PageLayout from '@/components/layout/PageLayout'

const CARDS = [
  '„Ich weiß nicht mehr, ob ich übertreibe."',
  '„Nach jedem Streit bin ich verwirrter als vorher."',
  '„Manchmal ist alles nah – und kurz danach wieder kalt."',
  '„Ich erkenne ein Muster, kann es aber nicht greifen."',
  '„Ich möchte meine Situation für Therapie sortieren."',
]

const STEPS = [
  {
    n: '1',
    title: 'Situation beschreiben',
    text: 'Du schilderst, was dich bewegt – im eigenen Tempo, mit eigenen Worten.',
  },
  {
    n: '2',
    title: 'Muster erkennen',
    text: 'Wiederkehrende Dynamiken werden sichtbar gemacht – ohne Bewertung.',
  },
  {
    n: '3',
    title: 'Nächste Schritte sehen',
    text: 'Du erhältst Orientierung für nächste Schritte und professionelle Hilfe.',
  },
]

export default function LandingPage() {
  return (
    <PageLayout>

      {/* ── Hero (navy) ───────────────────────────────────────────── */}
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
          <p className="mt-5 text-[1.05rem] text-brand-blue max-w-[560px] leading-[1.75]">
            EchoB hilft dir, belastende Situationen zu sortieren, wiederkehrende
            Muster sichtbar zu machen und deine nächsten Schritte klarer zu sehen.
          </p>
          <div className="mt-9 flex flex-wrap gap-3.5">
            <Link to="/warteliste" className="btn-primary">
              Auf die Warteliste
            </Link>
            <a href="#wie-es-funktioniert" className="btn-outline">
              Wie es funktioniert
            </a>
          </div>
        </div>
      </section>

      {/* ── Gedanken-Karten (hell) ────────────────────────────────── */}
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
            {CARDS.map((text) => (
              <div key={text} className="card italic text-brand-muted">
                {text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Wie es funktioniert (hell) ────────────────────────────── */}
      <section id="wie-es-funktioniert" className="border-t border-brand-border px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <span className="label">So funktioniert EchoB</span>
          <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy">
            Drei Schritte zu mehr Klarheit
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map(({ n, title, text }) => (
              <div key={n} className="card">
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent font-bold text-sm">
                  {n}
                </div>
                <h3 className="mb-2 font-bold text-navy">{title}</h3>
                <p className="text-sm text-brand-muted leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA (navy) ────────────────────────────────────────────── */}
      <section className="bg-navy text-white px-6 py-[72px]">
        <div className="mx-auto max-w-[960px] text-center">
          <span className="label">Jetzt starten</span>
          <h2 className="mt-2 text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold text-white">
            Sei dabei, wenn EchoB startet.
          </h2>
          <p className="mt-4 text-brand-blue max-w-xl mx-auto leading-[1.75]">
            EchoB ist in Entwicklung. Trag dich ein – wir melden uns, sobald es losgeht.
          </p>
          <Link to="/warteliste" className="btn-primary mt-8 inline-flex">
            Auf die Warteliste
          </Link>
          <p className="mt-4 text-xs text-white/30">
            EchoB ersetzt keine Psychotherapie und keine Notfallhilfe.
          </p>
        </div>
      </section>

    </PageLayout>
  )
}
