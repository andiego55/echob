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
              <Link to="/auth" state={{ defaultTab: 'signup' }} className="block text-[0.84rem] text-white/50 hover:text-white transition-colors mb-2 no-underline">App</Link>
              <Link to="/coaching" className="block text-[0.84rem] text-white/50 hover:text-white transition-colors mb-2 no-underline">Coaching</Link>
              <Link to="/fachpersonen" className="block text-[0.84rem] text-white/50 hover:text-white transition-colors mb-2 no-underline">Fachpersonen</Link>
            </div>
            <div>
              <h4 className="text-[0.75rem] font-bold tracking-[0.08em] uppercase text-white/30 mb-3.5">
                Inhalt
              </h4>
              <Link to="/wissen" className="block text-[0.84rem] text-white/50 hover:text-white transition-colors mb-2 no-underline">Wissen</Link>
              <Link to="/blog" className="block text-[0.84rem] text-white/50 hover:text-white transition-colors mb-2 no-underline">Blog</Link>
              <Link to="/ueber" className="block text-[0.84rem] text-white/50 hover:text-white transition-colors mb-2 no-underline">Über EchoB</Link>
            </div>
            <div>
              <h4 className="text-[0.75rem] font-bold tracking-[0.08em] uppercase text-white/30 mb-3.5">
                Rechtliches
              </h4>
              <Link to="/datenschutz" className="block text-[0.84rem] text-white/50 hover:text-white transition-colors mb-2 no-underline">Datenschutz</Link>
              <Link to="/impressum" className="block text-[0.84rem] text-white/50 hover:text-white transition-colors mb-2 no-underline">Impressum</Link>
              <Link to="/agb" className="block text-[0.84rem] text-white/50 hover:text-white transition-colors mb-2 no-underline">AGB</Link>
              <Link to="/widerruf" className="block text-[0.84rem] text-white/50 hover:text-white transition-colors mb-2 no-underline">Widerruf</Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-wrap justify-between gap-2.5 pt-6 text-[0.78rem]">
          <span>© {new Date().getFullYear()} EchoB. Alle Rechte vorbehalten.</span>
          <span className="text-white/30">
            In einer Krise?{' '}
            <Link
              to="/blog/krisentelefone"
              className="text-white/60 underline underline-offset-2 hover:text-white"
            >
              Notruf &amp; Krisennummern
            </Link>
            . EchoB ersetzt keine Psychotherapie, Diagnostik oder Notfallhilfe.
          </span>
        </div>
      </div>
    </footer>
  )
}
