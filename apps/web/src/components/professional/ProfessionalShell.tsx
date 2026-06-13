/**
 * ProfessionalShell – Wrapper für alle /professional/* Seiten.
 * Eigener Header mit Fachpersonen-Navigation (Postfach, Klient:innen).
 */
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function ProfessionalShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <header className="bg-navy border-b border-white/[0.07] sticky top-0 z-40">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-6 h-14">
          <Link
            to="/professional"
            className="flex items-center gap-2 text-[1.15rem] font-extrabold tracking-[-0.02em] text-white no-underline"
          >
            Echo<span className="text-accent">B</span>
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/70">
              Fachperson
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {[
              { to: '/professional',        label: 'Postfach',     end: true },
              { to: '/professional/cases',  label: 'Klient:innen', end: false },
            ].map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md text-sm font-medium no-underline transition-colors ${
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs text-white/40">{user?.email}</span>
            <button
              onClick={handleSignOut}
              className="text-xs text-white/50 hover:text-white transition-colors"
            >
              Abmelden
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  )
}
