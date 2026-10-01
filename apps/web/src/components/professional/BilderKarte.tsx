/**
 * Die freigegebenen Bilder — für die Fachperson, **dezent.**
 *
 * **Warum zugeklappt und mit eigenem Abruf.** Ein Bild drängt sich auf: Es steht in einer
 * Akte aus Text und zieht den Blick, bevor man gelesen hat. Die Person hat es für sich
 * gemacht; dass sie es herzeigt, heißt nicht, dass es den Fall anführen soll. Also eine Zeile,
 * ein Klick, und erst dann die Bilder.
 *
 * Der Abruf erst beim Aufklappen hat denselben Grund zweimal: Ein Megabyte je Bild soll keine
 * Akte langsam machen, die jemand nur aufschlägt, um eine Notiz zu lesen.
 *
 * **Die Bilder kommen NICHT aus dem Bündel**, sondern über einen eigenen Weg. Das ist die
 * Bedingung, unter der es diese Freigabe gibt: Was nicht im Bündel ist, kann nicht in das
 * Kontextband geraten, das daraus für das Gespräch mit Echo gebaut wird. Es gibt keinen Weg
 * dorthin, nicht nur keine Absicht.
 *
 * **Die Legende steht an jedem Bild.** Ein Bild ohne sie ist eine Projektionsfläche: Wer nicht
 * weiß, dass die Tür im Flur aus einer bestimmten Szene kommt, deutet sie — und deutet dann
 * unser Bild statt der Lage.
 */
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Fehlermeldung from '@/components/Fehlermeldung'
import Lichtkasten from '@/components/app/bild/Lichtkasten'
import { professionalBilderApi, type FreigegebenesBild } from '@/api/professionalBilder'

/** Ein freigegebenes Bild — geholt, wenn es sichtbar wird. */
function Bild({ caseId, bild, onGross }: {
  caseId: string
  bild: FreigegebenesBild
  onGross: (url: string) => void
}) {
  const [url, setUrl] = useState<string | null>(
    // Ein altes Datenbild liegt als SVG in der Antwort — es braucht keinen zweiten Abruf.
    bild.svg ? `data:image/svg+xml;utf8,${encodeURIComponent(bild.svg)}` : null,
  )
  const [fehler, setFehler] = useState(false)
  const rahmen = useRef<HTMLDivElement | null>(null)
  const geholt = useRef(false)

  useEffect(() => {
    const knoten = rahmen.current
    if (!knoten || bild.svg || !bild.hat_datei) return

    let eigene: string | null = null
    const holen = async () => {
      if (geholt.current) return
      geholt.current = true
      try {
        const blob = await professionalBilderApi.datei(caseId, bild.id)
        eigene = URL.createObjectURL(blob)
        setUrl(eigene)
      } catch {
        setFehler(true)
      }
    }

    if (typeof IntersectionObserver === 'undefined') {
      void holen()
      return () => { if (eigene) URL.revokeObjectURL(eigene) }
    }
    const beobachter = new IntersectionObserver(eintraege => {
      if (eintraege.some(e => e.isIntersecting)) {
        void holen()
        beobachter.disconnect()
      }
    }, { rootMargin: '200px' })
    beobachter.observe(knoten)
    return () => {
      beobachter.disconnect()
      if (eigene) URL.revokeObjectURL(eigene)
    }
  }, [caseId, bild.id, bild.svg, bild.hat_datei])

  const datum = new Date(bild.created_at).toLocaleDateString('de-DE')

  return (
    <figure className="m-0 overflow-hidden rounded-brand border border-brand-border bg-white">
      <div ref={rahmen} className="relative aspect-square w-full bg-brand-bg">
        {url ? (
          <button
            type="button"
            onClick={() => onGross(url)}
            aria-label="Bild groß ansehen"
            className="block h-full w-full cursor-zoom-in"
          >
            <img src={url} alt={bild.satz || `Bild vom ${datum}`}
              className="block h-full w-full object-contain" />
          </button>
        ) : (
          <p className="absolute inset-0 grid place-items-center px-3 text-center text-[0.72rem] text-brand-muted">
            {fehler ? 'Lässt sich gerade nicht laden.' : 'Wird geladen …'}
          </p>
        )}
      </div>
      <figcaption className="border-t border-brand-border p-2.5">
        {bild.satz && (
          <p className="text-[0.78rem] font-medium leading-snug text-navy">{bild.satz}</p>
        )}
        <p className="mt-0.5 text-[0.68rem] text-brand-muted">{datum}</p>
        {(bild.legende?.length ?? 0) > 0 && (
          <details className="mt-1.5">
            <summary className="cursor-pointer text-[0.7rem] text-accent">
              Was darauf wofür steht
            </summary>
            <dl className="mt-1 space-y-1">
              {bild.legende!.map(z => (
                <div key={z.was} className="text-[0.7rem] leading-snug">
                  <dt className="inline font-medium text-navy">{z.was}: </dt>
                  <dd className="inline text-brand-muted">{z.wofuer}</dd>
                </div>
              ))}
            </dl>
          </details>
        )}
      </figcaption>
    </figure>
  )
}

export default function BilderKarte({ caseId }: { caseId: string }) {
  const [offen, setOffen] = useState(false)
  const [gross, setGross] = useState<{ url: string; bild: FreigegebenesBild } | null>(null)

  const bilder = useQuery({
    queryKey: ['pro-bilder', caseId],
    queryFn: () => professionalBilderApi.liste(caseId),
    enabled: offen,
    staleTime: 60_000,
  })

  return (
    <section className="rounded-brand-lg border border-brand-border bg-white">
      <button
        type="button"
        onClick={() => setOffen(o => !o)}
        aria-expanded={offen}
        className="flex w-full items-start gap-3 p-5 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-[0.95rem] font-bold text-navy">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent/70" />
            Bilder
          </span>
          <span className="mt-1.5 block max-w-[68ch] text-[0.82rem] leading-relaxed text-brand-muted">
            Bilder, die die Person aus diesem Fall hat malen lassen — Orte und Gegenstände aus
            ihren eigenen Szenen. Sie gehen in <strong className="font-semibold">kein Gespräch
            mit Echo</strong> ein, auch nicht ihr Titel: Sie sind zum Ansehen da, nicht als
            Material.
          </span>
        </span>
        <svg
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" aria-hidden="true"
          className={`mt-1 h-4 w-4 shrink-0 text-brand-muted transition-transform ${
            offen ? 'rotate-180' : ''
          }`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {offen && (
        <div className="border-t border-brand-border p-5">
          <Fehlermeldung error={bilder.error} />
          {bilder.isLoading && (
            <p className="text-[0.8rem] text-brand-muted">Wird geladen …</p>
          )}
          {bilder.data?.length === 0 && (
            <p className="text-[0.8rem] text-brand-muted">
              Die Person hat die Bilder freigegeben, aber noch keines gemacht.
            </p>
          )}
          {(bilder.data?.length ?? 0) > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {bilder.data!.map(b => (
                <Bild key={b.id} caseId={caseId} bild={b}
                  onGross={url => setGross({ url, bild: b })} />
              ))}
            </div>
          )}
        </div>
      )}

      <Lichtkasten
        url={gross?.url ?? null}
        alt={gross?.bild.satz || 'Bild aus diesem Fall'}
        satz={gross?.bild.satz}
        legende={gross?.bild.legende}
        onSchliessen={() => setGross(null)}
      />
    </section>
  )
}
