/**
 * /ueber/team — Team (Platzhalter)
 * Inhalte folgen später; die Seite ist bewusst kein totes Ende.
 */
import { Link } from 'react-router-dom'
import PageLayout from '@/components/layout/PageLayout'

export default function TeamPage() {
  return (
    <PageLayout>
      {/* Hero */}
      <section
        className="bg-navy text-white px-6 pt-[calc(60px+5rem)] pb-20"
        style={{ backgroundImage: 'radial-gradient(ellipse 65% 55% at 80% 40%, rgba(59,106,154,0.25) 0%, transparent 70%)' }}
      >
        <div className="mx-auto max-w-[960px]">
          <span className="label">Über EchoB</span>
          <h1 className="mt-2 text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold leading-[1.2] tracking-[-0.02em] max-w-[560px]">
            Das Team hinter EchoB
          </h1>
          <p className="mt-5 text-[1.05rem] text-brand-blue max-w-[520px] leading-[1.75]">
            EchoB entsteht an der Schnittstelle von IT und Psychologie. Wir stellen die Menschen
            dahinter hier in Kürze ausführlich vor.
          </p>
        </div>
      </section>

      {/* Platzhalter */}
      <section className="border-t border-brand-border px-6 py-[72px]">
        <div className="mx-auto max-w-[760px]">
          <div className="card text-center py-12">
            <div className="text-3xl mb-4">👥</div>
            <h2 className="text-lg font-bold text-navy mb-2">Inhalte folgen in Kürze</h2>
            <p className="text-sm text-brand-muted max-w-md mx-auto leading-relaxed mb-6">
              Wir arbeiten gerade daran, das Team hinter EchoB hier vorzustellen. Bis dahin erfährst du
              im Gründer-Interview, warum es EchoB gibt und welche Haltung dahintersteht.
            </p>
            <Link to="/ueber/gruender" className="btn-primary !py-2.5 !px-5 !text-sm no-underline">
              Zum Gründer-Interview →
            </Link>
          </div>
          <p className="mt-8 text-center text-sm text-brand-muted">
            Du möchtest mitwirken?{' '}
            <a href="mailto:kontakt@echo-b.de" className="text-accent font-medium hover:underline">kontakt@echo-b.de</a>
          </p>
        </div>
      </section>
    </PageLayout>
  )
}
