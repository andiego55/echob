import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { CONTENT_MANIFEST } from '@/content/manifest.generated'
import { SELF_TESTS } from '@/selftests'

const WISSEN_COLS = [
  [
    {
      heading: 'Beziehungsdynamiken',
      links: [
        { label: 'Beziehungsmuster erkennen',       to: '/wissen/beziehungsmuster' },
        { label: 'Emotionale Manipulation',         to: '/wissen/emotionale-manipulation' },
        { label: 'Gaslighting oder Missverständnis?', to: '/wissen/gaslighting-oder-missverstaendnis' },
        { label: 'Gaslighting: Begriff',            to: '/glossar/gaslighting' },
        { label: 'Bindungsstile',                   to: '/wissen/bindungsstile' },
        { label: 'Kommunikation & Konflikte',       to: '/wissen/kommunikation-konflikte' },
      ],
    },
    {
      heading: 'Psychologisches Wissen',
      links: [
        { label: 'Persönlichkeit & Verhalten', to: '/wissen/persoenlichkeit-verhalten' },
        { label: 'Emotionsregulation',         to: '/wissen/emotionsregulation' },
      ],
    },
  ],
  [
    {
      heading: 'Selbstreflexion',
      links: [
        { label: 'Beobachtung & Gefühl trennen', to: '/wissen/beobachtung-gefuehl' },
        { label: 'Grenzen setzen',               to: '/wissen/grenzen-setzen' },
      ],
    },
    {
      heading: 'Hilfe finden',
      links: [
        { label: 'Wann professionelle Hilfe sinnvoll ist', to: '/wissen/professionelle-hilfe' },
        { label: 'Krisentelefone & Anlaufstellen',         to: '/wissen/krisentelefone' },
      ],
    },
  ],
]

const SCENE_COUNT = CONTENT_MANIFEST.filter((m) => m.type === 'scene').length
const TEST_COUNT = SELF_TESTS.length

// Highlight-Elemente im Wissen-Dropdown (mit Icon, Teaser, Live-Zähler).
const WISSEN_FEATURES = [
  {
    to: '/szenen',
    title: 'Beziehungsszenen',
    teaser: 'Kurze Geschichten aus schwierigen Beziehungen. Erkenne dich wieder.',
    badge: `${SCENE_COUNT} Szenen`,
    cta: 'Entdecken',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
        <path d="M12 6.5C9.8 5.1 6.4 5.1 4 6v12c2.4-.9 5.8-.9 8 .5 2.2-1.4 5.6-1.4 8-.5V6c-2.4-.9-5.8-.9-8 .5Z" />
        <path d="M12 6.5V19" />
      </svg>
    ),
  },
  {
    to: '/selbsttests',
    title: 'Selbsttests',
    teaser: 'Wo stehst du gerade? Klare Auswertung, mit Echo besprechbar.',
    badge: `${TEST_COUNT} Tests`,
    cta: 'Test starten',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
        <path d="M6 20V12M12 20V6M18 20v-5" />
      </svg>
    ),
  },
  {
    to: '/glossar',
    title: 'Glossar',
    teaser: 'Die wichtigsten Begriffe – klar erklärt, von A bis Z.',
    badge: 'A–Z',
    cta: 'Nachschlagen',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
        <path d="M5 6h14M5 10.5h14M5 15h9M5 19h6" />
      </svg>
    ),
  },
]

const NAV_SIMPLE = [
  { to: '/',             label: 'Start' },
  { to: '/coaching',     label: 'Coaching' },
  { to: '/fachpersonen', label: 'Fachpersonen' },
  { to: '/ueber',        label: 'Über' },
]

const LINK_CLS = (active: boolean) =>
  `text-[0.88rem] font-medium no-underline transition-colors duration-150 ${
    active ? 'text-white' : 'text-white/70 hover:text-white'
  }`

export default function Header() {
  const { session, signOut } = useAuth()
  const location = useLocation()
  const wissenActive =
    location.pathname.startsWith('/wissen') ||
    location.pathname.startsWith('/glossar') ||
    location.pathname.startsWith('/szenen') ||
    location.pathname.startsWith('/selbsttests')
  const ueberActive = location.pathname.startsWith('/ueber')

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-navy border-b border-white/[0.07]">
      <div className="mx-auto flex max-w-[960px] items-center justify-between gap-5 px-6 h-[60px]">
        <Link to="/" className="flex items-center gap-2.5 text-[1.35rem] font-extrabold tracking-[-0.02em] text-white no-underline">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 shrink-0">
            <circle cx="12" cy="12" r="9.5" fill="none" stroke="#e07b54" strokeWidth="1.5" opacity="0.4" />
            <circle cx="12" cy="12" r="5.8" fill="none" stroke="#e07b54" strokeWidth="1.9" opacity="0.9" />
            <circle cx="12" cy="12" r="2.6" fill="#e07b54" />
          </svg>
          <span>Echo<span className="text-accent">B</span></span>
        </Link>

        <nav className="hidden items-center gap-5 md:flex">
          {/* Start */}
          <NavLink to="/" end className={({ isActive }) => LINK_CLS(isActive)}>Start</NavLink>
          <NavLink to="/coaching" end className={({ isActive }) => LINK_CLS(isActive)}>Coaching</NavLink>

          {/* Wissen mit Dropdown */}
          <div className="relative group">
            <NavLink
              to="/wissen"
              end
              className={() => LINK_CLS(wissenActive) + ' flex items-center gap-1'}
            >
              Wissen
              <svg
                className="w-3 h-3 opacity-60 transition-transform group-hover:rotate-180"
                fill="none"
                viewBox="0 0 12 12"
              >
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </NavLink>

            {/* Dropdown – pt-3 bridges the gap between trigger and panel */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3
                            opacity-0 pointer-events-none
                            group-hover:opacity-100 group-hover:pointer-events-auto
                            transition-opacity duration-150 z-50">
              <div className="w-[600px] rounded-brand-lg border border-brand-border bg-white shadow-2xl overflow-hidden">
                {/* Highlights – die interaktiven Elemente prominent anteasern */}
                <div className="grid grid-cols-3 gap-2.5 bg-gradient-to-b from-brand-bg/70 to-white p-4">
                  {WISSEN_FEATURES.map((f) => (
                    <Link
                      key={f.to}
                      to={f.to}
                      className="group/f flex flex-col rounded-brand-sm border border-brand-border bg-white p-3.5 no-underline shadow-brand-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-brand"
                    >
                      <div className="flex items-center justify-between">
                        <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent/10 text-accent transition-colors group-hover/f:bg-accent group-hover/f:text-white">
                          {f.icon}
                        </span>
                        {f.badge && (
                          <span className="rounded-full bg-brand-bg px-2 py-0.5 text-[0.6rem] font-semibold tracking-wide text-brand-muted">{f.badge}</span>
                        )}
                      </div>
                      <p className="mt-2.5 text-[0.9rem] font-bold text-navy">{f.title}</p>
                      <p className="mt-1 text-[0.74rem] leading-snug text-brand-muted">{f.teaser}</p>
                      <span className="mt-2.5 inline-flex items-center gap-1 text-[0.72rem] font-semibold text-accent">
                        {f.cta}<span className="transition-transform group-hover/f:translate-x-0.5">→</span>
                      </span>
                    </Link>
                  ))}
                </div>

                {/* Themen zum Nachlesen */}
                <div className="border-t border-brand-border p-4 pt-3.5">
                  <p className="mb-2.5 text-[0.6rem] font-bold uppercase tracking-[0.16em] text-brand-muted/70">Themen zum Nachlesen</p>
                  <div className="grid grid-cols-2 gap-x-6">
                    {WISSEN_COLS.map((col, ci) => (
                      <div key={ci} className="flex flex-col gap-3.5">
                        {col.map(({ heading, links }) => (
                          <div key={heading}>
                            <p className="mb-1 text-[0.63rem] font-bold uppercase tracking-[0.1em] text-accent/90">{heading}</p>
                            {links.map(({ label, to }) => (
                              <Link
                                key={to}
                                to={to}
                                className="block py-1 text-[0.82rem] leading-tight text-brand-text hover:text-accent no-underline transition-colors"
                              >
                                {label}
                              </Link>
                            ))}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fachpersonen */}
          {NAV_SIMPLE.slice(2, 3).map(({ to, label }) => (
            <NavLink key={to} to={to} end className={({ isActive }) => LINK_CLS(isActive)}>
              {label}
            </NavLink>
          ))}

          {/* Ausbildung */}
          <NavLink to="/ausbildungsinstitute" end className={({ isActive }) => LINK_CLS(isActive)}>
            Ausbildung
          </NavLink>

          {/* Über mit Dropdown */}
          <div className="relative group">
            <NavLink
              to="/ueber"
              end
              className={() => LINK_CLS(ueberActive) + ' flex items-center gap-1'}
            >
              Über
              <svg
                className="w-3 h-3 opacity-60 transition-transform group-hover:rotate-180"
                fill="none"
                viewBox="0 0 12 12"
              >
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </NavLink>

            <div className="absolute top-full right-0 pt-3
                            opacity-0 pointer-events-none
                            group-hover:opacity-100 group-hover:pointer-events-auto
                            transition-opacity duration-150 z-50">
              <div className="w-52 rounded-brand border border-brand-border bg-white shadow-2xl overflow-hidden py-1.5">
                <Link to="/ueber" className="block px-4 py-2 text-[0.83rem] text-brand-text hover:text-accent hover:bg-brand-bg no-underline transition-colors">
                  Über EchoB
                </Link>
                <Link to="/ueber/gruender" className="block px-4 py-2 text-[0.83rem] text-brand-text hover:text-accent hover:bg-brand-bg no-underline transition-colors">
                  Interview
                </Link>
                <Link to="/ueber/team" className="block px-4 py-2 text-[0.83rem] text-brand-text hover:text-accent hover:bg-brand-bg no-underline transition-colors">
                  Team
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <div className="flex items-center gap-3">
          {session ? (
            <>
              <Link to="/app" className="btn-outline !py-2 !px-4 !text-[0.85rem]">
                Dashboard
              </Link>
              <button
                onClick={signOut}
                className="text-[0.85rem] text-white/60 hover:text-white transition-colors"
              >
                Abmelden
              </button>
            </>
          ) : (
            <>
              <Link to="/auth" className="text-[0.85rem] text-white/70 hover:text-white transition-colors no-underline">
                Anmelden
              </Link>
              <Link to="/auth" state={{ defaultTab: 'signup' }} className="btn-primary !py-2 !px-[18px] !text-[0.85rem]">
                Kostenlos starten
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
