/**
 * „Da liegt noch etwas von dir."
 *
 * Der Hinweis auf einen liegengebliebenen Entwurf. Bewusst ein ANGEBOT und keine
 * Automatik: Ein Formular, das sich beim Öffnen von selbst mit altem Text füllt, ist
 * schlimmer als ein leeres — man merkt es womöglich nicht und schickt etwas ab, das man so
 * nicht schreiben wollte.
 *
 * Beide Wege sind gleich leicht erreichbar. „Verwerfen" ist bewusst leise gesetzt, aber
 * nicht versteckt: Wer neu anfangen will, soll das ohne Umweg können.
 */
import type { Entwurf } from '@/lib/entwurf'

export default function EntwurfHinweis<T>({
  entwurf, onUebernehmen, was = 'Entwurf',
}: {
  entwurf: Entwurf<T>
  /** Bekommt den gespeicherten Stand — das Formular setzt ihn selbst ein. */
  onUebernehmen: (wert: T) => void
  /** Wovon die Rede ist, im Satz: „Dein angefangener {was} …" */
  was?: string
}) {
  if (!entwurf.gefunden) return null

  return (
    <div className="card card-static mb-5 border-l-4 border-l-accent">
      <p className="card-title">Da liegt noch etwas von dir</p>
      <p className="mt-1 text-sm leading-relaxed text-brand-muted">
        {was} von {entwurf.alter ?? 'vorhin'} — abgeschickt wurde er nicht. Du kannst ihn
        weiterschreiben oder neu anfangen.
      </p>
      <div className="mt-3.5 flex flex-wrap items-center gap-3">
        <button
          onClick={() => { onUebernehmen(entwurf.gefunden as T); entwurf.verwerfen() }}
          className="btn-primary !py-2 !px-4 !text-sm"
        >
          Weiterschreiben
        </button>
        <button
          onClick={entwurf.loeschen}
          className="text-sm text-brand-muted transition-colors hover:text-navy"
        >
          Verwerfen und neu anfangen
        </button>
      </div>
    </div>
  )
}
