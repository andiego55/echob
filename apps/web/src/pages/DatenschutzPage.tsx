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

          {/* 1. Verantwortlicher */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">1. Verantwortlicher</h2>
            <p>
              Verantwortlicher im Sinne der DSGVO ist:<br /><br />
              Max Mustermann<br />
              Dorfstraße 1<br />
              111 Hellersdorf<br />
              Deutschland<br /><br />
              E-Mail:{' '}
              <a href="mailto:max.m@echob.de" className="text-accent hover:underline">
                max.m@echob.de
              </a>
            </p>
          </div>

          {/* 2. Datenschutzbeauftragter */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">2. Datenschutzbeauftragter</h2>
            <p>
              Max Mustermann<br />
              Dorfstraße 1<br />
              111 Hellersdorf<br /><br />
              E-Mail:{' '}
              <a href="mailto:max.m@echob.de" className="text-accent hover:underline">
                max.m@echob.de
              </a>
            </p>
          </div>

          {/* 3. Welche Daten wir verarbeiten */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">3. Welche Daten wir verarbeiten</h2>

            <h3 className="font-semibold text-navy mb-1">Warteliste</h3>
            <p className="text-brand-muted text-sm mb-4">
              Wenn du dich in die Warteliste einträgst, speichern wir:
            </p>
            <ul className="list-disc list-inside text-sm text-brand-muted space-y-1 mb-4">
              <li>Deine E-Mail-Adresse (Pflichtangabe)</li>
              <li>Dein Interessensbereich, falls angegeben (optional)</li>
              <li>Eine Freitext-Notiz, falls angegeben (optional)</li>
              <li>Den Zeitpunkt der Eintragung</li>
            </ul>
            <p className="text-brand-muted text-sm">
              <strong className="text-navy">Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO
              (Einwilligung). Du kannst deine Einwilligung jederzeit widerrufen, indem du uns
              eine E-Mail sendest. Deine Daten werden dann unverzüglich aus der Warteliste gelöscht.
            </p>

            <h3 className="font-semibold text-navy mt-6 mb-1">Serverprotokolle</h3>
            <p className="text-brand-muted text-sm">
              Beim Aufruf der Website speichert unser Webserver automatisch Informationen in
              sogenannten Server-Log-Dateien: Browsertyp, Betriebssystem, Referrer-URL,
              Hostname und Uhrzeit der Anfrage. Diese Daten sind nicht einer bestimmten
              Person zuordenbar und werden nicht mit anderen Datenquellen zusammengeführt.
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an
              der technisch fehlerfreien Bereitstellung).
            </p>
          </div>

          {/* 4. Cookies und Tracking */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">4. Cookies und Tracking</h2>
            <p className="text-brand-muted text-sm">
              Diese Website verwendet <strong className="text-navy">keine Tracking-Cookies</strong>,
              kein Google Analytics, kein Facebook Pixel und keine vergleichbaren
              Analyse- oder Werbedienste. Es werden ausschließlich technisch notwendige
              Daten verarbeitet, die für den Betrieb der Website erforderlich sind.
            </p>
          </div>

          {/* 5. Deine Rechte */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">5. Deine Rechte</h2>
            <p className="text-brand-muted text-sm mb-3">
              Du hast gegenüber uns folgende Rechte hinsichtlich deiner personenbezogenen Daten:
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
              Zur Ausübung deiner Rechte genügt eine E-Mail an{' '}
              <a href="mailto:max.m@echob.de" className="text-accent hover:underline">
                max.m@echob.de
              </a>.
              Du hast außerdem das Recht, dich bei der zuständigen Datenschutz-Aufsichtsbehörde
              zu beschweren.
            </p>
          </div>

          {/* 6. Datensicherheit */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">6. Datensicherheit</h2>
            <p className="text-brand-muted text-sm">
              Wir setzen technische und organisatorische Sicherheitsmaßnahmen ein, um deine
              Daten gegen Manipulation, Verlust oder unberechtigten Zugriff zu schützen.
              Die Übertragung erfolgt verschlüsselt über HTTPS.
            </p>
          </div>

          {/* 7. Änderungen */}
          <div>
            <h2 className="text-lg font-bold text-navy mb-3">7. Änderungen dieser Erklärung</h2>
            <p className="text-brand-muted text-sm">
              Wir behalten uns vor, diese Datenschutzerklärung anzupassen, sobald sich die
              Rechtslage oder unsere Datenverarbeitungen ändern. Die jeweils aktuelle Version
              ist stets auf dieser Seite abrufbar.
            </p>
          </div>

        </div>
      </section>
    </PageLayout>
  )
}
