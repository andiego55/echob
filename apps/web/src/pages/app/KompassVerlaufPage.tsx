/**
 * /app/kompass/verlauf — deine Spur: alles Festgehaltene auf einer Achse.
 *
 * **Warum das keine sechste Karte auf der Startseite ist.** Der Bauplan nennt es „Deine
 * Spur" und beschreibt „eine einzige scrollbare Zeitachse, auf der alles liegt". Genau
 * das war diese Seite schon — nur für eine Form. Sie wächst, statt daneben ein zweites
 * Mal zu entstehen; eine Seite mit den Momenten und daneben eine mit allem hätte zwei
 * Wahrheiten über denselben Tag.
 *
 * **Warum die Momente reich bleiben und der Rest schmal.** Ein Puls trägt Wörter, eine
 * Notiz, „hat gutgetan", den Fall — und den Knopf zum Wegnehmen. Als schmale Zeile auf
 * der Achse wäre das alles weg, und die Seite hätte weniger, als sie vorher hatte. Also
 * kommen die Momente weiter aus ihrer eigenen, vollen Abfrage; die Achse liefert nur,
 * was sonst noch an dem Tag war.
 *
 * **Warum die Szenen ausgeschaltet beginnen.** Sie gehören zu Fällen, und dies ist der
 * Raum ohne Fall. Wer nur auf sich schauen will, soll nicht an eine Beziehung erinnert
 * werden — wer beides sehen will, schaltet sie ein. Dann ist dies der Ort, an dem die
 * beiden Hälften des Produkts auf derselben Linie liegen.
 *
 * **Warum es diese Seite neben der Kurve auf dem Dashboard gibt.** Die Kurve zeigt eine
 * Bewegung, aber keine Gründe. Wer sieht, dass die letzte Woche tiefer lag, will als
 * Nächstes wissen, was an diesen Tagen war — und genau dafür stehen hier die Notizen, die
 * Wörter und die Fälle unter der Linie.
 *
 * **Warum man Momente löschen kann.** Wer seinen Zustand festhält, muss ihn auch wieder
 * wegnehmen dürfen. Ohne diese Möglichkeit hält man sich beim Erfassen zurück, und genau
 * das soll hier nicht passieren.
 *
 * **Warum der Zeitraum umschaltbar ist und nicht mitwächst.** Ein Jahr ist die
 * interessantere Ansicht, sobald es ein Jahr gibt — aber als Voreinstellung wäre es in den
 * ersten Wochen eine fast leere Fläche mit drei Punkten ganz rechts.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import Fehlermeldung from '@/components/Fehlermeldung'
import { PageSkeleton } from '@/components/Skeleton'
import { useBestaetigen } from '@/components/Bestaetigung'
import VerlaufsKurve from '@/components/app/kompass/VerlaufsKurve'
import BesprechenKnopf from '@/components/app/kompass/BesprechenKnopf'
import { useAgenda } from '@/hooks/useAgenda'
import { kompassApi, type AgendaArt, type Puls, type SpurEreignis } from '@/api/kompass'
import { casesApi } from '@/api/cases'
import { bewegung, rhythmusSatz, spurNachTagen, ton, zeitWort } from '@/lib/kompass'

const ZEITRAEUME = [
  { tage: 28, label: '4 Wochen' },
  { tage: 90, label: '3 Monate' },
  { tage: 365, label: 'Ein Jahr' },
]

export default function KompassVerlaufPage() {
  const qc = useQueryClient()
  const bestaetigen = useBestaetigen()
  const agenda = useAgenda()
  const [tage, setTage] = useState(28)
  const [offen, setOffen] = useState<string | null>(null)
  const [mitSzenen, setMitSzenen] = useState(false)

  const { data: katalog } = useQuery({
    queryKey: ['kompass-katalog'],
    queryFn: kompassApi.katalog,
    staleTime: Infinity,
  })
  const { data: pulse, isLoading, error: verlaufFehler } = useQuery({
    queryKey: ['kompass-verlauf', tage],
    queryFn: () => kompassApi.verlauf(tage),
  })
  const { data: spur } = useQuery({
    queryKey: ['kompass-spur', tage, mitSzenen],
    queryFn: () => kompassApi.spur(tage, mitSzenen),
  })
  const { data: faelle } = useQuery({
    queryKey: ['cases'],
    queryFn: casesApi.list,
    staleTime: 60_000,
  })

  const loeschen = useMutation({
    mutationFn: (id: string) => kompassApi.pulsLoeschen(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kompass-verlauf'] })
      qc.invalidateQueries({ queryKey: ['kompass-spur'] })
      qc.invalidateQueries({ queryKey: ['kompass'] })
    },
  })

  const liste = useMemo(() => pulse ?? [], [pulse])
  const gruppen = useMemo(
    () => spurNachTagen(liste, spur ?? []), [liste, spur])
  const richtung = useMemo(() => bewegung(liste), [liste])

  /** Wort-Schlüssel → Beschriftung. Ohne das stünde in der Liste `erschoepft_stumpf`. */
  const wortLabel = useMemo(() => {
    const karte = new Map<string, string>()
    for (const familie of katalog?.wortfamilien ?? []) {
      for (const w of familie.worte) karte.set(w.key, w.label)
    }
    return karte
  }, [katalog])

  const fallName = useMemo(() => {
    const karte = new Map<string, string>()
    for (const f of faelle?.cases ?? []) karte.set(f.id, f.person_name || 'Ohne Namen')
    return karte
  }, [faelle])

  async function wegnehmen(p: Puls) {
    const ok = await bestaetigen({
      titel: 'Diesen Moment wegnehmen?',
      text: 'Er verschwindet aus deinem Verlauf und aus der Kurve. Das lässt sich nicht rückgängig machen.',
      knopf: 'Wegnehmen',
      gefahr: true,
    })
    if (ok) loeschen.mutate(p.id)
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-[760px] px-6 py-8">
        <Link
          to="/app/kompass"
          className="text-[0.8rem] text-brand-muted no-underline transition-colors hover:text-navy"
        >
          ← Mein Kompass
        </Link>

        <header className="mb-6 mt-3">
          <h1 className="page-title">Meine Spur</h1>
          <p className="mt-1 max-w-[62ch] text-sm text-brand-muted">
            Alles, was du festgehalten hast, auf einer Achse — Momente, Sätze, Vorhaben
            und Porträts. Die Linie oben zeigt die Bewegung, die Achse darunter die
            Gründe.
          </p>
        </header>

        {/* Der Fehler zuerst. Sonst fiele ein gescheiterter Abruf auf die leere Liste
            zurück, und die Seite behauptete „In diesem Zeitraum liegt noch nichts" —
            ein Leerzustand ohne Grund ist schlimmer als eine Fehlermeldung. */}
        {verlaufFehler ? (
          <Fehlermeldung error={verlaufFehler} />
        ) : isLoading ? (
          <PageSkeleton cards={2} label="Dein Verlauf wird geladen" />
        ) : (
          <>
            <section className="card card-static">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="card-title-lg">Die Linie</h2>
                <div className="flex gap-1" role="group" aria-label="Zeitraum">
                  {ZEITRAEUME.map(z => (
                    <button
                      key={z.tage}
                      type="button"
                      onClick={() => { setTage(z.tage); setOffen(null) }}
                      aria-pressed={tage === z.tage}
                      className={`rounded-full px-3 py-1 text-[0.75rem] font-medium transition-colors ${
                        tage === z.tage
                          ? 'bg-navy text-white'
                          : 'text-brand-muted hover:bg-brand-bg hover:text-navy'
                      }`}
                    >
                      {z.label}
                    </button>
                  ))}
                </div>
              </div>

              {liste.length >= 2 ? (
                <>
                  <div className="mt-4">
                    {/* Am Telefon höher als auf dem Dashboard: Hier IST die Kurve der
                        Inhalt und nicht die Fußnote unter drei Karten. */}
                    <VerlaufsKurve
                      pulse={liste}
                      tage={tage}
                      hoehe={190}
                      gewaehlt={offen}
                      onWahl={p => setOffen(o => (o === p.id ? null : p.id))}
                    />
                  </div>
                  <p className="mt-3 text-[0.86rem] text-brand-muted">
                    {rhythmusSatz(liste.length, tage)}
                    {richtung && <> {richtung.satz}</>}
                  </p>
                  <p className="mt-1 text-[0.74rem] text-brand-muted">
                    Tipp einen Punkt an, um den Moment unten zu finden.
                  </p>
                </>
              ) : (
                <p className="mt-2 text-[0.88rem] leading-relaxed text-brand-muted">
                  {liste.length === 0
                    ? 'In diesem Zeitraum liegt noch nichts. Halte im Kompass einen Moment fest — ein Antippen genügt.'
                    : 'Ein Moment ist noch keine Linie. Ab dem zweiten zeigt sich hier eine Bewegung.'}
                </p>
              )}
            </section>

            <Fehlermeldung error={loeschen.error} className="mt-4" />

            <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="section-label !mb-0">Die Achse</h2>
              {/* Ein Schalter, kein Filter-Menue: Es gibt genau eine Entscheidung, und
                  sie ist aus, bis jemand sie trifft. */}
              <label className="flex cursor-pointer items-center gap-2 text-[0.78rem] text-brand-muted transition-colors hover:text-navy">
                <input
                  type="checkbox"
                  checked={mitSzenen}
                  onChange={e => setMitSzenen(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-brand-border accent-accent"
                />
                Szenen aus meinen Fällen einblenden
              </label>
            </div>

            {gruppen.length > 0 ? (
              <section className="mt-3 space-y-5">
                {gruppen.map(g => (
                  <div key={g.tag}>
                    <h3 className="section-label">{g.label}</h3>
                    <div className="mt-2 space-y-2">
                      {g.pulse.map(p => (
                        <MomentZeile
                          key={p.id}
                          puls={p}
                          hervorgehoben={offen === p.id}
                          wortLabel={wortLabel}
                          fallName={fallName}
                          onWegnehmen={() => wegnehmen(p)}
                          laeuft={loeschen.isPending && loeschen.variables === p.id}
                          aufDerListe={agenda.istDrauf('puls', p.id)}
                          onBesprechen={agenda.umschalten}
                        />
                      ))}
                      {g.ereignisse.map((e, i) => (
                        <SpurZeile key={`${e.art}-${e.am}-${i}`} ereignis={e} />
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            ) : (
              <p className="mt-3 text-[0.88rem] leading-relaxed text-brand-muted">
                In diesem Zeitraum liegt noch nichts. Was du festhältst, sammelt sich
                hier von selbst.
              </p>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}

// ── Ein Moment in der Liste ──────────────────────────────────────────────────

function MomentZeile({
  puls: p, hervorgehoben, wortLabel, fallName, onWegnehmen, laeuft,
  aufDerListe, onBesprechen,
}: {
  puls: Puls
  hervorgehoben: boolean
  wortLabel: Map<string, string>
  fallName: Map<string, string>
  onWegnehmen: () => void
  laeuft: boolean
  aufDerListe: boolean
  onBesprechen: (art: AgendaArt, zielId: string, drauf: boolean) => Promise<unknown>
}) {
  const farbe = ton(p.zustand).hex
  return (
    <article
      className={`rounded-brand border bg-brand-card p-4 transition-all ${
        hervorgehoben
          ? 'border-accent/60 shadow-brand'
          : 'border-brand-border shadow-brand-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Der Streifen trägt die Farbe des Zustands — in einer Liste aus zwanzig
            Einträgen findet man die schweren Tage daran, ohne zu lesen. */}
        <span
          className="mt-1 h-8 w-1 shrink-0 rounded-full"
          style={{ backgroundColor: farbe }}
          aria-hidden="true"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-[0.95rem] font-semibold" style={{ color: ton(p.zustand).schrift }}>
              {p.zustand_label}
            </span>
            <span className="text-[0.75rem] text-brand-muted">{zeitWort(p.created_at)}</span>
            {p.anspannung !== null && (
              <span className="text-[0.75rem] text-brand-muted">
                · Anspannung {p.anspannung}/10
              </span>
            )}
          </div>

          {p.worte.length > 0 && (
            <p className="mt-1.5 text-[0.82rem] text-brand-muted">
              {p.worte.map(w => wortLabel.get(w) ?? w).join(' · ')}
            </p>
          )}

          {p.notiz && (
            <p className="mt-2 whitespace-pre-wrap text-[0.88rem] leading-relaxed text-brand-text">
              {p.notiz}
            </p>
          )}

          {p.geholfen && (
            <p className="mt-2 rounded-brand-sm bg-accent/[0.07] px-3 py-2 text-[0.84rem] leading-relaxed text-navy">
              <span className="font-semibold">Hat gutgetan:</span> {p.geholfen}
            </p>
          )}

          {p.case_id && fallName.has(p.case_id) && (
            <p className="mt-2 text-[0.75rem] text-brand-muted">
              Mit {fallName.get(p.case_id)}
            </p>
          )}

          {/* Erst nach dem Inhalt: Der Knopf ist ein Nachgedanke zu dem, was dasteht,
              und keine Aufforderung beim Lesen. */}
          <div className="mt-2 -ml-2.5">
            <BesprechenKnopf
              art="puls"
              zielId={p.id}
              markiert={aufDerListe}
              onUmschalten={onBesprechen}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onWegnehmen}
          disabled={laeuft}
          aria-label="Diesen Moment wegnehmen"
          title="Wegnehmen"
          className="shrink-0 rounded-brand-sm p-1.5 text-brand-muted transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        >
          <svg
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" className="h-4 w-4" aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </article>
  )
}

// ── Alles, was kein Moment ist ───────────────────────────────────────────────
// Schmal mit Absicht. Ein bestätigter Satz hat seine eigene Seite, eine Szene auch —
// hier steht, DASS an dem Tag etwas war, und ein Klick führt dorthin. Stünde hier
// jeweils der ganze Text, wäre die Achse nach zwei Monaten unlesbar.

const ETIKETT: Record<SpurEreignis['art'], { farbe: string; wort: string }> = {
  puls:     { farbe: 'bg-brand-muted', wort: 'Moment' },
  satz:     { farbe: 'bg-accent', wort: 'Satz' },
  vorhaben: { farbe: 'bg-navy', wort: 'Vorhaben' },
  schritt:  { farbe: 'bg-accent/60', wort: 'Schritt' },
  portrait: { farbe: 'bg-navy', wort: 'Porträt' },
  szene:    { farbe: 'bg-brand-border', wort: 'Szene' },
}

function SpurZeile({ ereignis: e }: { ereignis: SpurEreignis }) {
  const etikett = ETIKETT[e.art] ?? ETIKETT.puls
  const inhalt = (
    <>
      <span
        className={`mt-[0.45rem] h-2 w-2 shrink-0 rounded-full ${etikett.farbe}`}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[0.84rem] font-semibold text-navy">{e.titel}</span>
          <span className="text-[0.72rem] text-brand-muted">{zeitWort(e.am)}</span>
        </span>
        {e.detail && (
          <span className="mt-0.5 block text-[0.84rem] leading-snug text-brand-text">
            {e.art === 'satz' ? `„${e.detail}“` : e.detail}
          </span>
        )}
      </span>
    </>
  )

  const klassen = 'flex items-start gap-3 rounded-brand border border-brand-border/70 bg-brand-card px-4 py-2.5 no-underline transition-colors'

  return e.ziel
    ? <Link to={e.ziel} className={`${klassen} hover:border-accent/40`}>{inhalt}</Link>
    : <div className={klassen}>{inhalt}</div>
}
