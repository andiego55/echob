import PageLayout from '@/components/layout/PageLayout'

export default function DatenschutzPage() {
  return (
    <PageLayout>
      {/* Page Hero */}
      <section className="bg-navy text-white px-6 pt-[calc(60px+52px)] pb-[52px]">
        <div className="mx-auto max-w-[960px]">
          <span className="label">Rechtliches</span>
          <h1 className="mt-2 text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-[-0.02em]">
            Datenschutzerklärung
          </h1>
          <p className="mt-2 text-[0.95rem] text-brand-blue">
            Stand: {new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </section>

      {/* Inhalt */}
      <section className="px-6 py-[72px]">
        <div className="mx-auto max-w-[720px] space-y-10 text-brand-text leading-[1.75]">

          <div className="rounded-brand border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            <strong>Vorläufige Entwurfsfassung (Aufbauphase).</strong> EchoB befindet sich im Aufbau.
            Diese Erklärung beschreibt die vorgesehene Verarbeitung nach bestem Wissen; sie wird vor dem
            regulären Betrieb noch datenschutzrechtlich geprüft und ggf. angepasst.
          </div>

          {/* 1. Verantwortlicher */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">1. Verantwortlicher</h2>
            <p className="text-brand-muted text-sm">
              Verantwortlicher im Sinne der DSGVO ist derzeit:
            </p>
            <p className="text-sm mt-2">
              Andreas Wygrabek<br />
              Diemelweg 8A<br />
              34317 Habichtswald<br />
              Deutschland<br /><br />
              E-Mail:{' '}
              <a href="mailto:kontakt@echo-b.de" className="text-accent hover:underline">kontakt@echo-b.de</a>
            </p>
            <p className="text-brand-muted text-sm mt-3">
              Der Betrieb von EchoB wird in eine UG (haftungsbeschränkt) überführt, die sich derzeit in
              Gründung befindet. Mit ihrer Eintragung wird diese Gesellschaft Verantwortliche und schließt
              die Verträge mit den eingesetzten Dienstleistern; diese Erklärung wird dann entsprechend
              aktualisiert.
            </p>
            <p className="text-brand-muted text-sm mt-3">
              EchoB kann auf zwei Wegen genutzt werden, was Einfluss auf die Verantwortlichkeit hat:
            </p>
            <ul className="list-disc list-inside text-sm text-brand-muted space-y-1.5 mt-2">
              <li><strong className="text-navy">Direkte Nutzung:</strong> Du meldest dich selbst an; Vertrag und Abrechnung bestehen direkt mit uns. Verantwortliche sind wir.</li>
              <li><strong className="text-navy">Nutzung über eine Fachperson:</strong> Lädt dich eine Fachperson (z. B. Praxis) ein und rechnet die Nutzung über sie ab, handeln wir für die in dieser Begleitung verarbeiteten Daten als <strong className="text-navy">Auftragsverarbeiter der Fachperson</strong> (Art. 28 DSGVO); die Fachperson ist insoweit Verantwortliche. Wir schließen dafür mit ihr einen Vertrag zur Auftragsverarbeitung.</li>
            </ul>
          </div>

          {/* 2. Worum es geht */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">2. Worum es geht</h2>
            <p className="text-brand-muted text-sm">
              EchoB ist eine fallbasierte Reflexionsplattform für belastende Beziehungssituationen. Dabei
              verarbeiten wir bestimmungsgemäß <strong className="text-navy">besonders sensible Inhalte</strong> –
              Angaben zu deinen Beziehungen, Erlebnissen und deinem psychischen Befinden – und setzen dafür
              <strong className="text-navy"> KI-Unterstützung</strong> ein. Diese Erklärung legt offen, welche
              Daten wie, wo und durch wen verarbeitet werden.
            </p>
          </div>

          {/* 3. Konto & Anmeldung */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">3. Konto und Anmeldung</h2>
            <p className="text-brand-muted text-sm">
              Für die Nutzung legst du ein Konto an (E-Mail und Passwort, alternativ Anmeldung über Google).
              Die Authentifizierung wickeln wir über unseren Dienstleister Supabase ab; dort werden
              E-Mail-Adresse und ein verschlüsselter Passwort-Hash gespeichert. Bei der Anmeldung über Google
              verarbeitet Google im Rahmen des Anmeldevorgangs die dafür erforderlichen Daten.
              <br /><br />
              <strong className="text-navy">Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO
              (Vertragserfüllung).
            </p>
            <p className="text-brand-muted text-sm mt-3">
              <strong className="text-navy">Pseudonyme Nutzung:</strong> Du kannst EchoB unter einem Pseudonym
              nutzen – insbesondere, wenn dich eine Fachperson einlädt, ist eine Anmeldung ohne Angabe deines
              Klarnamens gegenüber EchoB möglich. Das ist ein hohes Maß an Privatheit, aber
              <strong className="text-navy"> keine Anonymität im rechtlichen Sinne</strong>: Deine Inhalte können
              persönliche Bezüge enthalten, ein interner Zugriff ist technisch möglich (Abschnitt 10), und im
              Fachpersonen-Weg kennt die Fachperson deine Identität. Es gelten daher weiterhin die Regelungen
              dieser Erklärung.
            </p>
          </div>

          {/* 4. Reflexionsinhalte – besondere Kategorien & Einwilligung */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">
              4. Reflexionsinhalte und Einwilligung (Art. 9 DSGVO)
            </h2>
            <p className="text-brand-muted text-sm mb-3">
              Im geschützten Bereich erfasst du u. a. Fälle, Szenen, Gespräche mit „Echo", Skalen, Berichte,
              Hypothesen und Profile. Diese Inhalte können Angaben zu deiner Gesundheit, deinem psychischen
              Befinden und deinem Privat- oder Sexualleben enthalten und gelten damit als
              <strong className="text-navy"> besondere Kategorien personenbezogener Daten</strong>.
            </p>
            <p className="text-brand-muted text-sm mb-3">
              <strong className="text-navy">Rechtsgrundlage:</strong> deine{' '}
              <strong className="text-navy">ausdrückliche Einwilligung</strong> nach Art. 9 Abs. 2 lit. a DSGVO
              sowie Art. 6 Abs. 1 lit. b DSGVO (Vertrag).
            </p>
            <p className="text-brand-muted text-sm">
              Wir holen deine Einwilligungen <strong className="text-navy">getrennt nach Zweck</strong> ein und
              protokollieren sie – insbesondere für (a) die Verarbeitung deiner sensiblen Reflexionsinhalte,
              (b) die KI-Verarbeitung einschließlich Übermittlung in die USA (Abschnitt 5), (c) eine etwaige
              Audioaufnahme (Abschnitt 5) und (d) eine Freigabe an eine bestimmte Fachperson (Abschnitt 11).
              Du kannst jede Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen. Widerrufst du die
              Einwilligung in die KI-Verarbeitung, stehen die darauf beruhenden Funktionen (Echo-Dialog,
              Zusammenfassungen, Skalen, Berichte) nicht mehr zur Verfügung.
            </p>
          </div>

          {/* 5. KI-Verarbeitung & USA */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">5. KI-Verarbeitung und Übermittlung in die USA</h2>
            <p className="text-brand-muted text-sm mb-3">
              Zur Erzeugung von Antworten, Zusammenfassungen, Skalen und Berichten übermitteln wir die dafür
              jeweils erforderlichen Inhalte über eine Programmierschnittstelle (API) an
              <strong className="text-navy"> OpenAI</strong> (OpenAI, L.L.C., USA). Bei der Sprach-Schnellerfassung
              wird zusätzlich eine Audioaufnahme zur Transkription übermittelt.
            </p>
            <p className="text-brand-muted text-sm mb-3">
              Die dauerhafte Speicherung deiner Fallinhalte erfolgt verschlüsselt auf Servern in der EU
              (Abschnitt 16). Für die KI-Verarbeitung werden die jeweils benötigten Inhalte in die USA
              übermittelt und dort in <strong className="text-navy">unverschlüsselter Form</strong> verarbeitet –
              sie müssen für das KI-Modell lesbar sein. Die Übertragung selbst erfolgt stets über
              transportverschlüsselte (TLS) Verbindungen. Wir setzen bewusst leistungsfähige, aktuelle
              KI-Modelle ein, um dir eine bestmögliche Produkterfahrung zu bieten. Die USA sind ein Drittland
              ohne generell gleichwertiges Datenschutzniveau.
            </p>
            <p className="text-brand-muted text-sm mb-3">
              <strong className="text-navy">Garantien für die Übermittlung:</strong> Grundlage der Übermittlung
              in die USA sind die von der EU-Kommission erlassenen Standardvertragsklauseln (Art. 46 Abs. 2
              lit. c DSGVO), die Bestandteil des mit dem Anbieter geschlossenen Auftragsverarbeitungsvertrags
              sind. Ergänzend stützen wir die Verarbeitung deiner besonderen Kategorien personenbezogener Daten
              auf deine ausdrückliche Einwilligung nach Art. 9 Abs. 2 lit. a DSGVO.
            </p>
            <p className="text-brand-muted text-sm">
              <strong className="text-navy">Speicherung beim Anbieter:</strong> Über die API übermittelte Inhalte
              werden nicht zum Training der Modelle verwendet. Nach der aktuellen Anbieter-Praxis werden
              API-Daten nur für einen begrenzten Zeitraum (in der Regel bis zu 30 Tage zur Missbrauchserkennung)
              gespeichert und danach gelöscht, soweit keine gesetzliche Pflicht entgegensteht.
            </p>
          </div>

          {/* 6. Angaben über andere Personen */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">6. Angaben über andere Personen</h2>
            <p className="text-brand-muted text-sm mb-3">
              In deinen Fällen beschreibst du zwangsläufig auch andere Personen (z. B. Partner:innen,
              Ex-Partner:innen, Familienangehörige). Deren Angaben können ebenfalls personenbezogene – teils
              besonders sensible – Daten sein. Damit gehen wir so um:
            </p>
            <ul className="list-disc list-inside text-sm text-brand-muted space-y-1.5">
              <li>
                Wir bitten dich, andere Personen nur so weit zu beschreiben, wie es für deine Reflexion nötig
                ist, und dabei <strong className="text-navy">Rollen</strong> (z. B. „Partner", „Mutter") statt
                Klarnamen zu verwenden. Ein entsprechender Hinweis erscheint im Produkt.
              </li>
              <li>Wir legen keine eigenständigen, dauerhaften Profile über identifizierbare Dritte an; die Angaben bleiben Teil deines Falls und deiner Kontrolle.</li>
              <li>
                Eine gesonderte Benachrichtigung dieser Personen nach Art. 14 DSGVO nehmen wir regelmäßig nicht
                vor: Uns liegen dazu keine Kontaktdaten vor, eine Benachrichtigung wäre mit unverhältnismäßigem
                Aufwand verbunden (Art. 14 Abs. 5 lit. b DSGVO), und die Angaben stehen unter deiner Kontrolle
                und werden nach Möglichkeit pseudonymisiert.
              </li>
            </ul>
          </div>

          {/* 7. Automatisierte Auswertung */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">7. Automatisierte Auswertung und Musterbildung</h2>
            <p className="text-brand-muted text-sm mb-3">
              EchoB macht wiederkehrende Muster sichtbar und erzeugt u. a. Skalen, Hypothesen und Berichte.
              Diese Auswertungen beruhen auf deinen eigenen Angaben und dienen ausschließlich deiner Reflexion.
            </p>
            <ul className="list-disc list-inside text-sm text-brand-muted space-y-1.5">
              <li>Die Ergebnisse sind <strong className="text-navy">Anhaltspunkte, keine Diagnosen</strong>, und können unvollständig oder fehlerhaft sein – auch KI kann irren.</li>
              <li>Es findet <strong className="text-navy">keine automatisierte Entscheidung im Sinne von Art. 22 DSGVO</strong> statt, die dir gegenüber rechtliche Wirkung entfaltet oder dich in ähnlicher Weise erheblich beeinträchtigt.</li>
              <li>Erzeugte Auswertungen (z. B. gespeicherte Hypothesen oder Profile) werden Teil deines Falls und unterliegen denselben Rechten (Auskunft, Löschung).</li>
            </ul>
          </div>

          {/* 8. Weitere Verarbeitungen */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">8. Weitere Verarbeitungen</h2>

            <h3 className="font-semibold text-navy mb-1">Zahlungen</h3>
            <p className="text-brand-muted text-sm mb-4">
              Für kostenpflichtige Funktionen nutzen wir den Zahlungsdienstleister Stripe. Die Zahlungsdaten
              verarbeitet Stripe <strong className="text-navy">eigenverantwortlich</strong>; wir erhalten nur die
              zur Vertragsabwicklung nötigen Informationen. Je nach Nutzungsweg erfolgt die Abrechnung direkt
              mit dir oder über die dich begleitende Fachperson (Abschnitt 1). Rechtsgrundlage: Art. 6 Abs. 1
              lit. b DSGVO.
            </p>

            <h3 className="font-semibold text-navy mb-1">Warteliste</h3>
            <p className="text-brand-muted text-sm mb-4">
              Trägst du dich in die Warteliste ein, speichern wir E-Mail-Adresse, optional einen
              Interessensbereich und eine Notiz sowie den Zeitpunkt. Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO
              (Einwilligung), jederzeit widerrufbar.
            </p>

            <h3 className="font-semibold text-navy mb-1">Kontakt- und Anfrageformulare</h3>
            <p className="text-brand-muted text-sm mb-4">
              Über die Anfrageformulare (z. B. „Erstgespräch anfragen", „Persönliche Demo anfragen",
              Fachpersonen-Vormerkung) verarbeiten wir die von dir angegebenen Daten – Name (optional), E-Mail
              und/oder Telefonnummer sowie eine optionale Nachricht –, um dich zu deiner Anfrage zu
              kontaktieren. Die Angaben werden gespeichert und uns per E-Mail zugestellt. Rechtsgrundlage:
              Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) sowie Art. 6 Abs. 1 lit. b DSGVO (Anbahnung eines
              Vertrags), jederzeit widerrufbar.
            </p>

            <h3 className="font-semibold text-navy mb-1">E-Mail-Versand</h3>
            <p className="text-brand-muted text-sm mb-4">
              Für den Versand von System- und Benachrichtigungs-E-Mails (z. B. Anmeldebestätigung,
              Passwort-Zurücksetzen, Einladungen, Benachrichtigung über Anfragen) nutzen wir den Dienst
              <strong className="text-navy"> Resend</strong> (Resend, Inc., USA). Der Versand erfolgt über die
              <strong className="text-navy"> EU-Region des Anbieters (Irland)</strong>, sodass die dabei
              verarbeiteten Daten (Empfänger-Adresse, E-Mail-Inhalt) innerhalb der EU verarbeitet werden. Da der
              Anbieter seinen Sitz in den USA hat, kann ein Zugriff aus einem Drittland nicht vollständig
              ausgeschlossen werden; hierfür bestehen Standardvertragsklauseln. Rechtsgrundlage: Art. 6 Abs. 1
              lit. b und lit. f DSGVO.
            </p>

            <h3 className="font-semibold text-navy mb-1">Serverprotokolle</h3>
            <p className="text-brand-muted text-sm">
              Beim Aufruf der Website werden technisch notwendige Protokolldaten verarbeitet (z. B. Browsertyp,
              Zeitpunkt). Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an fehlerfreiem
              Betrieb und Sicherheit).
            </p>
          </div>

          {/* 9. Empfänger / Auftragsverarbeiter */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">9. Empfänger, Auftragsverarbeiter und Rollen</h2>
            <p className="text-brand-muted text-sm mb-3">
              <strong className="text-navy">Auftragsverarbeiter</strong> (Art. 28 DSGVO), die in unserem Auftrag
              und nach unserer Weisung verarbeiten:
            </p>
            <ul className="list-disc list-inside text-sm text-brand-muted space-y-1.5">
              <li><strong className="text-navy">Hetzner</strong> – Hosting von Anwendung und Datenbank (Deutschland/EU)</li>
              <li><strong className="text-navy">Supabase</strong> – Authentifizierung</li>
              <li><strong className="text-navy">Cloudflare</strong> – Auslieferung und Absicherung der Website</li>
              <li><strong className="text-navy">OpenAI</strong> – KI-gestützte Verarbeitung (USA, siehe Abschnitt 5)</li>
              <li><strong className="text-navy">Resend</strong> – Versand von System-E-Mails (EU-Region Irland, siehe Abschnitt 8)</li>
            </ul>
            <p className="text-brand-muted text-sm mt-4 mb-3">
              <strong className="text-navy">Eigenständig Verantwortliche</strong> für ihren jeweiligen Teil der
              Verarbeitung:
            </p>
            <ul className="list-disc list-inside text-sm text-brand-muted space-y-1.5">
              <li><strong className="text-navy">Stripe</strong> – Zahlungsabwicklung (eigenverantwortlich)</li>
              <li><strong className="text-navy">Von dir ausgewählte Fachpersonen</strong> – verarbeiten freigegebene Inhalte für ihre eigenen Zwecke (siehe Abschnitt 11)</li>
              <li><strong className="text-navy">Google</strong> – nur bei Anmeldung über Google, für den Anmeldevorgang</li>
            </ul>
            <p className="text-brand-muted text-sm mt-3">
              Mit den Auftragsverarbeitern bestehen Verträge nach Art. 28 DSGVO; für Übermittlungen in Drittländer
              bestehen Standardvertragsklauseln (Art. 46 DSGVO).
            </p>
          </div>

          {/* 10. Pseudonymisierung & Zugriff */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">10. Pseudonymisierung und interner Zugriff</h2>
            <p className="text-brand-muted text-sm">
              Deine Inhalte werden in der Anwendungsdatenbank nur unter einer pseudonymen Kennung gespeichert;
              Klarname und E-Mail liegen getrennt im Authentifizierungssystem. Sensible Freitext-Inhalte werden
              zusätzlich verschlüsselt gespeichert. Aus technischen und betrieblichen Gründen (z. B. Fehlersuche,
              Sicherheit, Missbrauchsabwehr) ist ein interner Zugriff auf gespeicherte Inhalte technisch möglich;
              solche Zugriffe beschränken wir auf dokumentierte, notwendige Ausnahmefälle. Ein Zugriff durch die
              genannten Dienstleister erfolgt nur im Rahmen ihrer jeweiligen Aufgabe.
            </p>
          </div>

          {/* 11. Freigabe an Fachpersonen */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">11. Freigabe an Fachpersonen</h2>
            <p className="text-brand-muted text-sm mb-3">
              Du kannst einzelne Inhalte eines Falls gezielt an eine registrierte Fachperson freigeben. Es wird
              ausschließlich das übermittelt, was du auswählst. Rechtsgrundlage: Art. 6 Abs. 1 lit. a / Art. 9
              Abs. 2 lit. a DSGVO (Einwilligung).
            </p>
            <p className="text-brand-muted text-sm mb-3">
              Meldest du dich hingegen von vornherein <strong className="text-navy">über eine Fachperson</strong>{' '}
              an (Abschnitt 1), verarbeiten wir die im Rahmen dieser Begleitung anfallenden Daten als deren
              Auftragsverarbeiter auf Grundlage eines Vertrags nach Art. 28 DSGVO.
            </p>
            <p className="text-brand-muted text-sm">
              <strong className="text-navy">Rollen:</strong> Für die freigegebenen Inhalte handelt die Fachperson
              im Rahmen ihrer eigenen Tätigkeit (z. B. Beratung, Therapie) als eigenständig Verantwortliche;
              EchoB stellt die technische Plattform bereit. <strong className="text-navy">Widerruf:</strong> Ein
              Widerruf beendet den Zugriff der Fachperson über die Plattform. Inhalte, die die Fachperson zuvor
              bereits exportiert, in eigene Unterlagen übernommen oder als eigene Notizen erstellt hat,
              unterliegen der Verantwortung und den Löschpflichten der Fachperson; entsprechende Auskunfts- oder
              Löschverlangen richtest du insoweit an die Fachperson.
            </p>
          </div>

          {/* 12. Nutzung nur durch Volljährige */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">12. Nutzung nur durch Volljährige</h2>
            <p className="text-brand-muted text-sm">
              EchoB richtet sich ausschließlich an volljährige Personen (ab 18 Jahren). Mit der Nutzung
              bestätigst du, dass du volljährig bist.
            </p>
          </div>

          {/* 13. Speicherdauer, Widerruf & Löschung */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">13. Speicherdauer, Widerruf und Löschung</h2>
            <p className="text-brand-muted text-sm mb-2">
              Wir speichern Daten nur so lange, wie es für den jeweiligen Zweck erforderlich ist:
            </p>
            <ul className="list-disc list-inside text-sm text-brand-muted space-y-1.5">
              <li><strong className="text-navy">Fall- und Reflexionsinhalte:</strong> bis zu deiner Löschung (einzelner Fall oder Konto).</li>
              <li><strong className="text-navy">Konto- und Anmeldedaten:</strong> für die Dauer des Kontos.</li>
              <li><strong className="text-navy">KI-Übermittlungen:</strong> beim Anbieter bis zu 30 Tage (Missbrauchserkennung), danach Löschung (Abschnitt 5).</li>
              <li><strong className="text-navy">Audioaufnahmen:</strong> nur zur Transkription verarbeitet und nicht dauerhaft gespeichert.</li>
              <li><strong className="text-navy">Server- und Sicherheitsprotokolle:</strong> kurzfristig (in der Regel wenige Tage bis Wochen).</li>
              <li><strong className="text-navy">Kontaktanfragen und Warteliste:</strong> bis zur Erledigung bzw. bis zum Widerruf, danach kurzfristig gelöscht.</li>
              <li><strong className="text-navy">Zahlungs- und Rechnungsunterlagen:</strong> gesetzliche Aufbewahrungsfristen (bis zu 10 Jahre, §§ 147 AO, 257 HGB).</li>
              <li><strong className="text-navy">Einwilligungsnachweise:</strong> solange zur Nachweisführung erforderlich.</li>
            </ul>
            <p className="text-brand-muted text-sm mt-3">
              Im Bereich <strong className="text-navy">„Datenschutz"</strong> kannst du jederzeit selbst deine
              Daten exportieren (Art. 15/20), einzelne Fälle endgültig löschen sowie dein Konto vollständig
              löschen (Art. 17). Die Kontolöschung gilt zugleich als Widerruf der erteilten Einwilligungen.
            </p>
            <p className="text-brand-muted text-sm mt-2">
              <strong className="text-navy">Hinweis:</strong> Nach einer Löschung können Daten für eine kurze
              Übergangszeit noch in verschlüsselten Sicherungskopien (Backups) enthalten sein, bis diese im
              regulären Turnus überschrieben werden. Gesetzliche Aufbewahrungspflichten (z. B. für Rechnungen)
              bleiben unberührt.
            </p>
          </div>

          {/* 14. Cookies und Tracking */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">14. Cookies und Tracking</h2>
            <p className="text-brand-muted text-sm">
              EchoB verwendet <strong className="text-navy">keine Tracking-Cookies</strong>, kein Google Analytics
              und keine Werbedienste. Es werden nur technisch notwendige Daten verarbeitet (z. B. für die
              Anmeldung). Schriftarten werden selbst gehostet – beim Seitenaufruf entsteht kein Abruf bei externen
              Schrift-Anbietern.
            </p>
          </div>

          {/* 15. Deine Rechte */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">15. Deine Rechte</h2>
            <p className="text-brand-muted text-sm mb-3">
              Du hast hinsichtlich deiner personenbezogenen Daten folgende Rechte:
            </p>
            <ul className="list-disc list-inside text-sm text-brand-muted space-y-1.5">
              <li><strong className="text-navy">Auskunft</strong> (Art. 15 DSGVO)</li>
              <li><strong className="text-navy">Berichtigung</strong> (Art. 16 DSGVO)</li>
              <li><strong className="text-navy">Löschung</strong> (Art. 17 DSGVO)</li>
              <li><strong className="text-navy">Einschränkung der Verarbeitung</strong> (Art. 18 DSGVO)</li>
              <li><strong className="text-navy">Datenübertragbarkeit</strong> (Art. 20 DSGVO)</li>
              <li><strong className="text-navy">Widerspruch</strong> (Art. 21 DSGVO)</li>
              <li><strong className="text-navy">Widerruf einer Einwilligung</strong> (Art. 7 Abs. 3 DSGVO)</li>
            </ul>
            <p className="text-brand-muted text-sm mt-4">
              Zur Ausübung genügt eine E-Mail an{' '}
              <a href="mailto:kontakt@echo-b.de" className="text-accent hover:underline">kontakt@echo-b.de</a>.
              Du hast außerdem das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren.
            </p>
          </div>

          {/* 16. Datensicherheit */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">16. Datensicherheit</h2>
            <p className="text-brand-muted text-sm">
              Wir setzen technische und organisatorische Maßnahmen ein, um deine Daten gegen Verlust,
              Manipulation und unberechtigten Zugriff zu schützen. Dazu gehören:
            </p>
            <ul className="list-disc list-inside text-sm text-brand-muted space-y-1.5 mt-2">
              <li>verschlüsselte Übertragung über HTTPS/TLS,</li>
              <li>Verschlüsselung im Ruhezustand: Der Server-Datenträger ist verschlüsselt, und sensible
                Freitext-Inhalte werden zusätzlich auf Feldebene verschlüsselt gespeichert,</li>
              <li>verschlüsselte, regelmäßige Backups,</li>
              <li>Pseudonymisierung (Trennung von Inhalt und Identität) sowie Beschränkung interner Zugriffe auf
                das Notwendige.</li>
            </ul>
            <p className="text-brand-muted text-sm mt-3">
              Für die KI-Verarbeitung gilt die Ausnahme aus Abschnitt 5: Die dafür benötigten Inhalte werden zur
              Verarbeitung in unverschlüsselter Form an den KI-Anbieter übermittelt.
            </p>
          </div>

          {/* 17. Änderungen */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">17. Änderungen dieser Erklärung</h2>
            <p className="text-brand-muted text-sm">
              Wir passen diese Datenschutzerklärung an, sobald sich die Rechtslage oder unsere Verarbeitungen
              ändern. Die jeweils aktuelle Version ist stets auf dieser Seite abrufbar.
            </p>
          </div>

        </div>
      </section>
    </PageLayout>
  )
}
