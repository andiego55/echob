import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-navy-dark text-white/45 pt-12 pb-7">
      <div className="mx-auto max-w-[960px] px-6">
        {/* Brand + Links */}
        <div className="flex flex-wrap justify-between gap-8 pb-8 border-b border-white/[0.07]">
          <div>
            <span className="text-[1.2rem] font-extrabold tracking-[-0.02em] text-white">
              Echo<span className="text-accent">B</span>
            </span>
            <p className="mt-2.5 text-[0.82rem] max-w-[260px] leading-[1.6]">
              Belastende Beziehungsmuster erkennen und sortieren.
            </p>
          </div>
          <div className="flex gap-12 flex-wrap">
            <div>
              <h4 className="text-[0.75rem] font-bold tracking-[0.08em] uppercase text-white/30 mb-3.5">
                Produkt
              </h4>
              <a href="#" className="block text-[0.84rem] text-white/50 hover:text-white transition-colors mb-2 no-underline">App</a>
              <a href="#" className="block text-[0.84rem] text-white/50 hover:text-white transition-colors mb-2 no-underline">Coaching</a>
              <a href="#" className="block text-[0.84rem] text-white/50 hover:text-white transition-colors mb-2 no-underline">Fachpersonen</a>
            </div>
            <div>
              <h4 className="text-[0.75rem] font-bold tracking-[0.08em] uppercase text-white/30 mb-3.5">
                Rechtliches
              </h4>
              <Link to="/datenschutz" className="block text-[0.84rem] text-white/50 hover:text-white transition-colors mb-2 no-underline">Datenschutz</Link>
              <Link to="/impressum" className="block text-[0.84rem] text-white/50 hover:text-white transition-colors mb-2 no-underline">Impressum</Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-wrap justify-between gap-2.5 pt-6 text-[0.78rem]">
          <span>© {new Date().getFullYear()} EchoB. Alle Rechte vorbehalten.</span>
          <span className="text-white/30">
            EchoB ersetzt keine Psychotherapie, keine Diagnostik und keine Notfallhilfe.
          </span>
        </div>
      </div>
    </footer>
  )
}
