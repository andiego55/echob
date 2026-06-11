import { Link } from 'react-router-dom'
import PageLayout from '@/components/layout/PageLayout'

export default function UeberPage() {
  return (
    <PageLayout>

      {/* Hero */}
      <section className="bg-navy text-white px-6 pt-[calc(60px+4rem)] pb-16">
        <div className="mx-auto max-w-[960px]">
          <span className="label">Über EchoB</span>
          <h1 className="mt-2 text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold leading-[1.2] tracking-[-0.02em] max-w-2xl">
            Erkenne, was sich wiederholt.
          </h1>
          <p className="mt-5 text-[1.05rem] text-brand-blue max-w-[560px] leading-[1.75]">
            EchoB entstand aus einer einfachen Beobachtung: Viele Menschen stecken in Beziehungssituationen,
            die sie nicht einordnen können – und finden keinen guten ersten Schritt.
          </p>
        </div>
      </section>

      {/* Was EchoB ist */}
      <section className="border-t border-brand-border px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold text-navy mb-3">Was EchoB ist</h2>
          <p className="text-brand-muted max-w-[600px] leading-[1.75] mb-10">
            EchoB ist eine Reflexionsplattform für Menschen in belastenden oder schwer einzuordnenden Beziehungssituationen.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="card">
              <h3 className="font-bold text-navy mb-2">Ein Werkzeug zur Selbstreflexion</h3>
              <p className="text-sm text-brand-muted leading-relaxed">
                EchoB hilft dabei, eigene Wahrnehmungen zu sortieren, Beobachtungen von Interpretationen zu trennen
                und wiederkehrende Dynamiken sichtbar zu machen.
              </p>
            </div>
            <div className="card">
              <h3 className="font-bold text-navy mb-2">Eine Brücke zur professionellen Hilfe</h3>
              <p className="text-sm text-brand-muted leading-relaxed">
                EchoB soll den Weg zu Therapie, Beratung oder Coaching erleichtern – nicht ersetzen.
                Strukturierte Berichte helfen, Erstgespräche effizienter zu nutzen.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Was EchoB nicht ist */}
      <section className="border-t border-brand-border bg-navy/[0.02] px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold text-navy mb-10">Was EchoB nicht ist</h2>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { title: 'Keine Diagnose-App', text: 'EchoB stellt keine psychologischen oder medizinischen Diagnosen und benennt keine Persönlichkeitsstörungen.' },
              { title: 'Kein Therapieersatz', text: 'EchoB ersetzt keine Psychotherapie, keine psychologische Beratung und keine medizinische Behandlung.' },
              { title: 'Keine Notfallhilfe', text: 'Bei akuter Gefahr verweist EchoB auf geeignete Stellen. Die App ist nicht für Krisensituationen ausgelegt.' },
            ].map(({ title, text }) => (
              <div key={title} className="card border-l-2 border-l-accent">
                <h3 className="font-bold text-navy mb-2">{title}</h3>
                <p className="text-sm text-brand-muted leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-brand border border-amber-200 bg-amber-50 px-5 py-4 max-w-xl">
            <p className="text-sm text-amber-800">
              Bei akuter Gefahr: Telefonseelsorge{' '}
              <strong>0800 111 0 111</strong> (kostenlos, 24/7) oder Notruf <strong>112</strong>.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-brand-border px-6 py-[72px]">
        <div className="mx-auto max-w-[960px] flex flex-wrap gap-4 items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-navy mb-1">EchoB selbst erleben</h2>
            <p className="text-sm text-brand-muted">3 Tage kostenlos testen – kein Download, keine Kreditkarte.</p>
          </div>
          <Link to="/auth" state={{ defaultTab: 'signup' }} className="btn-primary">
            Kostenlos starten
          </Link>
        </div>
      </section>

    </PageLayout>
  )
}
