/**
 * /institute/examples/new — KI-Fallgenerierung (Wizard).
 * Platzhalter: wird in Phase 1c/1d mit Rahmen-Eingaben + Generierung + Editor gefüllt.
 */
import { Link } from 'react-router-dom'
import InstituteShell from '@/components/institute/InstituteShell'

export default function InstituteGeneratePage() {
  return (
    <InstituteShell>
      <div className="mx-auto max-w-[760px] px-6 py-10">
        <Link to="/institute/dashboard" className="text-sm text-brand-muted no-underline hover:text-navy">
          ← Zurück zum Dashboard
        </Link>
        <div className="card mt-4">
          <span className="label">Beispielfall generieren</span>
          <h1 className="mt-1 text-xl font-bold text-navy">Der KI-Generator wird gerade gebaut</h1>
          <p className="mt-2 text-sm leading-relaxed text-brand-muted">
            Hier legen Sie in Kürze über ein paar Rahmen-Eingaben (Pseudonym, Belastungsgrad,
            Beziehungsart und -status, Kontakthäufigkeit, Freitext, Schwerpunkte, Szenenzahl und
            optional eine Partnerperson) einen prototypischen Fall an. EchoB erzeugt daraus Szenen,
            Profile und die Fall-Einschätzung – Sie bearbeiten alles und legen den Fall dann ab.
          </p>
        </div>
      </div>
    </InstituteShell>
  )
}
