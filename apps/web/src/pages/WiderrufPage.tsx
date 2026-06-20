import PageLayout from '@/components/layout/PageLayout'
import { Link } from 'react-router-dom'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-navy mb-3">{title}</h2>
      <div className="space-y-3 text-brand-text">{children}</div>
    </div>
  )
}

export default function WiderrufPage() {
  return (
    <PageLayout>
      <section className="bg-navy text-white px-6 pt-[calc(60px+52px)] pb-[52px]">
        <div className="mx-auto max-w-[960px]">
          <span className="label">Rechtliches</span>
          <h1 className="mt-2 text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-[-0.02em]">
            Widerrufsbelehrung
          </h1>
        </div>
      </section>

      <section className="px-6 py-[72px]">
        <div className="mx-auto max-w-[720px] space-y-8 leading-[1.75]">

          <div className="rounded-brand border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            <strong>Hinweis (Entwurf):</strong> Diese Widerrufsbelehrung ist ein noch nicht anwaltlich
            geprüftes Gerüst auf Basis des gesetzlichen Musters. Vor dem Verkauf an Verbraucher:innen
            rechtlich final prüfen lassen.
          </div>

          <Section title="Widerrufsrecht">
            <p>
              Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu
              widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsschlusses.
            </p>
            <p>
              Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (Anbieter, Anschrift siehe{' '}
              <Link to="/impressum" className="text-accent hover:underline">Impressum</Link>) mittels
              einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder eine E-Mail)
              über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das
              untenstehende Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.
            </p>
            <p>
              Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung
              des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.
            </p>
          </Section>

          <Section title="Folgen des Widerrufs">
            <p>
              Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen
              erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag
              zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf bei uns eingegangen ist. Für
              diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen
              Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes
              vereinbart.
            </p>
          </Section>

          <Section title="Vorzeitiges Erlöschen des Widerrufsrechts">
            <p>
              Haben Sie verlangt, dass die <strong>Dienstleistung</strong> (z. B. der App-Zugang oder
              die Coaching-Stunde) während der Widerrufsfrist beginnt, so haben Sie uns einen
              angemessenen Betrag zu zahlen, der dem Anteil der bis zum Widerruf bereits erbrachten
              Leistung entspricht.
            </p>
            <p>
              Das Widerrufsrecht <strong>erlischt</strong> bei einem Vertrag über die Erbringung von
              Dienstleistungen, wenn wir die Leistung vollständig erbracht haben und mit der Ausführung
              erst begonnen haben, nachdem Sie dazu Ihre ausdrückliche Zustimmung gegeben und
              gleichzeitig Ihre Kenntnis davon bestätigt haben, dass Sie Ihr Widerrufsrecht bei
              vollständiger Vertragserfüllung verlieren. Bei digitalen Inhalten gilt Entsprechendes
              (§ 356 Abs. 5 BGB). Genau diese Zustimmung holen wir vor dem Kauf über eine Checkbox ein.
            </p>
          </Section>

          <Section title="Muster-Widerrufsformular">
            <p className="text-sm text-brand-muted">
              (Wenn Sie den Vertrag widerrufen wollen, füllen Sie bitte dieses Formular aus und senden
              Sie es zurück.)
            </p>
            <div className="rounded-brand border border-brand-border bg-white px-5 py-4 text-sm text-brand-text space-y-2">
              <p>An: [Anbieter – Name und Anschrift siehe Impressum], E-Mail: [siehe Impressum]</p>
              <p>
                Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den
                Kauf der folgenden Leistung (*):
              </p>
              <p>— Bestellt am (*) / erhalten am (*): __________</p>
              <p>— Name der/des Verbraucher(s): __________</p>
              <p>— Anschrift der/des Verbraucher(s): __________</p>
              <p>— Datum: __________</p>
              <p className="text-brand-muted text-xs">(*) Unzutreffendes streichen.</p>
            </div>
            <p className="text-xs text-brand-muted">Stand: {new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })} · Entwurf, anwaltlich zu prüfen.</p>
          </Section>

        </div>
      </section>
    </PageLayout>
  )
}
