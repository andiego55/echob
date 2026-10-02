/**
 * /app/cases/:caseId/bild — die Bildwerkstatt und die Galerie.
 *
 * Konzept: https://claude.ai/code/artifact/dc994cdb-d9d1-475d-a856-d93e0035d6e1
 *
 * **Hier gab es zwei Wege, und einer ist draußen.** Das „Datenbild" zeichnete die Zahlen des
 * Falls im Browser als SVG — exakt, abstrakt, kostenlos und sofort. Es half niemandem weiter:
 * Man sah, dass man viele Momente festgehalten hat, und sonst nichts. Bilder dieser Art, die
 * jemand aufgehoben hat, bleiben in seiner Galerie; entstehen soll nur nichts Neues davon.
 *
 * **Damit ist die Seite ein Werkzeug mit einem Knopf.** Das Menü steht in einem eigenen
 * Baustein (`BildMenue`) — die Seite hält den Zustand, löst das Malen aus und zeigt, was
 * dabei herauskommt.
 */
import { useCallback, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import Fehlermeldung from '@/components/Fehlermeldung'
import { PageSkeleton } from '@/components/Skeleton'
import { useBestaetigen } from '@/components/Bestaetigung'
import BildMenue from '@/components/app/bild/BildMenue'
import GemaltesBild from '@/components/app/bild/GemaltesBild'
import Lichtkasten from '@/components/app/bild/Lichtkasten'
import { profileApi } from '@/api/profile'
import {
  bilderApi,
  type Bildwahl,
  type GespeichertesBild,
  type LegendenZeile,
} from '@/api/bilder'

/**
 * Ein SVG als Bildadresse — **nur noch für alte Bilder aus dem Datenbild-Weg.**
 *
 * Sie kommen aus der Datenbank, und dort hat sie einmal der Browser hineingeschrieben. In
 * einem `<img>` führt ein Browser kein Skript aus, egal was in der Datei steht — damit ist die
 * Frage nicht mehr, ob unsere Verbotsliste beim Annehmen vollständig war.
 */
function alsBildAdresse(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const ANFANG: Bildwahl = {
  quelle: 'fall',
  bildwelt: 'landschaft',
  handschrift: 'aquarell',
  palette: 'kuehl',
  abstraktion: 'normal',
  gewichte: {},
  stimmungen: [],
  szenen: [],
  symbolik: 'zurueckhaltend',
  figur: 'keine',
  // Vorgabe „aus deinem Fall": Wer eine Gestalt will, muss nicht erst entscheiden, wie sie
  // dasteht — und wenn er es doch will, steht die Wahl daneben.
  haltung: 'fall',
  begleitung: 'keine',
  begleitung_text: '',
  wunsch: '',
}

export default function BildwerkstattPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const qc = useQueryClient()
  const bestaetigen = useBestaetigen()

  const [wahl, setWahl] = useState<Bildwahl>(ANFANG)
  const aendern = (teil: Partial<Bildwahl>) => setWahl(w => ({ ...w, ...teil }))

  const katalog = useQuery({
    queryKey: ['bild-katalog', caseId],
    queryFn: () => bilderApi.katalog(caseId!),
    enabled: !!caseId,
    staleTime: Infinity,
  })

  const szenen = useQuery({
    queryKey: ['bild-szenen', caseId],
    queryFn: () => bilderApi.szenen(caseId!),
    enabled: !!caseId,
    staleTime: 60_000,
  })

  const galerie = useQuery({
    queryKey: ['bilder', caseId],
    queryFn: () => bilderApi.galerie(caseId!),
    enabled: !!caseId,
  })

  /**
   * Der Sicherheitshinweis — **und er ist hier dringender als beim Podcast.**
   *
   * Eine Tonaufnahme muss man abspielen; ein Bild sieht man im Vorbeigehen. Es liegt nach
   * dem Herunterladen im Fotoalbum des Telefons, zwischen Urlaubsbildern, und wer das
   * Telefon in die Hand nimmt, scrollt daran vorbei.
   *
   * Dieselbe Bedingung wie dort: nur wenn im Profil ein Anhaltspunkt steht. Ein Hinweis, der
   * immer erscheint, wird nicht gelesen — und bei jemandem ohne Anhaltspunkt wäre er eine
   * Unterstellung.
   */
  const profil = useQuery({ queryKey: ['profile'], queryFn: () => profileApi.get() })
  const sicherheitshinweis =
    (profil.data?.safety_status ?? 'no_indication') !== 'no_indication' 

  const malen = useMutation({
    mutationFn: () => bilderApi.malen(caseId!, {
      ...wahl,
      // Was im Baukasten nichts tut, geht auch nicht hinaus.
      wunsch: wahl.quelle === 'fall' ? wahl.wunsch : '',
      szenen: wahl.quelle === 'fall' ? wahl.szenen : [],
    }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['bilder', caseId] }) },
  })

  const satzAendern = useMutation({
    mutationFn: ({ id, satz }: { id: string; satz: string }) =>
      bilderApi.satz(caseId!, id, satz),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['bilder', caseId] }) },
  })

  const loeschen = useMutation({
    mutationFn: (id: string) => bilderApi.loeschen(caseId!, id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['bilder', caseId] }) },
  })

  /**
   * Das aufgeschlagene Bild.
   *
   * In der Kachel ist ein Bild 260 Pixel breit — darin erkennt niemand ein Hauptmotiv, eine
   * Schwelle am Rand oder ein Tier in der Ferne. Die Adresse kommt von dem Baustein, der sie
   * schon geholt hat; hier wird nichts zweites geladen.
   */
  const [gross, setGross] = useState<{
    url: string
    alt: string
    satz?: string | null
    legende?: LegendenZeile[] | null
  } | null>(null)

  const laeuft = malen.isPending
  const bereit = useMemo(
    () => (katalog.data?.bildwelten?.length ?? 0) > 0,
    [katalog.data],
  )

  if (!caseId) return null

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6">
        <CaseNav caseId={caseId} />

        <header className="mt-6">
          <h1 className="page-title">Bildwerkstatt</h1>
          <p className="mt-2 max-w-[68ch] text-[0.92rem] leading-relaxed text-brand-muted">
            Ein Bild aus deinem Fall — nicht als Illustration, sondern als Ort, der deine Lage
            trägt. Du entscheidest, worin es spielt, wie konkret es wird und was darin schwer
            wiegt. Nichts Lesbares kommt darin vor, und höchstens ein Gesicht: deins, wenn du
            das willst.
          </p>
        </header>

        <Fehlermeldung error={katalog.error ?? galerie.error} className="mt-4" />

        {katalog.isLoading ? (
          <PageSkeleton />
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* ── Das Menü ──────────────────────────────────────────────── */}
            <div>
              <BildMenue
                wahl={wahl}
                aendern={aendern}
                katalog={katalog.data}
                szenen={szenen.data}
              />
            </div>

            {/* ── Malen lassen ──────────────────────────────────────────── */}
            <aside className="rounded-brand-lg border border-brand-border bg-white p-5 lg:sticky lg:top-6 lg:self-start">
              <h2 className="card-title-lg">Malen lassen</h2>
              <p className="mt-1.5 text-[0.8rem] leading-relaxed text-brand-muted">
                Das kostet von deinem Monatskontingent, und dasselbe Bild kommt nie zweimal
                heraus — auch nicht bei denselben Einstellungen.
              </p>

              <Fehlermeldung error={malen.error} className="mt-3" />

              {laeuft ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="mt-4 flex items-start gap-3 rounded-brand border border-accent/40 bg-accent/[0.06] px-4 py-3"
                >
                  <span aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
                  {/* **Zwei Schritte auf dem Weg „fall", und das steht dran.** Wer zwei
                      Minuten auf „wird gemalt" schaut, klickt noch einmal. */}
                  <span className="text-[0.82rem] leading-relaxed text-navy">
                    <strong className="font-semibold">
                      {wahl.quelle === 'fall'
                        ? 'Dein Fall wird gelesen, dann wird gemalt.'
                        : 'Wird gemalt.'}
                    </strong>{' '}
                    {wahl.quelle === 'fall'
                      ? 'Beides zusammen braucht ein bis zwei Minuten.'
                      : 'Das braucht eine halbe bis ganze Minute.'}{' '}
                    Lass die Seite offen — du musst nicht noch einmal klicken.
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => malen.mutate()}
                  disabled={!bereit}
                  className="btn-primary !py-2.5 !px-5 !text-sm mt-4 w-full disabled:opacity-40"
                >
                  {malen.error ? 'Noch einmal versuchen' : 'Malen lassen'}
                </button>
              )}

              <p className="mt-3 text-[0.74rem] leading-snug text-brand-muted">
                Das Bild landet direkt in deiner Galerie — es lässt sich nicht reproduzieren,
                also wird es gleich aufgehoben.
              </p>

              {sicherheitshinweis && (
                <p className="mt-3 rounded-brand border border-amber-300/60 bg-amber-50 px-4 py-3 text-[0.82rem] leading-relaxed text-amber-900">
                  Ein Bild sieht man im Vorbeigehen — anders als einen Text, den man öffnen
                  muss. Wenn du es herunterlädst, liegt es danach in der Galerie deines
                  Geräts, zwischen allen anderen Bildern. Überleg kurz, wer dieses Gerät in
                  die Hand nimmt.
                </p>
              )}

              {/* **Die Legende, direkt nach dem Bild.**
                  Eine Metapher, die niemand auflöst, bleibt Dekoration — daran ist der erste
                  Entwurf gescheitert. Sie sagt, was wofür steht, und deutet nichts. */}
              {malen.data?.legende?.length ? (
                <div className="mt-5 rounded-brand border border-accent/30 bg-accent/[0.04] p-4">
                  <p className="text-[0.82rem] font-semibold text-navy">
                    Was du im letzten Bild siehst
                  </p>
                  <dl className="mt-2 space-y-1.5">
                    {malen.data.legende.map(z => (
                      <div key={z.was} className="text-[0.76rem] leading-snug">
                        <dt className="inline font-medium text-navy">{z.was}: </dt>
                        <dd className="inline text-brand-muted">{z.wofuer}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-3 text-[0.7rem] text-brand-muted">
                    Es steht in deiner Galerie ganz oben.
                  </p>
                </div>
              ) : null}
            </aside>
          </div>
        )}

        {/* ── Die Galerie ───────────────────────────────────────────────── */}
        {(galerie.data?.length ?? 0) > 0 && (
          <section className="mt-12">
            <h2 className="card-title-lg">Deine Bilder</h2>
            {/* **Ein Satz zum Mitnehmen, ohne Ausrufezeichen.** Nicht als Warnung, sondern
                als Auskunft darüber, was man gerade tut — den eindringlichen Hinweis gibt es
                oben, und nur dann, wenn im Profil ein Anhaltspunkt steht. */}
            <p className="mt-1 max-w-[62ch] text-[0.82rem] leading-relaxed text-brand-muted">
              Leg das zweite neben das erste. Eine Veränderung, die man sieht, kann dir sonst
              niemand zeigen. Was du mitnimmst, liegt danach in der Galerie deines Geräts.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {galerie.data!.map(b => (
                <BildKarte
                  key={b.id}
                  bild={b}
                  onGross={url => setGross({
                    url,
                    alt: b.satz || 'Dein Bild',
                    satz: b.satz,
                    legende: b.legende,
                  })}
                  onSatz={s => satzAendern.mutate({ id: b.id, satz: s })}
                  onLoeschen={async () => {
                    if (await bestaetigen({
                      titel: 'Dieses Bild löschen?',
                      text: 'Es lässt sich nicht zurückholen — ein gemaltes Bild gibt es nur '
                        + 'einmal, auch dieselben Einstellungen ergeben ein anderes.',
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

      <Lichtkasten
        url={gross?.url ?? null}
        alt={gross?.alt ?? ''}
        satz={gross?.satz}
        legende={gross?.legende}
        onSchliessen={() => setGross(null)}
      />
    </AppShell>
  )
}

/** Ein Bild in der Galerie — mit seinem Satz, seinem Datum und zum Mitnehmen. */
function BildKarte({ bild, onSatz, onLoeschen, onGross }: {
  bild: GespeichertesBild
  onSatz: (s: string) => void
  onLoeschen: () => void
  onGross: (url: string) => void
}) {
  const [entwurf, setEntwurf] = useState<string | null>(null)

  /**
   * Die Adresse des angezeigten Bildes — **fuer das Mitnehmen.**
   *
   * Es gab dafuer nie einen Knopf: Die alten PNG- und SVG-Knoepfe galten dem gerechneten Weg
   * und sind mit ihm gegangen. Eine Galerie aus Bildern, die man nicht speichern, drucken
   * oder zeigen kann, ist ein Album hinter Glas — und ein Bild herzuzeigen ist genau das,
   * wofuer viele es machen.
   */
  const [adresse, setAdresse] = useState<string | null>(
    bild.art === 'gerechnet' && bild.svg ? alsBildAdresse(bild.svg) : null,
  )

  const mitnehmen = useCallback(() => {
    if (!adresse) return
    const name = (bild.satz || 'Bild').replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 60)
    const a = document.createElement('a')
    a.href = adresse
    // Das gemalte Bild ist ein PNG, das alte Datenbild ein SVG.
    a.download = `${name || 'Bild'}.${bild.art === 'gerechnet' ? 'svg' : 'png'}`
    a.click()
  }, [adresse, bild.satz, bild.art])

  return (
    <figure className="m-0 overflow-hidden rounded-brand-lg border border-brand-border bg-white">
      {/* Zwei Arten, zwei Wege zum Bild: Das gemalte muss als Datei geholt werden, das alte
          gerechnete liegt als SVG in der Antwort. */}
      {bild.art === 'gerechnet' && bild.svg && (
        <button
          type="button"
          onClick={() => onGross(alsBildAdresse(bild.svg!))}
          aria-label="Bild groß ansehen"
          className="block w-full cursor-zoom-in"
        >
          <img
            src={alsBildAdresse(bild.svg)}
            alt={bild.satz || `Datenbild vom ${new Date(bild.created_at)
              .toLocaleDateString('de-DE')}`}
            className="block w-full"
          />
        </button>
      )}
      {bild.art === 'erzeugt' && (
        <GemaltesBild caseId={bild.case_id} bildId={bild.id}
          alt={bild.satz || 'Gemaltes Bild'} onGross={onGross} onBereit={setAdresse} />
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
              aria-label="Dein Satz unter dem Bild"
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
          {bild.einstellungen.bildwelt && <span>{bild.einstellungen.bildwelt}</span>}
          {/* Erst da, wenn das Bild da ist — ein Knopf, der ins Leere lädt, ist schlimmer
              als keiner. */}
          {adresse && (
            <button type="button" onClick={mitnehmen}
              className="text-accent hover:underline">mitnehmen</button>
          )}
          <button type="button" onClick={onLoeschen}
            className="ml-auto hover:text-red-600">löschen</button>
        </div>
      </figcaption>
    </figure>
  )
}
