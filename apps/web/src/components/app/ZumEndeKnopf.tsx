/**
 * Der Rückweg ans Ende des Gesprächs.
 *
 * **Warum es ihn braucht.** Seit `lib/mitlaufen` das Fenster nicht mehr bedingungslos nach
 * unten zieht, kann man während einer langen Antwort in Ruhe nach oben lesen. Damit
 * entsteht aber eine neue Lücke: Echo schreibt weiter, und man bekommt es nicht mit. Der
 * Knopf schließt sie — er sagt, dass unten etwas passiert, und bringt einen mit einem
 * Klick zurück.
 *
 * **Eine Schwelle für beides.** Sichtbarkeit und Nachlaufen hängen an derselben Funktion
 * `istNahAmEnde`. Zwei getrennte Schwellen würden einen Bereich erzeugen, in dem weder
 * nachgelaufen wird noch der Knopf erscheint — genau der Zustand, den niemand versteht.
 *
 * **Warum hier ein `scroll`-Ereignis nötig ist, in `mitlaufen` aber nicht.** Das Nachlaufen
 * wird ohnehin bei jedem Takt aufgerufen und kann deshalb jedes Mal frisch nachsehen. Der
 * Knopf muss auch dann verschwinden, wenn gar nichts mehr geschrieben wird und jemand
 * einfach von Hand nach unten blättert. Dafür gibt es keinen anderen Anlass als das
 * Ereignis selbst.
 */
import { useEffect, useState, type RefObject } from 'react'
import { istNahAmEnde } from '@/lib/mitlaufen'

interface Props {
  /** Der blätternde Behälter des Verlaufs. */
  behaelter: RefObject<HTMLElement | null>
  /** Schreibt Echo gerade? Dann sagt der Knopf das auch. */
  imFluss: boolean
}

export default function ZumEndeKnopf({ behaelter, imFluss }: Props) {
  const [amEnde, setAmEnde] = useState(true)

  useEffect(() => {
    const el = behaelter.current
    if (!el) return
    const nachsehen = () => setAmEnde(istNahAmEnde(el))
    nachsehen()
    el.addEventListener('scroll', nachsehen, { passive: true })
    return () => el.removeEventListener('scroll', nachsehen)
  }, [behaelter])

  if (amEnde) return null

  return (
    // `h-0` sorgt dafür, dass der Knopf keinen Platz im Verlauf belegt; `sticky bottom-0`
    // hält ihn am unteren Rand des Behälters. Das `marginTop` hebt den Abstand auf, den ein
    // `space-y` der Elternliste sonst hinzufügen würde.
    <div
      className="sticky bottom-0 z-10 flex h-0 justify-center"
      style={{ marginTop: 0 }}
    >
      <button
        type="button"
        onClick={() => {
          const el = behaelter.current
          if (!el) return
          const start = el.scrollTop
          const ziel = el.scrollHeight
          el.scrollTo({ top: ziel, behavior: 'smooth' })
          // Sicherheitsnetz: Wo `smooth` nicht ausgeführt wird — bei reduzierter Bewegung
          // oder in Umgebungen ohne Bildlaufanimation — bliebe der Knopf sonst wirkungslos.
          // Nach 120 ms hat eine laufende Animation sich bewegt; hat sie das nicht, gab es
          // keine, und wir springen hart. Ein laufender Bildlauf wird so nicht abgeschnitten.
          window.setTimeout(() => {
            if (behaelter.current && behaelter.current.scrollTop === start) {
              behaelter.current.scrollTop = ziel
            }
          }, 120)
        }}
        className="-translate-y-3 rounded-full border border-brand-border bg-brand-card px-3 py-1.5 text-[0.72rem] text-brand-muted shadow-brand transition-colors hover:border-accent hover:text-accent"
      >
        {imFluss ? 'Echo schreibt weiter' : 'Zum Ende'}
        <span aria-hidden className="ml-1.5">↓</span>
      </button>
    </div>
  )
}
