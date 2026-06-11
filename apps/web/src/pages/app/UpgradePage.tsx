/**
 * /app/upgrade — Pricing & Subscription
 */
import { Link } from 'react-router-dom'
import AppShell from '@/components/app/AppShell'

const STARTER_PACKAGE = {
  id: 'startpaket',
  name: 'Startpaket',
  badge: 'Empfohlen zum Einstieg',
  price: '99',
  period: 'einmalig',
  desc: 'Der ideale Einstieg: voller App-Zugang für einen Monat — plus eine persönliche Coaching-Stunde, in der wir gemeinsam deine Situation reflektieren und die App in deinen Prozess integrieren.',
  features: [
    '1 Monat App-Vollzugang',
    'Alle 5 Berichtstypen (Muster, Therapie, Coaching, Verlauf, Kurz)',
    'Alle Dialog- & Analyseformen',
    'Unbegrenzte Fälle & Szenen',
    'GPT-4o – bestes verfügbares KI-Modell',
    'Echo auf voller Analysestufe: alle Perspektiven & Tiefen aktiv',
    '1 persönliche Coaching-Stunde mit dem EchoB-Gründer (60 min)',
    'Terminvereinbarung direkt nach Buchungsmail',
  ],
  mailSubject: 'EchoB Startpaket',
}

const PLANS = [
  {
    id: 'early_bird',
    name: 'Early Bird',
    badge: 'Bis November',
    price: '12,99',
    period: 'Monat',
    desc: 'Vollzugang zu allen Features. Günstigster Einstiegspreis – nur für kurze Zeit.',
    features: [
      'Unbegrenzte Fälle',
      'Unbegrenzte Szenen',
      'Alle Themendialoge',
      'Berichte & Skalenwerte',
      'Blog-Dialoge',
      'Datensicherung & Export',
    ],
    featured: true,
    mailSubject: 'EchoB Early Bird Abo',
  },
  {
    id: 'regular',
    name: 'Monatsabo',
    badge: null,
    price: '24,99',
    period: 'Monat',
    desc: 'Vollzugang ohne Laufzeitbindung. Monatlich kündbar.',
    features: [
      'Unbegrenzte Fälle',
      'Unbegrenzte Szenen',
      'Alle Themendialoge',
      'Berichte & Skalenwerte',
      'Blog-Dialoge',
      'Datensicherung & Export',
    ],
    featured: false,
    mailSubject: 'EchoB Monatsabo',
  },
  {
    id: 'annual',
    name: 'Jahresabo',
    badge: 'Spare 33 %',
    price: '199',
    period: 'Jahr',
    desc: 'Ein Jahr Vollzugang zum Vorzugspreis. Entspricht 16,58 €/Monat.',
    features: [
      'Unbegrenzte Fälle',
      'Unbegrenzte Szenen',
      'Alle Themendialoge',
      'Berichte & Skalenwerte',
      'Blog-Dialoge',
      'Datensicherung & Export',
      'Priorität bei neuen Features',
    ],
    featured: false,
    mailSubject: 'EchoB Jahresabo',
  },
]

export default function UpgradePage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-[1000px] px-6 py-10">

        <div className="mb-8">
          <Link to="/app" className="text-sm text-brand-muted hover:text-navy">← Zurück</Link>
          <h1 className="mt-4 text-2xl font-bold text-navy">Pläne & Angebote</h1>
          <p className="mt-1 text-sm text-brand-muted max-w-xl">
            Wähle das passende Angebot und schreibe uns eine kurze Mail – wir schalten dein Konto umgehend frei.
          </p>
        </div>

        {/* Trial info box */}
        <div className="mb-8 rounded-brand border border-amber-200 bg-amber-50 px-5 py-4 max-w-xl">
          <p className="text-sm font-semibold text-amber-800 mb-1">Kostenlose Testphase</p>
          <p className="text-xs text-amber-700">
            Mit dem Testzugang kannst du EchoB 3 Tage lang erkunden — mit 1 Fall, bis zu 5 Szenen
            und Zugang zu Kurzbericht & Coaching-Vorbereitung.
            Alle weiteren Berichte und Features sind ab dem Startpaket verfügbar.
          </p>
        </div>

        {/* Startpaket */}
        <div className="mb-8 rounded-brand border-2 border-accent bg-accent/5 p-6 max-w-2xl shadow-sm">
          <div className="flex items-start justify-between mb-1">
            <span className="text-base font-bold text-navy">{STARTER_PACKAGE.name}</span>
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-accent text-white">
              {STARTER_PACKAGE.badge}
            </span>
          </div>
          <div className="mb-2">
            <span className="text-3xl font-extrabold text-navy">{STARTER_PACKAGE.price} €</span>
            <span className="text-xs text-brand-muted ml-1">/ {STARTER_PACKAGE.period}</span>
          </div>
          <p className="text-sm text-brand-muted mb-5 leading-relaxed max-w-lg">{STARTER_PACKAGE.desc}</p>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1.5 mb-6">
            {STARTER_PACKAGE.features.map((f) => (
              <div key={f} className="flex items-start gap-2 text-sm text-navy">
                <span className="text-accent mt-0.5 shrink-0">✓</span>
                {f}
              </div>
            ))}
          </div>
          <a
            href={`mailto:info@echo-b.de?subject=${encodeURIComponent(STARTER_PACKAGE.mailSubject)}&body=${encodeURIComponent(
              `Hallo,\n\nich möchte das Startpaket (99 € einmalig) buchen.\n\nMeine E-Mail-Adresse: \n\nBitte schalte meinen Zugang frei und kontaktiere mich für die Terminvereinbarung der Coaching-Stunde.\n\nVielen Dank!`
            )}`}
            className="inline-block text-sm font-semibold px-6 py-2.5 rounded-brand bg-accent text-white hover:bg-accent/90 transition-colors"
          >
            Startpaket buchen
          </a>
        </div>

        <h2 className="text-sm font-semibold text-navy mb-4">Oder: App-Abo ohne Coaching</h2>

        {/* Pricing grid */}
        <div className="grid gap-5 sm:grid-cols-3 mb-10">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-brand border p-6 flex flex-col ${
                plan.featured
                  ? 'border-accent bg-accent/5 shadow-md'
                  : 'border-brand-border bg-white'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-bold text-navy">{plan.name}</span>
                {plan.badge && (
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                    plan.featured ? 'bg-accent text-white' : 'bg-navy/10 text-navy'
                  }`}>
                    {plan.badge}
                  </span>
                )}
              </div>
              <div className="mb-3">
                <span className="text-3xl font-extrabold text-navy">{plan.price} €</span>
                <span className="text-xs text-brand-muted ml-1">/ {plan.period}</span>
              </div>
              <p className="text-xs text-brand-muted mb-5 leading-relaxed">{plan.desc}</p>
              <ul className="space-y-1.5 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-navy">
                    <span className="text-accent mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href={`mailto:info@echo-b.de?subject=${encodeURIComponent(plan.mailSubject)}&body=${encodeURIComponent(
                  `Hallo,\n\nich möchte das ${plan.name} (${plan.price} €/${plan.period}) buchen.\n\nMeine E-Mail-Adresse: \n\nBitte schalte meinen Zugang frei.\n\nVielen Dank!`
                )}`}
                className={`block text-center text-sm font-semibold py-2.5 rounded-brand transition-colors ${
                  plan.featured
                    ? 'bg-accent text-white hover:bg-accent/90'
                    : 'bg-navy text-white hover:bg-navy/90'
                }`}
              >
                {plan.name} buchen
              </a>
            </div>
          ))}
        </div>

        {/* Contact info */}
        <div className="rounded-brand border border-brand-border bg-white px-6 py-5 max-w-xl">
          <p className="text-sm font-semibold text-navy mb-2">So läuft die Buchung</p>
          <ol className="space-y-1.5 text-xs text-brand-muted list-decimal list-inside">
            <li>Klicke auf „Plan buchen" — es öffnet sich dein E-Mail-Programm.</li>
            <li>Sende die vorausgefüllte Mail an uns.</li>
            <li>Wir schalten deinen Account innerhalb von 24 Stunden frei.</li>
          </ol>
          <div className="mt-4 text-xs text-brand-muted">
            Fragen? <a href="tel:+4917359089060" className="text-accent font-medium">0173 5908906</a>
            {' · '}
            <a href="mailto:info@echo-b.de" className="text-accent font-medium">info@echo-b.de</a>
          </div>
        </div>

      </div>
    </AppShell>
  )
}
