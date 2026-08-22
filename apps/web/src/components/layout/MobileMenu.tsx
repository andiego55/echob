/**
 * Die Navigation auf dem Telefon.
 *
 * **Was hier gefehlt hat.** Die Kopfzeile trug `hidden md:flex` — unter 768 px war das
 * `<nav>` schlicht `display: none`, und es gab keinen Ersatz. Bei 376 px blieben genau drei
 * Ziele übrig: Logo, „Anmelden", „Kostenlos starten". Wissen, Glossar, Selbsttests, Szenen,
 * Paartherapie, Fachpersonen — von oben nicht erreichbar. Es gibt zwar einen Fußbereich mit
 * fünfzehn Links, aber der liegt auf der Startseite zehn Bildschirme weiter unten.
 *
 * Das trifft ausgerechnet die Besucher, für die die 304 prerenderten Seiten gebaut wurden:
 * Suchverkehr ist mehrheitlich mobil. Sie landen auf einer Wissensseite, lesen sie, und
 * kommen nirgendwohin.
 *
 * **Flach statt nachgebaut.** Am Schreibtisch öffnen sich beim Überfahren reich gestaltete
 * Klappmenüs mit Symbolen und Teasern. Die hier nachzubauen wäre falsch: Auf einem kleinen
 * Schirm zählt, in wie wenigen Blicken man sein Ziel findet, nicht wie gut es aussieht.
 * Deshalb dieselben Ziele, aber als Liste unter Überschriften — die Gliederung bleibt, der
 * Schmuck fällt weg.
 */
import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MENUE_GRUPPEN } from './navigation'

export default function MobileMenu({
  offen, onSchliessen, angemeldet,
}: {
  offen: boolean
  onSchliessen: () => void
  angemeldet: boolean
}) {
  const { pathname } = useLocation()
  const panelRef = useRef<HTMLDivElement>(null)

  // Beim Wechsel der Seite schließen — sonst bleibt das Menü über der neuen Seite stehen.
  useEffect(() => { onSchliessen() }, [pathname])   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!offen) return
    const taste = (e: KeyboardEvent) => { if (e.key === 'Escape') onSchliessen() }
    document.addEventListener('keydown', taste)
    // Der Hintergrund darf nicht mitscrollen, während das Menü offen ist.
    const vorher = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', taste)
      document.body.style.overflow = vorher
    }
  }, [offen, onSchliessen])

  if (!offen) return null

  return (
    <div
      className="fixed inset-0 top-[60px] z-40 bg-navy md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="h-full overflow-y-auto overscroll-contain px-6 pb-24 pt-4 outline-none"
      >
        {MENUE_GRUPPEN.map(gruppe => (
          <section key={gruppe.titel} className="border-b border-white/[0.08] py-4 first:pt-0">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.09em] text-white/40">
              {gruppe.titel}
            </p>
            <ul className="mt-2.5 space-y-0.5">
              {gruppe.eintraege.map(e => (
                <li key={e.to}>
                  <Link
                    to={e.to}
                    onClick={onSchliessen}
                    /* min-h-11 = 44 px: die kleinste Fläche, die sich mit dem Daumen
                       zuverlässig treffen lässt. */
                    className={`flex min-h-11 items-center rounded-brand-sm px-3 -mx-3 text-[0.95rem] no-underline transition-colors ${
                      pathname === e.to
                        ? 'bg-white/[0.10] font-semibold text-white'
                        : 'text-white/75 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    {e.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <div className="mt-6 flex flex-col gap-2.5">
          {angemeldet ? (
            <Link to="/app" onClick={onSchliessen} className="btn-primary !py-3 justify-center">
              Zur App
            </Link>
          ) : (
            <>
              <Link to="/auth" onClick={onSchliessen} className="btn-primary !py-3 justify-center">
                Kostenlos starten
              </Link>
              <Link
                to="/auth"
                onClick={onSchliessen}
                className="btn !py-3 justify-center border-2 border-white/25 text-white"
              >
                Anmelden
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/** Der Knopf, der das Menü öffnet — drei Striche, die sich zum Kreuz drehen. */
export function MobileMenuButton({
  offen, onWechseln,
}: { offen: boolean; onWechseln: () => void }) {
  return (
    <button
      onClick={onWechseln}
      aria-expanded={offen}
      aria-label={offen ? 'Menü schließen' : 'Menü öffnen'}
      className="grid h-11 w-11 shrink-0 place-items-center text-white/80 transition-colors hover:text-white md:hidden"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
        strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
        {offen
          ? <><path d="M6 6l12 12" /><path d="M18 6L6 18" /></>
          : <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>}
      </svg>
    </button>
  )
}
