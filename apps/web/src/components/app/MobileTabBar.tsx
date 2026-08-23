/**
 * Die Navigation der App auf dem Telefon.
 *
 * **Was gefehlt hat.** Die Kopfzeile der App trug `hidden md:flex`. Unter 768 px waren
 * damit Postfach, Für Paare, Profil, Schutz und Hilfe schlicht nicht erreichbar — und das
 * Logo führte auf die öffentliche Startseite, also aus der App heraus.
 *
 * **Warum unten und nicht als Burger.** Für die öffentliche Seite ist ein Klappmenü richtig:
 * Man browst einmal, sucht ein Ziel, geht weiter. Die App ist ein Werkzeug, das jemand
 * mehrmals täglich benutzt — oft einhändig, oft unterwegs. Am unteren Rand liegt sie im
 * Daumenweg statt in der oberen Ecke, und das Postfach kann seine ungelesenen Nachrichten
 * zeigen, ohne dass man erst etwas aufklappen muss.
 *
 * **Vier Plätze, nicht sechs.** Mehr wird auf 375 px zu Text, den niemand liest. „Mehr"
 * sammelt ein, was man selten braucht.
 */
import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

interface Ziel {
  to: string
  label: string
  end?: boolean
  pfad: React.ReactNode
}

const ZIELE: Ziel[] = [
  {
    to: '/app', label: 'Fälle', end: true,
    pfad: <><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h10" /></>,
  },
  {
    to: '/app/inbox', label: 'Postfach',
    pfad: <><path d="M3 8l9 6 9-6" /><rect x="3" y="5" width="18" height="14" rx="2" /></>,
  },
  {
    to: '/app/paar', label: 'Für Paare',
    pfad: <><circle cx="9" cy="9" r="3.2" /><circle cx="16" cy="9" r="3.2" />
           <path d="M4 19c.8-2.6 2.7-4 5-4M19 19c-.8-2.6-2.7-4-5-4" /></>,
  },
]

/** Was seltener gebraucht wird — hinter einem Zug nach oben. */
const MEHR = [
  { to: '/app/profile',  label: 'Mein Profil' },
  { to: '/app/privacy',  label: 'Schutz & Daten' },
  { to: '/app/help',     label: 'Hilfe' },
  { to: '/app/settings', label: 'Einstellungen' },
]

export default function MobileTabBar({ inboxUnread = 0 }: { inboxUnread?: number }) {
  const { pathname } = useLocation()
  const { user, signOut } = useAuth()
  const [mehrOffen, setMehrOffen] = useState(false)

  useEffect(() => { setMehrOffen(false) }, [pathname])

  useEffect(() => {
    if (!mehrOffen) return
    const taste = (e: KeyboardEvent) => { if (e.key === 'Escape') setMehrOffen(false) }
    document.addEventListener('keydown', taste)
    return () => document.removeEventListener('keydown', taste)
  }, [mehrOffen])

  const inMehr = MEHR.some(m => pathname.startsWith(m.to))

  return (
    <>
      {mehrOffen && (
        <div
          className="fixed inset-0 z-40 bg-navy/40 md:hidden"
          onClick={() => setMehrOffen(false)}
          aria-hidden="true"
        />
      )}

      {mehrOffen && (
        <div
          className="fixed inset-x-0 bottom-[60px] z-40 border-t border-brand-border bg-white p-2 shadow-brand-lg md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Weitere Bereiche"
        >
          {MEHR.map(m => (
            <NavLink
              key={m.to}
              to={m.to}
              className={({ isActive }) =>
                `flex min-h-11 items-center rounded-brand px-4 text-sm no-underline transition-colors ${
                  isActive ? 'bg-accent/10 font-semibold text-accent' : 'text-brand-text hover:bg-brand-bg'
                }`
              }
            >
              {m.label}
            </NavLink>
          ))}

          {/* Abmelden gab es unter 640 px NIRGENDS: In der Kopfzeile steht es
              `hidden sm:block`, und hier fehlte es. In einer Anwendung, die man auf einem
              Telefon benutzt, das auch anderen in die Hand fällt, ist das kein
              Schönheitsfehler.

              Abgesetzt durch eine Linie, weil es keine Navigation ist, sondern ein
              Verlassen — und der Name daneben, damit man sieht, wen man abmeldet. */}
          <div className="mt-1 border-t border-brand-border pt-1">
            <button
              type="button"
              onClick={() => { setMehrOffen(false); void signOut() }}
              className="flex min-h-11 w-full items-center justify-between gap-3 rounded-brand px-4 text-sm text-brand-text transition-colors hover:bg-brand-bg"
            >
              <span>Abmelden</span>
              {user?.email && (
                <span className="min-w-0 truncate text-[0.68rem] text-brand-muted">
                  {user.email}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* `pb-[env(safe-area-inset-bottom)]` hält die Leiste über der Wischleiste des
          iPhones — sonst liegt der unterste Millimeter unter der Systemgeste. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-brand-border bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_12px_rgba(15,30,46,0.06)] md:hidden"
        aria-label="Hauptbereiche"
      >
        <div className="flex">
          {ZIELE.map(z => (
            <NavLink
              key={z.to}
              to={z.to}
              end={z.end}
              className={({ isActive }) =>
                `relative flex min-h-[60px] flex-1 flex-col items-center justify-center gap-1 px-1 no-underline transition-colors ${
                  isActive ? 'text-accent' : 'text-brand-muted'
                }`
              }
            >
              <span className="relative">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
                  strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]"
                  aria-hidden="true">
                  {z.pfad}
                </svg>
                {z.to === '/app/inbox' && inboxUnread > 0 && (
                  <span className="absolute -right-2 -top-1.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                    {inboxUnread > 9 ? '9+' : inboxUnread}
                  </span>
                )}
              </span>
              <span className="text-[0.65rem] font-medium leading-none">{z.label}</span>
            </NavLink>
          ))}

          <button
            onClick={() => setMehrOffen(o => !o)}
            aria-expanded={mehrOffen}
            className={`flex min-h-[60px] flex-1 flex-col items-center justify-center gap-1 px-1 transition-colors ${
              inMehr || mehrOffen ? 'text-accent' : 'text-brand-muted'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" className="h-[22px] w-[22px]" aria-hidden="true">
              <circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" />
            </svg>
            <span className="text-[0.65rem] font-medium leading-none">Mehr</span>
          </button>
        </div>
      </nav>
    </>
  )
}
