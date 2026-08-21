/**
 * Vertrauens-Hinweis für den Paarbereich.
 *
 * Macht die zentrale Zusicherung sichtbar: Eine Kopplung ist keine Freigabe. Was Echo im
 * gemeinsamen Raum weiß, stellt jede Person später ausdrücklich selbst zusammen.
 */
export default function IsolationNotice({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-xs text-brand-muted">
        Dein eigener Fall bleibt privat. Was Echo im gemeinsamen Raum weiß, bestimmst du selbst.
      </p>
    )
  }

  return (
    <div className="card bg-accent/[0.04] border-l-4 border-l-accent">
      <h2 className="card-title">Was privat bleibt</h2>
      <ul className="mt-2 space-y-1.5 text-sm text-brand-muted">
        <li>
          <span className="font-medium text-navy">Dein Fall bleibt deiner.</span> Die Verbindung
          gibt keine Szenen, Skalen, Berichte oder Dialoge frei.
        </li>
        <li>
          <span className="font-medium text-navy">Du baust den Kontext.</span> Was Echo für ein
          gemeinsames Gespräch weiß, schreibst du vorher selbst – Wort für Wort.
        </li>
        <li>
          <span className="font-medium text-navy">Jederzeit beendbar.</span> Beendet eine Seite
          den Raum, ist er sofort für beide geschlossen.
        </li>
      </ul>
    </div>
  )
}
