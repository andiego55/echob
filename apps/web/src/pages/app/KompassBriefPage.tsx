/**
 * /app/kompass/brief — Ein Brief an dich selbst
 *
 * **An einem guten Tag schreibt man anders als an einem schlechten.** Der Raum nutzt das:
 * ein paar Zeilen an das eigene Ich in einigen Monaten — „Falls du dann wieder an
 * derselben Stelle stehst …". Dieselbe Mechanik wie beim Krisenplan, und aus demselben
 * Grund: Die starke Version deiner selbst schreibt für die schwächere.
 *
 * **Er liegt zu, bis das Datum kommt — und das steht nicht hier.** Der Server schickt den
 * Text verschlossener Briefe gar nicht erst mit. Diese Seite könnte ihn also auch dann
 * nicht zeigen, wenn jemand sie umbaute; das ist Absicht. Eine Regel, die nur in der
 * Oberfläche steht, ist keine.
 *
 * **Kein „doch schon lesen".** Der Knopf würde genau in dem Moment gedrückt, für den der
 * Brief nicht geschrieben ist: aus Neugier, nicht aus Not. Zurücknehmen geht dagegen
 * jederzeit — sonst wäre der Brief etwas, das einem passiert.
 *
 * **Warum das Öffnen ein Klick ist und nicht von selbst passiert.** Ein Brief, der beim
 * Aufschlagen der Seite schon offen daliegt, ist eine Benachrichtigung. Einer, den man
 * aufmacht, ist ein Brief.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import Fehlermeldung from '@/components/Fehlermeldung'
import { PageSkeleton } from '@/components/Skeleton'
import { useBestaetigen } from '@/components/Bestaetigung'
import { kompassApi, type Brief } from '@/api/kompass'
import { altersWort } from '@/lib/kompass'

export default function KompassBriefPage() {
  const qc = useQueryClient()
  const bestaetigen = useBestaetigen()
  const [schreibt, setSchreibt] = useState(false)
  const [text, setText] = useState('')
  const [tage, setTage] = useState<number | null>(null)
  // Geöffnete Briefe leben hier und nicht in der Liste: Die Liste kommt ohne Text, und
  // das soll sie auch. Was offen ist, ist offen — bis die Seite neu lädt.
  const [geoeffnet, setGeoeffnet] = useState<Record<string, string>>({})

  const { data: katalog, error: katalogFehler } = useQuery({
    queryKey: ['kompass-katalog'],
    queryFn: kompassApi.katalog,
    staleTime: Infinity,
  })
  const { data: briefe, isLoading, error } = useQuery({
    queryKey: ['kompass-briefe'],
    queryFn: kompassApi.briefe,
  })

  const frisch = () => {
    qc.invalidateQueries({ queryKey: ['kompass-briefe'] })
    qc.invalidateQueries({ queryKey: ['kompass'] })
  }

  const legen = useMutation({
    mutationFn: ({ text, tage }: { text: string; tage: number }) =>
      kompassApi.briefSchreiben(text, tage),
    onSuccess: () => { setText(''); setTage(null); setSchreibt(false); frisch() },
  })
  const oeffnen = useMutation({
    mutationFn: (id: string) => kompassApi.briefOeffnen(id),
    onSuccess: b => { setGeoeffnet(alt => ({ ...alt, [b.id]: b.text ?? '' })); frisch() },
  })
  const zuruecknehmen = useMutation({
    mutationFn: (id: string) => kompassApi.briefZuruecknehmen(id),
    onSuccess: frisch,
  })

  async function wegnehmen(b: Brief) {
    const ok = await bestaetigen({
      titel: b.offen ? 'Diesen Brief wegnehmen?' : 'Diesen verschlossenen Brief wegnehmen?',
      text: b.offen
        ? 'Er verschwindet ganz.'
        : 'Er verschwindet ganz — und du wirst nie lesen, was darin stand.',
      knopf: 'Wegnehmen',
      gefahr: true,
    })
    if (ok) zuruecknehmen.mutate(b.id)
  }

  if (katalogFehler || error) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[680px] px-6 py-8">
          <h1 className="page-title">Ein Brief an dich selbst</h1>
          <Fehlermeldung error={katalogFehler ?? error} className="mt-3" />
        </div>
      </AppShell>
    )
  }

  if (isLoading || !katalog) {
    return <AppShell><PageSkeleton cards={2} label="Deine Briefe werden geladen" /></AppShell>
  }

  const alle = briefe ?? []
  const wartend = alle.filter(b => b.offen && !b.gelesen_at)
  const zu = alle.filter(b => !b.offen)
  const gelesen = alle.filter(b => b.offen && b.gelesen_at)

  return (
    <AppShell>
      <div className="mx-auto max-w-[680px] px-6 py-8">
        <Link
          to="/app/kompass"
          className="text-[0.8rem] text-brand-muted no-underline transition-colors hover:text-navy"
        >
          ← Mein Kompass
        </Link>

        <header className="mb-6 mt-3">
          <h1 className="page-title">Ein Brief an dich selbst</h1>
          <p className="mt-1 max-w-[58ch] text-sm text-brand-muted">
            An einem guten Tag schreibt man anders als an einem schlechten. Schreib ein
            paar Zeilen an dich in ein paar Monaten — sie liegen zu, bis der Tag da ist.
          </p>
        </header>

        {/* ── Was heute aufgeht ─────────────────────────────────────────────── */}
        {wartend.map(b => (
          <section key={b.id} className="card card-hero card-static mb-3 border-accent/50">
            {geoeffnet[b.id] !== undefined ? (
              <>
                <p className="section-label">Du hast dir geschrieben</p>
                <p className="mt-2 whitespace-pre-wrap text-[1.02rem] leading-[1.8] text-navy">
                  {geoeffnet[b.id]}
                </p>
                <p className="mt-3 text-[0.78rem] text-brand-muted">
                  Geschrieben {altersWort(b.created_at)}.
                </p>
              </>
            ) : (
              <div className="py-3 text-center">
                <h2 className="card-title-lg">Hier liegt ein Brief für dich.</h2>
                <p className="mx-auto mt-2 max-w-[42ch] text-[0.88rem] leading-relaxed text-brand-muted">
                  Du hast ihn {altersWort(b.created_at)} geschrieben — für heute.
                </p>
                <button
                  type="button"
                  disabled={oeffnen.isPending}
                  onClick={() => oeffnen.mutate(b.id)}
                  className="btn-primary mt-4"
                >
                  {oeffnen.isPending ? 'Wird geöffnet …' : 'Aufmachen'}
                </button>
              </div>
            )}
          </section>
        ))}

        {/* ── Schreiben ─────────────────────────────────────────────────────── */}
        <section className="card card-static">
          {schreibt ? (
            <div className="beitrag-neu">
              <label
                htmlFor="brieftext"
                className="block text-[0.95rem] font-semibold text-navy"
              >
                Was willst du dir sagen?
              </label>
              <p className="mt-1 max-w-[54ch] text-[0.83rem] leading-relaxed text-brand-muted">
                Schreib an den Menschen, der du in ein paar Monaten bist — und zwar an den
                an einem schlechten Tag. Was hättest du dann gern gewusst?
              </p>
              <textarea
                id="brieftext"
                value={text}
                onChange={e => setText(e.target.value.slice(0, katalog.brief_max_zeichen))}
                rows={7}
                autoFocus
                placeholder="Falls du dann wieder an derselben Stelle stehst …"
                className="input mt-3 resize-y text-[0.98rem] leading-relaxed"
              />
              <p className="mt-1 text-right text-[0.72rem] text-brand-muted">
                {text.length} / {katalog.brief_max_zeichen}
              </p>

              <p className="mt-3 text-[0.84rem] font-semibold text-navy">Wann soll er aufgehen?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {katalog.brief_abstaende.map(a => (
                  <button
                    key={a.tage}
                    type="button"
                    onClick={() => setTage(a.tage)}
                    aria-pressed={tage === a.tage}
                    className={`rounded-full px-4 py-1.5 text-[0.82rem] font-medium transition-colors ${
                      tage === a.tage
                        ? 'bg-navy text-white'
                        : 'border border-brand-border text-brand-muted hover:border-accent/40 hover:text-navy'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>

              <p className="mt-4 text-[0.8rem] leading-relaxed text-brand-muted">
                Danach ist er zu. Du kannst ihn jederzeit wegnehmen, aber nicht vorher
                lesen — das ist der Punkt.
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={!text.trim() || tage === null || legen.isPending}
                  onClick={() => legen.mutate({ text, tage: tage! })}
                  className="btn-primary !px-5 !py-2 !text-sm disabled:opacity-50"
                >
                  {legen.isPending ? 'Wird zugeklebt …' : 'Zukleben'}
                </button>
                <button
                  type="button"
                  onClick={() => { setSchreibt(false); setText(''); setTage(null) }}
                  className="text-[0.82rem] text-brand-muted transition-colors hover:text-navy"
                >
                  Abbrechen
                </button>
              </div>
              <Fehlermeldung error={legen.error} className="mt-3" />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSchreibt(true)}
              className="flex w-full items-center justify-center gap-2 py-2 text-[0.92rem] font-semibold text-accent transition-colors hover:text-accent-hover"
            >
              <span aria-hidden="true">+</span> Einen Brief schreiben
            </button>
          )}
        </section>

        {/* ── Was noch zu ist ───────────────────────────────────────────────── */}
        {zu.length > 0 && (
          <section className="mt-6">
            <h2 className="section-label">Verschlossen</h2>
            <div className="mt-2 space-y-2">
              {zu.map(b => (
                <article
                  key={b.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-brand border border-dashed border-brand-border bg-brand-bg/50 px-4 py-3"
                >
                  <span className="text-[0.9rem] text-brand-text">
                    Geht auf am{' '}
                    <span className="font-semibold text-navy">
                      {new Date(b.oeffnet_am).toLocaleDateString('de-DE',
                        { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </span>
                  <span className="text-[0.75rem] text-brand-muted">
                    geschrieben {altersWort(b.created_at)}
                  </span>
                  <button
                    type="button"
                    onClick={() => wegnehmen(b)}
                    className="ml-auto text-[0.78rem] text-brand-muted transition-colors hover:text-red-600"
                  >
                    Wegnehmen
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ── Was schon angekommen ist ──────────────────────────────────────── */}
        {gelesen.length > 0 && (
          <section className="mt-6">
            <h2 className="section-label">Angekommen</h2>
            <div className="mt-2 space-y-3">
              {gelesen.map(b => (
                <article
                  key={b.id}
                  className="rounded-brand border border-brand-border bg-brand-card p-4 shadow-brand-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-[0.78rem] text-brand-muted">
                      Geschrieben {altersWort(b.created_at)}, gelesen {altersWort(b.gelesen_at)}
                    </span>
                    <button
                      type="button"
                      onClick={() => wegnehmen(b)}
                      className="text-[0.78rem] text-brand-muted transition-colors hover:text-red-600"
                    >
                      Wegnehmen
                    </button>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-[0.96rem] leading-[1.75] text-brand-text">
                    {b.text}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}

        {alle.length === 0 && !schreibt && (
          <p className="mt-6 max-w-[54ch] text-[0.86rem] leading-relaxed text-brand-muted">
            Dasselbe Prinzip wie beim{' '}
            <Link
              to="/app/kompass/krisenplan"
              className="font-semibold text-accent no-underline hover:underline"
            >
              Notfallplan
            </Link>
            : Die Version von dir, der es gerade gut genug geht, schreibt für die, der es
            das nicht tut.
          </p>
        )}

        <Fehlermeldung
          error={oeffnen.error ?? zuruecknehmen.error}
          className="mt-4"
        />
      </div>
    </AppShell>
  )
}
