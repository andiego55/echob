/**
 * AppShell – Wrapper für alle /app/* Seiten.
 * Enthält: App-Header (EchoB-Logo, User-Email, Abmelden)
 * Kein Sidebar in MVP – das kommt mit Phase 2.
 */
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

interface Props {
  children: React.ReactNode
}

export default function AppShell({ children }: Props) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      {/* App-Header */}
      <header className="bg-navy border-b border-white/[0.07] sticky top-0 z-40">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-6 h-14">
          <Link
            to="/app"
            className="text-[1.15rem] font-extrabold tracking-[-0.02em] text-white no-underline"
          >
            Echo<span className="text-accent">B</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {[
              { to: '/app',      label: 'Meine Fälle', end: true },
              { to: '/app/help', label: 'Hilfe',       end: false },
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

      {/* Inhalt */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
