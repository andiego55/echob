import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function Header() {
  const { session, signOut } = useAuth()

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-navy border-b border-white/[0.07]">
      <div className="mx-auto flex max-w-[960px] items-center justify-between gap-5 px-6 h-[60px]">
        <Link to="/" className="text-[1.35rem] font-extrabold tracking-[-0.02em] text-white no-underline">
          Echo<span className="text-accent">B</span>
        </Link>

        <nav className="hidden items-center gap-5 md:flex">
          {[
            { to: '/',           label: 'Start' },
            { to: '/warteliste', label: 'Warteliste' },
          ].map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                `text-[0.88rem] font-medium no-underline transition-colors duration-150 ${
                  isActive ? 'text-white' : 'text-white/70 hover:text-white'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
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
              <Link to="/warteliste" className="btn-primary !py-2 !px-[18px] !text-[0.85rem]">
                Kostenlos starten
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
