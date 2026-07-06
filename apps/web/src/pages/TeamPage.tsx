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
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8.5" r="3" /><path d="M2.5 19a6.5 6.5 0 0 1 13 0" /><path d="M16 6.3a2.8 2.8 0 0 1 0 5.4" /><path d="M17.5 13.5a5.5 5.5 0 0 1 4 5.3" /></svg>
            </div>
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

      {/* Für Fachpersonen: 1-Pager (Produkt + Partnerprogramm) */}
      <section className="border-t border-brand-border px-6 py-[56px]">
        <div className="mx-auto max-w-[760px]">
          <span className="label">Für Fachpersonen</span>
          <h2 className="mt-1 mb-5 text-lg font-bold text-navy">Zwei 1-Pager zum Weitergeben</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: 'EchoB – Produkt & Features', sub: 'Was EchoB für Fachpersonen kann.', href: '/echob-fachpersonen-1pager.pdf' },
              { title: 'EchoB-Partnerprogramm', sub: 'Kostenlos prüfen, sichtbar werden, Klient:innen gewinnen.', href: '/echob-partnerprogramm-1pager.pdf' },
            ].map(({ title, sub, href }) => (
              <a key={href} href={href} download
                className="flex items-center gap-4 rounded-[1.25rem] border border-brand-border bg-navy/[0.03] p-5 no-underline transition-colors hover:border-accent/50">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 4v9" /><path d="M8.5 10.5 12 14l3.5-3.5" /><path d="M5 16.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1.5" />
                  </svg>
                </span>
                <span>
                  <span className="block text-sm font-bold text-navy">{title}</span>
                  <span className="block text-xs text-brand-muted leading-snug">{sub}</span>
                  <span className="mt-1 block text-xs font-semibold text-accent">PDF herunterladen →</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </PageLayout>
  )
}
