import PageLayout from '@/components/layout/PageLayout'

export default function ImpressumPage() {
  return (
    <PageLayout>
      {/* Page Hero */}
      <section className="bg-navy text-white px-6 pt-[calc(60px+52px)] pb-[52px]">
        <div className="mx-auto max-w-[960px]">
          <span className="label">Rechtliches</span>
          <h1 className="mt-2 text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-[-0.02em]">
            Impressum
          </h1>
        </div>
      </section>

      {/* Inhalt */}
      <section className="px-6 py-[72px]">
        <div className="mx-auto max-w-[720px] space-y-10 text-brand-text leading-[1.75]">

          <div>
            <h2 className="text-lg font-bold text-navy mb-3">Angaben gemäß § 5 TMG</h2>
            <p>
              Max Mustermann<br />
              Dorfstraße 1<br />
              111 Hellersdorf<br />
              Deutschland
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-navy mb-3">Kontakt</h2>
            <p>
              E-Mail:{' '}
              <a href="mailto:max.m@echob.de" className="text-accent hover:underline">
                max.m@echob.de
              </a>
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-navy mb-3">
              Verantwortlich für den Inhalt gemäß § 18 Abs. 2 MStV
            </h2>
            <p>
              Max Mustermann<br />
              Dorfstraße 1<br />
              111 Hellersdorf
            </p>
          </div>

          <div className="safety-notice">
            <strong>Hinweis:</strong> EchoB ist kein medizinisches Produkt, ersetzt keine
            Psychotherapie, keine ärztliche Diagnostik und keine Notfallhilfe. Bei akuten
            psychischen Krisen wende dich bitte an den ärztlichen Bereitschaftsdienst
            (116 117) oder die Telefonseelsorge (0800 111 0 111, kostenlos, 24/7).
          </div>

          <div>
            <h2 className="text-lg font-bold text-navy mb-3">Haftungsausschluss</h2>
            <h3 className="font-semibold text-navy mb-1">Haftung für Inhalte</h3>
            <p className="text-brand-muted text-sm mb-4">
              Die Inhalte dieser Website wurden mit größtmöglicher Sorgfalt erstellt.
              Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte übernehmen
              wir jedoch keine Gewähr. Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG
              für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen
              verantwortlich.
            </p>
            <h3 className="font-semibold text-navy mb-1">Haftung für Links</h3>
            <p className="text-brand-muted text-sm">
              Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte
              wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch
              keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der
              jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
            </p>
          </div>

        </div>
      </section>
    </PageLayout>
  )
}
