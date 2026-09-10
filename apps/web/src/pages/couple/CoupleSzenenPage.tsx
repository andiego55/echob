/**
 * Beziehungsszenen im Paarraum — ein Regal und eine Runde.
 *
 * **Warum eine erfundene Szene hier der richtige Gegenstand ist.** Der Paarraum wird sonst
 * nur mit eigenem Material gefüttert — also genau mit dem, worüber zwei Menschen im Streit
 * nicht reden können. Eine erfundene Szene ist neutraler Boden: Niemand hat sie getan, also
 * muss sich niemand verteidigen. Was dabei sichtbar wird, ist trotzdem echt.
 *
 * **Die Oberfläche hat sechs Zustände, und der unscheinbarste ist der wichtigste:** das
 * Warten, nachdem man fertig ist. Dort steht genau eine Auskunft über die andere Person —
 * ob sie auch fertig ist. Mehr gibt der Server nicht heraus, und das ist die ganze Übung:
 * Wer die Antwort vorher sähe, antwortete darauf statt auf die Szene. Ohne diese eine
 * Auskunft wartete man allerdings vor einem stummen Bildschirm, und das hält niemand aus.
 *
 * **Beim Aufdecken werden die Abweichungen hervorgehoben, nicht die Treffer.** Eine
 * Trefferquote allein machte aus der Runde ein Quiz, das man gewinnt. Das Interessante
 * steht an den Stellen, an denen die Vermutung danebenlag.
 */
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import CoupleShell from '@/components/couple/CoupleShell'
import Fehlermeldung from '@/components/Fehlermeldung'
import { ListSkeleton } from '@/components/Skeleton'
import { CONTENT_MANIFEST } from '@/content/manifest.generated'
import {
  paarSzenenApi,
  type PaarFrage,
  type PaarSzenenArt,
  type RegalEintrag,
  type RundeAnsicht,
} from '@/api/paarSzenen'

const SZENEN = CONTENT_MANIFEST.filter(m => m.type === 'scene')

/** Woher eine vorschlagbare Szene kommt — die Reihenfolge ist die Reihenfolge im Bild. */
export const VORSCHLAGSQUELLEN = [
  { key: 'beide', titel: 'Habt ihr beide gewählt' },
  { key: 'meine', titel: 'Nur von dir' },
  { key: 'ihre', titel: 'Nur von ihr/ihm' },
] as const

/**
 * Die vorschlagbaren Szenen, getrennt nach Herkunft.
 *
 * **Eine Runde braucht keine Überschneidung.** Vorschlagen kann man aus beiden Regalen —
 * das war schon immer so, nur unsichtbar: Alle Szenen lagen in einer Reihe, und wessen
 * Szene man da anbot, sah man nicht. Dabei ist genau das der Zug. „Ich möchte über deine
 * reden" ist eine andere Geste als „lass uns über meine reden", und beide sollen möglich
 * und erkennbar sein.
 *
 * Verwaiste Einträge (Szene aus dem Verzeichnis verschwunden) fallen raus — sonst schlüge
 * jemand eine Szene vor, die die andere Person nicht öffnen kann.
 */
export function herkunftAusRegal(regal: {
  meine: RegalEintrag[]
  ihre: RegalEintrag[]
  gemeinsam: string[]
} | undefined) {
  const gemeinsam = new Set(regal?.gemeinsam ?? [])
  const meine = (regal?.meine ?? []).filter(p => !p.verwaist)
  const ihre = (regal?.ihre ?? []).filter(p => !p.verwaist)
  return {
    beide: meine.filter(p => gemeinsam.has(p.scene_slug)),
    meine: meine.filter(p => !gemeinsam.has(p.scene_slug)),
    ihre: ihre.filter(p => !gemeinsam.has(p.scene_slug)),
  }
}

const ART_TEXT: Record<PaarSzenenArt, { label: string; was: string }> = {
  getrennt: {
    label: 'Getrennt beantworten',
    was: 'Fünf Fragen zur Szene. Ihr schreibt getrennt und seht die Antwort der anderen '
      + 'Person erst, wenn beide fertig sind.',
  },
  geraten: {
    label: 'Raten, was die/der andere antwortet',
    was: 'Fünf Fragen zum Ankreuzen — jede zweimal: wie du antwortest, und was du '
      + 'glaubst, wie sie/er antwortet.',
  },
}

// ── Das Regal ───────────────────────────────────────────────────────────────
function RegalKarte({
  eintrag, gemeinsam, onWeg,
}: { eintrag: RegalEintrag; gemeinsam: boolean; onWeg?: () => void }) {
  return (
    <li className={[
      'rounded-brand border px-4 py-3',
      gemeinsam ? 'border-accent/50 bg-accent/[0.06]' : 'border-brand-border bg-white',
    ].join(' ')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.92rem] font-semibold leading-snug text-navy">
            {eintrag.verwaist ? 'Diese Szene gibt es nicht mehr' : eintrag.title}
          </p>
          {eintrag.perspective && (
            <p className="mt-0.5 text-[0.7rem] uppercase tracking-wide text-brand-muted">
              {eintrag.perspective}
            </p>
          )}
          {eintrag.grund && (
            <p className="mt-1.5 text-[0.84rem] leading-snug text-brand-text">
              „{eintrag.grund}“
            </p>
          )}
        </div>
        {onWeg && (
          <button
            type="button"
            onClick={onWeg}
            className="shrink-0 text-[0.76rem] text-brand-muted hover:text-navy hover:underline"
          >
            Heraus
          </button>
        )}
      </div>
      {gemeinsam && (
        <p className="mt-2 text-[0.74rem] font-semibold text-accent">
          Habt ihr beide gewählt
        </p>
      )}
    </li>
  )
}

function SzenenWaehler({ onWahl, laeuft }: {
  onWahl: (slug: string, grund: string) => void
  laeuft: boolean
}) {
  const [suche, setSuche] = useState('')
  const [gewaehlt, setGewaehlt] = useState<string | null>(null)
  const [grund, setGrund] = useState('')

  const treffer = useMemo(() => {
    const q = suche.trim().toLowerCase()
    const liste = q
      ? SZENEN.filter(s =>
          s.title.toLowerCase().includes(q)
          || (s.description ?? '').toLowerCase().includes(q))
      : SZENEN
    return liste.slice(0, 12)
  }, [suche])

  const szene = gewaehlt ? SZENEN.find(s => s.slug === gewaehlt) : null

  if (szene) {
    return (
      <div className="rounded-brand border border-accent/30 bg-accent/[0.04] p-4">
        <p className="text-[0.92rem] font-semibold text-navy">{szene.title}</p>
        <label htmlFor="regal-grund" className="mt-3 block text-[0.84rem] text-brand-muted">
          Warum diese? (freiwillig — sie/er sieht es)
        </label>
        <input
          id="regal-grund"
          value={grund}
          onChange={e => setGrund(e.target.value)}
          maxLength={500}
          placeholder="Weil …"
          className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-[0.9rem] focus:border-accent focus:outline-none"
        />
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
          <button
            type="button"
            disabled={laeuft}
            onClick={() => { onWahl(szene.slug, grund); setGewaehlt(null); setGrund(''); setSuche('') }}
            className="btn-primary !px-5 !py-2 !text-[0.86rem] disabled:opacity-50"
          >
            Ins Regal
          </button>
          <button
            type="button"
            onClick={() => { setGewaehlt(null); setGrund('') }}
            className="text-[0.84rem] text-brand-muted hover:text-navy hover:underline"
          >
            Doch eine andere
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <input
        value={suche}
        onChange={e => setSuche(e.target.value)}
        placeholder={`Szene suchen — ${SZENEN.length} stehen bereit`}
        className="w-full rounded-brand border border-brand-border px-3.5 py-2.5 text-[0.9rem] focus:border-accent focus:outline-none"
      />
      <ul className="mt-2 max-h-[260px] space-y-1 overflow-y-auto">
        {treffer.map(s => (
          <li key={s.slug}>
            <button
              type="button"
              onClick={() => setGewaehlt(s.slug)}
              className="w-full rounded-brand px-3 py-2 text-left text-[0.88rem] text-brand-text hover:bg-accent/[0.06] hover:text-navy"
            >
              {s.title}
              {s.perspective && (
                <span className="ml-2 text-[0.74rem] text-brand-muted">{s.perspective}</span>
              )}
            </button>
          </li>
        ))}
        {treffer.length === 0 && (
          <li className="px-3 py-2 text-[0.86rem] text-brand-muted">Nichts gefunden.</li>
        )}
      </ul>
    </div>
  )
}

// ── Antworten ───────────────────────────────────────────────────────────────
function OffeneFrage({ frage, wert, onChange }: {
  frage: PaarFrage; wert: string; onChange: (v: string) => void
}) {
  return (
    <div>
      <label htmlFor={`pf-${frage.key}`} className="text-[0.92rem] font-medium text-navy">
        {frage.label}
      </label>
      {frage.hinweis && (
        <p className="mt-0.5 text-[0.78rem] leading-snug text-brand-muted">{frage.hinweis}</p>
      )}
      <textarea
        id={`pf-${frage.key}`}
        value={wert}
        onChange={e => onChange(e.target.value)}
        rows={frage.zeilen ?? 3}
        maxLength={1200}
        placeholder={frage.platzhalter}
        className="mt-1.5 w-full rounded-brand border border-brand-border px-3.5 py-2.5 text-[0.92rem] leading-relaxed placeholder:text-brand-muted/60 focus:border-accent focus:outline-none"
      />
    </div>
  )
}

function OptionsReihe({ optionen, wert, onWahl, gedaempft }: {
  optionen: { key: string; label: string }[]
  wert: string | undefined
  onWahl: (k: string) => void
  gedaempft?: boolean
}) {
  return (
    <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
      {optionen.map(o => {
        const an = wert === o.key
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onWahl(o.key)}
            aria-pressed={an}
            className={[
              'rounded-brand border px-3 py-2 text-left text-[0.86rem] transition-all',
              an
                ? gedaempft
                  ? 'border-navy bg-navy text-white'
                  : 'border-accent bg-accent text-white'
                : 'border-brand-border bg-white text-brand-text hover:border-accent/50',
            ].join(' ')}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function RateFrage({ frage, wert, onChange }: {
  frage: PaarFrage
  wert: { selbst?: string; vermutung?: string }
  onChange: (v: { selbst?: string; vermutung?: string }) => void
}) {
  return (
    <div className="rounded-brand border border-brand-border p-4">
      <p className="text-[0.94rem] font-semibold text-navy">{frage.label}</p>
      <OptionsReihe
        optionen={frage.optionen ?? []}
        wert={wert.selbst}
        onWahl={k => onChange({ ...wert, selbst: k })}
      />
      <p className="mt-4 text-[0.88rem] font-medium text-brand-muted">{frage.vermutung}</p>
      <OptionsReihe
        optionen={frage.optionen ?? []}
        wert={wert.vermutung}
        onWahl={k => onChange({ ...wert, vermutung: k })}
        gedaempft
      />
    </div>
  )
}

// ── Aufdecken ───────────────────────────────────────────────────────────────
function labelVon(frage: PaarFrage, key: unknown): string {
  if (typeof key !== 'string') return '—'
  return frage.optionen?.find(o => o.key === key)?.label ?? key
}

function Gegenueberstellung({ runde }: { runde: RundeAnsicht }) {
  if (runde.art === 'getrennt') {
    return (
      <div className="space-y-5">
        {runde.fragen.map(f => (
          <div key={f.key}>
            <p className="text-[0.92rem] font-semibold text-navy">{f.label}</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {([['Du', runde.meine_antworten], ['Sie/Er', runde.ihre_antworten]] as const)
                .map(([wer, quelle]) => (
                  <div key={wer} className="rounded-brand border border-brand-border bg-white p-3.5">
                    <p className="text-[0.68rem] font-bold uppercase tracking-wide text-brand-muted">
                      {wer}
                    </p>
                    <p className="mt-1 text-[0.9rem] leading-relaxed text-brand-text">
                      {(quelle[f.key] as string) || <span className="text-brand-muted/70">—</span>}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const daneben = runde.treffer.filter(t => !t.getroffen)
  return (
    <div>
      <p className="text-[0.92rem] leading-relaxed text-brand-text">
        {daneben.length === 0
          ? 'Du hast jede Antwort richtig eingeschätzt.'
          : daneben.length === runde.treffer.length
            ? 'Keine deiner Vermutungen hat gestimmt — das ist der interessante Fall.'
            : `${runde.treffer.length - daneben.length} von ${runde.treffer.length} `
              + 'Vermutungen haben gestimmt. Die anderen stehen unten.'}
      </p>

      <div className="mt-4 space-y-3">
        {runde.fragen.map(f => {
          const treffer = runde.treffer.find(t => t.frage === f.key)
          const meine = (runde.meine_antworten[f.key] ?? {}) as { selbst?: string }
          const ihre = (runde.ihre_antworten[f.key] ?? {}) as { selbst?: string }
          const abweichung = treffer && !treffer.getroffen
          return (
            <div
              key={f.key}
              className={[
                'rounded-brand border p-4',
                abweichung ? 'border-accent/50 bg-accent/[0.05]' : 'border-brand-border bg-white',
              ].join(' ')}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[0.9rem] font-semibold text-navy">{f.label}</p>
                {abweichung && (
                  <span className="text-[0.72rem] font-bold uppercase tracking-wide text-accent">
                    Anders als gedacht
                  </span>
                )}
              </div>
              <dl className="mt-2.5 grid gap-x-6 gap-y-1.5 text-[0.86rem] sm:grid-cols-2">
                <div className="flex gap-2">
                  <dt className="text-brand-muted">Du:</dt>
                  <dd className="font-medium text-navy">{labelVon(f, meine.selbst)}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-brand-muted">Sie/Er:</dt>
                  <dd className="font-medium text-navy">{labelVon(f, ihre.selbst)}</dd>
                </div>
                {treffer && (
                  <div className="flex gap-2 sm:col-span-2">
                    <dt className="text-brand-muted">Du hattest getippt:</dt>
                    <dd className={abweichung ? 'text-accent' : 'text-brand-muted'}>
                      {labelVon(f, treffer.vermutet)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )
        })}
      </div>

      {([['Du', runde.meine_antworten], ['Sie/Er', runde.ihre_antworten]] as const)
        .filter(([, q]) => typeof q.kommentar === 'string' && q.kommentar)
        .map(([wer, q]) => (
          <blockquote key={wer} className="mt-4 border-l-2 border-brand-border pl-4">
            <p className="text-[0.7rem] font-bold uppercase tracking-wide text-brand-muted">
              {wer}
            </p>
            <p className="mt-0.5 text-[0.9rem] leading-relaxed text-brand-text">
              {q.kommentar as string}
            </p>
          </blockquote>
        ))}
    </div>
  )
}

// ── Die Seite ───────────────────────────────────────────────────────────────
export default function CoupleSzenenPage() {
  const { coupleId = '' } = useParams<{ coupleId: string }>()
  const qc = useQueryClient()
  const [entwurf, setEntwurf] = useState<Record<string, unknown> | null>(null)
  const [kommentar, setKommentar] = useState('')
  const [neueArt, setNeueArt] = useState<PaarSzenenArt>('getrennt')
  const [mitBruecke, setMitBruecke] = useState(true)
  const [vorschlagSlug, setVorschlagSlug] = useState<string | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['paar-szenen', coupleId],
    queryFn: () => paarSzenenApi.stand(coupleId),
    enabled: !!coupleId,
    // Solange gewartet wird, muss die Seite von selbst merken, dass sie fertig ist.
    refetchInterval: (q) => (q.state.data?.runde?.status === 'laeuft' ? 15_000 : false),
  })

  const herkunft = useMemo(() => herkunftAusRegal(data?.regal), [data])

  const frisch = () => qc.invalidateQueries({ queryKey: ['paar-szenen', coupleId] })
  const melden = (e: unknown) => {
    const d = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
    setFehler(d ?? 'Das hat gerade nicht geklappt.')
  }

  const waehlen = useMutation({
    mutationFn: ({ slug, grund }: { slug: string; grund: string }) =>
      paarSzenenApi.regalWaehlen(coupleId, slug, grund),
    onSuccess: frisch, onError: melden,
  })
  const entfernen = useMutation({
    mutationFn: (slug: string) => paarSzenenApi.regalEntfernen(coupleId, slug),
    onSuccess: frisch, onError: melden,
  })
  const vorschlagen = useMutation({
    mutationFn: (slug: string) =>
      paarSzenenApi.vorschlagen(coupleId, slug, neueArt, mitBruecke),
    onSuccess: () => { setVorschlagSlug(null); frisch() }, onError: melden,
  })
  const annehmen = useMutation({
    mutationFn: (id: string) => paarSzenenApi.annehmen(coupleId, id),
    onSuccess: frisch, onError: melden,
  })
  const ablehnen = useMutation({
    mutationFn: (id: string) => paarSzenenApi.ablehnen(coupleId, id),
    onSuccess: () => { setEntwurf(null); frisch() }, onError: melden,
  })
  const sichern = useMutation({
    mutationFn: ({ id, a, k }: { id: string; a: Record<string, unknown>; k: string }) =>
      paarSzenenApi.antwortenSichern(coupleId, id, a, k || null),
    onSuccess: frisch, onError: melden,
  })
  const fertig = useMutation({
    mutationFn: (id: string) => paarSzenenApi.fertig(coupleId, id),
    onSuccess: () => { setEntwurf(null); frisch() }, onError: melden,
  })

  const runde = data?.runde ?? null
  const werte = entwurf ?? runde?.meine_antworten ?? {}
  const setWert = (key: string, v: unknown) => setEntwurf({ ...werte, [key]: v })

  return (
    <CoupleShell subtitle="Eine erfundene Szene als gemeinsamer Gegenstand — niemand von euch hat sie getan.">
      <div className="mx-auto max-w-[900px] px-6 py-8">
        <h1 className="page-title">Szenen</h1>
        <p className="mt-1 max-w-[64ch] text-sm leading-relaxed text-brand-muted">
          Erfundene Beziehungsszenen als gemeinsamer Gegenstand. Niemand von euch hat sie
          getan — deshalb muss sich niemand verteidigen, und trotzdem kommt zur Sprache,
          worüber sonst schwer zu reden ist.
        </p>

        {isLoading && <ListSkeleton rows={3} label="Wird geladen" />}
        {error && <Fehlermeldung error={error} />}
        {fehler && <p className="mt-4 text-[0.88rem] text-red-600">{fehler}</p>}

        {data && (
          <>
            {/* ── Das Regal ────────────────────────────────────────────── */}
            <section className="mt-7 rounded-brand-lg border border-brand-border bg-white p-6">
              <h2 className="section-label">Unsere Szenen</h2>
              <p className="mt-1 max-w-[60ch] text-[0.86rem] leading-relaxed text-brand-muted">
                Wählt je {data.regal.empfohlen} bis {data.regal.max} Szenen, die zu euch
                passen. Ihr seht die Auswahl der anderen Person — was ihr beide gewählt habt,
                ist gemeinsamer Boden; der Rest ist das Thema. Jederzeit austauschbar.
              </p>

              <div className="mt-5 grid gap-6 md:grid-cols-2">
                <div>
                  <p className="text-[0.8rem] font-semibold text-navy">Deine Auswahl</p>
                  {data.regal.meine.length === 0 ? (
                    <p className="mt-2 text-[0.86rem] text-brand-muted">Noch keine.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {data.regal.meine.map(p => (
                        <RegalKarte
                          key={p.scene_slug}
                          eintrag={p}
                          gemeinsam={data.regal.gemeinsam.includes(p.scene_slug)}
                          onWeg={() => entfernen.mutate(p.scene_slug)}
                        />
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="text-[0.8rem] font-semibold text-navy">Ihre/Seine Auswahl</p>
                  {data.regal.ihre.length === 0 ? (
                    <p className="mt-2 text-[0.86rem] text-brand-muted">Noch keine.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {data.regal.ihre.map(p => (
                        <RegalKarte
                          key={p.scene_slug}
                          eintrag={p}
                          gemeinsam={data.regal.gemeinsam.includes(p.scene_slug)}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {data.regal.meine.length < data.regal.max && (
                <div className="mt-5 border-t border-brand-border pt-5">
                  <SzenenWaehler
                    laeuft={waehlen.isPending}
                    onWahl={(slug, grund) => waehlen.mutate({ slug, grund })}
                  />
                </div>
              )}
            </section>

            {/* ── Die Runde ────────────────────────────────────────────── */}
            <section className="mt-6 rounded-brand-lg border border-brand-border bg-white p-6">
              <h2 className="section-label">Eine Runde</h2>

              {/* Kein Vorschlag offen */}
              {!runde && (
                <>
                  <p className="mt-1 max-w-[60ch] text-[0.86rem] leading-relaxed text-brand-muted">
                    Schlag eine Szene vor. Sie/Er kann annehmen oder ablehnen — erst danach
                    geht es los.
                  </p>
                  <div className="mt-4 space-y-2">
                    {(Object.keys(ART_TEXT) as PaarSzenenArt[]).map(a => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setNeueArt(a)}
                        aria-pressed={neueArt === a}
                        className={[
                          'block w-full rounded-brand border px-4 py-3 text-left transition-all',
                          neueArt === a
                            ? 'border-accent bg-accent/[0.06]'
                            : 'border-brand-border hover:border-accent/50',
                        ].join(' ')}
                      >
                        <span className="block text-[0.92rem] font-semibold text-navy">
                          {ART_TEXT[a].label}
                        </span>
                        <span className="mt-0.5 block text-[0.82rem] leading-snug text-brand-muted">
                          {ART_TEXT[a].was}
                        </span>
                      </button>
                    ))}
                  </div>

                  <label className="mt-4 flex cursor-pointer gap-3 text-[0.86rem] text-brand-text">
                    <input
                      type="checkbox"
                      checked={mitBruecke}
                      onChange={e => setMitBruecke(e.target.checked)}
                      className="mt-0.5 h-4 w-4 flex-shrink-0 accent-accent"
                    />
                    <span>
                      Letzte Frage mitnehmen: <em>„Kommt so etwas bei euch vor?“</em>
                      <span className="mt-0.5 block text-[0.8rem] text-brand-muted">
                        Die einzige Frage, die von der Geschichte auf euch zeigt — und die
                        einzige, deren Antwort sich als Vorwurf lesen lässt. Ohne sie bleibt
                        die Runde ganz bei der Erfindung.
                      </span>
                    </span>
                  </label>

                  <div className="mt-5 border-t border-brand-border pt-5">
                    {/* Getrennt nach Herkunft, nicht in einen Topf.
                        Eine Runde braucht KEINE Ueberschneidung - vorschlagen kann man aus
                        beiden Regalen. Nur sah man das vorher nicht: Alle Szenen lagen in
                        einer Reihe, und wessen Szene man da anbietet, war unsichtbar. Genau
                        das ist aber der Zug. „Ich moechte ueber deine reden" ist eine
                        andere Geste als „lass uns ueber meine reden", und beide sollen
                        moeglich und erkennbar sein. */}
                    {/* Die Antwort auf „und wenn wir nichts gemeinsam haben?" steht dort,
                        wo die Frage entsteht - nicht in einer Hilfeseite. */}
                    {herkunft.beide.length === 0
                      && herkunft.meine.length + herkunft.ihre.length > 0 && (
                      <p className="mb-4 max-w-[54ch] text-[0.8rem] leading-relaxed text-brand-muted">
                        Ihr habt noch keine Szene doppelt gewählt. Das ist kein Hindernis —
                        eine Runde braucht keine gemeinsame Szene, nur eine, über die ihr
                        beide reden wollt.
                      </p>
                    )}
                    {VORSCHLAGSQUELLEN.map(({ key, titel }) => {
                      const liste = herkunft[key]
                      if (liste.length === 0) return null
                      return (
                        <div key={key} className="mb-4">
                          <p className="mb-2 text-[0.82rem] font-semibold text-navy">{titel}</p>
                          <div className="flex flex-wrap gap-2">
                            {liste.map(p => (
                              <button
                                key={p.scene_slug}
                                type="button"
                                onClick={() => setVorschlagSlug(p.scene_slug)}
                                className={[
                                  'rounded-full border px-3.5 py-1.5 text-[0.82rem] transition-colors',
                                  vorschlagSlug === p.scene_slug
                                    ? 'border-accent bg-accent text-white'
                                    : 'border-brand-border hover:border-accent/50',
                                ].join(' ')}
                              >
                                {p.title}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                    <button
                      type="button"
                      disabled={!vorschlagSlug || vorschlagen.isPending}
                      onClick={() => vorschlagSlug && vorschlagen.mutate(vorschlagSlug)}
                      className="btn-primary !px-6 !py-2.5 !text-[0.88rem] disabled:opacity-40"
                    >
                      {vorschlagen.isPending ? 'Wird vorgeschlagen …' : 'Vorschlagen'}
                    </button>
                    {!vorschlagSlug && (
                      <p className="mt-2 text-[0.8rem] text-brand-muted">
                        {data.regal.meine.length + data.regal.ihre.length === 0
                          ? 'Stellt oben eine Szene ins Regal — eine von euch beiden genügt.'
                          : 'Wähl zuerst eine Szene aus.'}
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Vorschlag liegt */}
              {runde?.status === 'vorgeschlagen' && (
                <div className="mt-3">
                  <p className="text-[1rem] font-semibold text-navy">{runde.title}</p>
                  <p className="mt-1 text-[0.86rem] text-brand-muted">
                    {ART_TEXT[runde.art].was}
                    {!runde.mit_bruecke && ' Ohne die Frage nach euch.'}
                  </p>
                  <Link
                    to={`/szenen/${runde.scene_slug}`}
                    target="_blank"
                    className="mt-2 inline-block text-[0.84rem] font-medium text-accent hover:underline"
                  >
                    Szene lesen (neuer Reiter) →
                  </Link>

                  <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
                    {runde.ich_habe_vorgeschlagen ? (
                      <>
                        <p className="text-[0.88rem] text-brand-muted">
                          Wartet auf ihre/seine Zusage.
                        </p>
                        <button
                          type="button"
                          onClick={() => ablehnen.mutate(runde.id)}
                          className="text-[0.84rem] text-brand-muted hover:text-navy hover:underline"
                        >
                          Zurückziehen
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => annehmen.mutate(runde.id)}
                          disabled={annehmen.isPending}
                          className="btn-primary !px-6 !py-2.5 !text-[0.88rem] disabled:opacity-50"
                        >
                          Annehmen
                        </button>
                        <button
                          type="button"
                          onClick={() => ablehnen.mutate(runde.id)}
                          className="text-[0.84rem] text-brand-muted hover:text-navy hover:underline"
                        >
                          Lieber nicht
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Läuft — antworten oder warten */}
              {runde?.status === 'laeuft' && (
                <div className="mt-3">
                  <p className="text-[1rem] font-semibold text-navy">{runde.title}</p>
                  <Link
                    to={`/szenen/${runde.scene_slug}`}
                    target="_blank"
                    className="mt-1 inline-block text-[0.84rem] font-medium text-accent hover:underline"
                  >
                    Szene lesen (neuer Reiter) →
                  </Link>

                  {runde.ich_bin_fertig ? (
                    <div className="mt-5 rounded-brand border border-brand-border bg-brand-bg px-5 py-4">
                      <p className="text-[0.94rem] font-semibold text-navy">
                        Du bist fertig.
                      </p>
                      <p className="mt-1 text-[0.86rem] leading-relaxed text-brand-muted">
                        {runde.sie_ist_fertig
                          ? 'Sie/Er auch — gleich ist es aufgedeckt.'
                          : 'Sobald sie/er auch fertig ist, seht ihr beide Antworten '
                            + 'nebeneinander. Vorher sieht keiner die des anderen — sonst '
                            + 'würde man darauf antworten statt auf die Szene.'}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="mt-5 space-y-4">
                        {runde.fragen.map(f =>
                          runde.art === 'getrennt' ? (
                            <OffeneFrage
                              key={f.key}
                              frage={f}
                              wert={(werte[f.key] as string) ?? ''}
                              onChange={v => setWert(f.key, v)}
                            />
                          ) : (
                            <RateFrage
                              key={f.key}
                              frage={f}
                              wert={(werte[f.key] as { selbst?: string; vermutung?: string }) ?? {}}
                              onChange={v => setWert(f.key, v)}
                            />
                          ),
                        )}
                      </div>

                      {runde.art === 'geraten' && (
                        <div className="mt-4">
                          <label htmlFor="pk" className="text-[0.88rem] font-medium text-navy">
                            Willst du etwas dazu sagen?
                          </label>
                          <p className="mt-0.5 text-[0.78rem] text-brand-muted">
                            Freiwillig. Sie/Er sieht es, wenn aufgedeckt wird.
                          </p>
                          <textarea
                            id="pk"
                            value={kommentar || ((werte.kommentar as string) ?? '')}
                            onChange={e => setKommentar(e.target.value)}
                            rows={3}
                            maxLength={800}
                            className="mt-1.5 w-full rounded-brand border border-brand-border px-3.5 py-2.5 text-[0.9rem] focus:border-accent focus:outline-none"
                          />
                        </div>
                      )}

                      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-brand-border pt-5">
                        <button
                          type="button"
                          onClick={() => sichern.mutate({ id: runde.id, a: werte, k: kommentar })}
                          disabled={sichern.isPending}
                          className="rounded-brand border border-brand-border px-5 py-2 text-[0.86rem] font-medium text-navy hover:border-accent/50 disabled:opacity-50"
                        >
                          {sichern.isPending ? 'Wird gesichert …' : 'Zwischenspeichern'}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await sichern.mutateAsync({ id: runde.id, a: werte, k: kommentar })
                            fertig.mutate(runde.id)
                          }}
                          disabled={fertig.isPending || sichern.isPending}
                          className="btn-primary !px-6 !py-2.5 !text-[0.88rem] disabled:opacity-50"
                        >
                          {fertig.isPending ? 'Wird gemeldet …' : 'Fertig'}
                        </button>
                        <span className="text-[0.8rem] text-brand-muted">
                          {runde.sie_ist_fertig ? 'Sie/Er ist schon fertig.' : 'Sie/Er schreibt noch.'}
                        </span>
                      </div>
                      <p className="mt-3 text-[0.78rem] leading-relaxed text-brand-muted/80">
                        Nach „Fertig“ lässt sich nichts mehr ändern — sonst könnte man die
                        eigene Antwort nachbessern, sobald aufgedeckt ist.
                      </p>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => ablehnen.mutate(runde.id)}
                    className="mt-5 text-[0.82rem] text-brand-muted hover:text-navy hover:underline"
                  >
                    Runde beenden
                  </button>
                </div>
              )}

              {/* Aufgedeckt */}
              {runde?.status === 'aufgedeckt' && (
                <div className="mt-3">
                  <p className="text-[1rem] font-semibold text-navy">{runde.title}</p>
                  <p className="mt-1 text-[0.84rem] text-brand-muted">Aufgedeckt.</p>
                  <div className="mt-5">
                    <Gegenueberstellung runde={runde} />
                  </div>
                  <p className="mt-6 border-t border-brand-border pt-5 text-[0.84rem] leading-relaxed text-brand-muted">
                    Wo ihr auseinanderliegt, ist nichts falsch — dort steht nur, dass ihr
                    dieselbe Geschichte verschieden lest. Das ist ein guter Anfang für ein
                    Gespräch und kein Ergebnis.
                  </p>
                  <button
                    type="button"
                    onClick={() => ablehnen.mutate(runde.id)}
                    className="mt-4 text-[0.84rem] font-semibold text-accent hover:underline"
                  >
                    Nächste Runde →
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </CoupleShell>
  )
}
