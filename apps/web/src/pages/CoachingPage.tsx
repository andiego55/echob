import { Link } from 'react-router-dom'
import PageLayout from '@/components/layout/PageLayout'

const COACHING_PROCESS = [
  { icon: '✉', title: '1. Kontakt aufnehmen', text: 'Schreib uns eine kurze E-Mail oder ruf direkt an. Wir melden uns innerhalb von 24 Stunden – ohne Formulare, ohne Warteschleife.' },
  { icon: '💬', title: '2. Erstgespräch (kostenlos)', text: 'In 30 Minuten sortieren wir gemeinsam, was dich beschäftigt, welche Unterstützung passt – und ob Coaching der richtige nächste Schritt ist.' },
  { icon: '🔄', title: '3. Reflexion zwischen Gesprächen', text: 'Zwischen den Sessions nutzt du EchoB, um Situationen festzuhalten und Muster zu erkennen. Dein Coach kann diese Daten einbeziehen – mit deiner Zustimmung.' },
]

const KI_MENSCH = [
  { icon: '🤖', title: 'Was die KI leistet', text: 'Echo analysiert deine dokumentierten Situationen, erkennt wiederkehrende Dynamiken, berechnet Skalenwerte zu Belastung, Bindungsmustern und Selbstwahrnehmung – und ist jederzeit verfügbar.' },
  { icon: '👤', title: 'Was Menschen leisten', text: 'Dein Coach hört zu, stellt Rückfragen, hält Ambivalenz aus und begleitet dich in Momenten, in denen Struktur allein nicht hilft. Echte Verbindung kann keine KI ersetzen.' },
  { icon: '📊', title: 'Daten als Gesprächsgrundlage', text: 'Mit deiner Erlaubnis kann dein Coach auf deine EchoB-Daten zugreifen: Szenen, Muster, Skalenwerte. Das macht Gespräche konkreter und spart wertvolle Zeit.' },
  { icon: '🔒', title: 'Deine Daten gehören dir', text: 'Was du in EchoB dokumentierst, teilst du nur dann, wenn du es möchtest. Kein Coaching-Zugriff ohne deine ausdrückliche Freigabe. DSGVO-konform, Server in Deutschland.' },
]

const TRUST_BADGES = [
  { icon: '🇩🇪', label: 'Server in Deutschland' },
  { icon: '🔒', label: 'DSGVO-konform' },
  { icon: '🚫', label: 'Keine Datenweitergabe' },
  { icon: '🗑️', label: 'Jederzeit löschbar' },
  { icon: '👁️', label: 'Coaching-Zugriff nur mit Freigabe' },
  { icon: '🔐', label: 'Verschlüsselte Übertragung' },
]

export default function CoachingPage() {
  return (
    <PageLayout>

      {/* Hero */}
      <section
        className="bg-navy text-white px-6 pt-[calc(60px+5rem)] pb-20 md:pb-28"
        style={{ backgroundImage: 'radial-gradient(ellipse 65% 55% at 80% 40%, rgba(59,106,154,0.25) 0%, transparent 70%)' }}
      >
        <div className="mx-auto max-w-[960px]">
          <span className="label">Menschliche Begleitung</span>
          <h1 className="mt-2 text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold leading-[1.2] tracking-[-0.02em] max-w-2xl">
            KI analysiert. Menschen begleiten.
          </h1>
          <p className="mt-5 text-[1.05rem] text-brand-blue max-w-[560px] leading-[1.75]">
            EchoB verbindet strukturierte KI-Reflexion mit echter menschlicher Beratung.
            Wenn du mehr willst als eine App, sind wir persönlich für dich da.
          </p>
          <div className="mt-9 flex flex-wrap gap-3.5">
            <a href="mailto:coaching@echo-b.de" className="btn-primary">Erstgespräch anfragen</a>
            <a href="tel:+4917359089060" className="btn-outline">☎ 0173 5908906</a>
          </div>
        </div>
      </section>

      {/* Erreichbarkeit */}
      <section className="border-t border-brand-border px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <div className="rounded-brand border border-brand-border bg-white p-6 mb-8">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
              <span className="text-sm font-bold text-navy">Wir sind erreichbar</span>
            </div>
            <p className="text-sm text-brand-muted mb-6">
              Melde dich direkt – ohne Wartezeiten, ohne Formulare. Montag bis Freitag 8–20 Uhr, samstags 10–16 Uhr.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: 'Telefon', value: '0173 5908906', sub: 'Mo–Sa, direkt erreichbar', href: 'tel:+4917359089060' },
                { label: 'Coaching-Anfragen', value: 'coaching@echo-b.de', sub: 'Antwort innerhalb 24h', href: 'mailto:coaching@echo-b.de' },
                { label: 'Allgemeine Anfragen', value: 'info@echo-b.de', sub: 'Fragen zur App & Plattform', href: 'mailto:info@echo-b.de' },
              ].map(({ label, value, sub, href }) => (
                <a key={label} href={href} className="card block no-underline hover:border-accent/40 transition-all">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-1">{label}</p>
                  <p className="text-sm font-semibold text-accent mb-1">{value}</p>
                  <p className="text-xs text-brand-muted">{sub}</p>
                </a>
              ))}
            </div>
          </div>

          {/* Echte Menschen */}
          <div className="rounded-brand border border-brand-border bg-white p-6 flex flex-wrap gap-6 items-start">
            <div className="text-4xl">👤</div>
            <div className="flex-1 min-w-[240px]">
              <h3 className="font-bold text-navy mb-2">Echte Menschen, keine Bot-Antworten</h3>
              <p className="text-sm text-brand-muted leading-relaxed">
                Hinter EchoB stehen ausgebildete Beraterinnen und Berater mit Erfahrung in Beziehungsthemen,
                systemischer Beratung und Krisenbegleitung. Wir nutzen KI als Werkzeug – aber du sprichst
                mit einem Menschen, der zuhört.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {['🔒 Vertraulich', '📞 Direkt erreichbar', '💬 Kein Skript'].map(b => (
                <span key={b} className="text-xs font-medium px-3 py-1.5 rounded-full border border-brand-border bg-brand-bg text-navy">{b}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Angebote & Preise */}
      <section className="border-t border-brand-border bg-navy/[0.02] px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <span className="label">Angebote & Preise</span>
          <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy">
            Was du bei EchoB buchen kannst
          </h2>
          <p className="mt-3 text-brand-muted max-w-[600px] leading-[1.75]">
            Zwei Produktlinien – je nachdem, was du gerade brauchst.
          </p>

          {/* Startpaket */}
          <div className="mt-10">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-muted">Einstieg</span>
            <h3 className="text-lg font-bold text-navy mt-1 mb-2">Startpaket – App + Coaching</h3>
            <p className="text-sm text-brand-muted mb-6 max-w-xl">
              Der ideale Start: 1 Monat voller App-Zugang mit GPT-4o plus eine persönliche Coaching-Stunde mit dem EchoB-Gründer.
            </p>
            <div className="rounded-brand border-2 border-accent bg-accent/5 p-6 max-w-lg">
              <div className="flex items-start justify-between mb-2">
                <span className="text-base font-bold text-navy">Startpaket</span>
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-accent text-white">Empfohlen</span>
              </div>
              <div className="text-3xl font-extrabold text-navy mb-1">99 € <span className="text-sm font-normal text-brand-muted">/ einmalig</span></div>
              <ul className="space-y-1.5 my-4">
                {[
                  '1 Monat App-Vollzugang',
                  'Alle 5 Berichtstypen & Dialogformen',
                  'Unbegrenzte Fälle & Szenen',
                  'GPT-4o – bestes verfügbares KI-Modell',
                  '1 persönliche Coaching-Stunde (60 min)',
                  'Terminvereinbarung direkt nach Buchung',
                ].map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-navy">
                    <span className="text-accent mt-0.5 shrink-0">✓</span>{f}
                  </li>
                ))}
              </ul>
              <a
                href={`mailto:info@echo-b.de?subject=${encodeURIComponent('EchoB Startpaket')}&body=${encodeURIComponent('Hallo,\n\nich möchte das Startpaket (99 € einmalig) buchen.\n\nMeine E-Mail-Adresse: \n\nBitte schalte meinen Zugang frei und kontaktiere mich für die Terminvereinbarung der Coaching-Stunde.\n\nVielen Dank!')}`}
                className="btn-primary block text-center"
              >
                Startpaket buchen
              </a>
            </div>
          </div>

          {/* Beziehungscoaching */}
          <div className="mt-14">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-muted">Kontinuierliche Begleitung</span>
            <h3 className="text-lg font-bold text-navy mt-1 mb-2">Beziehungscoaching</h3>
            <p className="text-sm text-brand-muted mb-6 max-w-xl">
              Persönliche Begleitung durch ausgebildete Beraterinnen und Berater –
              kombiniert mit der EchoB-Plattform für tiefe Reflexionsprozesse.
            </p>
            <div className="grid gap-5 sm:grid-cols-3">
              {/* Erstgespräch */}
              <div className="card flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-green-100 text-green-700 self-start mb-3">Kostenlos</span>
                <p className="font-bold text-navy mb-1">Erstgespräch</p>
                <p className="text-xs text-brand-muted mb-4 leading-relaxed">Lerne uns kennen. Kein Druck, keine Verpflichtung – nur ein ehrliches Gespräch.</p>
                <div className="text-2xl font-extrabold text-navy mb-1">0 €</div>
                <p className="text-xs text-brand-muted mb-4">30 Minuten · Einmalig</p>
                <ul className="space-y-1.5 mb-6 flex-1">
                  {['Vertrauliches Kennenlerngespräch', 'Deine Situation schildern', 'Einschätzung, was dir helfen könnte', 'Kein Weiterbuchen nötig'].map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-navy"><span className="text-accent mt-0.5 shrink-0">✓</span>{f}</li>
                  ))}
                </ul>
                <a href="mailto:coaching@echo-b.de?subject=Erstgespräch" className="btn-primary text-center text-sm block">Erstgespräch anfragen</a>
              </div>

              {/* Einzelstunde */}
              <div className="card flex flex-col">
                <div className="h-6 mb-3" />
                <p className="font-bold text-navy mb-1">Einzelstunde</p>
                <p className="text-xs text-brand-muted mb-4 leading-relaxed">Punktuelle Begleitung, wann immer du sie brauchst. Flexibel buchbar, ohne Abo.</p>
                <div className="text-2xl font-extrabold text-navy mb-1">119 € <span className="text-sm font-normal text-brand-muted">/Std.</span></div>
                <p className="text-xs text-brand-muted mb-4">60 Minuten · Einzeln buchbar</p>
                <ul className="space-y-1.5 mb-6 flex-1">
                  {['Persönliches Coaching-Gespräch (60 Min.)', 'Auswertung deiner EchoB-Daten auf Wunsch', 'Schriftliche Zusammenfassung im Anschluss', 'Kein Folgecommitment'].map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-navy"><span className="text-accent mt-0.5 shrink-0">✓</span>{f}</li>
                  ))}
                </ul>
                <a href="mailto:coaching@echo-b.de?subject=Einzelstunde" className="btn-outline text-center text-sm block">Session buchen</a>
              </div>

              {/* Monatspaket */}
              <div className="rounded-brand border-2 border-accent bg-accent/5 p-5 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-accent text-white self-start mb-3">Empfohlen</span>
                <p className="font-bold text-navy mb-1">Monatspaket „Begleitung"</p>
                <p className="text-xs text-brand-muted mb-4 leading-relaxed">Kontinuierliche Begleitung über einen Monat – für Menschen, die tiefer gehen möchten.</p>
                <div className="text-2xl font-extrabold text-navy mb-1">499 € <span className="text-sm font-normal text-brand-muted">/Monat</span></div>
                <p className="text-xs text-brand-muted mb-4">6 Sessions à 60 Min. · ≈ 83 € pro Session</p>
                <ul className="space-y-1.5 mb-6 flex-1">
                  {['6 persönliche Coaching-Sessions', 'Wöchentliche Check-ins per Chat', 'Voller EchoB-Plattformzugang inklusive', 'Auswertung aller Skalenwerte & Muster', 'Bericht für Therapie erstellen', 'Priority-Rückmeldung innerhalb 4 Stunden'].map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-navy"><span className="text-accent mt-0.5 shrink-0">✓</span>{f}</li>
                  ))}
                </ul>
                <a href="mailto:coaching@echo-b.de?subject=Monatspaket" className="btn-primary text-center text-sm block">Paket anfragen</a>
                <p className="text-[10px] text-brand-muted mt-2 text-center">Spart ~30 % gegenüber Einzelstunden · monatlich kündbar</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ablauf */}
      <section className="border-t border-brand-border px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <span className="label">Ablauf</span>
          <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy">Wie ein Coaching bei EchoB läuft</h2>
          <p className="mt-3 text-brand-muted max-w-[600px] leading-[1.75]">Der Prozess ist klar und transparent – du behältst jederzeit die Kontrolle.</p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {COACHING_PROCESS.map(({ icon, title, text }) => (
              <div key={title} className="card">
                <div className="text-3xl mb-3">{icon}</div>
                <h3 className="font-bold text-navy mb-2">{title}</h3>
                <p className="text-sm text-brand-muted leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* KI + Mensch */}
      <section className="border-t border-brand-border bg-navy/[0.02] px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <span className="label">Das Besondere</span>
          <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy">Warum KI und Mensch zusammengehören</h2>
          <p className="mt-3 text-brand-muted max-w-[600px] leading-[1.75]">Weder Algorithmen noch Gespräche allein reichen aus. EchoB kombiniert beides.</p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {KI_MENSCH.map(({ icon, title, text }) => (
              <div key={title} className="card flex gap-4">
                <span className="text-2xl shrink-0 mt-0.5">{icon}</span>
                <div>
                  <h3 className="font-bold text-navy mb-1.5">{title}</h3>
                  <p className="text-sm text-brand-muted leading-relaxed">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Datenschutz */}
      <section className="border-t border-brand-border px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <span className="label">Sicherheit & Datenschutz</span>
          <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy">Dein Vertrauen ist die Grundlage</h2>
          <p className="mt-3 text-brand-muted max-w-[600px] leading-[1.75]">
            Du teilst Dinge, die wirklich persönlich sind. Deshalb nehmen wir Datenschutz und Vertraulichkeit
            als zentrale Verantwortung – nicht als Selbstverständlichkeit.
          </p>
          <div className="mt-8 flex flex-wrap gap-2 mb-10">
            {TRUST_BADGES.map(({ icon, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-brand-border bg-white text-navy">
                <span>{icon}</span>{label}
              </span>
            ))}
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { title: 'Schweigepflicht & Vertraulichkeit', text: 'Alle Coaching-Gespräche sind vertraulich. Was du schilderst, bleibt bei deinem Coach. Keine Weitergabe, keine Aktennotizen außerhalb der vereinbarten Dokumentation.' },
              { title: 'Datenminimierung', text: 'EchoB erhebt nur, was für den Dienst notwendig ist. Keine Werbeprofile, keine Analyse für Dritte. Du kannst alle deine Daten jederzeit exportieren oder löschen.' },
              { title: 'Kein Ersatz für Therapie', text: 'EchoB-Coaching ist Beratung, keine Psychotherapie. Wenn du therapeutische Unterstützung brauchst, helfen wir dir, die richtigen Anlaufstellen zu finden.' },
            ].map(({ title, text }) => (
              <div key={title} className="card">
                <h3 className="font-bold text-navy mb-2">{title}</h3>
                <p className="text-sm text-brand-muted leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-navy text-white px-6 py-[72px]">
        <div className="mx-auto max-w-[960px] text-center">
          <span className="label">Jetzt anfangen</span>
          <h2 className="mt-2 text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold text-white">Bereit für ein Erstgespräch?</h2>
          <p className="mt-4 text-brand-blue max-w-xl mx-auto leading-[1.75]">
            Schreib uns eine kurze Nachricht oder ruf direkt an. Das Erstgespräch ist kostenlos und unverbindlich.
          </p>
          <div className="mt-8 flex justify-center flex-wrap gap-4">
            <a href="mailto:coaching@echo-b.de" className="btn-primary">Erstgespräch anfragen</a>
            <a href="tel:+4917359089060" className="btn-outline">☎ 0173 5908906</a>
          </div>
          <p className="mt-6 text-xs text-white/30 max-w-lg mx-auto">
            EchoB-Coaching ersetzt keine Psychotherapie. Bei akuter Gefahr: Telefonseelsorge{' '}
            <strong className="text-white/50">0800 111 0 111</strong> (kostenlos, 24/7) oder Notruf{' '}
            <strong className="text-white/50">112</strong>.
          </p>
        </div>
      </section>

    </PageLayout>
  )
}
