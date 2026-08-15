import { Link } from 'react-router-dom'
import PageLayout from '@/components/layout/PageLayout'
import { SELF_TESTS } from '@/selftests'
import { TEST_CATEGORY_LABELS, type SelfTest, type TestCategory } from '@/selftests/types'

/**
 * /selbsttests — öffentliche Übersicht der Selbsttests. Test starten → clientseitige
 * Auswertung → „mit Echo besprechen" (analog zu /szenen und /wissen).
 */
const CAT_BADGE: Record<TestCategory, { bg: string; fg: string }> = {
  beziehung: { bg: '#E6F1FB', fg: '#0C447C' },
  trennung: { bg: '#EAF3DE', fg: '#27500A' },
  manipulation: { bg: '#FBEFE9', fg: '#7A3B1E' },
  persoenlichkeit: { bg: '#EEEDFE', fg: '#3C3489' },
  therapie: { bg: '#E1F5EE', fg: '#085041' },
}

export default function SelbsttestsPage() {
  return (
    <PageLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy px-6 pt-[calc(60px+4.5rem)] pb-20 text-white">
        <svg aria-hidden="true" className="pointer-events-none absolute -right-24 -top-10 h-[420px] w-[420px] opacity-[0.13]" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="90" fill="none" stroke="#e07b54" strokeWidth="1" />
          <circle cx="100" cy="100" r="64" fill="none" stroke="#e07b54" strokeWidth="1.2" />
          <circle cx="100" cy="100" r="38" fill="none" stroke="#e07b54" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="14" fill="#e07b54" />
        </svg>
        <div className="relative mx-auto max-w-[820px]">
          <span className="label">Selbsttests</span>
          <h1 className="mt-2 max-w-[16ch] text-[clamp(2rem,5vw,3.1rem)] font-extrabold leading-[1.12] tracking-[-0.02em]">
            Wo stehst du <span className="text-accent">gerade</span>?
          </h1>
          <p className="mt-6 max-w-[580px] text-[1.08rem] leading-[1.75] text-brand-blue">
            Ehrliche, fundierte Selbsttests zu Beziehung, Bindung und belastenden Mustern. Du bekommst ein
            klares Ergebnis mit Zahlen und Einordnung – und kannst es danach direkt mit Echo besprechen.
            Ohne Diagnose, nur für dich.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <a href="#tests" className="btn-primary !px-6 !py-3">Test auswählen</a>
            <span className="text-sm text-white/45">{SELF_TESTS.length} Tests · anonym · kostenlos</span>
          </div>
        </div>
      </section>

      {/* Verfügbare Tests */}
      <section id="tests" className="scroll-mt-[80px] px-6 py-16">
        <div className="mx-auto max-w-[1040px]">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {SELF_TESTS.map((t) => <TestCard key={t.slug} test={t} />)}
          </div>
        </div>
      </section>

      {/* Hinweis */}
      <section className="border-t border-brand-border px-6 py-10">
        <div className="mx-auto max-w-[720px]">
          <p className="text-xs leading-relaxed text-brand-muted/80">
            Die Selbsttests dienen der Orientierung und Selbstreflexion. Sie ersetzen keine Diagnose und keine
            Beratung oder Therapie. Bei akuter Gefahr: Notruf <strong>110 / 112</strong>, Telefonseelsorge{' '}
            <strong>0800 111 0 111</strong>.
          </p>
        </div>
      </section>
    </PageLayout>
  )
}

function TestCard({ test }: { test: SelfTest }) {
  const c = CAT_BADGE[test.category]
  return (
    <Link
      to={`/selbsttests/${test.slug}`}
      className="group flex flex-col rounded-brand-lg border border-brand-border bg-white p-7 no-underline shadow-brand transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-brand-lg"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: c.bg, color: c.fg }}>
          {TEST_CATEGORY_LABELS[test.category]}
        </span>
        <span className="text-[11px] text-brand-muted/70">{test.duration}</span>
      </div>
      <h3 className="text-[1.2rem] font-bold leading-snug text-navy">{test.title}</h3>
      <p className="mt-2 flex-1 text-[0.95rem] leading-relaxed text-brand-muted">{test.teaser}</p>
      <span className="mt-5 text-sm font-semibold text-accent">Test starten →</span>
    </Link>
  )
}
