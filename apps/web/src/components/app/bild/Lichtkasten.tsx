/**
 * Ein Bild, aufgeschlagen — groß, dunkel umrandet, mit seiner Legende daneben.
 *
 * **Das Problem, das es löst.** In der Galerie ist ein Bild eine Kachel von 260 Pixeln. Ein
 * Bild, das aus dem eigenen Fall entstanden ist, sieht man sich darin nicht an — man erkennt
 * darauf nicht einmal, was das Hauptmotiv ist. Die Symbolik, die Schwelle am Rand, das Tier
 * in der Ferne: alles Dinge, die es in Kachelgröße gar nicht gibt.
 *
 * **Warum dunkel.** Ein Bild neben Weiß wirkt flach; die Ränder verschwimmen mit der Seite.
 * Ein dunkler Grund nimmt die Seite weg und lässt nur das Bild übrig — dasselbe, was ein
 * Rahmen in einem Raum tut.
 *
 * **Und die Legende steht dabei.** Groß ansehen und nachlesen, was man sieht, ist derselbe
 * Vorgang. Wer dafür schließen und woanders suchen muss, tut es nicht.
 *
 * **Escape, Klick daneben, Kreuz.** Drei Wege hinaus. Ein Vollbild, aus dem man nur mit einem
 * kleinen Kreuz in einer Ecke herauskommt, macht Leute nervös.
 */
import { useEffect } from 'react'

export type Legendenzeile = { was: string; wofuer: string }

export default function Lichtkasten({ url, alt, satz, legende, onSchliessen }: {
  /** Die Adresse des Bildes — eine Objekt-URL oder eine Daten-URL. */
  url: string | null
  alt: string
  satz?: string | null
  legende?: Legendenzeile[] | null
  onSchliessen: () => void
}) {
  useEffect(() => {
    if (!url) return
    const taste = (e: KeyboardEvent) => { if (e.key === 'Escape') onSchliessen() }
    document.addEventListener('keydown', taste)
    // Solange das Bild offen ist, scrollt die Seite darunter nicht mit: Sonst schiebt sich
    // beim Wischen auf dem Telefon die Galerie hinter dem Bild weg.
    const vorher = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', taste)
      document.body.style.overflow = vorher
    }
  }, [url, onSchliessen])

  if (!url) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={satz || alt}
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-4 bg-navy/90 px-4 py-6 backdrop-blur-sm sm:px-8"
      onClick={onSchliessen}
    >
      <button
        type="button"
        onClick={onSchliessen}
        aria-label="Schließen"
        className="absolute right-3 top-3 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
      >
        <svg
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
          strokeLinecap="round" className="h-5 w-5" aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <div
        className="flex max-h-full w-full max-w-[1100px] flex-col items-center gap-4 overflow-y-auto lg:flex-row lg:items-start lg:justify-center"
        onClick={e => e.stopPropagation()}
      >
        {/* `object-contain` und eine Höhengrenze: Ein quadratisches Bild soll auf einem
            breiten Bildschirm nicht über den unteren Rand hinauslaufen. */}
        <img
          src={url}
          alt={alt}
          className="max-h-[78vh] w-auto max-w-full shrink-0 rounded-brand-lg object-contain shadow-brand-lg"
        />

        {(satz || (legende?.length ?? 0) > 0) && (
          <div className="w-full max-w-[420px] shrink-0 rounded-brand-lg bg-white/95 p-4 lg:max-h-[78vh] lg:overflow-y-auto">
            {satz && (
              <p className="text-[0.9rem] font-semibold leading-snug text-navy">{satz}</p>
            )}
            {(legende?.length ?? 0) > 0 && (
              <dl className={`space-y-2.5 ${satz ? 'mt-3 border-t border-brand-border pt-3' : ''}`}>
                {legende!.map(z => (
                  <div key={z.was}>
                    <dt className="text-[0.78rem] font-semibold leading-snug text-navy">
                      {z.was}
                    </dt>
                    <dd className="mt-0.5 text-[0.76rem] leading-snug text-brand-muted">
                      {z.wofuer}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
