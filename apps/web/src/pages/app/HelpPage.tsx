/**
 * /app/help — Hilfe, Coaching, Fachpersonen, Sicherheitsressourcen
 */
import { Link } from 'react-router-dom'
import AppShell from '@/components/app/AppShell'

const COACHING_OPTIONS = [
  {
    icon: '🧭',
    title: 'Orientierungsgespräch',
    desc: 'Ein Gespräch, um deine Situation zu sortieren, zentrale Szenen zu verstehen und nächste Schritte zu klären.',
    cta: 'Anfragen',
    available: false,
  },
  {
    icon: '📱',
    title: 'App-Begleitung',
    desc: 'Unterstützung bei der Nutzung von EchoB – Fallstruktur verstehen, Szenen dokumentieren, Berichte einordnen.',
    cta: 'Anfragen',
    available: false,
  },
  {
    icon: '🤝',
    title: 'Coaching-Paket',
    desc: 'Mehrere Sitzungen zu Grenzen, Kommunikation, Trennung, Entscheidungsfindung oder Co-Parenting.',
    cta: 'Anfragen',
    available: false,
  },
]

const SAFETY_RESOURCES = [
  { name: 'Notruf', contact: '110 / 112', note: 'Bei akuter Gefahr' },
  { name: 'Telefonseelsorge', contact: '0800 111 0 111', note: 'Kostenlos, 24h, anonym' },
  { name: 'Hilfetelefon Gewalt gegen Frauen', contact: '08000 116 016', note: 'Kostenlos, 24h, mehrsprachig' },
  { name: 'Nummer gegen Kummer', contact: '0800 111 0 550', note: 'Für Kinder und Jugendliche' },
]

export default function HelpPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-[1100px] px-6 py-10">
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-navy">Menschliche Hilfe</h1>
          <p className="mt-2 text-sm text-brand-muted max-w-xl">
            EchoB ist eine Reflexionshilfe. Manchmal reicht eine App nicht aus.
            Hier findest du Coaching-Angebote, Fachpersonen und Sicherheitsressourcen.
          </p>
        </div>

        {/* Sicherheitsressourcen – immer an erster Stelle */}
        <section className="mb-10">
          <h2 className="text-base font-bold text-navy mb-4">Sicherheitsressourcen</h2>
          <div className="rounded-brand border border-red-200 bg-red-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-red-200">
              <p className="text-xs font-semibold text-red-800">
                Bei akuter Gefahr bitte sofort Hilfe holen – nicht erst Berichte erstellen.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-0">
              {SAFETY_RESOURCES.map((r) => (
                <div key={r.name} className="flex items-start gap-3 px-4 py-3 border-b border-red-100 last:border-0 sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(odd)]:border-red-100">
                  <div>
                    <p className="text-sm font-semibold text-red-900">{r.name}</p>
                    <p className="text-lg font-bold text-red-800">{r.contact}</p>
                    <p className="text-xs text-red-700">{r.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Coaching */}
        <section className="mb-10">
          <h2 className="text-base font-bold text-navy mb-1">Coaching-Angebote</h2>
          <p className="text-xs text-brand-muted mb-4">
            Coaching ist keine Psychotherapie. Bei psychischen Erkrankungen oder akuten Krisen ist professionelle
            psychologische oder psychiatrische Hilfe wichtiger.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {COACHING_OPTIONS.map((o) => (
              <div key={o.title} className="card">
                <div className="text-2xl mb-3">{o.icon}</div>
                <p className="text-sm font-semibold text-navy mb-2">{o.title}</p>
                <p className="text-xs text-brand-muted mb-4">{o.desc}</p>
                <button
                  disabled={!o.available}
                  className="btn-outline !py-2 !px-4 !text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {o.available ? o.cta : 'Bald verfügbar'}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Fachpersonen */}
        <section className="mb-10">
          <h2 className="text-base font-bold text-navy mb-1">Fachpersonen finden</h2>
          <p className="text-xs text-brand-muted mb-4">
            Psychotherapeut:innen, Beratungsstellen und Coaches in deiner Nähe.
            Dieses Verzeichnis ist in Vorbereitung.
          </p>
          <div className="card text-center py-8">
            <div className="text-3xl mb-3">🔍</div>
            <p className="text-sm font-semibold text-navy mb-1">Verzeichnis in Vorbereitung</p>
            <p className="text-xs text-brand-muted mb-4">
              Empfehlungen für Psychotherapeut:innen, Beratungsstellen und Coaches folgen bald.
            </p>
            <Link to="/warteliste" className="btn-outline !py-2 !px-4 !text-sm">
              Auf Warteliste eintragen
            </Link>
          </div>
        </section>

        {/* Abgrenzung */}
        <div className="rounded-brand bg-brand-bg border border-brand-border px-4 py-4">
          <p className="text-xs font-semibold text-navy mb-1">Wichtige Abgrenzung</p>
          <p className="text-xs text-brand-muted">
            EchoB ist keine Therapie-App, keine Diagnose-App und keine Notfallhilfe.
            Die Anwendung hilft dabei, belastende Beziehungsmuster zu strukturieren und
            professionelle Hilfe vorzubereiten – nicht zu ersetzen.
          </p>
        </div>
      </div>
    </AppShell>
  )
}
