/**
 * Ein gemaltes Lagebild in der Galerie.
 *
 * **Warum das ein eigener Baustein ist.** Ein gerechnetes Bild liegt als SVG in der Antwort
 * und ist sofort da. Ein gemaltes ist ein Megabyte und kommt nicht mit der Galerie — zwanzig
 * davon in einer Antwort wären eine Ladezeit, die niemand versteht. Jedes holt sich also
 * selbst, wenn es gebraucht wird.
 *
 * **Und es geht durch den API-Client, nicht über eine Adresse.** Der Endpunkt verlangt eine
 * Anmeldung; ein `<img src>` kann sich nicht anmelden. Also holen, eine Objekt-URL machen,
 * anzeigen. Umständlicher als ein Link, und genau darum geht es: Ein Bild reist weiter als
 * Text, und wovon es keine öffentliche Adresse gibt, kann auch keine herumliegen.
 *
 * **Geholt wird erst, wenn es sichtbar wird.** Eine Galerie mit zwanzig gemalten Bildern
 * holte sonst beim Öffnen zwanzig Megabyte — auf einem Telefon im Zug ist das der Unterschied
 * zwischen einer Seite und einer Wartezeit.
 */
import { useEffect, useRef, useState } from 'react'
import { bilderApi } from '@/api/bilder'

export default function GemaltesBild({ caseId, bildId, alt }: {
  caseId: string
  bildId: string
  alt: string
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [fehler, setFehler] = useState(false)
  const rahmen = useRef<HTMLDivElement | null>(null)
  const geholt = useRef(false)

  useEffect(() => {
    const knoten = rahmen.current
    if (!knoten) return

    let eigeneUrl: string | null = null

    const holen = async () => {
      if (geholt.current) return
      geholt.current = true
      try {
        const blob = await bilderApi.datei(caseId, bildId)
        eigeneUrl = URL.createObjectURL(blob)
        setUrl(eigeneUrl)
      } catch {
        // Ein Bild, das sich nicht laden lässt, ist kein Absturz — aber die leere Stelle
        // braucht eine Erklärung, sonst hält man sie für einen Fehler der Galerie.
        setFehler(true)
      }
    }

    // `IntersectionObserver` gibt es in jedem Browser, den dieses Projekt bedient. Fehlt er
    // doch, wird sofort geholt: lieber eine Ladezeit als ein leeres Bild.
    if (typeof IntersectionObserver === 'undefined') {
      void holen()
      return () => { if (eigeneUrl) URL.revokeObjectURL(eigeneUrl) }
    }

    const beobachter = new IntersectionObserver(einträge => {
      if (einträge.some(e => e.isIntersecting)) {
        void holen()
        beobachter.disconnect()
      }
    }, { rootMargin: '200px' })
    beobachter.observe(knoten)

    return () => {
      beobachter.disconnect()
      if (eigeneUrl) URL.revokeObjectURL(eigeneUrl)
    }
  }, [caseId, bildId])

  return (
    <div ref={rahmen} className="relative aspect-square w-full bg-brand-bg">
      {url ? (
        <img src={url} alt={alt} className="block h-full w-full object-cover" />
      ) : (
        <p className="absolute inset-0 grid place-items-center px-4 text-center text-[0.74rem] text-brand-muted">
          {fehler ? 'Dieses Bild lässt sich gerade nicht laden.' : 'Wird geladen …'}
        </p>
      )}
    </div>
  )
}
