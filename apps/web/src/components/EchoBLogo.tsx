import { Link } from 'react-router-dom'

/**
 * EchoB-Wortmarke mit den Echo-Wellen-Ringen (wie im öffentlichen Header).
 * Standardziel ist die Startseite (/), damit man aus der App jederzeit zurück
 * auf die Homepage kommt.
 */
export default function EchoBLogo({
  to = '/',
  badge,
  className = '',
}: {
  to?: string
  badge?: string
  className?: string
}) {
  return (
    <Link
      to={to}
      title="Zur EchoB-Startseite"
      className={`flex items-center gap-2 text-[1.15rem] font-extrabold tracking-[-0.02em] text-white no-underline ${className}`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[1.35em] w-[1.35em] shrink-0">
        <circle cx="12" cy="12" r="9.5" fill="none" stroke="#e07b54" strokeWidth="1.5" opacity="0.4" />
        <circle cx="12" cy="12" r="5.8" fill="none" stroke="#e07b54" strokeWidth="1.9" opacity="0.9" />
        <circle cx="12" cy="12" r="2.6" fill="#e07b54" />
      </svg>
      <span>Echo<span className="text-accent">B</span></span>
      {badge && (
        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/70">
          {badge}
        </span>
      )}
    </Link>
  )
}
