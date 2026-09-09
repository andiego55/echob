/**
 * /app/cases/:caseId/resonanz — was du wiedererkannt hast
 *
 * **Wofür diese Seite gut ist.** Wer wenig eigenes Material hat, hat hier trotzdem etwas:
 * zwanzig Szenen, die er als vertraut markiert hat. Einzeln sagt das wenig. Zusammen zeigt
 * es eine Richtung — und zwar oft eine, die die Person selbst noch nicht in Worte gefasst
 * hat. Genau dafür steht sie hier: nicht als Ergebnis, sondern als etwas zum Ansehen.
 *
 * **Warum hier keine Punktwerte stehen.** Die Szenen sind Literatur, keine geeichten
 * Testitems: nicht gleich schwer, nicht gleich häufig, nicht unabhängig voneinander. Ein
 * „Wert" darüber sähe aus wie eine Messung und wäre keine. Gezählt wird deshalb, was
 * zählbar ist — wie viele wiedererkannte Szenen eine Wirkung berühren, und wie belastend
 * die Person sie selbst genannt hat. Die Balken sind Anteile an der größten Zeile, nicht
 * an einer Skala; deshalb steht die Zahl immer daneben.
 *
 * **Zwei Achsen, und das ist der Kern.** Links, was es mit ihr macht (Erschöpfung, Zweifel,
 * Wachsamkeit) — rechts, was in den Szenen geschieht (Kontrolle, Rückzug, Abwertung). Die
 * erste Achse ist die, die eine Person über sich selbst meist nicht ausspricht.
 */
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import Fehlermeldung from '@/components/Fehlermeldung'
import ResonanzUebernahme from '@/components/app/ResonanzUebernahme'
import ResonanzFassung from '@/components/app/ResonanzFassung'
import { ListSkeleton } from '@/components/Skeleton'
import { resonanzApi, type ResonanzEintrag, type ResonanzFrage } from '@/api/resonanz'
import { REAKTIONS_INFOS, REAKTION_LABEL, SKALEN, istWiedererkannt, type Reaktion } from '@/lib/resonanz'

type Filter = 'alle' | Reaktion

function Balken({ anteil, gedaempft }: { anteil: number; gedaempft?: boolean }) {
  return (
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-border/50" aria-hidden="true">
      <div
        className={`h-full rounded-full ${gedaempft ? 'bg-navy/35' : 'bg-accent'}`}
        style={{ width: `${Math.max(6, Math.round(anteil * 100))}%` }}
      />
    </div>
  )
}

function LeerZustand({ caseId }: { caseId: string }) {
  return (
    <div className="rounded-brand-lg border border-dashed border-brand-border bg-white px-7 py-10 text-center">
      <p className="text-[1.05rem] font-semibold text-navy">Hier ist noch nichts.</p>
      <p className="mx-auto mt-2 max-w-[52ch] text-sm leading-relaxed text-brand-muted">
        Auf <Link to="/szenen" className="font-medium text-accent hover:underline">/szenen</Link>{' '}
        liegen erfundene Beziehungsszenen. Wenn dir eine bekannt vorkommt, tipp auf
        „Kenne ich" — mehr ist nicht nötig. Was sich daraus ergibt, siehst du hier.
      </p>
      <Link to="/szenen" className="btn-primary mt-5 inline-block !px-6 !py-3">
        Szenen lesen
      </Link>
      <p className="mt-4 text-xs text-brand-muted/70">
        Fall: <span className="font-mono">{caseId.slice(0, 8)}</span>
      </p>
    </div>
  )
}

function EintragsKarte({
  eintrag, caseId, fragen, offen, onZuordnen, onLoesen, onOeffnen, onSchliessen,
  onUebernommen, zuordnenLaeuft,
}: {
  eintrag: ResonanzEintrag
  caseId: string
  fragen: ResonanzFrage[]
  offen: boolean
  onZuordnen: (slug: string) => void
  onLoesen: (slug: string) => void
  onOeffnen: (slug: string) => void
  onSchliessen: () => void
  onUebernommen: (nr: number) => void
  zuordnenLaeuft: boolean
}) {
  const e = eintrag
  return (
    <li className="rounded-brand border border-brand-border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          {e.perspective && (
            <p className="text-[0.66rem] font-semibold uppercase tracking-wide text-accent/70">
              {e.perspective}
            </p>
          )}
          <p className="text-[1rem] font-bold leading-snug text-navy">
            {e.verwaist ? (
              <span className="text-brand-muted">Diese Szene gibt es nicht mehr</span>
            ) : (
              <Link to={`/szenen/${e.scene_slug}`} className="hover:text-accent hover:underline">
                {e.title}
              </Link>
            )}
          </p>
        </div>
        <span className="whitespace-nowrap rounded-full border border-accent/30 bg-accent/[0.06] px-3 py-1 text-[0.74rem] font-medium text-navy">
          {REAKTION_LABEL[e.reaction]}
        </span>
      </div>

      {(e.frequency || e.distress) && (
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[0.82rem] text-brand-muted">
          {SKALEN.map(s => {
            const wert = e[s.key]
            if (!wert) return null
            return (
              <span key={s.key}>
                {s.frage.replace(/\?$/, '')}:{' '}
                <span className="font-semibold text-navy">{s.punkte[wert - 1]}</span>
                <span className="text-brand-muted/70"> ({wert}/5)</span>
              </span>
            )
          })}
        </div>
      )}

      {e.note && (
        <blockquote className="mt-3 border-l-2 border-accent/40 pl-3.5 text-[0.9rem] leading-relaxed text-brand-text">
          {e.note}
        </blockquote>
      )}

      {(e.wirkungen.length > 0 || e.muster.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {e.wirkungen.map(w => (
            <span key={w} className="rounded-full bg-accent/[0.08] px-2.5 py-0.5 text-[0.7rem] text-navy">
              {w}
            </span>
          ))}
          {e.muster.map(m => (
            <span key={m} className="rounded-full bg-navy/[0.06] px-2.5 py-0.5 text-[0.7rem] text-brand-muted">
              {m}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.82rem]">
        {/* Die Zuordnung geht in BEIDE Richtungen, und der Rueckweg ist der wichtigere.
            Bei mehreren Faellen ordnet man im Vorbeigehen zu und merkt spaeter, dass es
            die andere Beziehung war. Ohne diesen Knopf waere das nicht mehr zu
            korrigieren: Ein Eintrag, der Fall A gehoert, taucht bei Fall B gar nicht auf.

            Derselbe Knopf loest auch die Falle der stillen Zuordnung: Wer heute EINEN Fall
            hat, bekommt alles automatisch zugeordnet - legt er in drei Monaten einen
            zweiten an, haengen die alten Eintraege fest, auch die, die zum neuen
            gehoeren. */}
        {!e.verwaist && !e.promoted_scene_id && (
          e.case_id === null ? (
            <button
              type="button"
              onClick={() => onZuordnen(e.scene_slug)}
              disabled={zuordnenLaeuft}
              className="font-semibold text-accent hover:underline disabled:opacity-50"
            >
              Gehört zu diesem Fall
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onLoesen(e.scene_slug)}
              disabled={zuordnenLaeuft}
              className="text-brand-muted hover:text-navy hover:underline disabled:opacity-50"
            >
              Gehört doch nicht hierher
            </button>
          )
        )}
        {/* Der einzige Weg zu einer Szene fuehrt ueber die Ausarbeitung. Der Knopf
            heisst deshalb nicht „Szene anlegen“ - er oeffnet ein Menue, in dem die
            gefuehrten Fragen stehen und Echo gegen die erfundene Geschichte liest. */}
        {!e.promoted_scene_id && !e.verwaist && (
          <button
            type="button"
            onClick={() => (offen ? onSchliessen() : onOeffnen(e.scene_slug))}
            className="font-semibold text-accent hover:underline"
          >
            {offen
              ? 'Ausarbeitung schließen'
              : Object.keys(e.ausarbeitung).length > 0
                ? 'Fassung weiterschreiben →'
                : 'In eigene Worte fassen →'}
          </button>
        )}
        {e.promoted_scene_id && (
          <Link
            to={`/app/cases/${caseId}/scenes/${e.promoted_scene_id}`}
            className="text-brand-muted hover:text-navy hover:underline"
          >
            Daraus wurde eine eigene Szene →
          </Link>
        )}
      </div>

      {offen && (
        <ResonanzFassung
          eintrag={e}
          caseId={caseId}
          fragen={fragen}
          onSchliessen={onSchliessen}
          onUebernommen={onUebernommen}
        />
      )}
    </li>
  )
}

export default function ResonanzPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const qc = useQueryClient()
  const [filter, setFilter] = useState<Filter>('alle')
  const [offenerSlug, setOffenerSlug] = useState<string | null>(null)
  const [geradeUebernommen, setGeradeUebernommen] = useState<number | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['resonanz-ueberblick', caseId],
    queryFn: () => resonanzApi.ueberblick(caseId!),
    enabled: !!caseId,
  })

  const frisch = () => {
    qc.invalidateQueries({ queryKey: ['resonanz-ueberblick', caseId] })
    qc.invalidateQueries({ queryKey: ['resonanz-ueberblick'] })
  }
  const zuordnen = useMutation({
    mutationFn: (slug: string) => resonanzApi.zuordnen(slug, caseId!),
    onSuccess: frisch,
  })
  const loesen = useMutation({
    mutationFn: (slug: string) => resonanzApi.zuordnen(slug, null),
    onSuccess: frisch,
  })
  function uebernommen(nr: number) {
    setOffenerSlug(null)
    setGeradeUebernommen(nr)
    qc.invalidateQueries({ queryKey: ['scenes', caseId] })
  }

  const eintraege = data?.eintraege ?? []
  const a = data?.auswertung

  const gefiltert = useMemo(
    () => (filter === 'alle' ? eintraege : eintraege.filter(e => e.reaction === filter)),
    [eintraege, filter],
  )

  // Der Bezugswert der Balken: die groesste Zeile, nicht die Gesamtzahl. Sonst sieht eine
  // Sammlung von acht Szenen aus wie „fast nichts" - und das ist keine Aussage ueber die
  // Person, sondern ueber die Menge.
  const maxWirkung = Math.max(1, ...(a?.wirkungen ?? []).map(w => w.anzahl))
  const maxGruppe = Math.max(1, ...(a?.mustergruppen ?? []).map(g => g.anzahl))

  return (
    <AppShell>
      <CaseNav caseId={caseId!} />

      <div className="mx-auto max-w-[980px] px-6 py-8">
        <div className="mb-6">
          <h1 className="page-title">Wiedererkanntes</h1>
          <p className="mt-1 max-w-[62ch] text-sm leading-relaxed text-brand-muted">
            Erfundene Szenen, die dir bekannt vorkamen. Einzeln sagt das wenig — zusammen
            zeigt es oft eine Richtung. Es ist kein Test und kein Ergebnis: nichts davon
            behauptet, was dir passiert ist.
          </p>
        </div>

        <ResonanzUebernahme caseId={caseId} />

        {geradeUebernommen !== null && (
          <p className="mb-4 rounded-brand bg-green-50 px-5 py-3 text-[0.88rem] text-green-900">
            Übernommen als Szene {geradeUebernommen}.{' '}
            <Link to={`/app/cases/${caseId}/scenes`} className="font-semibold underline">
              Zu deinen Szenen
            </Link>
          </p>
        )}

        {isLoading && <ListSkeleton rows={3} label="Wird geladen" />}
        {error && <Fehlermeldung error={error} />}

        {data && eintraege.length === 0 && <LeerZustand caseId={caseId!} />}

        {data && eintraege.length > 0 && a && (
          <>
            {/* ── Kopfzahlen ───────────────────────────────────────────── */}
            <div className="mb-6 flex flex-wrap gap-x-8 gap-y-3 rounded-brand-lg border border-brand-border bg-white px-6 py-5">
              <div>
                <p className="text-[1.6rem] font-extrabold leading-none text-navy">{a.wiedererkannt}</p>
                <p className="mt-1 text-[0.78rem] text-brand-muted">wiedererkannt</p>
              </div>
              <div>
                <p className="text-[1.6rem] font-extrabold leading-none text-navy/50">{a.gesamt}</p>
                <p className="mt-1 text-[0.78rem] text-brand-muted">Szenen eingeordnet</p>
              </div>
              {a.je_reaktion.andere_seite > 0 && (
                <div>
                  <p className="text-[1.6rem] font-extrabold leading-none text-navy/50">
                    {a.je_reaktion.andere_seite}
                  </p>
                  <p className="mt-1 text-[0.78rem] text-brand-muted">von der anderen Seite</p>
                </div>
              )}
            </div>

            {/* ── Die beiden Achsen ────────────────────────────────────── */}
            <div className="mb-8 grid gap-5 lg:grid-cols-2">
              <section className="rounded-brand-lg border border-brand-border bg-white p-6">
                <h2 className="section-label">Was es mit dir macht</h2>
                <p className="mt-1 text-[0.8rem] leading-snug text-brand-muted">
                  Aus den Szenen, die du wiedererkannt hast.
                </p>
                {a.wirkungen.length === 0 ? (
                  <p className="mt-4 text-sm text-brand-muted">
                    Noch zu wenig, um etwas zu zeigen.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3.5">
                    {a.wirkungen.map(w => (
                      <li key={w.name}>
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-[0.92rem] font-semibold text-navy">{w.name}</span>
                          <span className="whitespace-nowrap text-[0.78rem] text-brand-muted">
                            {w.anzahl}
                            {w.belastung !== null && (
                              <span className="text-brand-muted/70">
                                {' '}· Ø Belastung {w.belastung.toLocaleString('de-DE')}
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-3">
                          <Balken anteil={w.anzahl / maxWirkung} />
                        </div>
                        <p className="mt-1 text-[0.75rem] leading-snug text-brand-muted/80">
                          {w.hinweis}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-brand-lg border border-brand-border bg-white p-6">
                <h2 className="section-label">Was in den Szenen geschieht</h2>
                <p className="mt-1 text-[0.8rem] leading-snug text-brand-muted">
                  Das Verhalten, um das es dort geht — nicht deine Beziehung.
                </p>
                {a.mustergruppen.length === 0 ? (
                  <p className="mt-4 text-sm text-brand-muted">
                    Deine Szenen handeln bisher eher von Zuständen als von Handlungen.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3.5">
                    {a.mustergruppen.map(g => (
                      <li key={g.name}>
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-[0.92rem] font-semibold text-navy">{g.name}</span>
                          <span className="text-[0.78rem] text-brand-muted">{g.anzahl}</span>
                        </div>
                        <div className="mt-1.5">
                          <Balken anteil={g.anzahl / maxGruppe} gedaempft />
                        </div>
                        <p className="mt-1 text-[0.75rem] leading-snug text-brand-muted/80">
                          {g.klassen.map(k => `${k.name} (${k.anzahl})`).join(' · ')}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            {/* ── Die Szenen selbst ────────────────────────────────────── */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <h2 className="section-label mr-2">Deine Einordnungen</h2>
              {(['alle', ...REAKTIONS_INFOS.map(r => r.key)] as Filter[]).map(f => {
                const anzahl = f === 'alle'
                  ? eintraege.length
                  : eintraege.filter(e => e.reaction === f).length
                if (anzahl === 0) return null
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={[
                      'rounded-full border px-3 py-1 text-[0.78rem] transition-colors',
                      filter === f
                        ? 'border-accent bg-accent text-white'
                        : 'border-brand-border bg-white text-brand-muted hover:border-accent/50 hover:text-navy',
                    ].join(' ')}
                  >
                    {f === 'alle' ? 'Alle' : REAKTION_LABEL[f]} ({anzahl})
                  </button>
                )
              })}
            </div>

            <ul className="space-y-3">
              {gefiltert.map(e => (
                <EintragsKarte
                  key={e.id}
                  eintrag={e}
                  caseId={caseId!}
                  fragen={data.fragen}
                  offen={offenerSlug === e.scene_slug}
                  onZuordnen={slug => zuordnen.mutate(slug)}
                  onLoesen={slug => loesen.mutate(slug)}
                  onOeffnen={setOffenerSlug}
                  onSchliessen={() => setOffenerSlug(null)}
                  onUebernommen={uebernommen}
                  zuordnenLaeuft={zuordnen.isPending || loesen.isPending}
                />
              ))}
            </ul>

            {eintraege.some(e => e.case_id === null) && (
              <p className="mt-5 rounded-brand bg-navy/[0.03] px-5 py-4 text-[0.84rem] leading-relaxed text-brand-muted">
                Einige Einordnungen sind noch keinem Fall zugeordnet. Das passiert, wenn du
                mehr als einen Fall hast — beim Lesen einer Szene ist ja nicht klar, um wen
                es geht. Erst zugeordnete Einordnungen fließen in die Gespräche dieses Falls
                ein, und erst aus ihnen kann eine Szene werden. Was hierher gehört, ordnest
                du mit einem Klick zu; was du versehentlich zugeordnet hast, löst du mit
                „Gehört doch nicht hierher" wieder.
              </p>
            )}

            {istWiedererkannt(gefiltert[0]?.reaction) && (
              <p className="mt-6 text-center text-[0.8rem] leading-relaxed text-brand-muted/80">
                Wiedererkennen ist kein Bericht. Was bei dir wirklich geschehen ist, weißt
                nur du — und es steht hier nur, soweit du es aufgeschrieben hast.
              </p>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
