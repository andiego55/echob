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

export default function AGBPage() {
  return (
    <PageLayout>
      <section className="bg-navy text-white px-6 pt-[calc(60px+52px)] pb-[52px]">
        <div className="mx-auto max-w-[960px]">
          <span className="label">Rechtliches</span>
          <h1 className="mt-2 text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-[-0.02em]">
            Allgemeine Geschäftsbedingungen (AGB)
          </h1>
        </div>
      </section>

      <section className="px-6 py-[72px]">
        <div className="mx-auto max-w-[720px] space-y-8 leading-[1.75]">

          <div className="rounded-brand border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            <strong>Hinweis (Entwurf):</strong> Diese AGB sind ein noch nicht anwaltlich geprüftes
            Gerüst. Vor dem Verkauf an Verbraucher:innen müssen sie rechtlich final geprüft und an
            die konkrete Konstellation angepasst werden.
          </div>

          <Section title="§ 1 Geltungsbereich und Anbieter">
            <p>
              Diese AGB gelten für alle Verträge über kostenpflichtige Leistungen, die über die
              Plattform EchoB (echo-b.de) zwischen dem Anbieter (Name, Anschrift und Kontakt siehe{' '}
              <Link to="/impressum" className="text-accent hover:underline">Impressum</Link>) und den
              Nutzenden („Kund:innen") geschlossen werden. Verbraucher:in ist jede natürliche Person,
              die das Geschäft zu überwiegend privaten Zwecken abschließt (§ 13 BGB).
            </p>
          </Section>

          <Section title="§ 2 Vertragsgegenstand und Leistungen">
            <p>
              EchoB ist eine fallbasierte Reflexions- und Selbstcoaching-Anwendung. Kostenpflichtige
              Leistungen sind:
            </p>
            <ul className="list-disc list-inside space-y-1 text-brand-muted text-sm">
              <li><strong className="text-navy">App-Abos</strong> (Early Bird, Monatsabo, Jahresabo): digitaler Vollzugang für die jeweilige Laufzeit.</li>
              <li><strong className="text-navy">Coaching-Leistungen</strong>: separat buchbare persönliche Online-Coaching-Stunden nach gesonderter Vereinbarung.</li>
            </ul>
            <p className="text-sm text-brand-muted">
              Der kostenlose Testzugang ist kein kostenpflichtiger Vertrag im Sinne dieser AGB.
            </p>
          </Section>

          <Section title="§ 3 Vertragsschluss">
            <p>
              Die Darstellung der Leistungen stellt kein bindendes Angebot dar. Durch Anklicken des
              entsprechend beschrifteten Bestell-Buttons („zahlungspflichtig bestellen" bzw.
              „zahlungspflichtig abonnieren") und Abschluss des Bezahlvorgangs über unseren
              Zahlungsdienstleister Stripe gibt die Kund:in ein verbindliches Angebot ab. Der Vertrag
              kommt mit der Bestätigung bzw. erfolgreichen Zahlung zustande; die Kund:in erhält eine
              Bestätigung per E-Mail.
            </p>
          </Section>

          <Section title="§ 4 Preise und Zahlung">
            <p>
              Alle Preise sind Endpreise in Euro und verstehen sich <strong>inkl. der gesetzlichen
              Umsatzsteuer</strong>. Die Zahlung erfolgt über den Zahlungsdienstleister Stripe
              (Kreditkarte, SEPA-Lastschrift u. a.). Abo-Entgelte sind zu Beginn des jeweiligen
              Abrechnungszeitraums im Voraus fällig.
            </p>
          </Section>

          <Section title="§ 5 Laufzeit, Verlängerung und Kündigung">
            <p>
              App-Abos haben die im Tarif angegebene Laufzeit (monatlich bzw. jährlich) und verlängern
              sich automatisch um die jeweilige Laufzeit, sofern sie nicht rechtzeitig gekündigt
              werden. Die Kündigung ist jederzeit zum Ende des laufenden Abrechnungszeitraums möglich
              – komfortabel über das Stripe-Kundenportal („Abo verwalten") oder in Textform an die im
              Impressum genannte Adresse.
            </p>
          </Section>

          <Section title="§ 6 Widerrufsrecht">
            <p>
              Verbraucher:innen steht ein gesetzliches Widerrufsrecht zu. Einzelheiten und das
              Muster-Widerrufsformular finden sich in der{' '}
              <Link to="/widerruf" className="text-accent hover:underline">Widerrufsbelehrung</Link>.
              Bei digitalen Inhalten und Dienstleistungen kann das Widerrufsrecht vorzeitig erlöschen,
              wenn die Kund:in dem sofortigen Beginn ausdrücklich zustimmt und ihre Kenntnis vom
              Erlöschen bestätigt.
            </p>
          </Section>

          <Section title="§ 7 Coaching-Leistungen">
            <p>
              Separat gebuchte Coaching-Stunden werden nach gesonderter Terminvereinbarung online
              durchgeführt. Sie ersetzen keine Psychotherapie, keine Heilbehandlung und keine
              Beratung im Sinne der jeweiligen Berufsordnungen. Terminabsagen sind bis 24 Stunden vor
              dem Termin kostenfrei möglich.
            </p>
          </Section>

          <Section title="§ 8 Verfügbarkeit und Änderungen">
            <p>
              Wir bemühen uns um eine möglichst unterbrechungsfreie Verfügbarkeit, schulden diese aber
              nicht zu 100 %. Wartungsarbeiten, Weiterentwicklungen oder Änderungen einzelner Funktionen
              bleiben vorbehalten, soweit der wesentliche Leistungsumfang erhalten bleibt.
            </p>
          </Section>

          <Section title="§ 9 Pflichten der Nutzenden">
            <p>
              Die Nutzenden verpflichten sich, <strong>keine Klarnamen oder identifizierenden Daten
              dritter Personen</strong> einzugeben (Pseudonyme verwenden) und die App nicht für
              rechtswidrige Zwecke zu nutzen. Zugangsdaten sind vertraulich zu behandeln.
            </p>
          </Section>

          <Section title="§ 10 Kein Ersatz für Therapie oder Notfallhilfe">
            <p>
              EchoB ist kein Medizinprodukt und stellt keine Diagnosen. Die Inhalte sind
              Reflexionshilfen und ersetzen weder Psychotherapie noch ärztliche Behandlung noch
              Notfallhilfe. In akuten Krisen: ärztlicher Bereitschaftsdienst 116 117 oder
              Telefonseelsorge 0800 111 0 111 (kostenlos, 24/7).
            </p>
          </Section>

          <Section title="§ 11 Haftung">
            <p>
              Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei Verletzung von
              Leben, Körper und Gesundheit. Bei einfacher Fahrlässigkeit haften wir nur bei Verletzung
              wesentlicher Vertragspflichten (Kardinalpflichten) und der Höhe nach begrenzt auf den
              vertragstypisch vorhersehbaren Schaden. Im Übrigen ist die Haftung ausgeschlossen.
            </p>
          </Section>

          <Section title="§ 12 Streitbeilegung">
            <p>
              Die EU-Kommission stellt eine Plattform zur Online-Streitbeilegung bereit:{' '}
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">ec.europa.eu/consumers/odr</a>.
              Zur Teilnahme an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
              sind wir nicht verpflichtet und grundsätzlich nicht bereit.
            </p>
          </Section>

          <Section title="§ 13 Schlussbestimmungen">
            <p>
              Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.
              Zwingende verbraucherschützende Vorschriften des Staates des gewöhnlichen Aufenthalts der
              Kund:in bleiben unberührt. Sollten einzelne Bestimmungen unwirksam sein, bleibt die
              Wirksamkeit der übrigen Bestimmungen unberührt.
            </p>
            <p className="text-xs text-brand-muted">Stand: {new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })} · Entwurf, anwaltlich zu prüfen.</p>
          </Section>

        </div>
      </section>
    </PageLayout>
  )
}
