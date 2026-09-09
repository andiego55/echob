/**
 * AvvDocument – Auftragsverarbeitungsvertrag (Art. 28 DSGVO), ENTWURF.
 *
 * Einsehbarer Vertragstext zwischen der Fachperson (Verantwortliche) und EchoB
 * (Auftragsverarbeiter). Steht in den Einstellungen — dort wird er auch
 * abgeschlossen. Das frueher blockierende Zustimmungs-Gate gibt es nicht mehr;
 * auf den offenen Abschluss weist <AvvBanner /> hin. Der Wortlaut ist ein sorgfältiger Entwurf und MUSS vor
 * dem Produktivbetrieb anwaltlich final geprüft werden – die Prüfung veranlasst der
 * Betreiber. Die Versionskennung kommt vom Server (avv_current_version) und bindet
 * den angezeigten Text an den protokollierten Nachweis.
 */

/** Frontend-Kennung des hier hinterlegten Vertragstexts. Muss mit CURRENT_AVV_VERSION
 *  im Backend (agreement_service.py) übereinstimmen. Bei Textänderungen beide erhöhen. */
export const AVV_DOC_VERSION = 'avv-2026-09b'

/**
 * Passt die Fassung, die der Server protokollieren würde, zu dem Text auf dieser Seite?
 *
 * **Warum das eine Frage sein kann, ohne dass jemand einen Fehler gemacht hat.** Diese
 * Datei deployt automatisch beim Push, das Backend von Hand. Dazwischen liegt ein Fenster,
 * in dem hier der neue Vertragstext steht — die Komponente kennt nur einen — während der
 * Server noch die alte Kennung meldet. Ein Abschluss in diesem Fenster hielte Zustimmung
 * zu einer Fassung fest, die die Fachperson nie gesehen hat. Der Nachweis sähe dabei
 * einwandfrei aus; auffallen würde es erst, wenn es darauf ankommt.
 *
 * Fehlt die Angabe (ältere API), wird nicht gesperrt: Dann gilt die Fassung des
 * angezeigten Dokuments, und Text und Kennung stammen wieder aus derselben Quelle.
 */
export function fassungPasstZumText(serverFassung: string | null | undefined): boolean {
  return !serverFassung || serverFassung === AVV_DOC_VERSION
}

function H({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-6 text-[15px] font-bold text-navy">{children}</h3>
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm leading-relaxed text-brand-text">{children}</p>
}
function LI({ children }: { children: React.ReactNode }) {
  return <li className="text-sm leading-relaxed text-brand-text">{children}</li>
}

const SUBPROCESSORS: { name: string; purpose: string; location: string; safeguard: string }[] = [
  {
    name: 'Hetzner Online GmbH',
    purpose: 'Hosting von Anwendung und Datenbank (Speicherung aller Fall- und Freigabedaten)',
    location: 'Deutschland / EU',
    safeguard: 'Kein Drittlandtransfer · AVV nach Art. 28',
  },
  {
    name: 'OpenAI, L.L.C. / OpenAI Ireland Ltd.',
    purpose: 'KI-gestützte Verarbeitung freigegebener Inhalte (Echo, Berichte, Skalen, Sprach­transkription)',
    location: 'USA',
    safeguard: 'EU-U.S. Data Privacy Framework (zertifiziert) · Standardvertragsklauseln · DPA · zusätzlich ausdrückliche Einwilligung der betroffenen Person',
  },
  {
    name: 'Supabase Inc.',
    purpose: 'Authentifizierung / Konto-Identität (u. a. E-Mail-Adresse, Konto-ID)',
    location: 'EU / USA [Region im finalen AVV zu präzisieren]',
    safeguard: 'AVV nach Art. 28 · bei Drittlandbezug Standardvertragsklauseln',
  },
  {
    name: 'Cloudflare, Inc.',
    purpose: 'Auslieferung und Absicherung der Website (Reverse-Proxy/CDN; Datenverarbeitung im Transit)',
    location: 'USA / globales Edge-Netz',
    safeguard: 'EU-U.S. Data Privacy Framework · Standardvertragsklauseln · AVV',
  },
  {
    name: 'Resend (Resend, Inc.)',
    purpose: 'Versand transaktionaler E-Mails (z. B. Einladungen, Benachrichtigungen; kann E-Mail-Adressen betreffen)',
    location: 'USA',
    safeguard: 'Standardvertragsklauseln · AVV',
  },
]

export default function AvvDocument({ version = AVV_DOC_VERSION }: { version?: string | null }) {
  return (
    <div>
      {/* Entwurfs-Kennzeichnung — unübersehbar */}
      <div className="rounded-brand border border-amber-300 bg-amber-50 px-4 py-3">
        <p className="text-sm font-semibold text-amber-900">
          Entwurf — noch nicht anwaltlich abschließend geprüft
        </p>
        <p className="mt-1 text-xs leading-relaxed text-amber-800">
          Dieser Vertragstext ist ein sorgfältig ausgearbeiteter Entwurf. Er wird vor dem
          Produktivbetrieb durch eine Fachanwältin/einen Fachanwalt für Datenschutzrecht final
          geprüft. Rechtsverbindlich ist erst die geprüfte Fassung. Mit Klammern
          [in eckigen Klammern] markierte Stellen sind noch zu verifizieren.
        </p>
      </div>

      <div className="mt-5">
        <h2 className="text-base font-bold text-navy">
          Vertrag zur Auftragsverarbeitung (AVV) nach Art. 28 DSGVO
        </h2>
        <p className="mt-1 text-xs text-brand-muted">
          Version {version || AVV_DOC_VERSION}
        </p>
      </div>

      <H>Präambel und Parteien</H>
      <P>
        Dieser Vertrag regelt die Verarbeitung personenbezogener Daten im Auftrag zwischen
      </P>
      <ul className="mt-2 list-none space-y-1 pl-0">
        <LI>
          <strong className="text-navy">der Fachperson bzw. Praxis</strong>, die den
          Fachpersonen-Zugang von EchoB nutzt (nachfolgend „Verantwortliche"), und
        </LI>
        <LI>
          <strong className="text-navy">Andreas Wygrabek, Diemelweg 8A, 34317 Habichtswald</strong>,
          Betreiber der Plattform EchoB (nachfolgend „Auftragsverarbeiter"),
        </LI>
      </ul>
      <P>
        gemeinsam „die Parteien". Die Verantwortliche entscheidet über Zwecke und Mittel der
        Verarbeitung der von ihren Klient:innen freigegebenen Daten; der Auftragsverarbeiter
        verarbeitet diese Daten ausschließlich in ihrem Auftrag und nach ihren Weisungen.
      </P>

      <H>1. Gegenstand, Art und Zweck der Verarbeitung</H>
      <P>
        Gegenstand ist die Bereitstellung der EchoB-Plattform zur Unterstützung der fachlichen
        Arbeit der Verantwortlichen: Speicherung und Anzeige der von Klient:innen ausdrücklich
        freigegebenen Fallinhalte, KI-gestützte Aufbereitung (Reflexion „Echo", Berichte,
        Skalen, Transkription), Notizen und Zusammenarbeit. Die Verarbeitung erfolgt
        ausschließlich zu diesen von der Verantwortlichen bestimmten Zwecken.
      </P>

      <H>2. Art der Daten und Kategorien betroffener Personen</H>
      <P>
        Verarbeitet werden insbesondere <strong className="text-navy">besondere Kategorien
        personenbezogener Daten</strong> (Art. 9 DSGVO) – Angaben zu Beziehungen, seelischem
        Befinden und Gesundheit – sowie Kontakt- und Kontodaten. Betroffene Personen sind die
        Klient:innen der Verantwortlichen sowie ggf. von ihnen benannte Dritte. Die
        Verantwortliche stellt sicher, dass für die Freigabe an sie eine gültige Rechtsgrundlage
        besteht; die Klient:innen erteilen die für die KI-gestützte Verarbeitung besonderer
        Daten erforderliche ausdrückliche Einwilligung zusätzlich innerhalb der Plattform.
      </P>

      <H>3. Weisungsgebundenheit (Art. 28 Abs. 3 lit. a)</H>
      <P>
        Der Auftragsverarbeiter verarbeitet die Daten nur auf dokumentierte Weisung der
        Verantwortlichen, einschließlich der über die Funktionen der Plattform ausgeübten
        Weisungen (z. B. Auswahl freigegebener Inhalte, Auslösen einer Echo-/Berichtsfunktion).
        Hält er eine Weisung für rechtswidrig, informiert er die Verantwortliche.
      </P>

      <H>4. Vertraulichkeit (lit. b)</H>
      <P>
        Zur Verarbeitung befugte Personen sind zur Vertraulichkeit verpflichtet. Der
        Auftragsverarbeiter greift nur soweit für Betrieb, Wartung und Fehlerbehebung
        erforderlich auf Inhalte zu.
      </P>

      <H>5. Berufsgeheimnis und Schweigepflicht (§ 203 StGB)</H>
      <P>
        Dieser Abschnitt gilt, soweit die Verantwortliche einer strafbewehrten Schweigepflicht
        unterliegt — etwa als Psychotherapeutin oder Psychotherapeut, als Berufspsychologin
        oder Berufspsychologe mit staatlich anerkannter wissenschaftlicher Abschlussprüfung
        oder als Angehörige eines anderen Heilberufs im Sinne des § 203 Abs. 1 StGB. Für
        beratende und coachende Tätigkeiten ohne solche Pflicht ist er gegenstandslos.
      </P>
      <P>
        Der Auftragsverarbeiter ist <strong className="text-navy">mitwirkende Person</strong> im
        Sinne des § 203 Abs. 3 Satz 2 StGB. Er ist über die Schweigepflicht belehrt und
        verpflichtet sich, fremde Geheimnisse, die ihm im Rahmen dieses Vertrages bekannt
        werden, nicht unbefugt zu offenbaren. Die Verpflichtung besteht über das Ende dieses
        Vertrages hinaus fort und gilt auch nach Beendigung der Tätigkeit.
      </P>
      <P>
        <strong className="text-navy">Belehrung.</strong> Der Auftragsverarbeiter ist darüber
        belehrt, dass die unbefugte Offenbarung eines fremden Geheimnisses, das ihm in dieser
        Eigenschaft bekannt geworden ist, nach § 203 Abs. 4 StGB mit Freiheitsstrafe bis zu
        einem Jahr oder mit Geldstrafe bestraft werden kann. Er hat die von ihm eingesetzten
        Personen entsprechend belehrt.
      </P>
      <P>
        <strong className="text-navy">Weitergabe der Verpflichtung.</strong> Der
        Auftragsverarbeiter verpflichtet die von ihm eingesetzten Personen und die in
        Abschnitt 7 benannten Unterauftragsverarbeiter in gleicher Weise (§ 203 Abs. 4 Satz 1
        StGB). Setzt ein Unterauftragsverarbeiter seinerseits weitere Personen ein, ist die
        Verpflichtung bis zur zuletzt eingesetzten Person fortzusetzen; der
        Auftragsverarbeiter wirkt darauf hin und weist dies auf Verlangen nach. Er setzt nur
        Unterauftragsverarbeiter ein, die zur Wahrung der Vertraulichkeit verpflichtet sind,
        und trifft die zur Verhinderung einer unbefugten Offenbarung erforderlichen
        Vorkehrungen; diese sind in Abschnitt 6 beschrieben.
      </P>
      <P>
        <strong className="text-navy">Datenminimierung gegenüber der KI:</strong> An das
        Sprachmodell werden ausschließlich die freigegebenen Inhalte übermittelt. Nicht
        übermittelt werden Kontokennungen, Nutzer-Kennungen und E-Mail-Adressen; Klient:innen
        werden über selbst gewählte Pseudonyme geführt. Welche Inhalte übermittelt werden,
        ist für die Verantwortliche vor jeder Anfrage einsehbar.
      </P>
      <P>
        <strong className="text-navy">Was das ausdrücklich nicht bedeutet.</strong> Die
        freigegebenen Inhalte werden im Wortlaut übermittelt, wie die Klient:in sie verfasst
        hat. Nennt sie darin Namen — eigene, die von Angehörigen, Partner:innen, Kindern oder
        Dritten —, so werden diese Namen mit übermittelt. Eine automatische Entfernung von
        Namen aus Freitext findet <strong>nicht</strong> statt: Ein Verfahren, das Namen
        errät, erzeugt entweder Fehlalarme oder — schwerer wiegend — eine trügerische
        Sicherheit. Für beigelegte Dokumente stellt der Auftragsverarbeiter stattdessen ein
        Werkzeug bereit, das E-Mail-Adressen, Telefonnummern und IBANs erkennt und auf einen
        Klick ersetzt; Namen ersetzt es nach Angabe der schreibenden Person. Die
        Verantwortliche wirkt darauf hin, dass nur erforderliche Angaben erhoben werden.
      </P>
      <P>
        <strong className="text-navy">Keine Nutzung zum Modelltraining.</strong> Die
        übermittelten Inhalte werden weder vom Auftragsverarbeiter noch vom eingesetzten
        KI-Dienstleister zum Training oder zur Verbesserung von Modellen verwendet. Der
        Auftragsverarbeiter nutzt die Programmierschnittstelle des KI-Dienstleisters, für
        die dieser eine Nutzung zu Trainingszwecken vertraglich ausschließt. Eine
        kurzzeitige Speicherung beim KI-Dienstleister zur Missbrauchserkennung ist derzeit
        nicht ausgeschlossen; der Auftragsverarbeiter wirkt auf eine Vereinbarung ohne
        Datenspeicherung hin und informiert die Verantwortliche über das Ergebnis.
      </P>
      <P>
        <strong className="text-navy">Erforderlichkeit.</strong> Die Verantwortliche
        entscheidet in eigener Verantwortung, dass die Einbeziehung des Auftragsverarbeiters
        für ihre Berufsausübung erforderlich ist (§ 203 Abs. 3 Satz 2 StGB). Sie gibt nur
        solche Inhalte frei und veranlasst nur solche Verarbeitungen, die dafür erforderlich
        sind. Eine darüber hinausgehende Offenbarung ist von dieser Vereinbarung nicht
        gedeckt.
      </P>
      <P>
        <strong className="text-navy">Verhältnis zur Einwilligung der Klient:in.</strong> Diese
        Vereinbarung tritt neben die Erklärung, die die Klient:in bei der Freigabe abgibt. Dort
        entbindet sie die Fachperson ausdrücklich insoweit von der Schweigepflicht, als es für
        die Verarbeitung der freigegebenen Inhalte erforderlich ist. Beide Grundlagen stehen
        nebeneinander; keine ersetzt die andere.
      </P>

      <H>6. Technische und organisatorische Maßnahmen (Art. 32, lit. c)</H>
      <P>Der Auftragsverarbeiter unterhält dem Risiko angemessene Maßnahmen, insbesondere:</P>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <LI>Transportverschlüsselung (TLS) für alle Verbindungen;</LI>
        <LI>
          Verschlüsselung ruhender Daten: verschlüsseltes Speichervolume (LUKS2) und
          zusätzlich anwendungsseitige Feldverschlüsselung sensibler Freitexte;
        </LI>
        <LI>
          strenge Zugriffskontrolle nach dem Prinzip der Datenminimierung: eine Fachperson
          erhält ausschließlich die je Fall einzeln freigegebenen Elemente; die
          Zugriffsprüfung ist serverseitig zentralisiert;
        </LI>
        <LI>
          Pseudonymisierung: die Fachperson erhält nicht die Konto-Kennung (Auth-ID) der
          Klient:in; Klient:innen können pseudonym auftreten;
        </LI>
        <LI>verschlüsselte, getrennt aufbewahrte Backups; Wiederherstellbarkeit;</LI>
        <LI>Sicherheits-Header und Content-Security-Policy.</LI>
      </ul>

      <H>7. Unterauftragsverarbeiter (Art. 28 Abs. 2 und 4)</H>
      <P>
        Die Verantwortliche erteilt mit Abschluss dieses Vertrags ihre{' '}
        <strong className="text-navy">allgemeine Genehmigung</strong> zum Einsatz der
        nachfolgenden Unterauftragsverarbeiter. Der Auftragsverarbeiter verpflichtet jeden
        Unterauftragsverarbeiter auf dieselben Datenschutzpflichten (Weiterreichung nach
        Art. 28 Abs. 4) und informiert die Verantwortliche über beabsichtigte Änderungen
        (Hinzukommen/Ersetzung), sodass sie widersprechen kann.
      </P>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-brand-border">
              <th className="py-2 pr-3 font-semibold text-navy">Unterauftragsverarbeiter</th>
              <th className="py-2 pr-3 font-semibold text-navy">Zweck</th>
              <th className="py-2 pr-3 font-semibold text-navy">Ort</th>
              <th className="py-2 font-semibold text-navy">Garantie bei Drittlandbezug</th>
            </tr>
          </thead>
          <tbody>
            {SUBPROCESSORS.map((s) => (
              <tr key={s.name} className="border-b border-brand-border/60 align-top">
                <td className="py-2 pr-3 font-medium text-navy">{s.name}</td>
                <td className="py-2 pr-3 text-brand-text">{s.purpose}</td>
                <td className="py-2 pr-3 text-brand-text">{s.location}</td>
                <td className="py-2 text-brand-text">{s.safeguard}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <P>
        <strong className="text-navy">Keine</strong> Unterauftragsverarbeitung im Sinne dieses
        Vertrags ist die Zahlungsabwicklung: Der Zahlungsdienstleister Stripe verarbeitet
        ausschließlich die Abrechnungsdaten der Fachperson/Praxis als eigenständig
        Verantwortlicher – nicht die diesem Vertrag unterliegenden Klient-Daten.
      </P>

      <H>8. Drittlandtransfer (Kapitel V DSGVO)</H>
      <P>
        Soweit Daten in die USA übermittelt werden (insbesondere an OpenAI zur KI-Verarbeitung),
        stützt sich die Übermittlung auf das EU-U.S. Data Privacy Framework (Angemessenheits­beschluss
        der EU-Kommission), ergänzend auf Standardvertragsklauseln, sowie auf die zusätzlich
        eingeholte ausdrückliche Einwilligung der betroffenen Person (Art. 49 Abs. 1 lit. a). Die
        Verantwortliche wird hierüber transparent informiert.
      </P>

      <H>9. Unterstützung bei Betroffenenrechten (lit. e)</H>
      <P>
        Der Auftragsverarbeiter unterstützt die Verantwortliche mit geeigneten technischen und
        organisatorischen Maßnahmen bei der Erfüllung von Betroffenenrechten (Auskunft,
        Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch). Anfragen
        betroffener Personen leitet er unverzüglich an die Verantwortliche weiter.
      </P>

      <H>10. Unterstützung bei Sicherheit und Meldepflichten (lit. f, Art. 32–36)</H>
      <P>
        Der Auftragsverarbeiter unterstützt die Verantwortliche bei der Einhaltung der Pflichten
        aus Art. 32–36 und meldet ihm bekannt gewordene Verletzungen des Schutzes
        personenbezogener Daten unverzüglich, damit die Verantwortliche ihre Melde- und
        Benachrichtigungspflichten (Art. 33, 34) erfüllen kann.
      </P>

      <H>11. Löschung oder Rückgabe nach Auftragsende (lit. g)</H>
      <P>
        Nach Beendigung der Verarbeitung löscht der Auftragsverarbeiter die Daten oder gibt sie
        zurück, nach Wahl der Verantwortlichen, sofern keine gesetzliche Aufbewahrungspflicht
        entgegensteht. Widerruft eine Klient:in eine Freigabe oder löscht die Verantwortliche
        eine Verbindung, endet der Zugriff über die Plattform unmittelbar.
      </P>

      <H>12. Nachweise und Überprüfungen (lit. h)</H>
      <P>
        Der Auftragsverarbeiter stellt der Verantwortlichen die zum Nachweis der Einhaltung
        dieser Pflichten erforderlichen Informationen zur Verfügung und ermöglicht angemessene
        Überprüfungen.
      </P>

      <H>13. Laufzeit</H>
      <P>
        Der Vertrag gilt für die Dauer der Nutzung des Fachpersonen-Zugangs. Er kann durch eine
        aktualisierte Fassung ersetzt werden; in diesem Fall ist die Zustimmung zur neuen Version
        erneut erforderlich. Der protokollierte Nachweis (Version und Zeitpunkt der Zustimmung)
        bleibt zu Dokumentationszwecken erhalten.
      </P>

      <p className="mt-6 border-t border-brand-border pt-4 text-xs leading-relaxed text-brand-muted">
        Hinweis: Dieser Entwurf ersetzt keine Rechtsberatung. Verbindlich ist die anwaltlich
        geprüfte Endfassung — das gilt besonders für Abschnitt 5, dessen strafrechtliche
        Reichweite gerade bei KI-Unterauftragsverarbeitern noch nicht abschließend geklärt ist.
        Fragen zur Auftragsverarbeitung: kontakt@echo-b.de.
      </p>
    </div>
  )
}
