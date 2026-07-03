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
            <strong>Vorläufige Entwurfsfassung (Entwicklungsphase).</strong> EchoB befindet sich
            im Aufbau. Diese Erklärung ist noch nicht abschließend rechtlich geprüft.
          </div>

          {/* 1. Verantwortlicher */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">1. Verantwortlicher</h2>
            <p>
              Verantwortlicher im Sinne der DSGVO ist:<br /><br />
              Andreas Wygrabek<br />
              Diemelweg 8A<br />
              34317 Habichtswald<br />
              Deutschland<br /><br />
              E-Mail:{' '}
              <a href="mailto:kontakt@echo-b.de" className="text-accent hover:underline">kontakt@echo-b.de</a>
            </p>
          </div>

          {/* 2. Was EchoB ist */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">2. Worum es geht</h2>
            <p className="text-brand-muted text-sm">
              EchoB ist eine fallbasierte Reflexionsplattform für belastende Beziehungssituationen.
              Dabei verarbeiten wir <strong className="text-navy">besonders sensible Inhalte</strong> –
              Angaben zu deinen Beziehungen, Erlebnissen und deinem psychischen Befinden – und nutzen
              dafür <strong className="text-navy">KI-Unterstützung</strong>. Diese Erklärung legt offen,
              welche Daten dabei wie verarbeitet werden.
            </p>
          </div>

          {/* 3. Konto & Anmeldung */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">3. Konto und Anmeldung</h2>
            <p className="text-brand-muted text-sm">
              Für die Nutzung legst du ein Konto an (E-Mail und Passwort, alternativ Anmeldung über
              Google). Die Authentifizierung wickeln wir über unseren Dienstleister Supabase ab; dort
              werden E-Mail-Adresse und ein verschlüsselter Passwort-Hash gespeichert.
              <br /><br />
              <strong className="text-navy">Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO
              (Vertragserfüllung).
            </p>
          </div>

          {/* 4. Reflexionsinhalte – besondere Kategorien */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">
              4. Reflexionsinhalte (besondere Kategorien, Art. 9 DSGVO)
            </h2>
            <p className="text-brand-muted text-sm mb-3">
              Im geschützten Bereich erfasst du u. a. Fälle, Szenen, Gespräche mit „Echo", Skalen,
              Berichte, Hypothesen und Profile. Diese Inhalte können Angaben zu deiner Gesundheit,
              deinem psychischen Befinden und deinem Privat-/Sexualleben enthalten und gelten damit
              als <strong className="text-navy">besondere Kategorien personenbezogener Daten</strong>.
            </p>
            <p className="text-brand-muted text-sm">
              <strong className="text-navy">Rechtsgrundlage:</strong> deine{' '}
              <strong className="text-navy">ausdrückliche Einwilligung</strong> nach Art. 9 Abs. 2
              lit. a DSGVO, die wir vor der Nutzung einholen und protokollieren, sowie Art. 6 Abs. 1
              lit. b DSGVO (Vertrag). Du kannst die Einwilligung jederzeit mit Wirkung für die
              Zukunft widerrufen (siehe Abschnitt 10).
            </p>
          </div>

          {/* 5. KI-Verarbeitung & Drittlandtransfer */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">5. KI-Verarbeitung & Übermittlung in die USA</h2>
            <p className="text-brand-muted text-sm mb-3">
              Zur Erzeugung von Antworten, Zusammenfassungen und Berichten übermitteln wir die
              jeweils relevanten Inhalte an <strong className="text-navy">OpenAI</strong> (OpenAI,
              L.L.C., USA). Bei der Sprach-Schnellerfassung wird zusätzlich eine Audioaufnahme zur
              Transkription übermittelt. Eine Verarbeitung in den USA bedeutet ein
              Drittland ohne generell gleichwertiges Datenschutzniveau.
            </p>
            <p className="text-brand-muted text-sm">
              <strong className="text-navy">Rechtsgrundlage und Garantien:</strong> ausdrückliche
              Einwilligung nach Art. 9 Abs. 2 lit. a in Verbindung mit Art. 49 Abs. 1 lit. a DSGVO
              (Einwilligung in die Drittlandübermittlung) sowie – soweit einschlägig – Standard­vertrags­klauseln
              mit dem Anbieter. API-Inhalte werden vom Anbieter nicht zum Training seiner Modelle genutzt.
            </p>
          </div>

          {/* 6. Weitere Verarbeitungen */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">6. Weitere Verarbeitungen</h2>

            <h3 className="font-semibold text-navy mb-1">Zahlungen</h3>
            <p className="text-brand-muted text-sm mb-4">
              Für kostenpflichtige Funktionen nutzen wir den Zahlungsdienstleister Stripe. Die
              Zahlungsdaten verarbeitet Stripe eigenverantwortlich; wir erhalten nur die zur
              Vertragsabwicklung nötigen Informationen. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
            </p>

            <h3 className="font-semibold text-navy mb-1">Warteliste</h3>
            <p className="text-brand-muted text-sm mb-4">
              Trägst du dich in die Warteliste ein, speichern wir E-Mail-Adresse, optional einen
              Interessensbereich und eine Notiz sowie den Zeitpunkt. Rechtsgrundlage: Art. 6 Abs. 1
              lit. a DSGVO (Einwilligung), jederzeit widerrufbar.
            </p>

            <h3 className="font-semibold text-navy mb-1">Kontakt- und Anfrageformulare</h3>
            <p className="text-brand-muted text-sm mb-4">
              Über die Anfrageformulare (z. B. „Erstgespräch anfragen", „Persönliche Demo anfragen",
              Fachpersonen-Vormerkung) verarbeiten wir die von dir angegebenen Daten – Name
              (optional), E-Mail und/oder Telefonnummer sowie eine optionale Nachricht –, um dich zu
              deiner Anfrage zu kontaktieren. Die Angaben werden gespeichert und uns per E-Mail
              zugestellt und nur so lange aufbewahrt, wie es zur Bearbeitung deiner Anfrage
              erforderlich ist. Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) sowie
              Art. 6 Abs. 1 lit. b DSGVO (Anbahnung eines Vertrags), jederzeit widerrufbar.
            </p>

            <h3 className="font-semibold text-navy mb-1">E-Mail-Versand</h3>
            <p className="text-brand-muted text-sm mb-4">
              Für den Versand von System- und Benachrichtigungs-E-Mails (z. B. Anmeldebestätigung,
              Passwort-Zurücksetzen, Einladungen, Benachrichtigung über Anfragen) nutzen wir den
              Dienst <strong className="text-navy">Resend</strong> (Resend, Inc., USA). Der Versand
              erfolgt über die <strong className="text-navy">EU-Region des Anbieters (Irland)</strong>,
              sodass die dabei verarbeiteten Daten (Empfänger-Adresse, E-Mail-Inhalt) innerhalb der EU
              verarbeitet werden. Da der Anbieter seinen Unternehmenssitz in den USA hat, kann ein
              Zugriff aus einem Drittland nicht vollständig ausgeschlossen werden; hierfür bestehen
              Standardvertragsklauseln. Rechtsgrundlage: Art. 6 Abs. 1 lit. b und lit. f DSGVO.
            </p>

            <h3 className="font-semibold text-navy mb-1">Serverprotokolle</h3>
            <p className="text-brand-muted text-sm">
              Beim Aufruf der Website werden technisch notwendige Protokolldaten verarbeitet
              (z. B. Browsertyp, Zeitpunkt). Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO
              (berechtigtes Interesse an fehlerfreiem Betrieb und Sicherheit).
            </p>
          </div>

          {/* 7. Empfänger / Auftragsverarbeiter */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">7. Empfänger und Auftragsverarbeiter</h2>
            <p className="text-brand-muted text-sm mb-3">
              Wir setzen sorgfältig ausgewählte Dienstleister als Auftragsverarbeiter ein. Mit ihnen
              werden Verträge zur Auftragsverarbeitung nach Art. 28 DSGVO geschlossen:
            </p>
            <ul className="list-disc list-inside text-sm text-brand-muted space-y-1.5">
              <li><strong className="text-navy">Hetzner</strong> – Server-Hosting der Anwendung und Datenbank (Deutschland/EU)</li>
              <li><strong className="text-navy">Supabase</strong> – Authentifizierung und Datenbank</li>
              <li><strong className="text-navy">Cloudflare</strong> – Auslieferung und Absicherung der Website</li>
              <li><strong className="text-navy">OpenAI</strong> – KI-gestützte Verarbeitung (USA, siehe Abschnitt 5)</li>
              <li><strong className="text-navy">Stripe</strong> – Zahlungsabwicklung</li>
              <li><strong className="text-navy">Resend</strong> – Versand von System- und Benachrichtigungs-E-Mails (Resend, Inc., USA; Verarbeitung in der EU-Region Irland – siehe Abschnitt 6)</li>
            </ul>
          </div>

          {/* 8. Trennung von Identität und Inhalt */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">8. Pseudonymisierung und Zugriff</h2>
            <p className="text-brand-muted text-sm">
              Deine Inhalte werden in der Anwendungsdatenbank nur unter einer pseudonymen Kennung
              gespeichert; Klarname und E-Mail liegen getrennt im Authentifizierungssystem. Aus
              technischen und betrieblichen Gründen (z. B. Fehlersuche, Sicherheit) kann der
              Verantwortliche grundsätzlich auf gespeicherte Inhalte zugreifen. Wir beschränken
              solche Zugriffe auf das Notwendige. <strong className="text-navy">Bitte gib während der
              Entwicklungsphase keine Klarnamen oder echten Daten Dritter ein</strong> und nutze
              Pseudonyme.
            </p>
          </div>

          {/* 9. Freigabe an Fachpersonen */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">9. Freigabe an Fachpersonen</h2>
            <p className="text-brand-muted text-sm">
              Du kannst einzelne Inhalte eines Falls gezielt an eine registrierte Fachperson
              freigeben. Es wird ausschließlich das übermittelt, was du auswählst; die Freigabe ist
              jederzeit widerrufbar. Rechtsgrundlage: Art. 6 Abs. 1 lit. a / Art. 9 Abs. 2 lit. a
              DSGVO (Einwilligung).
            </p>
          </div>

          {/* 10. Speicherdauer, Widerruf & Löschung */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">10. Speicherdauer, Widerruf und Löschung</h2>
            <p className="text-brand-muted text-sm">
              Wir speichern deine Daten, solange dein Konto besteht bzw. bis du sie löschst.
              Im Bereich <strong className="text-navy">„Datenschutz"</strong> kannst du jederzeit
              selbst:
            </p>
            <ul className="list-disc list-inside text-sm text-brand-muted space-y-1.5 mt-2">
              <li>alle deine Daten als Datei <strong className="text-navy">exportieren</strong> (Art. 15/20),</li>
              <li>einzelne <strong className="text-navy">Fälle endgültig löschen</strong>,</li>
              <li>dein <strong className="text-navy">Konto vollständig löschen</strong> (Art. 17) – dabei werden alle Inhalte und das Login-Konto entfernt.</li>
            </ul>
            <p className="text-brand-muted text-sm mt-2">
              Die Löschung deines Kontos gilt zugleich als Widerruf der erteilten Einwilligungen.
            </p>
          </div>

          {/* 11. Cookies und Tracking */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">11. Cookies und Tracking</h2>
            <p className="text-brand-muted text-sm">
              EchoB verwendet <strong className="text-navy">keine Tracking-Cookies</strong>, kein
              Google Analytics und keine Werbedienste. Es werden nur technisch notwendige Daten
              verarbeitet (z. B. für die Anmeldung). Schriftarten werden selbst gehostet – beim
              Seitenaufruf entsteht kein Abruf bei externen Schrift-Anbietern.
            </p>
          </div>

          {/* 12. Deine Rechte */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">12. Deine Rechte</h2>
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

          {/* 13. Datensicherheit */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">13. Datensicherheit</h2>
            <p className="text-brand-muted text-sm">
              Wir setzen technische und organisatorische Maßnahmen ein, um deine Daten gegen Verlust,
              Manipulation und unberechtigten Zugriff zu schützen. Dazu gehören:
            </p>
            <ul className="list-disc list-inside text-sm text-brand-muted space-y-1.5 mt-2">
              <li>verschlüsselte Übertragung über HTTPS/TLS,</li>
              <li>Verschlüsselung im Ruhezustand: Der Server-Datenträger ist verschlüsselt, und
                sensible Freitext-Inhalte werden zusätzlich auf Feldebene verschlüsselt gespeichert,</li>
              <li>verschlüsselte, regelmäßige Backups,</li>
              <li>Pseudonymisierung (Trennung von Inhalt und Identität) sowie Beschränkung interner
                Zugriffe auf das Notwendige.</li>
            </ul>
          </div>

          {/* 14. Änderungen */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">14. Änderungen dieser Erklärung</h2>
            <p className="text-brand-muted text-sm">
              Wir passen diese Datenschutzerklärung an, sobald sich die Rechtslage oder unsere
              Verarbeitungen ändern. Die jeweils aktuelle Version ist stets auf dieser Seite abrufbar.
            </p>
          </div>

        </div>
      </section>
    </PageLayout>
  )
}
