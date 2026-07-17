/**
 * StudentShell – Wrapper für alle /student/* Seiten. Konsistent zum Fachpersonen-/Institut-Shell.
 */
import { NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { studentApi } from '@/api/student'
import EchoBLogo from '@/components/EchoBLogo'

const NAV = [
  { to: '/student/dashboard', label: 'Meine Fälle', end: false },
  { to: '/student/modules', label: 'Lernmodule', end: false },
  { to: '/student/assignments', label: 'Aufgaben', end: false },
]

export default function StudentShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { data: inbox } = useQuery({ queryKey: ['student-inbox-count'], queryFn: () => studentApi.inboxCount() })
  const openCount = inbox?.assignments ?? 0

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <header className="bg-navy border-b border-white/[0.07] sticky top-0 z-40">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-6 h-14">
          <EchoBLogo to="/" badge="Ausbildung" />

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
                {to === '/student/assignments' && openCount > 0 && (
                  <span className="ml-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 align-middle text-[10px] font-bold text-white">
                    {openCount}
                  </span>
                )}
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
