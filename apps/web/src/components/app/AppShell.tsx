/**
 * AppShell – Wrapper für alle /app/* Seiten.
 * Enthält: App-Header (EchoB-Logo, User-Email, Abmelden)
 * Kein Sidebar in MVP – das kommt mit Phase 2.
 */
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { collabApi } from '@/api/collab'
import QuickExitButton from '@/components/app/QuickExit'

interface Props {
  children: React.ReactNode
}

export default function AppShell({ children }: Props) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { data: inboxUnread = 0 } = useQuery({
    queryKey: ['inbox'],
    queryFn: collabApi.inbox,
    select: d => d.assignments.filter(a => a.unread).length,
    staleTime: 30_000,
  })

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      {/* App-Header */}
      <header className="bg-gradient-to-b from-navy to-navy-dark border-b border-white/[0.08] shadow-[0_8px_24px_-12px_rgba(7,14,24,0.55)] sticky top-0 z-40">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-6 h-14">
          <Link
            to="/app"
            className="text-[1.15rem] font-extrabold tracking-[-0.02em] text-white no-underline"
          >
            Echo<span className="text-accent">B</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {[
              { to: '/app',          label: 'Meine Fälle',        end: true },
              { to: '/app/inbox',    label: 'Postfach',            end: false },
              { to: '/app/profile',  label: 'Mein Profil',         end: false },
              { to: '/app/privacy',  label: 'Schutz',              end: false },
              { to: '/app/help',     label: 'Hilfe',               end: false },
            ].map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-brand-sm text-sm font-medium no-underline transition-colors ${
                    isActive
                      ? 'bg-white/[0.12] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
                  }`
                }
              >
                {label}
                {to === '/app/inbox' && inboxUnread > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-accent text-white text-[10px] font-bold align-middle">
                    {inboxUnread}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <QuickExitButton />
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
