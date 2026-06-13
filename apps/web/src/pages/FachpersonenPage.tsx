import { Link } from 'react-router-dom'
import PageLayout from '@/components/layout/PageLayout'

const STEPS = [
  {
    no: '1',
    title: 'Klient:in gibt frei',
    text: 'Ihre Klient:in wählt im eigenen Fall gezielt aus, welche Inhalte Sie sehen dürfen – einzelne Szenen, alle Szenen, Berichte, Skalen, Onboarding, Themendialoge oder Profile.',
  },
  {
    no: '2',
    title: 'Sie sehen nur das Freigegebene',
    text: 'Die Freigabe erscheint in Ihrem Postfach. Sie öffnen den Fall und sehen ausschließlich die freigegebenen Inhalte – nichts darüber hinaus.',
  },
  {
    no: '3',
    title: 'Sie bereiten sich vor',
    text: 'Mit Echo besprechen Sie den freigegebenen Fallkontext, halten strukturierte Notizen fest und nutzen das Fachbegriff-Glossar.',
  },
]

const FEATURES = [
  { icon: '📥', title: 'Postfach', text: 'Neue Freigaben auf einen Blick – mit Pseudonym der Klient:in, Falltitel und den freigegebenen Inhalten.' },
  { icon: '🗂️', title: 'Klient:innen-Übersicht', text: 'Alle Ihnen zugewiesenen Fälle, nach Klient:in gruppiert. Jeder Fall ist ein eigener Kontext.' },
  { icon: '🔒', title: 'Nur Freigegebenes', text: 'Serverseitig erzwungen: Sie erhalten ausschließlich, was freigegeben wurde – auch Echo bekommt nie mehr.' },
  { icon: '💬', title: 'Echo im Fallkontext', text: 'Welche Themen tauchen auf? Welche Szenen sind relevant? Welche Fragen helfen? Ohne Diagnosen, ohne Therapieanweisungen.' },
  { icon: '📝', title: 'Strukturierte Notizen', text: 'Erste Eindrücke, wichtige Szenen, offene Fragen, Gesprächsimpulse und nächste Schritte – pro Fall gespeichert.' },
  { icon: '📖', title: 'Glossar', text: 'Fachbegriffe wie Grenze, Verantwortung oder Musterhypothese im Kontext des Falls mit Echo besprechen.' },
]

const TRUST = [
  { title: 'Nur ausgewählte Inhalte', text: 'Klient:innen geben gezielt frei – nicht den ganzen Account, sondern genau das, was sie teilen möchten.' },
  { title: 'Jederzeit widerrufbar', text: 'Eine Freigabe kann jederzeit widerrufen werden. Danach haben Sie keinen Zugriff mehr auf den Fall.' },
  { title: 'Pseudonym statt Klarname', text: 'Sie sehen das Pseudonym Ihrer Klient:in – keine E-Mail-Adresse, keine Kontodaten.' },
  { title: 'Serverseitig abgesichert', text: 'Der Zugriff wird bei jedem Aufruf serverseitig geprüft – nicht nur in der Oberfläche.' },
]

const AUDIENCE = [
  { title: 'Psychotherapeut:innen', text: 'Ein strukturierter, freigegebener Fallkontext als Grundlage für ein fokussiertes Erstgespräch.' },
  { title: 'Berater:innen', text: 'Beratung kann gezielter starten, wenn Klient:innen ihre Beobachtungen bereits sortiert haben.' },
  { title: 'Coaches', text: 'Konkrete Situationen und Muster benennen – als Grundlage für die Coaching-Arbeit.' },
]

export default function FachpersonenPage() {
  return (
    <PageLayout>

      {/* Hero */}
      <section className="bg-navy text-white px-6 pt-[calc(60px+4rem)] pb-16">
        <div className="mx-auto max-w-[960px]">
          <span className="label">Für Fachpersonen</span>
          <h1 className="mt-2 text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold leading-[1.2] tracking-[-0.02em] max-w-2xl">
            Gespräche, die schon vorbereitet beginnen
          </h1>
          <p className="mt-5 text-[1.05rem] text-brand-blue max-w-[600px] leading-[1.75]">
            Ihre Klient:innen reflektieren ihre Beziehungssituation strukturiert in EchoB –
            und geben Ihnen gezielt genau die Inhalte frei, die für Ihre Arbeit relevant sind.
            Sie sehen ausschließlich, was freigegeben wurde.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth?role=professional" className="btn-primary">
              Als Fachperson registrieren
            </Link>
            <a
              href="#so-funktionierts"
              className="btn border-2 border-white/25 text-white hover:bg-white/10"
            >
              So funktioniert's
            </a>
          </div>
        </div>
      </section>

      {/* So funktioniert's */}
      <section id="so-funktionierts" className="border-t border-brand-border px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <span className="label">So funktioniert's</span>
          <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy">
            In drei Schritten zu freigegebenem Fallkontext
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map(({ no, title, text }) => (
              <div key={no} className="card">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent font-bold mb-3">
                  {no}
                </div>
                <h3 className="font-bold text-navy mb-2">{title}</h3>
                <p className="text-sm text-brand-muted leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Funktionen */}
      <section className="border-t border-brand-border bg-navy/[0.02] px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <span className="label">Funktionen</span>
          <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy">
            Was der Fachpersonenbereich bietet
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon, title, text }) => (
              <div key={title} className="card">
                <div className="text-2xl mb-3" aria-hidden="true">{icon}</div>
                <h3 className="font-bold text-navy mb-2">{title}</h3>
                <p className="text-sm text-brand-muted leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vertrauen / Datenschutz */}
      <section className="border-t border-brand-border px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <span className="label">Auf Einwilligung gebaut</span>
          <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy">
            Klient:innen behalten die Kontrolle
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {TRUST.map(({ title, text }) => (
              <div key={title} className="flex gap-3">
                <span className="mt-0.5 text-accent" aria-hidden="true">✓</span>
                <div>
                  <h3 className="font-bold text-navy mb-1">{title}</h3>
                  <p className="text-sm text-brand-muted leading-relaxed">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Für wen */}
      <section className="border-t border-brand-border bg-navy/[0.02] px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <span className="label">Für wen</span>
          <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy">EchoB richtet sich an</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {AUDIENCE.map(({ title, text }) => (
              <div key={title} className="card">
                <h3 className="font-bold text-navy mb-2">{title}</h3>
                <p className="text-sm text-brand-muted leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-brand-border px-6 py-[80px]">
        <div className="mx-auto max-w-[960px] text-center">
          <span className="label">Loslegen</span>
          <h2 className="text-[clamp(1.5rem,2.8vw,2rem)] font-bold leading-[1.25] text-navy mb-4">
            Jetzt als Fachperson starten
          </h2>
          <p className="text-brand-muted max-w-[620px] mx-auto leading-[1.75] mb-8">
            Erstellen Sie Ihr Fachpersonen-Profil. Sobald eine Klient:in Sie per E-Mail einlädt und
            Inhalte freigibt, erscheint der Fall in Ihrem Postfach. Bei Fragen erreichen Sie uns direkt.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/auth?role=professional" className="btn-primary">
              Als Fachperson registrieren
            </Link>
            <a
              href="mailto:coaching@echo-b.de?subject=Fachpersonenbereich"
              className="btn bg-white text-navy border-2 border-brand-border hover:border-navy/30"
            >
              Kontakt aufnehmen
            </a>
          </div>

          <div className="mt-10 rounded-brand border border-amber-200 bg-amber-50 px-5 py-4 max-w-xl mx-auto text-left">
            <p className="text-sm text-amber-800">
              <strong>Wichtig:</strong> EchoB stellt keine Diagnosen und ersetzt keine professionelle
              Diagnostik. Echo gibt keine Diagnosen oder Therapieanweisungen – die Inhalte sind
              Reflexionshilfen, keine klinischen Dokumente.
            </p>
          </div>
        </div>
      </section>

    </PageLayout>
  )
}
