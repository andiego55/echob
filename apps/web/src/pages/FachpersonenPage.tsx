import PageLayout from '@/components/layout/PageLayout'

export default function FachpersonenPage() {
  return (
    <PageLayout>

      {/* Hero */}
      <section className="bg-navy text-white px-6 pt-[calc(60px+4rem)] pb-16">
        <div className="mx-auto max-w-[960px]">
          <span className="label">Für Fachpersonen</span>
          <h1 className="mt-2 text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold leading-[1.2] tracking-[-0.02em] max-w-2xl">
            Besser informierte Erstgespräche
          </h1>
          <p className="mt-5 text-[1.05rem] text-brand-blue max-w-[560px] leading-[1.75]">
            EchoB hilft Klient:innen, ihre Situation strukturiert aufzuarbeiten –
            bevor sie zu Ihnen kommen.
          </p>
        </div>
      </section>

      {/* Für wen */}
      <section className="border-t border-brand-border px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <span className="label">Für wen</span>
          <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy">EchoB richtet sich an</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              { title: 'Psychotherapeut:innen', text: 'Klient:innen können einen strukturierten Bericht aus EchoB als Gesprächsgrundlage für das Erstgespräch mitbringen.' },
              { title: 'Berater:innen', text: 'Beratungsgespräche können gezielter starten, wenn Klient:innen ihre Beobachtungen bereits sortiert haben.' },
              { title: 'Coaches', text: 'EchoB unterstützt Klient:innen dabei, konkrete Situationen und Muster zu benennen – als Grundlage für Coaching-Arbeit.' },
            ].map(({ title, text }) => (
              <div key={title} className="card">
                <h3 className="font-bold text-navy mb-2">{title}</h3>
                <p className="text-sm text-brand-muted leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Status + Kontakt */}
      <section className="border-t border-brand-border bg-navy/[0.02] px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <span className="label">Status</span>
          <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy mb-4">
            Fachpersonenbereich in Planung
          </h2>
          <p className="text-brand-muted max-w-[600px] leading-[1.75] mb-6">
            Ein eigener Bereich für Fachpersonen ist in Planung. Bei Interesse melden Sie sich gerne direkt bei uns.
          </p>
          <div className="flex flex-wrap gap-4">
            <a href="mailto:info@echo-b.de?subject=Interesse Fachpersonenbereich" className="btn-primary">
              Interesse bekunden
            </a>
            <a href="tel:+4917359089060" className="btn bg-white text-navy border-2 border-brand-border hover:border-navy/30">
              ☎ 0173 5908906
            </a>
          </div>
          <div className="mt-8 rounded-brand border border-amber-200 bg-amber-50 px-5 py-4 max-w-xl">
            <p className="text-sm text-amber-800">
              <strong>Wichtig:</strong> EchoB stellt keine Diagnosen und ersetzt keine professionelle Diagnostik.
              EchoB-Berichte sind Reflexionshilfen, keine klinischen Dokumente.
            </p>
          </div>
        </div>
      </section>

    </PageLayout>
  )
}
