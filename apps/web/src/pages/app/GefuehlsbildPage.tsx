/**
 * /app/cases/:caseId/gefuehlsbild — wie es dir in dieser Beziehung gerade geht.
 *
 * **Das Problem.** Wer belastet ist, kann oft nicht sagen, wie es ihm geht. Nicht aus
 * Unwilligkeit — die Worte sind nicht da, oder das einzige, das kommt, ist „schlecht". Jedes
 * Textfeld, das nach Gefühlen fragt, läuft bei genau diesen Menschen leer, und das sind die,
 * um die es geht.
 *
 * **Drei Zugänge, weil das nicht eine Ursache hat.** Szenen (du brauchst keine Worte),
 * das Feld (zwei Achsen zum Ziehen), die Wörter (du hast ein grobes und suchst das genaue).
 * Keiner ist Pflicht, jeder allein genügt. Wer nur drei Wörter antippt, hat ein gültiges
 * Gefühlsbild.
 *
 * **Warum die Schritte nicht erzwungen sind.** Ein Assistent, der einen durch vier Seiten
 * führt, verlangt Ausdauer von jemandem, der gerade keine hat. Die Schritte stehen
 * nebeneinander und sind einzeln anspringbar; „Weiter" ist ein Angebot, kein Tor.
 *
 * **Echos Text ist ein Vorschlag, kein Befund.** Er erscheint in einem Feld, das man
 * überschreiben kann, und erst „Bestätigen" macht ihn zur Aussage. Danach steht er — denn
 * ein Verlauf, in dem man das Alte nachbessern kann, ist keiner.
 */
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import Fehlermeldung from '@/components/Fehlermeldung'
import GefuehlsFeld from '@/components/app/GefuehlsFeld'
import { ListSkeleton } from '@/components/Skeleton'
import { CONTENT_MANIFEST } from '@/content/manifest.generated'
import {
  gefuehlsbildApi,
  type GbAchse,
  type GbWortFamilie,
  type Gefuehlsbild,
} from '@/api/gefuehlsbild'

const SZENEN = CONTENT_MANIFEST.filter(m => m.type === 'scene')

type Schritt = 'szenen' | 'feld' | 'woerter' | 'eigenes' | 'text'

const SCHRITTE: { key: Schritt; label: string; frage: string }[] = [
  { key: 'szenen', label: 'Szenen', frage: 'Was fühlt sich an wie du gerade?' },
  { key: 'feld', label: 'Das Feld', frage: 'Wo bist du gerade?' },
  { key: 'woerter', label: 'Wörter', frage: 'Wenn du es benennen müsstest?' },
  { key: 'eigenes', label: 'In eigenen Worten', frage: 'Willst du selbst etwas schreiben?' },
  { key: 'text', label: 'Dein Gefühlsbild', frage: 'Was daraus geworden ist' },
]

/** Eine stabile, aber je Sitzung andere Reihenfolge — sonst sieht jeder dieselben zuerst. */
function gemischt<T>(liste: T[]): T[] {
  const kopie = [...liste]
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[kopie[i], kopie[j]] = [kopie[j], kopie[i]]
  }
  return kopie
}

// ── Schritt 1: Szenen ───────────────────────────────────────────────────────
function SzenenStapel({ gewaehlt, max, onWahl }: {
  gewaehlt: string[]
  max: number
  onWahl: (slugs: string[]) => void
}) {
  const [stapel] = useState(() => gemischt(SZENEN))
  const [oben, setOben] = useState(0)
  const karte = stapel[oben % stapel.length]
  const voll = gewaehlt.length >= max

  return (
    <div>
      <p className="max-w-[60ch] text-[0.92rem] leading-relaxed text-brand-muted">
        Erfundene Geschichten. Es geht nicht darum, ob dir so etwas passiert ist — sondern ob
        sich die Stimmung darin anfühlt wie du gerade. Du brauchst kein einziges Wort dafür.
      </p>

      {gewaehlt.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {gewaehlt.map(slug => {
            const s = SZENEN.find(x => x.slug === slug)
            return (
              <button
                key={slug}
                type="button"
                onClick={() => onWahl(gewaehlt.filter(g => g !== slug))}
                className="group rounded-full border border-accent/40 bg-accent/[0.07] px-3.5 py-1.5 text-[0.82rem] text-navy hover:border-accent"
              >
                {s?.title ?? slug}
                <span className="ml-2 text-brand-muted group-hover:text-accent">×</span>
              </button>
            )
          })}
        </div>
      )}

      {voll ? (
        <p className="mt-5 rounded-brand bg-navy/[0.03] px-5 py-4 text-[0.88rem] text-brand-muted">
          {max} Szenen sind genug — mehr verwischt eher, als es schärft. Nimm eine heraus,
          wenn du tauschen willst.
        </p>
      ) : karte && (
        <article className="mt-5 rounded-brand-lg border border-brand-border bg-white px-6 py-6">
          {karte.perspective && (
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-accent">
              {karte.perspective}
            </p>
          )}
          <h3 className="mt-1.5 text-[1.2rem] font-bold leading-snug text-navy">
            {karte.title}
          </h3>
          {karte.pull_quote && (
            <p className="mt-3 font-serif text-[1.05rem] italic leading-[1.6] text-brand-text">
              „{karte.pull_quote}“
            </p>
          )}
          <p className="mt-3 text-[0.88rem] leading-relaxed text-brand-muted">
            {karte.description}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <button
              type="button"
              onClick={() => {
                onWahl([...gewaehlt, karte.slug])
                setOben(o => o + 1)
              }}
              className="btn-primary !px-6 !py-2.5 !text-[0.88rem]"
            >
              Fühlt sich an wie ich
            </button>
            <button
              type="button"
              onClick={() => setOben(o => o + 1)}
              className="text-[0.88rem] font-medium text-brand-muted hover:text-navy hover:underline"
            >
              Nächste →
            </button>
            <Link
              to={`/szenen/${karte.slug}`}
              target="_blank"
              className="text-[0.84rem] text-brand-muted hover:text-navy hover:underline"
            >
              Ganz lesen
            </Link>
          </div>
        </article>
      )}
    </div>
  )
}

// ── Schritt 3: Wörter ───────────────────────────────────────────────────────
function Wortfeld({ familien, gewaehlt, max, onWahl }: {
  familien: GbWortFamilie[]
  gewaehlt: string[]
  max: number
  onWahl: (worte: string[]) => void
}) {
  const [offen, setOffen] = useState<string | null>(null)

  function umschalten(key: string) {
    if (gewaehlt.includes(key)) return onWahl(gewaehlt.filter(g => g !== key))
    if (gewaehlt.length >= max) return
    onWahl([...gewaehlt, key])
  }

  return (
    <div>
      <p className="max-w-[60ch] text-[0.92rem] leading-relaxed text-brand-muted">
        Tipp erst das grobe Wort an — dann kommen die genaueren. Widersprüche darfst du
        stehen lassen: „erleichtert" und „schuldig" zugleich ist keine Unstimmigkeit,
        sondern oft der Kern.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {familien.map(f => {
          const auf = offen === f.key
          const darin = f.worte.filter(w => gewaehlt.includes(w.key)).length
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setOffen(auf ? null : f.key)}
              aria-expanded={auf}
              className={[
                'rounded-full border px-4 py-2 text-[0.9rem] font-medium transition-all',
                auf
                  ? 'border-navy bg-navy text-white'
                  : darin > 0
                    ? 'border-accent/50 bg-accent/[0.08] text-navy'
                    : 'border-brand-border bg-white text-brand-text hover:border-accent/50',
              ].join(' ')}
            >
              {f.label}
              {darin > 0 && <span className="ml-1.5 text-accent">·{darin}</span>}
            </button>
          )
        })}
      </div>

      {/* Das Auffaechern: Wer „Erschoepft" antippt, bekommt ausgelaugt, stumpf, kraftlos.
          Genau die Bewegung vom groben zum genauen Wort, um die es hier geht. */}
      {offen && (
        <div className="mt-4 rounded-brand border border-brand-border bg-brand-bg p-5">
          <p className="text-[0.8rem] text-brand-muted">
            Was davon trifft es genauer?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {familien.find(f => f.key === offen)!.worte.map(w => {
              const an = gewaehlt.includes(w.key)
              const gesperrt = !an && gewaehlt.length >= max
              return (
                <button
                  key={w.key}
                  type="button"
                  onClick={() => umschalten(w.key)}
                  disabled={gesperrt}
                  aria-pressed={an}
                  className={[
                    'rounded-brand border px-3.5 py-2 text-[0.9rem] transition-all',
                    an
                      ? 'border-accent bg-accent text-white'
                      : 'border-brand-border bg-white text-brand-text hover:border-accent/60 disabled:opacity-40 disabled:hover:border-brand-border',
                  ].join(' ')}
                >
                  {w.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {gewaehlt.length > 0 && (
        <p className="mt-4 text-[0.86rem] text-brand-muted">
          Gewählt: <span className="text-navy">{gewaehlt.length}</span> von {max}
        </p>
      )}
    </div>
  )
}

// ── Regler ──────────────────────────────────────────────────────────────────
function Regler({ achse, wert, onChange }: {
  achse: GbAchse; wert: number | undefined; onChange: (n: number) => void
}) {
  return (
    <div>
      <label htmlFor={`r-${achse.key}`} className="text-[0.9rem] font-medium text-navy">
        {achse.label}
      </label>
      <input
        id={`r-${achse.key}`}
        type="range"
        min={0}
        max={100}
        step={5}
        value={wert ?? 50}
        onChange={e => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-accent"
      />
      <div className="flex justify-between text-[0.76rem] text-brand-muted">
        <span>{achse.links}</span>
        <span>{achse.rechts}</span>
      </div>
      {wert === undefined && (
        <p className="mt-1 text-[0.76rem] text-brand-muted/70">Noch nicht gesetzt.</p>
      )}
    </div>
  )
}

// ── Ein vergangenes Bild ────────────────────────────────────────────────────
function VerlaufsKarte({ bild }: { bild: Gefuehlsbild }) {
  const [auf, setAuf] = useState(false)
  const datum = bild.bestaetigt_at
    ? new Date(bild.bestaetigt_at).toLocaleDateString('de-DE', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : ''
  return (
    <li className="rounded-brand border border-brand-border bg-white p-5">
      <button
        type="button"
        onClick={() => setAuf(a => !a)}
        className="flex w-full items-baseline justify-between gap-4 text-left"
      >
        <span>
          <span className="block text-[0.9rem] font-semibold text-navy">{datum}</span>
          {bild.ecke && (
            <span className="mt-0.5 block text-[0.8rem] text-brand-muted">{bild.ecke}</span>
          )}
        </span>
        <span className="shrink-0 text-[0.8rem] text-accent">{auf ? 'Zu' : 'Lesen'}</span>
      </button>

      {bild.woerter_labels.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {bild.woerter_labels.map(w => (
            <span key={w.key} className="rounded-full bg-accent/[0.08] px-2.5 py-0.5 text-[0.72rem] text-navy">
              {w.label}
            </span>
          ))}
        </div>
      )}

      {auf && bild.bericht && (
        <p className="mt-3 whitespace-pre-wrap border-t border-brand-border pt-3 text-[0.9rem] leading-relaxed text-brand-text">
          {bild.bericht}
        </p>
      )}
    </li>
  )
}

// ── Die Seite ───────────────────────────────────────────────────────────────
export default function GefuehlsbildPage() {
  const { caseId = '' } = useParams<{ caseId: string }>()
  const qc = useQueryClient()
  const [schritt, setSchritt] = useState<Schritt>('szenen')
  const [eigenes, setEigenes] = useState<string | null>(null)
  const [text, setText] = useState<string | null>(null)
  const [echoHinweis, setEchoHinweis] = useState<string | null>(null)
  const [bestaetigt, setBestaetigt] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['gefuehlsbild', caseId],
    queryFn: () => gefuehlsbildApi.stand(caseId),
    enabled: !!caseId,
  })

  const entwurf = data?.entwurf
  const melden = (e: unknown) => {
    const d = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
    setFehler(d ?? 'Das hat gerade nicht geklappt.')
  }
  const frisch = () => qc.invalidateQueries({ queryKey: ['gefuehlsbild', caseId] })

  const sichern = useMutation({
    mutationFn: (teil: Parameters<typeof gefuehlsbildApi.sichern>[1]) =>
      gefuehlsbildApi.sichern(caseId, teil),
    onSuccess: () => { frisch(); setFehler(null) },
    onError: melden,
  })
  const schreiben = useMutation({
    mutationFn: () => gefuehlsbildApi.schreiben(caseId),
    onSuccess: (v) => {
      setText(v.bericht)
      setEchoHinweis(v.hinweis)
      setFehler(null)
      if (v.bericht) sichern.mutate({ bericht: v.bericht })
    },
    onError: melden,
  })
  const bestaetigen = useMutation({
    mutationFn: () => gefuehlsbildApi.bestaetigen(caseId),
    onSuccess: () => {
      setBestaetigt(true)
      setText(null)
      setEigenes(null)
      setSchritt('szenen')
      frisch()
    },
    onError: melden,
  })

  const feld = entwurf?.feld ?? {}
  const textWert = text ?? entwurf?.bericht ?? ''
  const eigenesWert = eigenes ?? entwurf?.eigenes ?? ''
  const etwasDa = !!(entwurf && (
    entwurf.szenen.length || entwurf.woerter.length
    || Object.keys(entwurf.feld).length || (entwurf.eigenes ?? '').trim()
  ))

  const aktuell = useMemo(
    () => SCHRITTE.find(s => s.key === schritt)!,
    [schritt],
  )

  return (
    <AppShell>
      <CaseNav caseId={caseId} />

      <div className="mx-auto max-w-[820px] px-6 py-8">
        <h1 className="page-title">Gefühlsbild</h1>
        <p className="mt-1 max-w-[64ch] text-sm leading-relaxed text-brand-muted">
          Wie es dir in dieser Beziehung gerade geht — ohne dass du es aufschreiben musst.
          Drei Wege dorthin, keiner davon Pflicht. Am Ende schreibt Echo daraus einen Text,
          den du änderst, bis er stimmt.
        </p>

        {isLoading && <ListSkeleton rows={3} label="Wird geladen" />}
        {error && <Fehlermeldung error={error} />}

        {bestaetigt && (
          <p className="mt-5 rounded-brand bg-green-50 px-5 py-4 text-[0.9rem] leading-relaxed text-green-900">
            Bestätigt. Dein Gefühlsbild steht jetzt im Verlauf, Echo bezieht sich in
            Gesprächen darauf, und du kannst es unter{' '}
            <Link to={`/app/cases/${caseId}/share`} className="font-semibold underline">
              Freigaben
            </Link>{' '}
            für deine Fachperson sichtbar machen.
          </p>
        )}

        {data && entwurf && (
          <>
            {/* ── Die Schritte ──────────────────────────────────────────── */}
            <nav className="mt-7 flex flex-wrap gap-1.5" aria-label="Schritte">
              {SCHRITTE.map((s, i) => {
                const an = s.key === schritt
                const gefuellt =
                  (s.key === 'szenen' && entwurf.szenen.length > 0)
                  || (s.key === 'feld' && Object.keys(entwurf.feld).length > 0)
                  || (s.key === 'woerter' && entwurf.woerter.length > 0)
                  || (s.key === 'eigenes' && !!(entwurf.eigenes ?? '').trim())
                  || (s.key === 'text' && !!(entwurf.bericht ?? '').trim())
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSchritt(s.key)}
                    aria-current={an ? 'step' : undefined}
                    className={[
                      'rounded-brand border px-3.5 py-2 text-[0.84rem] font-medium transition-all',
                      an
                        ? 'border-accent bg-accent text-white'
                        : gefuellt
                          ? 'border-accent/40 bg-accent/[0.06] text-navy'
                          : 'border-brand-border bg-white text-brand-muted hover:border-accent/50',
                    ].join(' ')}
                  >
                    <span className="mr-1.5 opacity-60">{i + 1}</span>{s.label}
                  </button>
                )
              })}
            </nav>

            <section className="mt-5 rounded-brand-lg border border-brand-border bg-white p-6">
              <h2 className="text-[1.2rem] font-bold leading-snug text-navy">
                {aktuell.frage}
              </h2>

              <div className="mt-4">
                {schritt === 'szenen' && (
                  <SzenenStapel
                    gewaehlt={entwurf.szenen}
                    max={data.max_szenen}
                    onWahl={szenen => sichern.mutate({ szenen })}
                  />
                )}

                {schritt === 'feld' && (
                  <div className="space-y-7">
                    <GefuehlsFeld
                      valenz={feld.valenz}
                      aktivierung={feld.aktivierung}
                      ecke={entwurf.ecke}
                      achsen={data.achsen}
                      onChange={(valenz, aktivierung) =>
                        sichern.mutate({ feld: { ...feld, valenz, aktivierung } })}
                    />
                    <div className="space-y-6 border-t border-brand-border pt-6">
                      <p className="text-[0.86rem] leading-relaxed text-brand-muted">
                        Zwei Dinge, die sich aus dem Feld nicht ablesen lassen — man kann
                        ruhig und zugleich sehr fern sein.
                      </p>
                      {data.regler.map(r => (
                        <Regler
                          key={r.key}
                          achse={r}
                          wert={feld[r.key]}
                          onChange={n => sichern.mutate({ feld: { ...feld, [r.key]: n } })}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {schritt === 'woerter' && (
                  <Wortfeld
                    familien={data.wortfeld}
                    gewaehlt={entwurf.woerter}
                    max={data.max_worte}
                    onWahl={woerter => sichern.mutate({ woerter })}
                  />
                )}

                {schritt === 'eigenes' && (
                  <div>
                    <p className="max-w-[60ch] text-[0.92rem] leading-relaxed text-brand-muted">
                      Freiwillig — und wenn du hier etwas schreibst, wiegt es schwerer als
                      alles andere. Auch ein halber Satz genügt.
                    </p>
                    <textarea
                      value={eigenesWert}
                      onChange={e => setEigenes(e.target.value)}
                      onBlur={() => {
                        if (eigenes !== null && eigenes !== (entwurf.eigenes ?? '')) {
                          sichern.mutate({ eigenes })
                        }
                      }}
                      rows={6}
                      maxLength={2000}
                      placeholder="Was ich niemandem sage, ist …"
                      className="mt-4 w-full rounded-brand border border-brand-border px-3.5 py-2.5 text-[0.94rem] leading-relaxed placeholder:text-brand-muted/60 focus:border-accent focus:outline-none"
                    />
                  </div>
                )}

                {schritt === 'text' && (
                  <div>
                    {!etwasDa ? (
                      <p className="text-[0.92rem] leading-relaxed text-brand-muted">
                        Dafür ist noch nichts da. Geh einen der drei Schritte davor — einer
                        genügt.
                      </p>
                    ) : (
                      <>
                        <p className="max-w-[60ch] text-[0.92rem] leading-relaxed text-brand-muted">
                          Echo ordnet, was du angegeben hast, und schreibt es in der Ich-Form
                          auf. Es fügt nichts hinzu. Was nicht stimmt, schreibst du um — der
                          Text gehört dir erst, wenn du ihn bestätigst.
                        </p>

                        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                          <button
                            type="button"
                            onClick={() => schreiben.mutate()}
                            disabled={schreiben.isPending}
                            className="rounded-brand border border-brand-border px-5 py-2 text-[0.88rem] font-medium text-navy hover:border-accent/50 disabled:opacity-50"
                          >
                            {schreiben.isPending
                              ? 'Echo schreibt …'
                              : textWert ? 'Neu schreiben lassen' : 'Echo schreiben lassen'}
                          </button>
                          <span className="text-[0.8rem] text-brand-muted">
                            oder schreib den Text gleich selbst
                          </span>
                        </div>

                        {echoHinweis && (
                          <p className="mt-3 rounded-brand bg-navy/[0.03] px-4 py-3 text-[0.86rem] leading-relaxed text-brand-muted">
                            {echoHinweis}
                          </p>
                        )}

                        <textarea
                          value={textWert}
                          onChange={e => setText(e.target.value)}
                          onBlur={() => {
                            if (text !== null && text !== (entwurf.bericht ?? '')) {
                              sichern.mutate({ bericht: text })
                            }
                          }}
                          rows={9}
                          maxLength={4000}
                          placeholder="Hier steht gleich dein Gefühlsbild — oder du fängst selbst an."
                          className="mt-4 w-full rounded-brand border border-brand-border px-3.5 py-3 text-[0.96rem] leading-[1.7] placeholder:text-brand-muted/60 focus:border-accent focus:outline-none"
                        />

                        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-brand-border pt-4">
                          <button
                            type="button"
                            onClick={async () => {
                              if (text !== null) await sichern.mutateAsync({ bericht: text })
                              bestaetigen.mutate()
                            }}
                            disabled={!textWert.trim() || bestaetigen.isPending}
                            className="btn-primary !px-6 !py-2.5 !text-[0.88rem] disabled:opacity-40"
                          >
                            {bestaetigen.isPending ? 'Wird bestätigt …' : 'Das stimmt so'}
                          </button>
                          <span className="text-[0.8rem] leading-snug text-brand-muted">
                            Danach steht es — und lässt sich nicht mehr ändern.
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {fehler && <p className="mt-4 text-[0.88rem] text-red-600">{fehler}</p>}

              {schritt !== 'text' && (
                <div className="mt-6 flex items-center justify-between border-t border-brand-border pt-5">
                  <span className="text-[0.8rem] text-brand-muted">
                    {sichern.isPending ? 'Wird gesichert …' : 'Alles freiwillig.'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const i = SCHRITTE.findIndex(s => s.key === schritt)
                      setSchritt(SCHRITTE[Math.min(i + 1, SCHRITTE.length - 1)].key)
                    }}
                    className="text-[0.88rem] font-semibold text-accent hover:underline"
                  >
                    Weiter →
                  </button>
                </div>
              )}
            </section>

            {/* ── Der Verlauf ───────────────────────────────────────────── */}
            {data.verlauf.length > 0 && (
              <section className="mt-8">
                <h2 className="section-label">Früher</h2>
                <p className="mt-1 max-w-[60ch] text-[0.86rem] leading-relaxed text-brand-muted">
                  Ein einzelnes Gefühlsbild ist eine Momentaufnahme. Drei hintereinander sind
                  eine Bewegung — und die sieht man nur, weil das Alte stehen bleibt.
                </p>
                <ul className="mt-4 space-y-2.5">
                  {data.verlauf.map(b => <VerlaufsKarte key={b.id} bild={b} />)}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
