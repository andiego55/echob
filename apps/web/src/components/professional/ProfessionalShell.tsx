/**
 * ProfessionalShell – Wrapper für alle /professional/* Seiten.
 * Eigener Header mit Fachpersonen-Navigation (Postfach, Klient:innen).
 */
import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import AvvBanner from '@/components/professional/AvvBanner'
import MfaGate from '@/components/professional/MfaGate'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { professionalApi } from '@/api/professional'
import GearIcon from '@/components/icons/GearIcon'
import SeitenHilfe from '@/components/SeitenHilfe'
import EchoBLogo from '@/components/EchoBLogo'

const ZIELE = [
  { to: '/professional/dashboard', label: 'Dashboard',    end: false },
  { to: '/professional/profil',    label: 'Profil',       end: false },
  { to: '/professional/templates', label: 'Ressourcen',   end: false },
  { to: '/professional/report-templates', label: 'Berichtsvorlagen', end: false },
  { to: '/professional',           label: 'Postfach',     end: true },
]

export default function ProfessionalShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  /**
   * Das Menü unter 1024 px.
   *
   * **Vorher gab es darunter gar keins.** Die Leiste trug `hidden md:flex`: Unter 768 px
   * waren Dashboard, Profil, Ressourcen und Postfach nur über Umwege erreichbar - und
   * zwischen 768 und 1024 lief die Leiste über (gemessen rund 1020 px Bedarf mit
   * Adresse), die ganze Seite ließ sich seitwärts schieben.
   *
   * Ein Klappmenü und keine untere Leiste wie im Nutzerbereich: Die Fachperson arbeitet am
   * Schreibtisch, das Telefon ist hier der Ausnahmefall.
   */
  const [menueOffen, setMenueOffen] = useState(false)
  useEffect(() => { setMenueOffen(false) }, [pathname])
  useEffect(() => {
    if (!menueOffen) return
    const zu = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenueOffen(false) }
    window.addEventListener('keydown', zu)
    return () => window.removeEventListener('keydown', zu)
  }, [menueOffen])
  const { data: postfach } = useQuery({ queryKey: ['prof-postfach'], queryFn: professionalApi.postfach })
  // `/professional/me` ist der einzige Endpunkt des Bereichs, der VOR dem
  // Zwei-Faktor-Tor antwortet - genau dafuer ist er da: Er sagt, in welchem Zustand
  // wir sind. Alles andere wuerde hier 403 liefern.
  const { data: profil } = useQuery({ queryKey: ['prof-me'], queryFn: professionalApi.me })
  const unread = (postfach?.attention ?? []).filter(a => a.unread).length

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <header className="bg-navy border-b border-white/[0.07] sticky top-0 z-40">
        {/* Auf dem Telefon 16 px Rand statt 24: Logo mit Kennzeichnung (180 px), Hilfe, Zahnrad
            und „Menü“ brauchen gemessen rund 330 px - mit 48 px Rand ging das bei 375 nicht auf. */}
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-3 px-4 sm:px-6 h-14">
          <EchoBLogo to="/" badge="Fachperson" />

          {/* Ab 1024 px: Logo, fünf Punkte und die rechte Gruppe brauchen gemessen rund
              855 px. Darunter das Klappmenü. */}
          <nav className="hidden lg:flex items-center gap-1">
            {ZIELE.map(({ to, label, end }) => (
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
                {to === '/professional' && unread > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-bold align-middle">
                    {unread}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <SeitenHilfe ton="dunkel" />
            <NavLink
              to="/professional/settings"
              title="Einstellungen"
              aria-label="Einstellungen"
              className={({ isActive }) =>
                `transition-colors ${isActive ? 'text-white' : 'text-white/55 hover:text-white'}`
              }
            >
              <GearIcon />
            </NavLink>
            {/* Erst ab 1280 px und gekürzt: Die Adresse allein brauchte 155 px. */}
            <span className="hidden xl:block max-w-[14rem] truncate text-xs text-white/40" title={user?.email ?? undefined}>{user?.email}</span>
            <button
              onClick={handleSignOut}
              className="hidden lg:block text-xs text-white/50 hover:text-white transition-colors"
            >
              Abmelden
            </button>
            <button
              type="button"
              onClick={() => setMenueOffen(o => !o)}
              aria-expanded={menueOffen}
              aria-controls="fachperson-menue"
              className="relative inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-white/80 hover:bg-white/5 hover:text-white lg:hidden"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                {menueOffen
                  ? <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
                  : <path d="M3.5 6h13M3.5 10h13M3.5 14h13" strokeLinecap="round" />}
              </svg>
              Menü
              {unread > 0 && !menueOffen && (
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-accent" aria-label={`${unread} ungelesen`} />
              )}
            </button>
          </div>
        </div>

        {menueOffen && (
          <nav id="fachperson-menue" className="border-t border-white/[0.07] bg-navy px-4 pb-4 pt-2 lg:hidden">
            <ul className="mx-auto max-w-[1100px] space-y-0.5">
              {ZIELE.map(({ to, label, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      `flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium no-underline transition-colors ${
                        isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`
                    }
                  >
                    {label}
                    {to === '/professional' && unread > 0 && (
                      <span className="inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                        {unread}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
            <div className="mx-auto mt-3 flex max-w-[1100px] items-center justify-between gap-3 border-t border-white/[0.07] px-3 pt-3">
              <span className="min-w-0 truncate text-xs text-white/40">{user?.email}</span>
              <button onClick={handleSignOut} className="shrink-0 text-xs text-white/60 hover:text-white">
                Abmelden
              </button>
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1">
        {/* Steht in der Schale, damit der Hinweis auf jeder Seite des Bereichs
            sichtbar ist - nicht nur dort, wo man ihn ohnehin vermutet. */}
        {/* Das Zwei-Faktor-Tor liegt VOR dem AVV-Hinweis und vor allem anderen:
            Solange es zu ist, antwortet kein Endpunkt des Bereichs, und jeder
            Hinweis darunter liefe ins Leere. Durchgesetzt wird es im Backend;
            das hier ist der Weg dorthin, nicht der Schutz. */}
        {profil && profil.mfa_pflicht && !(profil.mfa_eingerichtet && profil.mfa_bestaetigt) ? (
          <MfaGate
            eingerichtet={profil.mfa_eingerichtet}
            bestaetigt={profil.mfa_bestaetigt}
          >
            {children}
          </MfaGate>
        ) : (
          <>
            <AvvBanner />
            {children}
          </>
        )}
      </main>
    </div>
  )
}
