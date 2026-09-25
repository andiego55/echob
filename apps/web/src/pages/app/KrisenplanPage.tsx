/**
 * /app/kompass/krisenplan — was hilft, wenn es kippt.
 *
 * **Das Grundproblem jedes Notfallplans: Er wird im Notfall gebraucht und muss vorher
 * geschrieben werden.** In dem Zustand, in dem man ihn braucht, fällt einem nichts ein —
 * und wenn es einem gut geht, sieht man keinen Anlass. Deshalb sammelt der Kompass
 * nebenbei: Nach jedem guten Moment fragt der Puls, was gutgetan hat, und genau diese
 * Sätze stehen hier als Vorschläge bereit. Der Plan entsteht aus guten Tagen statt aus
 * einem leeren Formular.
 *
 * **Zwei Ansichten, und die Leseansicht ist die wichtigere.** Wer diese Seite im Ernstfall
 * öffnet, darf keine Eingabefelder sehen, keine Speichern-Leiste und keine Hinweise zur
 * Bedienung. Er sieht große Schrift, wenige Zeilen und Nummern, die sich antippen lassen.
 * Bearbeitet wird an ruhigen Tagen, und dafür gibt es einen Knopf.
 *
 * **Die offiziellen Nummern stehen immer darunter** — auch wenn der Plan voll ist. Die
 * eigenen Menschen kommen zuerst, weil sie eher angerufen werden. Aber wenn niemand
 * rangeht, darf die Seite nicht zu Ende sein.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import Fehlermeldung from '@/components/Fehlermeldung'
import { PageSkeleton } from '@/components/Skeleton'
import { Pfeil, verschoben } from '@/components/app/kompass/Reihung'
import { kompassApi, type KrisenplanTeil } from '@/api/kompass'
import { ANLAUFSTELLEN } from '@/lib/anlaufstellen'
import { nummerAus, planGefuellt, planZeilen, planZumSpeichern } from '@/lib/kompass'

/** Wie viele Vorschläge aus guten Momenten höchstens angeboten werden. */
const MAX_VORSCHLAEGE = 6
/** In welchen Abschnitt ein übernommener Vorschlag wandert. */
const VORSCHLAG_ZIEL = 'schritte'

export default function KrisenplanPage() {
  const qc = useQueryClient()
  const [bearbeiten, setBearbeiten] = useState(false)
  const [entwurf, setEntwurf] = useState<Record<string, string[]> | null>(null)

  const { data: katalog, error: katalogFehler } = useQuery({
    queryKey: ['kompass-katalog'],
    queryFn: kompassApi.katalog,
    staleTime: Infinity,
  })
  const { data: plan, isLoading, error: planFehler } = useQuery({
    queryKey: ['kompass-krisenplan'],
    queryFn: kompassApi.krisenplan,
  })
  // Ein Jahr, nicht vier Wochen: Was vor Monaten geholfen hat, hilft wahrscheinlich
  // immer noch — und in den ersten Wochen gäbe es sonst nie einen Vorschlag.
  const { data: jahr } = useQuery({
    queryKey: ['kompass-verlauf', 365],
    queryFn: () => kompassApi.verlauf(365),
    staleTime: 60_000,
  })

  const teile: KrisenplanTeil[] = useMemo(() => katalog?.krisenplan_teile ?? [], [katalog])

  // Der Entwurf entsteht aus dem gespeicherten Plan, sobald beides da ist. Danach gehört
  // er der Seite: Ein erneutes Laden im Hintergrund darf keine Eingabe überschreiben.
  useEffect(() => {
    if (entwurf !== null || !katalog || plan === undefined) return
    const start: Record<string, string[]> = {}
    for (const t of teile) start[t.key] = planZeilen(plan?.inhalt, t.key)
    setEntwurf(start)
  }, [entwurf, katalog, plan, teile])

  const speichern = useMutation({
    mutationFn: (inhalt: Record<string, string[]>) => kompassApi.krisenplanSpeichern(inhalt),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kompass-krisenplan'] })
      qc.invalidateQueries({ queryKey: ['kompass'] })
      setBearbeiten(false)
    },
  })

  const vorhanden = planGefuellt(plan?.inhalt, teile.map(t => t.key))

  /** Sätze aus guten Momenten, die noch nicht im Plan stehen. Neueste zuerst. */
  const vorschlaege = useMemo(() => {
    const drin = new Set((entwurf?.[VORSCHLAG_ZIEL] ?? []).map(z => z.toLowerCase().trim()))
    const gesehen = new Set<string>()
    const raus: string[] = []
    for (const p of [...(jahr ?? [])].reverse()) {
      const satz = p.geholfen?.trim()
      if (!satz) continue
      const schluessel = satz.toLowerCase()
      if (drin.has(schluessel) || gesehen.has(schluessel)) continue
      gesehen.add(schluessel)
      raus.push(satz)
      if (raus.length === MAX_VORSCHLAEGE) break
    }
    return raus
  }, [jahr, entwurf])

  const geaendert = useMemo(() => {
    if (!entwurf) return false
    const gespeichert: Record<string, string[]> = {}
    for (const t of teile) gespeichert[t.key] = planZeilen(plan?.inhalt, t.key)
    return JSON.stringify(planZumSpeichern(entwurf)) !== JSON.stringify(planZumSpeichern(gespeichert))
  }, [entwurf, plan, teile])

  function setzeZeile(key: string, index: number, wert: string) {
    setEntwurf(e => {
      if (!e) return e
      const zeilen = [...(e[key] ?? [])]
      zeilen[index] = wert
      return { ...e, [key]: zeilen }
    })
  }

  function zeileWeg(key: string, index: number) {
    setEntwurf(e => (e ? { ...e, [key]: (e[key] ?? []).filter((_, i) => i !== index) } : e))
  }

  function zeileDazu(key: string, wert = '') {
    setEntwurf(e => (e ? { ...e, [key]: [...(e[key] ?? []), wert] } : e))
  }

  /**
   * Eine Zeile um eine Stelle verschieben — die REIHUNG.
   *
   * Der Bauplan zählt sie zu den Eingabeformen: „Aus Karten wählen, die wichtigsten nach
   * vorn." Die Wahl gibt es hier schon (die Vorschläge aus guten Momenten); dies ist die
   * zweite Hälfte — und ausdrücklich nur als ABSCHLUSS. Niemand fängt damit an, zehn
   * Dinge zu sortieren; man sortiert, was schon dasteht.
   *
   * Pfeile und kein Ziehen: Ziehen ist am Telefon ungenau und mit der Tastatur gar nicht
   * bedienbar. Auf ausgerechnet dieser Seite ist das keine Feinheit.
   *
   * Das Pfeilpaar und das Umstellen selbst liegen in `components/app/kompass/Reihung`.
   * Die ganze Form dort passt hier NICHT: Ihre Zeilen sind feste Bezeichnungen, diese
   * hier sind Eingabefelder, die man noch tippt. Geteilt wird deshalb, was wirklich
   * dasselbe ist — und nicht eine Komponente mit einem Schalter für zwei Bauarten.
   */
  function zeileSchieben(key: string, index: number, richtung: 'hoch' | 'runter') {
    setEntwurf(e => (e ? { ...e, [key]: verschoben(e[key] ?? [], index, richtung) } : e))
  }

  // Der Fehler VOR dem Ladezustand — und hier wiegt das schwerer als anderswo. Der
  // Entwurf entsteht erst, wenn beide Abfragen da sind; scheitert eine, bliebe diese
  // Seite dauerhaft im Skelett. Ausgerechnet der Notfallplan darf nicht wortlos
  // hängenbleiben. Die Nummern, die immer gelten, stehen deshalb auch hier.
  if (katalogFehler || planFehler) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[680px] px-6 py-8">
          <h1 className="page-title">Mein Notfallplan</h1>
          <Fehlermeldung error={katalogFehler ?? planFehler} className="mt-3" />
          <Anlaufstellen />
        </div>
      </AppShell>
    )
  }

  if (isLoading || !katalog || !entwurf) {
    return <AppShell><PageSkeleton cards={2} label="Dein Notfallplan wird geladen" /></AppShell>
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-[680px] px-6 py-8">
        <Link
          to="/app/kompass"
          className="text-[0.8rem] text-brand-muted no-underline transition-colors hover:text-navy"
        >
          ← Mein Kompass
        </Link>

        <header className="mb-6 mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="page-title">Mein Notfallplan</h1>
            <p className="mt-1 max-w-[58ch] text-sm text-brand-muted">
              Für den Zustand, in dem einem nichts mehr einfällt. Geschrieben wird er
              jetzt, gelesen irgendwann.
            </p>
          </div>
          {vorhanden && !bearbeiten && (
            <button
              type="button"
              onClick={() => setBearbeiten(true)}
              className="btn-quiet !px-4 !py-2 !text-sm"
            >
              Bearbeiten
            </button>
          )}
        </header>

        {vorhanden && !bearbeiten
          ? <Leseansicht teile={teile} inhalt={plan?.inhalt} />
          : (
            <Bearbeitung
              teile={teile}
              entwurf={entwurf}
              vorschlaege={vorschlaege}
              vorschlagZiel={teile.find(t => t.key === VORSCHLAG_ZIEL)?.label ?? ''}
              onZeile={setzeZeile}
              onWeg={zeileWeg}
              onDazu={zeileDazu}
              onSchieben={zeileSchieben}
            />
          )}

        <Anlaufstellen />

        {/* Dieselbe Mechanik, anderes Format — und deshalb steht der Verweis hier und
            nicht als eigener Eingang: Beides ist die starke Version deiner selbst, die
            fuer die schwaechere schreibt. Der Plan sagt, was zu tun ist; der Brief sagt,
            wie es war. */}
        <p className="mt-6 max-w-[54ch] text-[0.84rem] leading-relaxed text-brand-muted">
          Dieselbe Idee in anderer Form:{' '}
          <Link
            to="/app/kompass/brief"
            className="font-semibold text-accent no-underline hover:underline"
          >
            ein Brief an dich selbst
          </Link>
          . Ein paar Zeilen von heute, die in ein paar Monaten aufgehen — für einen Tag,
          an dem es schwerer ist.
        </p>

        {/* Die Speicherleiste klebt unten — bei vier Abschnitten ist das Ende der Seite
            weit weg, und ein Knopf, den man erst suchen muss, wird nicht gedrückt. */}
        {bearbeiten || !vorhanden ? (
          <div className="sticky bottom-[76px] z-30 mt-6 rounded-brand border border-brand-border bg-white/95 p-3 shadow-brand-lg backdrop-blur md:bottom-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[0.78rem] text-brand-muted">
                {geaendert ? 'Noch nicht gespeichert.' : 'Alles gespeichert.'}
              </p>
              <div className="flex gap-2">
                {vorhanden && (
                  <button
                    type="button"
                    onClick={() => {
                      const zurueck: Record<string, string[]> = {}
                      for (const t of teile) zurueck[t.key] = planZeilen(plan?.inhalt, t.key)
                      setEntwurf(zurueck)
                      setBearbeiten(false)
                    }}
                    className="btn-quiet !px-4 !py-2 !text-sm"
                  >
                    Abbrechen
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => speichern.mutate(planZumSpeichern(entwurf))}
                  disabled={!geaendert || speichern.isPending}
                  className="btn-primary !px-5 !py-2 !text-sm disabled:opacity-50"
                >
                  {speichern.isPending ? 'Wird gespeichert …' : 'Speichern'}
                </button>
              </div>
            </div>
            <Fehlermeldung error={speichern.error} />
          </div>
        ) : null}
      </div>
    </AppShell>
  )
}

// ── Die Leseansicht ──────────────────────────────────────────────────────────

function Leseansicht({ teile, inhalt }: {
  teile: KrisenplanTeil[]
  inhalt: Record<string, unknown> | null | undefined
}) {
  return (
    <div className="space-y-4">
      {teile.map(t => {
        const zeilen = planZeilen(inhalt, t.key)
        // Leere Abschnitte fallen weg. Im Ernstfall ist jede Zeile, die nichts sagt,
        // eine Zeile zu viel.
        if (zeilen.length === 0) return null
        const istListeVonMenschen = t.key === 'menschen'
        return (
          <section key={t.key} className="card card-static">
            <h2 className="card-title-lg">{t.label}</h2>
            <ol className="mt-3 space-y-2.5">
              {zeilen.map((z, i) => {
                const nummer = istListeVonMenschen ? nummerAus(z) : null
                return (
                  <li key={i} className="flex items-baseline gap-3">
                    <span
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent/10 text-[0.72rem] font-bold text-accent"
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>
                    {nummer ? (
                      <a
                        href={`tel:${nummer}`}
                        className="text-[1.02rem] leading-relaxed text-navy underline decoration-accent/40 underline-offset-4"
                      >
                        {z}
                      </a>
                    ) : (
                      <span className="text-[1.02rem] leading-relaxed text-navy">{z}</span>
                    )}
                  </li>
                )
              })}
            </ol>
          </section>
        )
      })}
    </div>
  )
}

// ── Die Bearbeitung ──────────────────────────────────────────────────────────

function Bearbeitung({
  teile, entwurf, vorschlaege, vorschlagZiel, onZeile, onWeg, onDazu, onSchieben,
}: {
  teile: KrisenplanTeil[]
  entwurf: Record<string, string[]>
  vorschlaege: string[]
  vorschlagZiel: string
  onZeile: (key: string, index: number, wert: string) => void
  onWeg: (key: string, index: number) => void
  onDazu: (key: string, wert?: string) => void
  onSchieben: (key: string, index: number, richtung: 'hoch' | 'runter') => void
}) {
  return (
    <div className="space-y-4">
      {/* Die Vorschläge stehen VOR den Abschnitten: Sie sind der leichteste Einstieg,
          und wer sie erst unter vier leeren Feldern findet, hat schon aufgegeben. */}
      {vorschlaege.length > 0 && (
        <section className="card card-hero card-static">
          <h2 className="card-title-lg">Das hat dir schon gutgetan</h2>
          <p className="mt-1 text-[0.84rem] leading-relaxed text-brand-muted">
            Aus deinen guten Momenten. Tipp an, was in „{vorschlagZiel}" gehört.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {vorschlaege.map(v => (
              <button
                key={v}
                type="button"
                onClick={() => onDazu(VORSCHLAG_ZIEL, v)}
                className="rounded-full border border-accent/40 bg-white px-3.5 py-1.5 text-left text-[0.84rem] text-navy transition-all hover:border-accent hover:bg-accent hover:text-white"
              >
                + {v}
              </button>
            ))}
          </div>
        </section>
      )}

      {teile.map(t => {
        const zeilen = entwurf[t.key] ?? []
        return (
          <section key={t.key} className="card card-static">
            <h2 className="card-title-lg">{t.label}</h2>
            <p className="mt-1 text-[0.82rem] leading-relaxed text-brand-muted">{t.hinweis}</p>

            <div className="mt-3 space-y-2">
              {zeilen.map((z, i) => (
                <div key={i} className="flex items-center gap-2">
                  {/* Die Nummer steht nur, wo die Reihenfolge etwas bedeutet. Sonst
                      waere sie eine Rangfolge, die niemand gemeint hat. */}
                  {t.geordnet && (
                    <span
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent/10 text-[0.7rem] font-bold text-accent"
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>
                  )}
                  <input
                    type="text"
                    value={z}
                    onChange={e => onZeile(t.key, i, e.target.value)}
                    maxLength={300}
                    placeholder={t.beispiel.split(' · ')[i] ?? ''}
                    aria-label={`${t.label}, Zeile ${i + 1}`}
                    className="input"
                  />
                  {t.geordnet && zeilen.length > 1 && (
                    <div className="flex shrink-0 flex-col">
                      <Pfeil
                        richtung="hoch"
                        aus={i === 0}
                        label={`Zeile ${i + 1} nach oben`}
                        onKlick={() => onSchieben(t.key, i, 'hoch')}
                      />
                      <Pfeil
                        richtung="runter"
                        aus={i === zeilen.length - 1}
                        label={`Zeile ${i + 1} nach unten`}
                        onKlick={() => onSchieben(t.key, i, 'runter')}
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => onWeg(t.key, i)}
                    aria-label={`Zeile ${i + 1} entfernen`}
                    className="shrink-0 rounded-brand-sm p-2 text-brand-muted transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <svg
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                      strokeLinecap="round" className="h-4 w-4" aria-hidden="true"
                    >
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>
              ))}

              {t.geordnet && zeilen.length > 1 && (
                <p className="!mt-2 text-[0.76rem] leading-relaxed text-brand-muted">
                  Die Reihenfolge zählt: Das Erste soll das Leichteste sein — das, was
                  auch dann noch geht, wenn fast nichts mehr geht.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => onDazu(t.key)}
              className="mt-2.5 text-[0.82rem] font-medium text-accent transition-colors hover:text-accent-hover"
            >
              + Zeile
            </button>

            {zeilen.length === 0 && t.beispiel && (
              <p className="mt-2 text-[0.76rem] italic text-brand-muted">
                Zum Beispiel: {t.beispiel}
              </p>
            )}
          </section>
        )
      })}
    </div>
  )
}

// ── Die Nummern, die immer gelten ────────────────────────────────────────────

function Anlaufstellen() {
  return (
    <section className="safety-notice mt-6">
      <p className="font-semibold text-navy">Wenn niemand rangeht</p>
      <ul className="mt-2 space-y-1.5">
        {ANLAUFSTELLEN.map(a => (
          <li key={a.name}>
            <span className="text-navy">{a.name}: </span>
            {a.wahl ? (
              <a
                href={`tel:${a.wahl}`}
                className="font-semibold text-navy underline decoration-[#3b6a9a]/40 underline-offset-4"
              >
                {a.nummer}
              </a>
            ) : (
              <span className="font-semibold text-navy">{a.nummer}</span>
            )}
            <span className="text-[0.82rem]"> — {a.hinweis}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
