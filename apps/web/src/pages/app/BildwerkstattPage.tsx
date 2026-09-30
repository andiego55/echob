/**
 * /app/cases/:caseId/bild — die Bildwerkstatt und die Galerie.
 *
 * Konzept: https://claude.ai/code/artifact/dc994cdb-d9d1-475d-a856-d93e0035d6e1
 *
 * **Das Bild entsteht im Browser, bei jedem Zug an einem Regler neu.** Kein Erzeugen-Knopf,
 * kein Warten, kein Kontingent. Das ist der praktische Gewinn des gerechneten Wegs — und der
 * Grund, warum es sich wie ein Werkzeug anfühlt und nicht wie ein Automat.
 *
 * **Die Werte werden nachgeladen, nicht auf Vorrat geholt.** Eine abgewählte Schicht fragt der
 * Server nicht ab. Abgefragt wird die Vereinigung aller je eingeschalteten Schichten: Damit
 * kostet Abschalten keinen Abruf und Einschalten genau einen.
 */
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import Fehlermeldung from '@/components/Fehlermeldung'
import { PageSkeleton } from '@/components/Skeleton'
import { useBestaetigen } from '@/components/Bestaetigung'
import BildRegler from '@/components/app/bild/BildRegler'
import { bilderApi, type GespeichertesBild } from '@/api/bilder'
import {
  STANDARD_EINSTELLUNGEN, STANDARD_PALETTE, genugFuerEinBild, lagebild,
  type Anordnung, type Dichte, type Schicht,
} from '@/lib/lagebild'

/**
 * Ein SVG als Bildadresse.
 *
 * **Warum die Bilder über `<img>` gehen und nicht über `dangerouslySetInnerHTML`.**
 *
 * Das Bild in der Werkstatt kommt aus unserem eigenen Code — dort wäre eingebettetes SVG
 * harmlos. Die Bilder in der GALERIE kommen aus der Datenbank, und dort hat sie der Browser
 * hineingeschrieben. Der Server prüft beim Annehmen, dass kein `<script>`, `<foreignObject>`,
 * `<image>` oder `javascript:` darin steht — aber das ist eine Verbotsliste, und
 * Verbotslisten lecken.
 *
 * In einem `<img>` führt ein Browser kein Skript aus, egal was in der Datei steht. Damit ist
 * die Frage nicht mehr, ob unsere Liste vollständig ist. Beide Bilder gehen denselben Weg,
 * damit es keine zweite Stelle gibt, die man vergessen kann.
 *
 * Der Preis: Der `<title>` im SVG erreicht einen Screenreader nicht mehr — dafür steht ein
 * `alt` am Bild, und das ist ohnehin der Ort, an dem ein Screenreader es sucht.
 */
function alsBildAdresse(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export default function BildwerkstattPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const qc = useQueryClient()
  const bestaetigen = useBestaetigen()

  const [palette, setPalette] = useState(STANDARD_PALETTE)
  const [anordnung, setAnordnung] = useState<Anordnung>('zeit')
  const [dichte, setDichte] = useState<Dichte>('normal')
  const [schichten, setSchichten] = useState<Schicht[]>(STANDARD_EINSTELLUNGEN.schichten)
  const [satz, setSatz] = useState('')

  /**
   * Alle Schichten, die diese Sitzung schon einmal gesehen hat.
   *
   * Der Abruf hängt daran und nicht an `schichten`: Wer eine Schicht abschaltet und wieder
   * einschaltet, soll nicht zweimal warten — und wer sie abschaltet, gar nicht.
   */
  const [geladen, setGeladen] = useState<Schicht[]>(STANDARD_EINSTELLUNGEN.schichten)

  const werte = useQuery({
    queryKey: ['bild-werte', caseId, [...geladen].sort().join(',')],
    queryFn: () => bilderApi.werte(caseId!, geladen),
    enabled: !!caseId,
    staleTime: 60_000,
  })

  const galerie = useQuery({
    queryKey: ['bilder', caseId],
    queryFn: () => bilderApi.galerie(caseId!),
    enabled: !!caseId,
  })

  const aufheben = useMutation({
    mutationFn: () => bilderApi.aufheben(caseId!, {
      einstellungen: { palette, anordnung, dichte, schichten },
      svg: gerechnet!.svg,
      satz,
    }),
    onSuccess: () => {
      setSatz('')
      qc.invalidateQueries({ queryKey: ['bilder', caseId] })
    },
  })

  const satzAendern = useMutation({
    mutationFn: (p: { id: string; satz: string }) =>
      bilderApi.satz(caseId!, p.id, p.satz),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bilder', caseId] }),
  })

  const loeschen = useMutation({
    mutationFn: (id: string) => bilderApi.loeschen(caseId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bilder', caseId] }),
  })

  const umschalten = (s: Schicht) => {
    setSchichten(v => (v.includes(s) ? v.filter(x => x !== s) : [...v, s]))
    setGeladen(v => (v.includes(s) ? v : [...v, s]))
  }

  /**
   * Das Bild.
   *
   * `useMemo` über alles, was hineingeht: Bei jedem Tastendruck im Satzfeld neu zu rechnen
   * wäre Arbeit für nichts — und bei achtzig Marken merkt man sie.
   */
  const gerechnet = useMemo(() => {
    if (!werte.data) return null
    return lagebild(werte.data, { palette, anordnung, dichte, schichten })
  }, [werte.data, palette, anordnung, dichte, schichten])

  if (werte.isLoading) {
    return (
      <AppShell>
        <CaseNav caseId={caseId!} />
        <div className="mx-auto max-w-[1100px] px-6 py-8"><PageSkeleton /></div>
      </AppShell>
    )
  }

  const genug = werte.data ? genugFuerEinBild(werte.data) : false

  return (
    <AppShell>
      <CaseNav caseId={caseId!} />
      <div className="mx-auto max-w-[1100px] px-6 py-8">
        <h1 className="page-title">Bild</h1>
        <p className="mt-2 max-w-[62ch] text-[0.94rem] leading-relaxed text-brand-muted">
          Deine Lage als Form — nicht als Illustration. Kein Mensch, kein Raum, kein
          Gegenstand: nur wie viel, wann, wie dicht und was fehlt. Alles, was du hier siehst,
          ist aus deinen Angaben gerechnet.
        </p>

        <Fehlermeldung error={werte.error ?? galerie.error} className="mt-4" />

        {!genug ? (
          /* **Ein leerer Fall bekommt kein leeres Quadrat.** Eine Fläche ohne einen
             einzigen Moment sähe aus wie ein Fehler, und die Person würde denken, das
             Werkzeug sei kaputt, statt zu erfahren, dass ihm noch der Stoff fehlt. */
          <p className="mt-6 rounded-brand-lg border border-brand-border bg-white px-5 py-6 text-[0.9rem] leading-relaxed text-brand-muted">
            Für ein Bild fehlt noch der Stoff. Halt ein paar Szenen fest oder mach dein
            Gefühlsbild — danach gibt es hier etwas zu sehen. Mit zwei Momenten fängt es an.
          </p>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            {/* ── Das Bild ──────────────────────────────────────────────── */}
            <div>
              {gerechnet && (
                <img
                  src={alsBildAdresse(gerechnet.svg)}
                  alt={`Dein Lagebild: ${gerechnet.marken.length} festgehaltene Momente, `
                    + `Anordnung ${anordnung}`}
                  className="block w-full rounded-brand-lg border border-brand-border bg-white"
                />
              )}
              <p className="mt-2 text-[0.74rem] text-brand-muted">
                {gerechnet?.marken.length ?? 0} von {werte.data?.szenen.length ?? 0} Momenten
                {werte.data?.spanne ? ` · über ${Math.round(werte.data.spanne / 30)} Monate` : ''}
              </p>

              {/* ── Aufheben ───────────────────────────────────────────── */}
              <div className="mt-4 rounded-brand-lg border border-brand-border bg-white p-5">
                <label className="block">
                  <span className="label">Dein Satz darunter</span>
                  <p className="mb-2 mt-0.5 max-w-[62ch] text-[0.76rem] leading-relaxed text-brand-muted">
                    Ein Bild ohne Worte lädt zur Projektion ein: Wer es in einem halben Jahr
                    wiedersieht, liest hinein, was er gerade fühlt. Ein Satz von dir hält
                    fest, was du heute siehst.
                  </p>
                  <input
                    value={satz}
                    onChange={e => setSatz(e.target.value)}
                    maxLength={160}
                    placeholder="Zum Beispiel: Viel Enge, wenig Bewegung."
                    className="input-brand w-full"
                  />
                </label>
                <Fehlermeldung error={aufheben.error} className="mt-3" />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => aufheben.mutate()}
                    disabled={aufheben.isPending || !gerechnet}
                    className="btn-primary !py-2 !px-4 !text-sm disabled:opacity-50"
                  >
                    {aufheben.isPending ? 'Wird aufgehoben …' : 'Bild aufheben'}
                  </button>
                  <span className="text-[0.76rem] leading-snug text-brand-muted">
                    Kostet nichts. Du kannst so viele Bilder machen, wie du willst —
                    aufgehoben wird nur, was du aufhebst.
                  </span>
                </div>
              </div>
            </div>

            {/* ── Die Regler ────────────────────────────────────────────── */}
            <aside className="rounded-brand-lg border border-brand-border bg-white p-5 lg:sticky lg:top-6 lg:self-start">
              {werte.data && (
                <BildRegler
                  werte={werte.data}
                  palette={palette} anordnung={anordnung} dichte={dichte}
                  schichten={schichten}
                  setPalette={setPalette} setAnordnung={setAnordnung} setDichte={setDichte}
                  umschalten={umschalten}
                />
              )}
              {werte.isFetching && (
                <p className="mt-4 text-[0.72rem] text-brand-muted">Wird nachgeladen …</p>
              )}
            </aside>
          </div>
        )}

        {/* ── Die Galerie ───────────────────────────────────────────────── */}
        {(galerie.data?.length ?? 0) > 0 && (
          <section className="mt-12">
            <h2 className="card-title-lg">Deine Bilder</h2>
            <p className="mt-1 max-w-[62ch] text-[0.82rem] leading-relaxed text-brand-muted">
              Leg das zweite neben das erste. Eine Veränderung, die man sieht, kann dir
              sonst niemand zeigen.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {galerie.data!.map(b => (
                <BildKarte
                  key={b.id}
                  bild={b}
                  onSatz={s => satzAendern.mutate({ id: b.id, satz: s })}
                  onLoeschen={async () => {
                    if (await bestaetigen({
                      titel: 'Dieses Bild löschen?',
                      text: 'Es lässt sich nicht zurückholen. Dieselben Einstellungen '
                        + 'ergeben zwar wieder dasselbe Bild — aber der Satz darunter und '
                        + 'das Datum sind weg.',
                      knopf: 'Löschen',
                      gefahr: true,
                    })) loeschen.mutate(b.id)
                  }}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  )
}

/** Ein Bild in der Galerie — mit seinem Satz, seinem Datum und zum Mitnehmen. */
function BildKarte({ bild, onSatz, onLoeschen }: {
  bild: GespeichertesBild
  onSatz: (s: string) => void
  onLoeschen: () => void
}) {
  const [entwurf, setEntwurf] = useState<string | null>(null)

  /**
   * Herunterladen.
   *
   * **SVG direkt, PNG über eine Leinwand im Browser.** Ein SVG ist in jeder Größe scharf und
   * druckbar; ein PNG ist das, was jeder verschicken und ansehen kann. Beides entsteht hier,
   * ohne Server — das Bild liegt schon im Browser.
   */
  const laden = async (als: 'svg' | 'png') => {
    if (!bild.svg) return
    const name = (bild.satz || 'Lagebild').replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 60)
    if (als === 'svg') {
      const url = URL.createObjectURL(new Blob([bild.svg], { type: 'image/svg+xml' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `${name}.svg`
      a.click()
      URL.revokeObjectURL(url)
      return
    }
    // PNG: das SVG in ein Bild laden, auf eine Leinwand zeichnen, herausschreiben.
    const quelle = URL.createObjectURL(new Blob([bild.svg], { type: 'image/svg+xml' }))
    try {
      const img = new Image()
      await new Promise<void>((fertig, schief) => {
        img.onload = () => fertig()
        img.onerror = () => schief(new Error('laden'))
        img.src = quelle
      })
      const leinwand = document.createElement('canvas')
      // Doppelt so groß: Ein PNG in Bildschirmgröße sieht gedruckt oder auf einem
      // Telefon mit hoher Auflösung ausgefranst aus.
      leinwand.width = 2000
      leinwand.height = 2000
      const ctx = leinwand.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0, 2000, 2000)
      const a = document.createElement('a')
      a.href = leinwand.toDataURL('image/png')
      a.download = `${name}.png`
      a.click()
    } finally {
      URL.revokeObjectURL(quelle)
    }
  }

  return (
    <figure className="m-0 overflow-hidden rounded-brand-lg border border-brand-border bg-white">
      {bild.svg && (
        <img
          src={alsBildAdresse(bild.svg)}
          alt={bild.satz || `Lagebild vom ${new Date(bild.created_at)
            .toLocaleDateString('de-DE')}`}
          className="block w-full"
        />
      )}
      <figcaption className="border-t border-brand-border p-3">
        {entwurf === null ? (
          <button type="button" onClick={() => setEntwurf(bild.satz ?? '')}
            className="block w-full text-left text-[0.8rem] leading-snug text-navy">
            {bild.satz || (
              <span className="text-brand-muted">Satz dazuschreiben …</span>
            )}
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              value={entwurf}
              onChange={e => setEntwurf(e.target.value)}
              maxLength={160}
              autoFocus
              className="input-brand min-w-0 flex-1 !py-1 !text-[0.8rem]"
              onKeyDown={e => {
                if (e.key === 'Enter') { onSatz(entwurf); setEntwurf(null) }
                if (e.key === 'Escape') setEntwurf(null)
              }}
            />
            <button type="button" onClick={() => { onSatz(entwurf); setEntwurf(null) }}
              className="shrink-0 text-[0.72rem] font-medium text-accent">Speichern</button>
          </div>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] text-brand-muted">
          <time dateTime={bild.created_at}>
            {new Date(bild.created_at).toLocaleDateString('de-DE')}
          </time>
          <span>{bild.einstellungen.anordnung}</span>
          <button type="button" onClick={() => void laden('png')}
            className="text-accent hover:underline">PNG</button>
          <button type="button" onClick={() => void laden('svg')}
            className="text-accent hover:underline">SVG</button>
          <button type="button" onClick={onLoeschen}
            className="ml-auto hover:text-red-600">löschen</button>
        </div>
      </figcaption>
    </figure>
  )
}
