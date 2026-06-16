import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const WISSEN_COLS = [
  [
    {
      heading: 'Beziehungsdynamiken',
      links: [
        { label: 'Beziehungsmuster erkennen', to: '/wissen/beziehungsmuster' },
        { label: 'Bindungsstile',              to: '/wissen/bindungsstile' },
        { label: 'Kommunikation & Konflikte',  to: '/wissen/kommunikation-konflikte' },
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

const NAV_SIMPLE = [
  { to: '/',             label: 'Start' },
  { to: '/coaching',     label: 'Coaching' },
  { to: '/blog',         label: 'Blog' },
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
  const wissenActive = location.pathname.startsWith('/wissen')
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
              <div className="w-[520px] rounded-brand border border-brand-border bg-white shadow-2xl overflow-hidden">
                {/* Topic grid */}
                <div className="grid grid-cols-2 gap-0 p-5">
                  {WISSEN_COLS.map((col, ci) => (
                    <div key={ci} className={`flex flex-col gap-5 ${ci === 0 ? 'pr-5 border-r border-brand-border' : 'pl-5'}`}>
                      {col.map(({ heading, links }) => (
                        <div key={heading}>
                          <p className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-accent mb-2">
                            {heading}
                          </p>
                          {links.map(({ label, to }) => (
                            <Link
                              key={to}
                              to={to}
                              className="block py-1.5 text-[0.83rem] text-brand-text hover:text-accent no-underline transition-colors leading-tight"
                            >
                              {label}
                            </Link>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Blog-Teaser */}
                <div className="border-t border-brand-border bg-brand-bg px-5 py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[0.82rem] font-semibold text-navy">EchoB Blog</p>
                    <p className="text-[0.76rem] text-brand-muted leading-snug">
                      Tiefergehende Artikel zu Beziehungsthemen
                    </p>
                  </div>
                  <Link
                    to="/blog"
                    className="shrink-0 text-[0.8rem] font-semibold text-accent hover:text-accent-hover no-underline transition-colors"
                  >
                    Zum Blog →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Blog + Fachpersonen */}
          {NAV_SIMPLE.slice(2, 4).map(({ to, label }) => (
            <NavLink key={to} to={to} end className={({ isActive }) => LINK_CLS(isActive)}>
              {label}
            </NavLink>
          ))}

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
                  Der Gründer
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
