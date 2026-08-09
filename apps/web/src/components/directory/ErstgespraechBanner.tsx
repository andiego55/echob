import { Link } from 'react-router-dom'

/**
 * Einladung, sich direkt bei EchoB zu melden (Erstgespräch-Angebot) — der
 * niedrigschwellige Alternativweg zur Suche. Verlinkt auf /coaching.
 */
export default function ErstgespraechBanner() {
  return (
    <div className="relative overflow-hidden rounded-brand-lg bg-navy px-7 py-8 text-white sm:px-9 sm:py-9">
      {/* Echo-Wellen-Motiv */}
      <svg aria-hidden="true" viewBox="0 0 200 200" className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 opacity-[0.12]">
        <circle cx="100" cy="100" r="90" fill="none" stroke="#e07b54" strokeWidth="3" />
        <circle cx="100" cy="100" r="58" fill="none" stroke="#e07b54" strokeWidth="4" />
        <circle cx="100" cy="100" r="26" fill="#e07b54" />
      </svg>

      <div className="relative max-w-[560px]">
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-accent">Du weißt nicht, wo du anfangen sollst?</p>
        <h3 className="mt-2.5 text-[1.35rem] font-bold leading-snug sm:text-[1.5rem]">
          Melde dich direkt bei uns
        </h3>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-white/70">
          Manchmal ist die schwerste Frage, wen man überhaupt braucht. In einem unverbindlichen
          Erstgespräch hören wir zu, ordnen deine Situation ein und finden gemeinsam heraus, was dir
          jetzt hilft – und wer die passende Begleitung sein könnte.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link to="/coaching" className="btn-primary !px-6 !py-3">
            Erstgespräch mit EchoB anfragen
          </Link>
          <span className="text-[0.8rem] text-white/50">unverbindlich · vertraulich</span>
        </div>
      </div>
    </div>
  )
}
