import PageLayout from '@/components/layout/PageLayout'
import ErstgespraechCTA from '@/components/coaching/ErstgespraechCTA'

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
            <ErstgespraechCTA className="btn-primary" label="Erstgespräch anfragen" source="coaching_hero" />
            <a href="tel:+4917359089060" className="btn-outline">☎ 0173 5908906</a>
          </div>
        </div>
      </section>

      {/* Erreichbarkeit */}
      <section className="border-t border-brand-border px-6 py-[72px]">
        <div className="mx-auto max-w-[960px] space-y-8">

          {/* Dunkle Karte: Kontakt */}
          <div
            className="rounded-2xl bg-navy p-6 md:p-8 shadow-[0_8px_32px_rgba(15,30,46,0.25)] md:flex md:items-center md:gap-10"
            style={{ backgroundImage: 'radial-gradient(ellipse 60% 70% at 90% 20%, rgba(59,106,154,0.3) 0%, transparent 70%)' }}
          >
            <div className="md:w-[260px] flex-shrink-0 mb-6 md:mb-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
                <span className="text-sm font-bold text-white">Wir sind erreichbar</span>
              </div>
              <p className="text-sm text-brand-blue leading-relaxed">
                Melde dich direkt – ohne Wartezeiten, ohne Formulare. Montag bis Freitag 8–20 Uhr,
                samstags 10–16 Uhr.
              </p>
            </div>
            <div className="flex-1 grid gap-4 sm:grid-cols-3">
              {[
                { label: 'Telefon', value: '0173 5908906', sub: 'Mo–Sa, direkt erreichbar', href: 'tel:+4917359089060' },
                { label: 'Coaching-Anfragen', value: 'kontakt@echo-b.de', sub: 'Antwort innerhalb 24h', href: 'mailto:kontakt@echo-b.de' },
                { label: 'Allgemeine Anfragen', value: 'kontakt@echo-b.de', sub: 'Fragen zur App & Plattform', href: 'mailto:kontakt@echo-b.de' },
              ].map(({ label, value, sub, href }) => (
                <a
                  key={label}
                  href={href}
                  className="block rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 no-underline
                             transition-all hover:border-accent/50 hover:bg-white/[0.07]"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brand-blue mb-1">{label}</p>
                  <p className="text-sm font-bold text-white mb-1 break-all">{value}</p>
                  <p className="text-xs text-white/45">{sub}</p>
                </a>
              ))}
            </div>
          </div>

          {/* Dunkle Karte: Echte Menschen */}
          <div
            className="rounded-2xl bg-navy p-6 md:p-8 shadow-[0_8px_32px_rgba(15,30,46,0.25)] flex flex-wrap gap-6 items-center"
            style={{ backgroundImage: 'radial-gradient(ellipse 60% 70% at 10% 90%, rgba(59,106,154,0.25) 0%, transparent 70%)' }}
          >
            <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center text-2xl flex-shrink-0 shadow-[0_4px_16px_rgba(224,123,84,0.4)]">
              👤
            </div>
            <div className="flex-1 min-w-[240px] max-w-[420px]">
              <h3 className="font-bold text-white mb-2">Echte Menschen, keine Bot-Antworten</h3>
              <p className="text-sm text-brand-blue leading-relaxed">
                Hinter EchoB stehen ausgebildete Beraterinnen und Berater mit Erfahrung in Beziehungsthemen,
                systemischer Beratung und Krisenbegleitung. Wir nutzen KI als Werkzeug – aber du sprichst
                mit einem Menschen, der zuhört.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5 ml-auto">
              {['🔒 Vertraulich', '📞 Direkt erreichbar', '💬 Kein Skript'].map(b => (
                <span key={b} className="text-sm font-medium px-4 py-2 rounded-full bg-white text-navy shadow-md">{b}</span>
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
            Von der einzelnen Stunde bis zur kontinuierlichen Begleitung – je nachdem, was du
            gerade brauchst. Die EchoB-Plattform ist überall mit dabei.
          </p>

          {/* Beziehungscoaching */}
          <div className="mt-10">
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
                <ErstgespraechCTA className="btn-primary text-center text-sm block w-full" label="Erstgespräch anfragen" source="coaching_erstgespraech" />
              </div>

              {/* Einzeltermin */}
              <div className="card flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-accent/15 text-accent self-start mb-3">Inkl. 1 Monat App</span>
                <p className="font-bold text-navy mb-1">Einzeltermin</p>
                <p className="text-xs text-brand-muted mb-4 leading-relaxed">Punktuelle Begleitung plus ein Monat voller App-Zugang – wann immer du ihn brauchst. Flexibel, ohne Abo.</p>
                <div className="text-2xl font-extrabold text-navy mb-1">119 € <span className="text-sm font-normal text-brand-muted">/Termin</span></div>
                <p className="text-xs text-brand-muted mb-4">90 Min. · 120 Min. ohne vorheriges Erstgespräch</p>
                <ul className="space-y-1.5 mb-6 flex-1">
                  {['Persönliches Coaching-Gespräch (90 Min.)', '1 Monat EchoB-Vollzugang inklusive', 'Auf Wunsch: Plattform-Einführung in Echo', 'Auswertung deiner EchoB-Daten auf Wunsch', 'Schriftliche Zusammenfassung im Anschluss', 'Kein Folgecommitment'].map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-navy"><span className="text-accent mt-0.5 shrink-0">✓</span>{f}</li>
                  ))}
                </ul>
                <ErstgespraechCTA className="w-full rounded-brand border-2 border-navy/25 py-2.5 text-center text-sm font-semibold text-navy transition-colors hover:border-navy/50 hover:bg-navy/[0.03]" label="Termin buchen" heading="Einzeltermin buchen" source="coaching_einzeltermin" />
              </div>

              {/* Monatspaket */}
              <div className="rounded-brand border-2 border-accent bg-accent/5 p-5 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-accent text-white self-start mb-3">Empfohlen</span>
                <p className="font-bold text-navy mb-1">Monatspaket „Begleitung"</p>
                <p className="text-xs text-brand-muted mb-4 leading-relaxed">Wöchentlicher Rhythmus aus persönlicher Begleitung und geführter Selbstreflexion – für Menschen, die tiefer gehen möchten.</p>
                <div className="text-2xl font-extrabold text-navy mb-1">499 € <span className="text-sm font-normal text-brand-muted">/Monat</span></div>
                <p className="text-xs text-brand-muted mb-4">Wöchentliche Online-Check-ins · je 60 Min.</p>
                <ul className="space-y-1.5 mb-6 flex-1">
                  {['Wöchentliche 60-Min.-Online-Check-ins', 'Persönliche Plattform-Einführung in Echo', 'Geführte Dialoge in der App zwischen den Terminen (Themen, Bindung, Eigenanteil …)', 'Voller EchoB-Plattformzugang inklusive', 'Auswertung aller Skalenwerte & Muster', 'Bericht für Therapie/Übergabe auf Wunsch'].map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-navy"><span className="text-accent mt-0.5 shrink-0">✓</span>{f}</li>
                  ))}
                </ul>
                <ErstgespraechCTA className="btn-primary text-center text-sm block w-full" label="Paket anfragen" heading="Monatspaket anfragen" source="coaching_monatspaket" />
                <p className="text-[10px] text-brand-muted mt-2 text-center">Wöchentliche Begleitung · monatlich kündbar</p>
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
            <ErstgespraechCTA className="btn-primary" label="Erstgespräch anfragen" source="coaching_cta" />
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
