import { Link } from 'react-router-dom'
import PageLayout from '@/components/layout/PageLayout'

interface TopicCard {
  icon: string
  title: string
  desc: string
  tags: string[]
  to: string
}

interface Category {
  label: string
  heading: string
  lead: string
  topics: TopicCard[]
}

const CATEGORIES: Category[] = [
  {
    label: 'Beziehungsdynamiken',
    heading: 'Muster und Dynamiken in Beziehungen',
    lead: 'Wie entstehen wiederkehrende Konflikte? Was steckt hinter Nähe-Distanz-Zyklen und dem Gefühl, sich im Kreis zu drehen?',
    topics: [
      {
        icon: '🔄',
        title: 'Beziehungsmuster erkennen',
        desc: 'Was sind wiederkehrende Dynamiken, und wie entstehen sie? Ein sachlicher Überblick ohne Schuldzuweisungen.',
        tags: ['Nähe & Distanz', 'Trigger', 'Wiederholung'],
        to: '/wissen/beziehungsmuster',
      },
      {
        icon: '🔗',
        title: 'Bindungsstile',
        desc: 'Sicher, ängstlich, vermeidend oder desorganisiert – wie frühe Bindungserfahrungen unsere Beziehungsmuster prägen.',
        tags: ['Bindungstheorie', 'Frühkindliche Prägung'],
        to: '/wissen/bindungsstile',
      },
      {
        icon: '💬',
        title: 'Kommunikation & Konflikte',
        desc: 'Warum Gespräche eskalieren, wie Missverständnisse entstehen und was konstruktive von destruktiver Kommunikation unterscheidet.',
        tags: ['Konfliktmuster', 'Gaslighting', 'De-Eskalation'],
        to: '/wissen/kommunikation-konflikte',
      },
    ],
  },
  {
    label: 'Psychologisches Wissen',
    heading: 'Persönlichkeit, Verhalten & Emotionen',
    lead: 'Sachliches Hintergrundwissen – kein Diagnoseleitfaden, sondern Orientierung für das Verständnis von Verhalten.',
    topics: [
      {
        icon: '🧠',
        title: 'Persönlichkeit & Verhalten',
        desc: 'Was Persönlichkeitsmerkmale bedeuten, wie sie sich in Beziehungen zeigen und was hinter extremen Verhaltensweisen stecken kann.',
        tags: ['Big Five', 'Persönlichkeitsstile', 'Narzissmus'],
        to: '/wissen/persoenlichkeit-verhalten',
      },
      {
        icon: '🌊',
        title: 'Emotionsregulation',
        desc: 'Warum manche Menschen Gefühle schwer regulieren können – und wie das Umfeld darunter leidet.',
        tags: ['Dysregulation', 'Trauma', 'Reaktivität'],
        to: '/wissen/emotionsregulation',
      },
    ],
  },
  {
    label: 'Selbstreflexion',
    heading: 'Klarheit über sich selbst gewinnen',
    lead: 'Werkzeuge, um zwischen Wahrnehmung, Gefühl und Interpretation zu unterscheiden – und Grenzen bewusster zu setzen.',
    topics: [
      {
        icon: '👁',
        title: 'Beobachtung, Gefühl, Interpretation',
        desc: 'Wie du lernst, zwischen dem was passiert ist, dem was du fühlst, und dem was du daraus schließt, zu unterscheiden.',
        tags: ['GFK', 'Wahrnehmung', 'Kognitive Verzerrung'],
        to: '/wissen/beobachtung-gefuehl',
      },
      {
        icon: '🛡',
        title: 'Grenzen setzen',
        desc: 'Was Grenzen wirklich bedeuten, warum sie so schwer zu setzen sind und wie man sie klar kommuniziert.',
        tags: ['Selbstschutz', 'Durchsetzung', 'Schuldgefühle'],
        to: '/wissen/grenzen-setzen',
      },
    ],
  },
  {
    label: 'Hilfe finden',
    heading: 'Wann und wo professionelle Hilfe sinnvoll ist',
    lead: 'Orientierung für den nächsten Schritt – von Beratung bis Krisentelefon.',
    topics: [
      {
        icon: '🤝',
        title: 'Wann professionelle Hilfe sinnvoll ist',
        desc: 'Orientierung, wann ein Gespräch mit Therapeut:innen oder Berater:innen der nächste sinnvolle Schritt sein kann.',
        tags: ['Therapie', 'Beratung', 'Erstgespräch'],
        to: '/wissen/professionelle-hilfe',
      },
      {
        icon: '📞',
        title: 'Krisentelefone & Anlaufstellen',
        desc: 'Eine Übersicht kostenloser Hilfsangebote in Deutschland, Österreich und der Schweiz – rund um die Uhr erreichbar.',
        tags: ['DACH', 'Anonym', 'Kostenlos'],
        to: '/wissen/krisentelefone',
      },
    ],
  },
]

function TopicCard({ icon, title, desc, tags, to }: TopicCard) {
  return (
    <Link to={to} className="card flex gap-4 no-underline hover:border-accent/40">
      <span className="text-2xl mt-0.5 shrink-0">{icon}</span>
      <div>
        <h3 className="text-[0.97rem] font-bold text-navy mb-1.5">{title}</h3>
        <p className="text-sm text-brand-muted leading-relaxed mb-3">{desc}</p>
        <div className="flex flex-wrap gap-1.5">
          {tags.map(t => (
            <span key={t} className="text-[10px] font-semibold uppercase tracking-wide text-accent bg-accent/8 rounded px-2 py-0.5">
              {t}
            </span>
          ))}
        </div>
      </div>
    </Link>
  )
}

export default function WissenPage() {
  return (
    <PageLayout>
      {/* Hero */}
      <section className="bg-navy text-white px-6 pt-[calc(60px+4rem)] pb-16">
        <div className="mx-auto max-w-[960px]">
          <span className="label">Wissen</span>
          <h1 className="mt-2 text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold leading-[1.2] tracking-[-0.02em]">
            Verstehen, was passiert
          </h1>
          <p className="mt-5 text-[1.05rem] text-brand-blue max-w-[560px] leading-[1.75]">
            Sachliches Hintergrundwissen zu Beziehungsdynamiken, Psychologie und Selbstreflexion –
            ohne Diagnosen, ohne Schubladen.
          </p>
        </div>
      </section>

      {/* Kategorien */}
      {CATEGORIES.map(({ label, heading, lead, topics }, i) => (
        <section
          key={label}
          className={`border-t border-brand-border px-6 py-[72px] ${i % 2 === 1 ? 'bg-navy/[0.02]' : ''}`}
        >
          <div className="mx-auto max-w-[960px]">
            <span className="label">{label}</span>
            <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy mb-3">
              {heading}
            </h2>
            <p className="text-brand-muted max-w-[600px] leading-[1.75] mb-10">{lead}</p>
            <div className="grid gap-5 sm:grid-cols-2">
              {topics.map(t => <TopicCard key={t.to} {...t} />)}
            </div>
          </div>
        </section>
      ))}

      {/* Disclaimer */}
      <section className="border-t border-brand-border px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <div className="rounded-brand border border-amber-200 bg-amber-50 px-5 py-4 max-w-xl mb-10">
            <p className="text-sm text-amber-800">
              <strong>Hinweis:</strong> Alle Inhalte dienen der Orientierung und ersetzen keine professionelle
              Beratung oder Therapie. Bei akuter Gefahr: Notruf <strong>110 / 112</strong>.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-navy mb-1">EchoB Blog</h2>
              <p className="text-sm text-brand-muted">Tiefergehende Artikel zu Beziehungsthemen – persönlicher, mit konkreten Beispielen.</p>
            </div>
            <Link to="/blog" className="btn-primary">Zum Blog →</Link>
          </div>
        </div>
      </section>
    </PageLayout>
  )
}
