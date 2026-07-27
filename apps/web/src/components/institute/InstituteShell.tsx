/**
 * InstituteShell – Wrapper für alle /institute/* Seiten.
 * Eigener Header mit Ausbildungs-Navigation. Konsistent zum Fachpersonen-Shell.
 * Hauptleiste = 5 Kernbereiche; „Einrichtung“ (KI-Aussteuerung, Bewertungsraster) im Zahnrad-Menü.
 */
import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import EchoBLogo from '@/components/EchoBLogo'
import GearIcon from '@/components/icons/GearIcon'

const NAV = [
  { to: '/institute/dashboard', label: 'Dashboard' },
  { to: '/institute/students', label: 'Studierende' },
  { to: '/institute/modules', label: 'Lernmodule' },
  { to: '/institute/assignments', label: 'Aufgaben' },
  { to: '/institute/submissions', label: 'Einreichungen' },
]

const SETTINGS_LINKS = [
  { to: '/institute/settings', label: 'KI-Aussteuerung', hint: 'Haus-Stil des Echo-Gesprächs' },
  { to: '/institute/rubrics', label: 'Bewertungsraster', hint: 'Vorlagen für die Auswertung' },
]

export default function InstituteShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const inSettings = SETTINGS_LINKS.some((l) => location.pathname.startsWith(l.to))

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <header className="bg-navy border-b border-white/[0.07] sticky top-0 z-40">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-6 h-14">
          <EchoBLogo to="/" badge="Institut" />

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
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
            {/* Einrichtung (Zahnrad-Menü) */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Einrichtung"
                aria-expanded={menuOpen}
                title="Einrichtung"
                className={`flex items-center transition-colors ${inSettings || menuOpen ? 'text-white' : 'text-white/55 hover:text-white'}`}
              >
                <GearIcon />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-brand border border-brand-border bg-white py-1 shadow-lg">
                    <p className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-brand-muted/70">Einrichtung</p>
                    {SETTINGS_LINKS.map((l) => (
                      <Link
                        key={l.to}
                        to={l.to}
                        onClick={() => setMenuOpen(false)}
                        className="block px-3 py-2 no-underline transition-colors hover:bg-brand-bg"
                      >
                        <span className="block text-sm font-medium text-navy">{l.label}</span>
                        <span className="block text-[11px] text-brand-muted">{l.hint}</span>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>

            <span className="hidden lg:block text-xs text-white/40">{user?.email}</span>
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
