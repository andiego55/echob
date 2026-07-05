import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import PageLayout from '@/components/layout/PageLayout'

const iconCls = 'h-6 w-6'
const svg = (children: ReactNode, cls: string = iconCls) => (
  <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
)

export default function UeberPage() {
  return (
    <PageLayout>

      {/* Hero */}
      <section
        className="bg-navy text-white px-6 pt-[calc(60px+5rem)] pb-20"
        style={{ backgroundImage: 'radial-gradient(ellipse 65% 55% at 80% 40%, rgba(59,106,154,0.25) 0%, transparent 70%)' }}
      >
        <div className="mx-auto max-w-[960px]">
          <span className="label">Über EchoB</span>
          <h1 className="mt-2 text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold leading-[1.2] tracking-[-0.02em] max-w-[640px]">
            Immer mehr Menschen sprechen mit KI über ihre Beziehungen.
          </h1>
          <p className="mt-5 text-[1.05rem] text-brand-blue max-w-[580px] leading-[1.75]">
            Wir gehen offen damit um – weil es funktioniert. KI-Gespräche sind eine wirksame Methode,
            um in die Selbst- und Beziehungsreflexion zu kommen. EchoB gibt dieser Methode einen
            Rahmen, der ehrlich ist: KI-gestützt, auf Reflexion ausgelegt – und mit einem klaren Weg
            zu menschlicher Unterstützung, wenn es darauf ankommt.
          </p>
        </div>
      </section>

      {/* Haltung: Was KI kann – und wo Menschen unersetzlich sind */}
      <section className="border-t border-brand-border px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <span className="label">Unsere Haltung</span>
          <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy mb-3">
            KI kann viel. Aber nicht alles.
          </h2>
          <p className="text-brand-muted max-w-[620px] leading-[1.75] mb-10">
            Richtig genutzt, liefert KI gute Informationen und hilft beim Sortieren.
            In Situationen mit Unklarheit und Zweifel braucht es jedoch oft echte – das heißt
            menschliche – Validierung. Beides gehört zusammen. EchoB ist um genau diese
            Überzeugung herum gebaut.
          </p>

          <div className="grid gap-5 md:grid-cols-2">
            {/* Was KI-Gespräche leisten */}
            <div className="card">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center text-accent">{svg(<><rect x="6" y="6" width="12" height="12" rx="2" /><rect x="9.5" y="9.5" width="5" height="5" rx="1" /><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" /></>, 'h-4 w-4')}</span>
                <h3 className="font-bold text-navy">Was KI-Gespräche leisten</h3>
              </div>
              <ul className="space-y-3">
                {[
                  'Gedanken ordnen: Wer schreibt und beschreibt, sortiert – jederzeit, ohne Wartezeit, ohne Urteil.',
                  'Wissen zugänglich machen: Bindungsstile, Kommunikationsmuster, Grenzen – verständlich erklärt, auf deine Situation bezogen.',
                  'Muster sichtbar machen: Über viele Situationen hinweg zeigt sich, was sich wiederholt.',
                  'Den Einstieg erleichtern: Die Hürde, einer KI zu schreiben, ist niedriger als jeder Anruf.',
                ].map((t) => (
                  <li key={t} className="flex gap-2.5 text-sm text-brand-muted leading-relaxed">
                    {svg(<path d="M5 12.5l4.5 4.5L19 7" />, 'h-4 w-4 shrink-0 mt-px text-accent')}
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            {/* Wo Menschen unersetzlich sind */}
            <div className="card border-l-2 border-l-accent">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-8 h-8 rounded-full bg-navy/[0.08] flex items-center justify-center text-navy">{svg(<><circle cx="9" cy="8.5" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M16 6.3a2.8 2.8 0 0 1 0 5.4" /><path d="M17 13.6a5.2 5.2 0 0 1 3.5 5.1" /></>, 'h-4 w-4')}</span>
                <h3 className="font-bold text-navy">Wo Menschen unersetzlich sind</h3>
              </div>
              <ul className="space-y-3">
                {[
                  'Echte Validierung: Ob deine Wahrnehmung trägt, klärt sich im Gespräch mit Menschen, die dich ernst nehmen und zurückfragen.',
                  'Unklarheit und Zweifel: Wenn du dir selbst nicht mehr traust, braucht es ein Gegenüber mit Erfahrung und Verantwortung.',
                  'Tiefe Veränderung: Therapie und Beratung arbeiten an dem, was ein Dialogfenster nicht erreicht.',
                  'Sicherheit: In Gefahrensituationen helfen Menschen – sofort und verbindlich.',
                ].map((t) => (
                  <li key={t} className="flex gap-2.5 text-sm text-brand-muted leading-relaxed">
                    {svg(<path d="M5 12.5l4.5 4.5L19 7" />, 'h-4 w-4 shrink-0 mt-px text-accent')}
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Was EchoB ist */}
      <section className="border-t border-brand-border bg-navy/[0.02] px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <span className="label">Was EchoB ist</span>
          <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy mb-3">
            Eine erste Anlaufstelle – KI-gestützt, und offen damit.
          </h2>
          <p className="text-brand-muted max-w-[620px] leading-[1.75] mb-10">
            EchoB ist für Menschen in belastenden oder schwer einzuordnenden Beziehungssituationen.
            Bei Unsicherheit und Informationssuche ist EchoB der erste Schritt – nicht der letzte.
          </p>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                icon: svg(<><rect x="6" y="3" width="10" height="17" rx="1" /><path d="M6 20H4M16 20h4" /><circle cx="12.5" cy="12" r="1" fill="currentColor" stroke="none" /></>),
                title: 'Erste Anlaufstelle',
                text: 'Situationen festhalten, Fragen stellen, Wissen nachschlagen – ohne Hürde, ohne Wartezeit, ohne dass jemand mitliest.',
              },
              {
                icon: svg(<path d="M4 7a2 2 0 0 1 2-2h3l2 2h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" />),
                title: 'Struktur statt Chatverlauf',
                text: 'Anders als ein freier Chatbot arbeitet EchoB mit Fällen, Szenen, Skalen und Berichten. Aus Gesprächen entsteht ein klares Bild.',
              },
              {
                icon: svg(<><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2.2 5.3-5.3 2.2 2.2-5.3z" /></>),
                title: 'Begleitung zum nächsten Schritt',
                text: 'Wenn mehr nötig ist, begleitet EchoB den Übergang in Beratung, Coaching oder Therapie – mit strukturierten Berichten als Grundlage.',
              },
            ].map(({ icon, title, text }) => (
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

      {/* Der Weg */}
      <section className="border-t border-brand-border px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <span className="label">Der Weg</span>
          <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy mb-12">
            Von der Unsicherheit zum nächsten Schritt
          </h2>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                step: '1',
                title: 'Sortieren',
                text: 'Du beschreibst konkrete Situationen – frei oder im Dialog mit Echo. Beobachtung, Gefühl und Interpretation werden getrennt.',
              },
              {
                step: '2',
                title: 'Verstehen',
                text: 'Muster, Skalen und Berichte machen sichtbar, was sich wiederholt – sachlich, ohne Diagnosen, ohne Schubladen.',
              },
              {
                step: '3',
                title: 'Handeln',
                text: 'Mit klarem Bild gehst du den nächsten Schritt: ein Gespräch, eine Beratung, ein Coaching oder eine Therapie – auf Wunsch mit deinem Bericht als Gesprächsgrundlage.',
              },
            ].map(({ step, title, text }) => (
              <div key={step} className="card relative pt-7">
                <span className="absolute -top-4 left-6 w-9 h-9 rounded-full bg-accent text-white font-extrabold flex items-center justify-center shadow-[0_4px_12px_rgba(224,123,84,0.35)]">
                  {step}
                </span>
                <h3 className="font-bold text-navy mb-2">{title}</h3>
                <p className="text-sm text-brand-muted leading-relaxed">{text}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <Link to="/coaching" className="text-accent font-medium hover:underline no-underline">
              Menschliches Coaching bei EchoB →
            </Link>
            <Link to="/wissen/professionelle-hilfe" className="text-accent font-medium hover:underline no-underline">
              Wann professionelle Hilfe sinnvoll ist →
            </Link>
          </div>
        </div>
      </section>

      {/* Was EchoB nicht ist */}
      <section className="border-t border-brand-border bg-navy/[0.02] px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <span className="label">Klare Grenzen</span>
          <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy mb-10">
            Was EchoB nicht ist
          </h2>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { title: 'Keine Diagnose-App', text: 'EchoB stellt keine psychologischen oder medizinischen Diagnosen und benennt keine Persönlichkeitsstörungen.' },
              { title: 'Kein Therapieersatz', text: 'EchoB ersetzt keine Psychotherapie, keine psychologische Beratung und keine medizinische Behandlung – es bereitet darauf vor.' },
              { title: 'Keine Notfallhilfe', text: 'Bei akuter Gefahr verweist EchoB auf geeignete Stellen. Die App ist nicht für Krisensituationen ausgelegt.' },
            ].map(({ title, text }) => (
              <div key={title} className="card border-l-2 border-l-accent">
                <h3 className="font-bold text-navy mb-2">{title}</h3>
                <p className="text-sm text-brand-muted leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-brand border border-amber-200 bg-amber-50 px-5 py-4 max-w-xl">
            <p className="text-sm text-amber-800">
              Bei akuter Gefahr: Telefonseelsorge{' '}
              <strong>0800 111 0 111</strong> (kostenlos, 24/7) oder Notruf <strong>112</strong>.
            </p>
          </div>
        </div>
      </section>

      {/* Gründer-Teaser */}
      <section className="border-t border-brand-border px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <span className="label">Der Mensch dahinter</span>
          <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy mb-3">
            Wer hinter EchoB steht
          </h2>
          <p className="text-brand-muted max-w-[620px] leading-[1.75] mb-6">
            EchoB ist aus einer persönlichen Überzeugung entstanden – an der Schnittstelle von IT und
            Psychologie. Im Interview erzählt der Gründer, warum es EchoB gibt und welche Haltung dahintersteht.
          </p>
          <Link to="/ueber/gruender" className="text-accent font-medium hover:underline no-underline">
            Das Gründer-Interview lesen →
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-brand-border bg-navy/[0.02] px-6 py-[72px]">
        <div className="mx-auto max-w-[960px] flex flex-wrap gap-4 items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-navy mb-1">EchoB selbst erleben</h2>
            <p className="text-sm text-brand-muted">3 Tage kostenlos testen – kein Download, keine Kreditkarte.</p>
          </div>
          <Link to="/auth" state={{ defaultTab: 'signup' }} className="btn-primary">
            Kostenlos starten
          </Link>
        </div>
      </section>

    </PageLayout>
  )
}
