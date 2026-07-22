/**
 * InstituteShell – Wrapper für alle /institute/* Seiten.
 * Eigener Header mit Ausbildungs-Navigation. Konsistent zum Fachpersonen-Shell.
 */
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import EchoBLogo from '@/components/EchoBLogo'
import GearIcon from '@/components/icons/GearIcon'

const NAV = [
  { to: '/institute/dashboard', label: 'Dashboard', end: false },
  { to: '/institute/cohort', label: 'Kohorte', end: false },
  { to: '/institute/students', label: 'Studierende', end: false },
  { to: '/institute/modules', label: 'Lernmodule', end: false },
  { to: '/institute/assignments', label: 'Aufgaben', end: false },
  { to: '/institute/submissions', label: 'Einreichungen', end: false },
  { to: '/institute/rubrics', label: 'Bewertungsraster', end: false },
]

export default function InstituteShell({ children }: { children: React.ReactNode }) {
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
          <EchoBLogo to="/" badge="Institut" />

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map(({ to, label, end }) => (
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
            <NavLink
              to="/institute/settings"
              title="KI-Aussteuerung"
              aria-label="KI-Aussteuerung"
              className={({ isActive }) => `transition-colors ${isActive ? 'text-white' : 'text-white/55 hover:text-white'}`}
            >
              <GearIcon />
            </NavLink>
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
