import PageLayout from '@/components/layout/PageLayout'
import ResearchSignupForm from '@/components/landing/ResearchSignupForm'
import EchoWellen from '@/components/EchoWellen'

const iconCls = 'h-6 w-6'

/**
 * /forschung — öffentliche Seite zur geplanten EchoB-Wirksamkeitsstudie.
 * Hängt am Fachpersonen-Reiter. Zwei klar getrennte Wege mitzumachen:
 * Fachpersonen (mitforschen) und Nutzer:innen (teilnehmen). Beide Formulare
 * gehen über die Kontakt-Pipeline an EchoB (ResearchSignupForm).
 */

const FOCUS = [
  {
    icon: (
      <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 19V5M5 19h14" />
        <path d="M8 16l3-4 3 2 4-6" />
      </svg>
    ),
    title: 'Hilft das Sortieren wirklich?',
    text: 'Verändert das strukturierte Festhalten von Szenen und Mustern, wie belastet sich Menschen fühlen – und wie klar sie ihre eigene Situation sehen?',
  },
  {
    icon: (
      <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20.3C10 18.8 4 14.4 4 9.4A3.9 3.9 0 0 1 12 7a3.9 3.9 0 0 1 8 2.4c0 5-6 9.4-8 10.9z" />
      </svg>
    ),
    title: 'Was verändert sich im Erleben?',
    text: 'Wir schauen mit anerkannten Fragebögen über die Zeit auf Klarheit, emotionale Entlastung und Selbstwirksamkeit – behutsam und ohne Diagnosen.',
  },
  {
    icon: (
      <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8.5" r="3" />
        <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
        <path d="M16 6.3a2.8 2.8 0 0 1 0 5.4" />
        <path d="M17 13.6a5.2 5.2 0 0 1 3.5 5.1" />
      </svg>
    ),
    title: 'Nutzen für die Begleitung',
    text: 'Bringt ein vorbereiteter, freigegebener Fallkontext etwas für Therapie, Beratung und Coaching – und wo sind die Grenzen?',
  },
]

const ETHICS = [
  { title: 'Freiwillig & widerrufbar', text: 'Teilnahme ist freiwillig und jederzeit ohne Angabe von Gründen beendbar.' },
  { title: 'Datensparsam & pseudonym', text: 'Wir erheben so wenig wie möglich. Auswertungen erfolgen pseudonym.' },
  { title: 'Keine Diagnosen', text: 'EchoB stellt keine Diagnosen und ersetzt keine Behandlung – auch nicht in der Studie.' },
  { title: 'Wissenschaftlich begleitet', text: 'Design und Auswertung entstehen mit fachlicher und wissenschaftlicher Begleitung.' },
]

export default function ForschungPage() {
  return (
    <PageLayout>
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-navy px-6 pt-[calc(60px+4.5rem)] pb-20 text-white">
        <EchoWellen />
        <div className="relative mx-auto max-w-[820px]">
          <span className="label">Forschung</span>
          <h1 className="mt-2 max-w-[18ch] text-[clamp(2rem,5vw,3.1rem)] font-extrabold leading-[1.12] tracking-[-0.02em]">
            Wir wollen belegen, dass EchoB <span className="text-accent">wirkt</span>.
          </h1>
          <p className="mt-6 max-w-[600px] text-[1.08rem] leading-[1.75] text-brand-blue">
            EchoB ist aus der Praxis entstanden – jetzt wollen wir wissenschaftlich prüfen, was es
            verändert. Für eine geplante <strong className="text-white">Wirksamkeitsstudie</strong> suchen
            wir Menschen, die mitmachen: Fachpersonen, die mitforschen, und Nutzer:innen, die teilnehmen.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <a href="#mitmachen" className="btn-primary !px-6 !py-3">Mitmachen</a>
            <span className="text-sm text-white/45">Freiwillig · pseudonym · jederzeit widerrufbar</span>
          </div>
        </div>
      </section>

      {/* ── Worum es geht ─────────────────────────────────────────── */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-[960px]">
          <span className="label">Worum es geht</span>
          <h2 className="mt-2 max-w-[22ch] text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy">
            Drei Fragen, die wir ehrlich beantworten wollen
          </h2>
          <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FOCUS.map(({ icon, title, text }) => (
              <div key={title} className="card h-full">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  {icon}
                </div>
                <h3 className="mb-2 font-bold text-navy">{title}</h3>
                <p className="text-sm leading-relaxed text-brand-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Zwei Wege mitzumachen ─────────────────────────────────── */}
      <section id="mitmachen" className="scroll-mt-[80px] border-t border-brand-border bg-navy/[0.02] px-6 py-16">
        <div className="mx-auto max-w-[960px]">
          <div className="max-w-[640px]">
            <span className="label">Mitmachen</span>
            <h2 className="mt-2 text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy">
              Zwei Wege – suchen Sie sich Ihren aus
            </h2>
            <p className="mt-3 leading-[1.75] text-brand-muted">
              Sie begleiten Menschen fachlich? Oder Sie nutzen EchoB selbst? Für beide gibt es einen
              eigenen, einfachen Weg in die Studie.
            </p>
          </div>

          <div className="mt-10 grid items-start gap-6 lg:grid-cols-2">
            {/* Fachpersonen */}
            <div className="flex h-full flex-col rounded-[1.25rem] border border-brand-border bg-white p-6 shadow-brand sm:p-8">
              <span className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-accent">Für Fachpersonen</span>
              <h3 className="mt-1.5 text-[1.35rem] font-bold text-navy">Forschen Sie mit</h3>
              <ul className="mt-4 space-y-2.5">
                {[
                  'Begleiten Sie Fälle mit EchoB und geben Sie strukturierte Rückmeldung.',
                  'Bringen Sie Ihre fachliche Perspektive in Design und Auswertung ein.',
                  'Optional: eigene Klient:innen einbeziehen – streng einwilligungsbasiert.',
                ].map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm leading-relaxed text-brand-muted">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
                    {p}
                  </li>
                ))}
              </ul>
              <div className="mt-6 border-t border-brand-border pt-6">
                <ResearchSignupForm variant="fachperson" />
              </div>
            </div>

            {/* Nutzer:innen */}
            <div className="flex h-full flex-col rounded-[1.25rem] border border-brand-border bg-white p-6 shadow-brand sm:p-8">
              <span className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-accent">Für Nutzer:innen</span>
              <h3 className="mt-1.5 text-[1.35rem] font-bold text-navy">Nimm teil</h3>
              <ul className="mt-4 space-y-2.5">
                {[
                  'Nutze EchoB, um deine Beziehungssituation in Ruhe zu sortieren.',
                  'Beantworte zu wenigen Zeitpunkten kurze, anerkannte Fragebögen.',
                  'Dein Beitrag hilft, EchoB besser – und belegbar wirksam – zu machen.',
                ].map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm leading-relaxed text-brand-muted">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
                    {p}
                  </li>
                ))}
              </ul>
              <div className="mt-6 border-t border-brand-border pt-6">
                <ResearchSignupForm variant="nutzer" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Fair und geschützt ────────────────────────────────────── */}
      <section className="border-t border-brand-border px-6 py-16">
        <div className="mx-auto max-w-[960px]">
          <span className="label">Fair und geschützt</span>
          <h2 className="mt-2 text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy">
            Ihre Teilnahme bleibt in Ihrer Hand
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {ETHICS.map(({ title, text }) => (
              <div key={title} className="flex gap-3">
                <span className="mt-0.5 text-accent" aria-hidden="true">✓</span>
                <div>
                  <h3 className="mb-1 font-bold text-navy">{title}</h3>
                  <p className="text-sm leading-relaxed text-brand-muted">{text}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-brand-muted">
            Fragen zur Studie?{' '}
            <a href="mailto:kontakt@echo-b.de" className="font-semibold text-accent hover:underline">kontakt@echo-b.de</a>
            {' '}– wir antworten gern, ganz unverbindlich.
          </p>
        </div>
      </section>
    </PageLayout>
  )
}
