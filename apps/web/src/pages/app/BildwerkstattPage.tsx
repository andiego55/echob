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
import { bilderApi, type GespeichertesBild, type LegendenZeile } from '@/api/bilder'
import GemaltesBild from '@/components/app/bild/GemaltesBild'
import Lichtkasten from '@/components/app/bild/Lichtkasten'
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
   * Gemalt oder gerechnet.
   *
   * **Gemalt ist die Vorauswahl — nach dem ersten Blick auf die gerechneten Bilder.**
   * Sie waren korrekt und unlesbar: eine Wolke aus Formen, aus der niemand etwas ablesen
   * konnte. Ein Gleichnis, das man deuten kann, hilft mehr als eine Struktur, die stimmt.
   *
   * Das gerechnete Bild bleibt daneben stehen, weil es etwas kann, was das gemalte nie
   * kann: Es ist exakt, sofort da, kostet nichts, und jede Stelle darin hat eine Antwort
   * auf „warum sieht das so aus?".
   */
  const [weg, setWeg] = useState<'gerechnet' | 'gemalt'>('gemalt')
  const [bildwelt, setBildwelt] = useState('landschaft')
  const [handschrift, setHandschrift] = useState('aquarell')
  const [symbolik, setSymbolik] = useState('zurueckhaltend')
  /**
   * Ob die Person selbst vorkommt.
   *
   * **Vorauswahl „keine", und das ist eine Entscheidung.** Sich selbst in einem Bild über
   * die eigene Lage zu sehen, ist ein Schritt, den man gehen können soll — aber nicht einer,
   * den man ungefragt bekommt.
   */
  const [figur, setFigur] = useState('keine')
  /**
   * Woraus das Bild entsteht.
   *
   * Vorgabe „aus deinem Fall": Der Baukasten war der Grund, warum zwei ganz verschiedene
   * Fälle fast dasselbe Bild bekamen. Wer seine Texte nicht hinausgeben will, stellt um —
   * und das steht an der Wahl dran.
   */
  const [quelle, setQuelle] = useState('fall')
  const [wunsch, setWunsch] = useState('')
  const [haltung, setHaltung] = useState('stehend')
  const [begleitung, setBegleitung] = useState('keine')

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

  // Nur wenn der gemalte Weg gewaehlt ist: Ein Abruf auf Vorrat fuer eine Liste, die die
  // meisten nie sehen, ist Arbeit fuer nichts.
  const bildwelten = useQuery({
    queryKey: ['bild-welten', caseId],
    queryFn: () => bilderApi.bildwelten(caseId!),
    enabled: !!caseId && weg === 'gemalt',
    staleTime: Infinity,
  })

  const galerie = useQuery({
    queryKey: ['bilder', caseId],
    queryFn: () => bilderApi.galerie(caseId!),
    enabled: !!caseId,
  })

  /**
   * Das aufgeschlagene Bild.
   *
   * **In der Kachel ist ein Bild 260 Pixel breit** — darin erkennt niemand ein Hauptmotiv,
   * eine Schwelle am Rand oder ein Tier in der Ferne. Die Adresse kommt von dem Baustein,
   * der sie schon geholt hat; hier wird nichts zweites geladen.
   */
  const [gross, setGross] = useState<{
    url: string
    alt: string
    satz?: string | null
    legende?: LegendenZeile[] | null
  } | null>(null)

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

  const malen = useMutation({
    mutationFn: () => bilderApi.malen(caseId!, {
      bildwelt, handschrift, palette, schichten, symbolik, figur, haltung, begleitung,
      quelle, wunsch: quelle === 'fall' ? wunsch : '',
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bilder', caseId] })
      qc.invalidateQueries({ queryKey: ['usage-status'] })
    },
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
              {/* **Zwei Wege, und der gerechnete steht zuerst.**
                  Er kostet nichts, reagiert sofort, und jede Stelle im Bild hat eine
                  Antwort auf „warum sieht das so aus?". Der gemalte ist das Angebot
                  daneben — wer ihn waehlt, soll es gewollt haben. */}
              <div className="mb-3 flex flex-wrap gap-2" role="tablist">
                {([
                  ['gemalt', 'Gemalt', 'Ein Gleichnis, das du lesen kannst.'],
                  ['gerechnet', 'Datenbild', 'Exakt und abstrakt. Kostet nichts.'],
                ] as const).map(([k, label, hinweis]) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={weg === k}
                    onClick={() => setWeg(k)}
                    className={`rounded-brand border px-4 py-2 text-left transition-colors ${
                      weg === k ? 'border-accent bg-accent/[0.06]'
                        : 'border-brand-border bg-white hover:border-accent/50'
                    }`}
                  >
                    <span className={`block text-[0.86rem] font-semibold ${
                      weg === k ? 'text-accent' : 'text-navy'
                    }`}>{label}</span>
                    <span className="block text-[0.72rem] text-brand-muted">{hinweis}</span>
                  </button>
                ))}
              </div>
              {weg === 'gerechnet' && gerechnet && (
                <button
                  type="button"
                  onClick={() => setGross({
                    url: alsBildAdresse(gerechnet.svg),
                    alt: `Dein Lagebild: ${gerechnet.marken.length} festgehaltene Momente`,
                  })}
                  aria-label="Bild groß ansehen"
                  className="block w-full cursor-zoom-in"
                >
                  <img
                    src={alsBildAdresse(gerechnet.svg)}
                    alt={`Dein Lagebild: ${gerechnet.marken.length} festgehaltene Momente, `
                      + `Anordnung ${anordnung}`}
                    className="block w-full rounded-brand-lg border border-brand-border bg-white"
                  />
                </button>
              )}

              {weg === 'gemalt' && (
                <div className="rounded-brand-lg border border-brand-border bg-white p-5">
                  <h2 className="card-title-lg">Ein Bildmodell malen lassen</h2>
                  <p className="mt-1.5 max-w-[62ch] text-[0.86rem] leading-relaxed text-brand-muted">
                    Du wählst ein Gleichnis — eine Landschaft, ein Haus, Wasser — und
                    bestimmst, wie gemalt wird. Nichts Lesbares kommt darin vor, und
                    höchstens ein Gesicht: deins, wenn du das willst.
                  </p>
                  <p className="mt-2 max-w-[62ch] text-[0.8rem] leading-relaxed text-brand-muted">
                    Das kostet — anders als das Datenbild — von deinem Monatskontingent, und
                    dasselbe Bild kommt nie zweimal heraus.
                  </p>

                  {/* ── Woraus? ──────────────────────────────────────────────
                      **Die Wahl gehört der Person, weil es eine Wahl über ihre Texte ist.**

                      Vorher stand hier der Satz „Kein Satz aus deinen Szenen geht hinaus" als
                      Zusage. Auf dem Weg „Aus deinem Fall" stimmt er nicht mehr — also ist
                      er keine Zusage mehr, sondern eine Wahl mit zwei ehrlich benannten
                      Seiten. Eine Zusage, die nur manchmal gilt, ist schlimmer als keine. */}
                  <div className="mt-5">
                    <span className="label">Woraus?</span>
                    <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                      {([
                        ['fall', 'Aus deinem Fall',
                          'Ein Sprachmodell liest deinen Fall und entwirft das Bild: Ort, '
                          + 'Licht und Gegenstände kommen aus dem, was du erzählt hast. '
                          + 'Dafür gehen deine Texte hinaus — an denselben Anbieter, der '
                          + 'sie für Echo, deine Berichte und den Podcast schon bekommt.'],
                        ['baukasten', 'Aus dem Baukasten',
                          'Nur Zahlen gehen hinaus, die Bildsprache steht fest. Dafür sehen '
                          + 'die Bilder sich untereinander ähnlicher.'],
                      ] as const).map(([k, label, hinweis]) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setQuelle(k)}
                          aria-pressed={quelle === k}
                          className={`rounded-brand border p-3 text-left transition-colors ${
                            quelle === k ? 'border-accent bg-accent/[0.06]'
                              : 'border-brand-border bg-white hover:border-accent/50'
                          }`}
                        >
                          <span className={`block text-[0.84rem] font-semibold ${
                            quelle === k ? 'text-accent' : 'text-navy'
                          }`}>{label}</span>
                          <span className="mt-0.5 block text-[0.72rem] leading-snug text-brand-muted">
                            {hinweis}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* **Der einzige Freitext hier — und er geht nie an das Bildmodell.**
                        Die Regie liest ihn, hinaus geht der geprüfte Auftrag. Ohne diese
                        Zwischenstufe wäre „zeig, wie er weggeht" die Abbildung eines echten
                        Menschen; genau deshalb gab es dieses Feld vorher nicht. */}
                    {quelle === 'fall' && (
                      <label className="mt-3 block">
                        <span className="label">Wünschst du dir etwas für das Bild?</span>
                        <p className="mb-1.5 mt-0.5 max-w-[62ch] text-[0.74rem] leading-snug text-brand-muted">
                          Freiwillig. Eine Jahreszeit, ein Gegenstand, ein Licht — „bitte
                          etwas Helles am Rand" ändert mehr, als man denkt. Ein Mensch kann
                          nicht darin vorkommen, auch wenn du danach fragst.
                        </p>
                        <textarea
                          value={wunsch}
                          onChange={e => setWunsch(e.target.value)}
                          maxLength={400}
                          rows={2}
                          placeholder="z. B. Es soll Winter sein, und irgendwo eine offene Tür."
                          className="input-brand w-full resize-y !text-[0.84rem]"
                        />
                        <span className="mt-0.5 block text-right text-[0.68rem] text-brand-muted">
                          {wunsch.length}/400
                        </span>
                      </label>
                    )}
                  </div>

                  {/* **Die Bildwelt zuerst: Sie ist die Entscheidung, das Übrige ist
                      Ausführung.** Und sie gehört der Person — ein Modell, das sich das
                      Gleichnis selbst aussucht, würde deuten. */}
                  <div className="mt-5">
                    <span className="label">Worin?</span>
                    <p className="mb-2 mt-0.5 text-[0.74rem] leading-snug text-brand-muted">
                      Dieselben Zahlen, ein anderes Gleichnis — und du siehst etwas anderes.
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {(bildwelten.data?.bildwelten ?? []).map(b => (
                        <button
                          key={b.key}
                          type="button"
                          onClick={() => setBildwelt(b.key)}
                          aria-pressed={bildwelt === b.key}
                          className={`rounded-brand border px-3.5 py-2.5 text-left transition-colors ${
                            bildwelt === b.key
                              ? 'border-accent bg-accent/[0.06]'
                              : 'border-brand-border bg-white hover:border-accent/50'
                          }`}
                        >
                          <span className={`block text-[0.84rem] font-semibold ${
                            bildwelt === b.key ? 'text-accent' : 'text-navy'
                          }`}>{b.label}</span>
                          <span className="block text-[0.72rem] leading-snug text-brand-muted">
                            {b.hinweis}
                          </span>
                        </button>
                      ))}
                      {bildwelten.isLoading && (
                        <p className="text-sm text-brand-muted">Einen Moment …</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-5">
                    <span className="label">Sinnbilder</span>
                    <p className="mb-2 mt-0.5 text-[0.74rem] leading-snug text-brand-muted">
                      Eine Schwelle, ein Übergang, ein Tier am Rand — alte Bilder für innere
                      Lagen. Jedes hängt an etwas, das es in deinem Fall wirklich gibt.
                    </p>
                    <div className="grid grid-cols-3 gap-1">
                      {(bildwelten.data?.symbolik ?? []).map(st => (
                        <button
                          key={st.key}
                          type="button"
                          onClick={() => setSymbolik(st.key)}
                          aria-pressed={symbolik === st.key}
                          title={st.hinweis}
                          className={`rounded-brand-sm border px-2 py-1.5 text-[0.74rem] transition-colors ${
                            symbolik === st.key
                              ? 'border-accent bg-accent text-white'
                              : 'border-brand-border bg-white text-brand-muted hover:border-accent/50'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* **Drei Möglichkeiten, und genau EIN Gesicht.**
                      Das Gesicht gehört der Person selbst — und sein Aussehen ist frei
                      erfunden, weil die App kein Bild von ihr hat. Dass es erfunden ist,
                      steht an der Wahl und nicht im Kleingedruckten: Wer es nicht liest,
                      hält die Gestalt für ein Abbild.

                      Andere Menschen dürfen vorkommen, aber nur fern und undeutlich. Die
                      Person, um die es im Fall geht, nie nah und nie mit Gesicht. */}
                  <div className="mt-5">
                    <span className="label">Kommst du vor?</span>
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      {(bildwelten.data?.figur ?? []).map(f => (
                        <button
                          key={f.key}
                          type="button"
                          onClick={() => setFigur(f.key)}
                          aria-pressed={figur === f.key}
                          className={`rounded-brand border px-3.5 py-2.5 text-left transition-colors ${
                            figur === f.key
                              ? 'border-accent bg-accent/[0.06]'
                              : 'border-brand-border bg-white hover:border-accent/50'
                          }`}
                        >
                          <span className={`block text-[0.84rem] font-semibold ${
                            figur === f.key ? 'text-accent' : 'text-navy'
                          }`}>{f.label}</span>
                          <span className="block text-[0.72rem] leading-snug text-brand-muted">
                            {f.hinweis}
                          </span>
                        </button>
                      ))}
                    </div>
                    {figur !== 'keine' && (
                      <>
                        <div className="mt-3">
                          <span className="label">Was tust du?</span>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {(bildwelten.data?.haltungen ?? []).map(h => (
                              <button
                                key={h.key}
                                type="button"
                                onClick={() => setHaltung(h.key)}
                                aria-pressed={haltung === h.key}
                                title={h.hinweis}
                                className={`rounded-full border px-3 py-1.5 text-[0.76rem] transition-colors ${
                                  haltung === h.key
                                    ? 'border-accent bg-accent/[0.06] font-semibold text-accent'
                                    : 'border-brand-border bg-white text-brand-muted hover:border-accent/50'
                                }`}
                              >
                                {h.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* **Die Begleitung steht nur da, wenn sie für diesen Fall in Frage
                            kommt.** Der Server schickt die Liste leer, wenn die
                            Selbstauskunft keine Kinder nennt — oder wenn es im Fall UM ein
                            Kind geht: Dann wäre die Kindfigur die Person, um die es geht. */}
                        {(bildwelten.data?.begleitungen?.length ?? 0) > 0 && (
                          <div className="mt-3">
                            <span className="label">Ist jemand bei dir?</span>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {bildwelten.data!.begleitungen.map(b => (
                                <button
                                  key={b.key}
                                  type="button"
                                  onClick={() => setBegleitung(b.key)}
                                  aria-pressed={begleitung === b.key}
                                  title={b.hinweis}
                                  className={`rounded-full border px-3 py-1.5 text-[0.76rem] transition-colors ${
                                    begleitung === b.key
                                      ? 'border-accent bg-accent/[0.06] font-semibold text-accent'
                                      : 'border-brand-border bg-white text-brand-muted hover:border-accent/50'
                                  }`}
                                >
                                  {b.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {figur === 'ich_sichtbar' ? (
                          <p className="mt-3 rounded-brand border border-accent/30 bg-accent/[0.05] p-3 text-[0.74rem] leading-relaxed text-brand-text">
                            <strong className="font-semibold">Dein Aussehen wird frei
                            erfunden.</strong> Aus deiner Selbstauskunft kommen nur
                            Altersspanne und Geschlecht — Haare, Gesicht, Statur und Kleidung
                            denkt sich das Bildmodell aus. Die Gestalt ist also eine Figur
                            und kein Abbild von dir, und sie wird dir vermutlich nicht
                            ähneln.
                            <br />
                            <span className="mt-1.5 block text-brand-muted">
                              Die Person, um die es in diesem Fall geht, kommt nie mit
                              Gesicht und nie nah vor — höchstens fern, schemenhaft oder von
                              hinten. Andere Menschen dürfen auftauchen, aber genauso: fern
                              und undeutlich.
                            </span>
                          </p>
                        ) : (
                          <p className="mt-3 text-[0.72rem] leading-snug text-brand-muted">
                            Aus deiner Selbstauskunft kommen nur Altersspanne und Geschlecht —
                            mehr weiß sie über dein Aussehen nicht. Deine Gestalt ist von
                            hinten und ohne Gesicht. Die Person, um die es in diesem Fall
                            geht, kommt nie mit Gesicht und nie nah vor; andere Menschen
                            dürfen auftauchen, aber nur fern und undeutlich.
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <div className="mt-5">
                    <span className="label">Wie gemalt?</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(bildwelten.data?.handschriften ?? []).map(h => (
                        <button
                          key={h.key}
                          type="button"
                          onClick={() => setHandschrift(h.key)}
                          aria-pressed={handschrift === h.key}
                          title={h.hinweis}
                          className={`rounded-full border px-3.5 py-1.5 text-[0.78rem] transition-colors ${
                            handschrift === h.key
                              ? 'border-accent bg-accent/[0.06] font-semibold text-accent'
                              : 'border-brand-border bg-white text-brand-muted hover:border-accent/50'
                          }`}
                        >
                          {h.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Fehlermeldung error={malen.error} className="mt-4" />

                  {malen.isPending ? (
                    <div
                      role="status"
                      aria-live="polite"
                      className="mt-4 flex items-start gap-3 rounded-brand border border-accent/40 bg-accent/[0.06] px-5 py-4"
                    >
                      <span aria-hidden="true"
                        className="mt-0.5 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
                      {/* **Zwei Schritte auf dem Weg „fall", und das steht dran.** Wer
                          zwei Minuten auf „wird gemalt" schaut, klickt noch einmal. */}
                      <span className="text-[0.86rem] leading-relaxed text-navy">
                        <strong className="font-semibold">
                          {quelle === 'fall'
                            ? 'Dein Fall wird gelesen, dann wird gemalt.'
                            : 'Wird gemalt.'}
                        </strong>{' '}
                        {quelle === 'fall'
                          ? 'Beides zusammen braucht ein bis zwei Minuten.'
                          : 'Das braucht eine halbe bis ganze Minute.'}{' '}
                        Lass die Seite offen — du musst nicht noch einmal klicken.
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => malen.mutate()}
                      disabled={!bildwelten.data?.bildwelten?.length}
                      className="btn-primary !py-2.5 !px-5 !text-sm mt-4 disabled:opacity-40"
                    >
                      {malen.error ? 'Noch einmal versuchen' : 'Malen lassen'}
                    </button>
                  )}
                  <p className="mt-3 text-[0.76rem] leading-snug text-brand-muted">
                    Ein gemaltes Bild landet direkt in deiner Galerie — es lässt sich nicht
                    reproduzieren, also wird es gleich aufgehoben.
                  </p>

                  {/* **Die Legende, direkt nach dem Bild.**
                      Eine Metapher, die niemand auflöst, bleibt Dekoration — daran ist der
                      erste Entwurf gescheitert. Sie sagt, was wofür steht, und deutet
                      nichts: „die Lichter sind deine Erkenntnisse", nicht „du hast viel
                      verstanden". */}
                  {malen.data?.legende?.length ? (
                    <div className="mt-5 rounded-brand border border-accent/30 bg-accent/[0.04] p-4">
                      <p className="text-[0.82rem] font-semibold text-navy">
                        Was du im letzten Bild siehst
                      </p>
                      <dl className="mt-2 space-y-1.5">
                        {malen.data.legende.map(z => (
                          <div key={z.was} className="text-[0.78rem] leading-snug">
                            <dt className="inline font-medium text-navy">{z.was}: </dt>
                            <dd className="inline text-brand-muted">{z.wofuer}</dd>
                          </div>
                        ))}
                      </dl>
                      <p className="mt-3 text-[0.72rem] text-brand-muted">
                        Es steht in deiner Galerie ganz oben.
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
              {weg === 'gerechnet' && (
                <p className="mt-2 text-[0.74rem] text-brand-muted">
                  {gerechnet?.marken.length ?? 0} von {werte.data?.szenen.length ?? 0} Momenten
                  {werte.data?.spanne
                    ? ` · über ${Math.round(werte.data.spanne / 30)} Monate` : ''}
                </p>
              )}

              {/* ── Aufheben: nur beim gerechneten Weg. Ein gemaltes Bild wird sofort
                     aufgehoben, weil es sich nicht wiederholen laesst. ──────── */}
              {weg === 'gerechnet' && (
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
              )}
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
                  // Die Legende liegt beim Bild und wird nicht nachgerechnet — sie ist auch
                  // nach einem Neuladen da, und sie erklaert das Bild, das damals entstand.
                  onGross={url => setGross({
                    url,
                    alt: b.satz || 'Dein Lagebild',
                    satz: b.satz,
                    legende: b.legende,
                  })}
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
   * Herunterladen.
   *
   * **SVG direkt, PNG über eine Leinwand im Browser.** Ein SVG ist in jeder Größe scharf und
   * druckbar; ein PNG ist das, was jeder verschicken und ansehen kann. Beides entsteht hier,
   * ohne Server — das Bild liegt schon im Browser.
   */
  const laden = async (als: 'svg' | 'png') => {
    if (!bild.svg) return  // gemalte Bilder werden ueber ihren eigenen Knopf geladen
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
      {/* Zwei Arten, zwei Wege zum Bild: Das gerechnete liegt als SVG in der Antwort, das
          gemalte muss als Datei geholt werden. */}
      {bild.art === 'gerechnet' && bild.svg && (
        <button
          type="button"
          onClick={() => onGross(alsBildAdresse(bild.svg!))}
          aria-label="Bild groß ansehen"
          className="block w-full cursor-zoom-in"
        >
          <img
            src={alsBildAdresse(bild.svg)}
            alt={bild.satz || `Lagebild vom ${new Date(bild.created_at)
              .toLocaleDateString('de-DE')}`}
            className="block w-full"
          />
        </button>
      )}
      {bild.art === 'erzeugt' && (
        <GemaltesBild caseId={bild.case_id} bildId={bild.id}
          alt={bild.satz || 'Gemaltes Lagebild'} onGross={onGross} />
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
