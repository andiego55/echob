import { type ReactNode } from 'react'
import PageLayout from '@/components/layout/PageLayout'
import ErstgespraechCTA from '@/components/coaching/ErstgespraechCTA'

const iconCls = 'h-6 w-6'
const svg = (children: ReactNode, cls: string = iconCls) => (
  <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
)

const COACHING_PROCESS = [
  { icon: svg(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M4 7l8 5 8-5" /></>), title: '1. Kontakt aufnehmen', text: 'Schreib uns eine kurze E-Mail oder ruf direkt an. Wir melden uns innerhalb von 24 Stunden – ohne Formulare, ohne Warteschleife.' },
  { icon: svg(<path d="M20 11.5a7.5 7.5 0 0 1-10.5 6.9L4 20l1.6-4.5A7.5 7.5 0 1 1 20 11.5z" />), title: '2. Erstgespräch (kostenlos)', text: 'In 30 Minuten sortieren wir gemeinsam, was dich beschäftigt, welche Unterstützung passt – und ob Coaching der richtige nächste Schritt ist.' },
  { icon: svg(<><path d="M4 12a8 8 0 0 1 13.7-5.6L20 8" /><path d="M20 4v4h-4" /><path d="M20 12a8 8 0 0 1-13.7 5.6L4 16" /><path d="M4 20v-4h4" /></>), title: '3. Reflexion zwischen Gesprächen', text: 'Zwischen den Sessions nutzt du EchoB, um Situationen festzuhalten und Muster zu erkennen. Dein Coach kann diese Daten einbeziehen – mit deiner Zustimmung.' },
]

const KI_MENSCH = [
  { icon: svg(<><rect x="6" y="6" width="12" height="12" rx="2" /><rect x="9.5" y="9.5" width="5" height="5" rx="1" /><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" /></>), title: 'Was die KI leistet', text: 'Echo analysiert deine dokumentierten Situationen, erkennt wiederkehrende Dynamiken, berechnet Skalenwerte zu Belastung, Bindungsmustern und Selbstwahrnehmung – und ist jederzeit verfügbar.' },
  { icon: svg(<><circle cx="12" cy="8" r="3.5" /><path d="M5.5 19a6.5 6.5 0 0 1 13 0" /></>), title: 'Was Menschen leisten', text: 'Dein Coach hört zu, stellt Rückfragen, hält Ambivalenz aus und begleitet dich in Momenten, in denen Struktur allein nicht hilft. Echte Verbindung kann keine KI ersetzen.' },
  { icon: svg(<><path d="M3 20h18" /><path d="M6 20v-6M12 20V8M18 20v-9" /></>), title: 'Daten als Gesprächsgrundlage', text: 'Mit deiner Erlaubnis kann dein Coach auf deine EchoB-Daten zugreifen: Szenen, Muster, Skalenwerte. Das macht Gespräche konkreter und spart wertvolle Zeit.' },
  { icon: svg(<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>), title: 'Deine Daten gehören dir', text: 'Was du in EchoB dokumentierst, teilst du nur dann, wenn du es möchtest. Kein Coaching-Zugriff ohne deine ausdrückliche Freigabe. Server in Deutschland, verschlüsselte Speicherung.' },
]

const badgeIcon = 'h-3.5 w-3.5'
const TRUST_BADGES = [
  { icon: svg(<><rect x="4" y="4" width="16" height="7" rx="1.5" /><rect x="4" y="13" width="16" height="7" rx="1.5" /><path d="M7.5 7.5h.01M7.5 16.5h.01" /></>, badgeIcon), label: 'Server in Deutschland' },
  { icon: svg(<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>, badgeIcon), label: 'Server in der EU' },
  { icon: svg(<><circle cx="12" cy="12" r="8.5" /><path d="M6 6l12 12" /></>, badgeIcon), label: 'Keine Datenweitergabe' },
  { icon: svg(<><path d="M5 7h14M10 7V5h4v2M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12" /></>, badgeIcon), label: 'Jederzeit löschbar' },
  { icon: svg(<><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" /><circle cx="12" cy="12" r="2.5" /></>, badgeIcon), label: 'Coaching-Zugriff nur mit Freigabe' },
  { icon: svg(<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /><circle cx="12" cy="15.5" r="1.2" fill="currentColor" stroke="none" /></>, badgeIcon), label: 'Verschlüsselte Übertragung' },
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
            <a href="tel:+4917359089060" className="btn-outline gap-2">{svg(<path d="M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 5 5.6 1.5 1.5 0 0 1 6.5 4z" />, 'h-4 w-4')} 0173 5908906</a>
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
                { label: 'Coaching-Anfragen', value: 'coaching@echo-b.de', sub: 'Antwort innerhalb 24h', href: 'mailto:coaching@echo-b.de' },
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
            <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center flex-shrink-0 text-white shadow-[0_4px_16px_rgba(224,123,84,0.4)]">
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.5" /><path d="M5.5 19a6.5 6.5 0 0 1 13 0" /></svg>
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
              {[
                { label: 'Vertraulich', icon: (<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>) },
                { label: 'Direkt erreichbar', icon: (<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 5 5.6 1.5 1.5 0 0 1 6.5 4z" /></svg>) },
                { label: 'Kein Skript', icon: (<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11.5a7.5 7.5 0 0 1-10.5 6.9L4 20l1.6-4.5A7.5 7.5 0 1 1 20 11.5z" /></svg>) },
              ].map(({ label, icon }) => (
                <span key={label} className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full bg-white text-navy shadow-md">{icon}{label}</span>
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
                    <li key={f} className="flex items-start gap-2 text-xs text-navy">{svg(<path d="M5 12.5l4.5 4.5L19 7" />, 'h-4 w-4 shrink-0 mt-0.5 text-accent')}{f}</li>
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
                    <li key={f} className="flex items-start gap-2 text-xs text-navy">{svg(<path d="M5 12.5l4.5 4.5L19 7" />, 'h-4 w-4 shrink-0 mt-0.5 text-accent')}{f}</li>
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
                <p className="text-xs text-brand-muted mb-4">4 wöchentliche Online-Check-ins · je 60 Min.</p>
                <ul className="space-y-1.5 mb-6 flex-1">
                  {['4 wöchentliche 60-Min.-Online-Check-ins', 'Persönliche Plattform-Einführung in Echo', 'Geführte Dialoge in der App zwischen den Terminen (Themen, Bindung, Eigenanteil …)', 'Voller EchoB-Plattformzugang inklusive', 'Auswertung aller Skalenwerte & Muster', 'Bericht für Therapie/Übergabe auf Wunsch'].map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-navy">{svg(<path d="M5 12.5l4.5 4.5L19 7" />, 'h-4 w-4 shrink-0 mt-0.5 text-accent')}{f}</li>
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
              <div key={title} className="group card">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors duration-200 group-hover:bg-accent group-hover:text-white">
                  {icon}
                </div>
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
              <div key={title} className="group card flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors duration-200 group-hover:bg-accent group-hover:text-white">
                  {icon}
                </div>
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
              <span key={label} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-brand-border bg-white text-navy">
                <span className="text-accent">{icon}</span>{label}
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
            <a href="tel:+4917359089060" className="btn-outline gap-2">{svg(<path d="M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 5 5.6 1.5 1.5 0 0 1 6.5 4z" />, 'h-4 w-4')} 0173 5908906</a>
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
