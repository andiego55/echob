/**
 * Geschäftsbedingungen für Praxen, Institute und Ausbildungsstätten.
 *
 * **Warum es diese Seite gibt.** Die bestehenden AGB adressieren ausschließlich
 * Verbraucher:innen („Verbraucher:in ist jede natürliche Person, die das Geschäft zu
 * überwiegend privaten Zwecken abschließt"). Verkauft werden aber Solo, Praxis, Institut
 * und Ausbildung — an Unternehmen. Das **komplette Umsatzmodell** lief damit ohne
 * Bedingungen: kein Ausschluss des Widerrufsrechts für Unternehmer, keine Nettopreise,
 * nichts zu § 14 UStG, keine Verknüpfung mit dem Auftragsverarbeitungsvertrag.
 *
 * **Eine eigene Seite und kein zweiter Teil der Verbraucher-AGB.** Beide Texte würden
 * dadurch länger und für beide Seiten unschärfer — und die Verbraucher-AGB sind der
 * Text, den ein Gericht im Zweifel streng liest. Getrennte Adressaten, getrennte
 * Dokumente.
 *
 * **Was hier NICHT entschieden wird.** An drei Stellen steht eine Entscheidung aus, die
 * nicht meine ist; sie sind im Text sichtbar markiert statt stillschweigend gefüllt:
 * die Umsatzsteuer (hängt am Status), die Haftungshöhe und der Gerichtsstand.
 */
import { Link } from 'react-router-dom'

import PageLayout from '@/components/layout/PageLayout'
import { RECHTSSTAND } from '@/lib/rechtsstand'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-navy mb-3">{title}</h2>
      <div className="space-y-3 text-brand-text">{children}</div>
    </div>
  )
}

/** Eine Stelle, an der eine Entscheidung aussteht — sichtbar statt stillschweigend gefüllt. */
function Offen({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-900">{children}</span>
  )
}

export default function AGBFachpersonenPage() {
  return (
    <PageLayout>
      <section className="bg-navy text-white px-6 pt-[calc(60px+52px)] pb-[52px]">
        <div className="mx-auto max-w-[960px]">
          <span className="label">Rechtliches</span>
          <h1 className="mt-2 text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-[-0.02em]">
            Geschäftsbedingungen für Praxen, Institute und Ausbildungsstätten
          </h1>
          <p className="mt-2 text-[0.95rem] text-brand-blue">
            Für Verträge mit Unternehmen. Verbraucher:innen finden ihre Bedingungen unter AGB.
          </p>
        </div>
      </section>

      <section className="px-6 py-[72px]">
        <div className="mx-auto max-w-[720px] space-y-8 leading-[1.75]">

          <div className="rounded-brand border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            <strong>Hinweis (Entwurf):</strong> Ein noch nicht anwaltlich geprüftes Gerüst.
            Gelb markierte Stellen sind offene Entscheidungen, keine Formulierungsfragen.
          </div>

          <Section title="§ 1 Geltungsbereich">
            <p>
              Diese Bedingungen gelten für alle Verträge über kostenpflichtige Leistungen
              zwischen dem Anbieter (siehe{' '}
              <Link to="/impressum" className="text-accent hover:underline">Impressum</Link>)
              und <strong>Unternehmern</strong> im Sinne von § 14 BGB — insbesondere
              Praxen, Beratungsstellen, Instituten und Ausbildungsstätten („Kundin").
            </p>
            <p>
              Für Verträge mit Verbraucher:innen gelten ausschließlich die{' '}
              <Link to="/agb" className="text-accent hover:underline">allgemeinen AGB</Link>.
              Entgegenstehende oder abweichende Bedingungen der Kundin werden nicht
              Vertragsbestandteil, auch wenn ihnen nicht ausdrücklich widersprochen wird.
            </p>
            <p>
              <strong>Kein Widerrufsrecht:</strong> Das gesetzliche Widerrufsrecht steht nur
              Verbraucher:innen zu und besteht bei Verträgen nach diesen Bedingungen nicht.
            </p>
          </Section>

          <Section title="§ 2 Leistung und die Werteinheit „aktiver Fall“">
            <p>
              EchoB stellt eine Plattform bereit, über die die Kundin Fälle ihrer
              Klient:innen begleiten kann — mit Fachpersonen-Echo, Berichten, Hypothesen,
              Sitzungsnotizen und Vorlagen. Die Klient:in behält ihr eigenes Konto und
              entscheidet, welche Inhalte sie freigibt.
            </p>
            <p>
              <strong>Abgerechnet wird der aktive Fall.</strong> Aktiv ist ein Fall, sobald
              die Kundin in einem Abrechnungszeitraum mit den Fachpersonen-Werkzeugen daran
              arbeitet. Maßgeblich ist der im laufenden Zeitraum <strong>erstmals</strong>{' '}
              aktivierte, unterschiedliche Fall; eine erneute Aktivierung desselben Falls im
              selben Zeitraum ist kostenfrei. Das Abschließen oder Archivieren eines Falls
              gibt die Einheit innerhalb des laufenden Zeitraums nicht zurück.
            </p>
            <p>
              Welche Tarife es gibt und wie viele Fälle sie enthalten, steht auf der{' '}
              <Link to="/fuer-fachpersonen" className="text-accent hover:underline">
                Seite für Fachpersonen
              </Link>. Die Nutzung ohne aktiven Fall — Spielwiese, Beispielfall,
              Kennenlernen — ist kostenfrei.
            </p>
          </Section>

          <Section title="§ 3 Vertragsschluss">
            <p>
              Die Darstellung der Tarife ist kein bindendes Angebot. Mit Abschluss des
              Bezahlvorgangs über unseren Zahlungsdienstleister gibt die Kundin ein
              verbindliches Angebot ab; der Vertrag kommt mit der Bestätigung bzw. der
              erfolgreichen Zahlung zustande.
            </p>
          </Section>

          <Section title="§ 4 Preise, Umsatzsteuer, Zahlung">
            <p>
              Alle Preise verstehen sich <strong>netto</strong>, zuzüglich der jeweils
              geltenden gesetzlichen Umsatzsteuer. Die Umsatzsteuer wird in der Rechnung
              gesondert ausgewiesen.
            </p>
            <p>
              Die Entgelte sind zu Beginn des jeweiligen Abrechnungszeitraums im Voraus
              fällig. Rechnungen werden elektronisch bereitgestellt und enthalten die
              Angaben nach § 14 UStG.
            </p>
            <p>
              Übersteigt die Zahl der im Zeitraum aktivierten Fälle das Kontingent des
              Tarifs, ist ein Wechsel in den nächsthöheren Tarif erforderlich; ein
              automatischer Mehrverbrauch wird nicht abgerechnet.
            </p>
          </Section>

          <Section title="§ 5 Laufzeit und Kündigung">
            <p>
              Die Verträge laufen monatlich und verlängern sich jeweils um einen Monat,
              wenn sie nicht zum Ende des laufenden Abrechnungszeitraums gekündigt werden.
              Die Kündigung ist über das Abrechnungsportal oder in Textform möglich.
            </p>
            <p>
              Nach Vertragsende enden die Fachpersonen-Werkzeuge. Die Konten und Inhalte der
              Klient:innen bleiben <strong>unberührt</strong> — sie gehören ihnen und nicht
              der Kundin. Die eigene Dokumentation der Kundin bleibt abrufbar, solange ihr
              Konto besteht; sie ist für deren Export selbst verantwortlich.
            </p>
          </Section>

          <Section title="§ 6 Datenschutz: Auftragsverarbeitung und Schweigepflicht">
            <p>
              Für die von Klient:innen freigegebenen Inhalte ist die Kundin{' '}
              <strong>Verantwortliche</strong> im Sinne der DSGVO; EchoB verarbeitet insoweit
              in ihrem Auftrag. Der <strong>Vertrag zur Auftragsverarbeitung</strong>{' '}
              (Art. 28 DSGVO) ist Bestandteil dieses Vertrags und vor der ersten
              Verarbeitung im Fachpersonenbereich zu schließen; ohne ihn bleiben die
              Werkzeuge gesperrt.
            </p>
            <p>
              <strong>Berufsgeheimnisträger:innen</strong> (§ 203 StGB — insbesondere
              approbierte Psychotherapeut:innen, Ärzt:innen, Berufspsycholog:innen,
              anerkannte Sozialarbeiter:innen sowie Berater:innen in anerkannten
              Beratungsstellen) verpflichten EchoB als mitwirkende Person gesondert zur
              Geheimhaltung; EchoB verpflichtet die eingesetzten
              Unterauftragsverarbeiter entsprechend. Die Einordnung der eigenen Berufsgruppe
              obliegt der Kundin.
            </p>
            <p>
              Die Kundin stellt sicher, dass die erforderlichen Einwilligungen ihrer
              Klient:innen vorliegen und dass ihre Nutzung mit ihrem Berufsrecht vereinbar
              ist.
            </p>
          </Section>

          <Section title="§ 7 Pflichten der Kundin">
            <p>
              Zugangsdaten sind vertraulich zu behandeln und nicht weiterzugeben; jedes
              Mitglied der Praxis nutzt ein eigenes Konto. Die Kundin gibt keine Klarnamen
              oder identifizierenden Angaben Dritter ein, soweit sie für die Arbeit nicht
              erforderlich sind.
            </p>
            <p>
              Die Werkzeuge dürfen nicht als Grundlage für Behandlungsentscheidungen,
              Diagnosen oder Gutachten verwendet werden (siehe § 9).
            </p>
          </Section>

          <Section title="§ 8 Verfügbarkeit und Weiterentwicklung">
            <p>
              Wir bemühen uns um eine möglichst unterbrechungsfreie Verfügbarkeit, schulden
              sie aber nicht zu 100 % und sagen keine Verfügbarkeitsquote zu. Wartung,
              Weiterentwicklung und Änderungen einzelner Funktionen bleiben vorbehalten,
              soweit der wesentliche Leistungsumfang erhalten bleibt und die Änderung für
              die Kundin zumutbar ist. Wesentliche Änderungen kündigen wir mit angemessener
              Frist in Textform an.
            </p>
          </Section>

          <Section title="§ 9 Kein Medizinprodukt">
            <p>
              EchoB ist <strong>kein Medizinprodukt</strong> und stellt keine Diagnosen. Die
              Werkzeuge dienen der Strukturierung, Dokumentation und Vorbereitung; die
              fachliche Beurteilung und jede Behandlungsentscheidung liegen allein bei der
              Kundin. Erzeugte Texte, Skalen und Hypothesen sind Anhaltspunkte und können
              unvollständig oder fehlerhaft sein. Näheres in der{' '}
              <a
                href="https://github.com/andiego55/echob/blob/main/docs/zweckbestimmung.md"
                className="text-accent hover:underline"
              >
                Zweckbestimmung
              </a>.
            </p>
          </Section>

          <Section title="§ 10 Haftung">
            <p>
              Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei
              Verletzung von Leben, Körper und Gesundheit. Bei einfacher Fahrlässigkeit
              haften wir nur bei Verletzung wesentlicher Vertragspflichten und der Höhe nach
              begrenzt auf den vertragstypisch vorhersehbaren Schaden,{' '}
              <Offen>höchstens jedoch auf das in den vorangegangenen zwölf Monaten
              gezahlte Entgelt — die Obergrenze ist eine unternehmerische Entscheidung und
              festzulegen.</Offen> Im Übrigen ist die Haftung ausgeschlossen.
            </p>
          </Section>

          <Section title="§ 11 Schlussbestimmungen">
            <p>
              Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des
              UN-Kaufrechts.{' '}
              <Offen>Gerichtsstand: gegenüber Kaufleuten frei vereinbar — Sitz des
              Anbieters oder ein anderer Ort; festzulegen.</Offen> Sollten einzelne
              Bestimmungen unwirksam sein, bleibt die Wirksamkeit der übrigen unberührt.
            </p>
            <p className="text-sm text-brand-muted">
              Stand: {RECHTSSTAND.agbFachpersonen.stand} · Fassung{' '}
              {RECHTSSTAND.agbFachpersonen.fassung} · Entwurf, anwaltlich zu prüfen.
            </p>
          </Section>

        </div>
      </section>
    </PageLayout>
  )
}
