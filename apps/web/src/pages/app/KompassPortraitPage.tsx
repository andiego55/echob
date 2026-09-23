/**
 * /app/kompass/portrait — Das Selbstporträt
 *
 * **Das Ergebnis zum Anfassen.** Jedes andere Stück des Kompasses erzeugt ein Teil: einen
 * Satz, ein Vorhaben, einen Punkt in einer Kurve. Hier werden sie zu einem Text, den man
 * jemandem zeigen kann — und es ist die Antwort auf die Frage, die viele vor dem ersten
 * Termin haben: Was soll ich eigentlich sagen?
 *
 * **Drei Zustände, und die Seite ist jeweils eine andere.**
 *
 *   *Noch nicht soweit.* Dann steht hier kein gesperrter Knopf, sondern ein Satz, der
 *   sagt, woraus ein Porträt entsteht. Ein ausgegrauter Knopf ist eine Aufforderung, die
 *   man nicht befolgen kann.
 *
 *   *Ein Entwurf liegt da.* Dann ist er das Erste, was man sieht — bearbeitbar. Nichts
 *   davon gilt, bevor man zustimmt.
 *
 *   *Bestätigte Porträts.* Untereinander, neueste zuerst, jedes mit seinem Datum. Das vom
 *   März neben dem vom September zu lesen, ist die ehrlichste Entwicklungsanzeige, die es
 *   gibt.
 *
 * **Warum das Textfeld und nicht nur Lesen.** Was Echo schreibt, ist ein Vorschlag. Ein
 * Text über einen Menschen, den er nicht ändern durfte, gehört ihm nicht — und der eine
 * Satz, der danebenliegt, macht sonst den ganzen wertlos.
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import Fehlermeldung from '@/components/Fehlermeldung'
import { PageSkeleton } from '@/components/Skeleton'
import { useBestaetigen } from '@/components/Bestaetigung'
import { kompassApi, type AgendaArt, type Portrait } from '@/api/kompass'
import { altersWort } from '@/lib/kompass'
import BesprechenKnopf from '@/components/app/kompass/BesprechenKnopf'
import { useAgenda } from '@/hooks/useAgenda'

const MAX_ZEICHEN = 4000

export default function KompassPortraitPage() {
  const qc = useQueryClient()
  const nachfragen = useBestaetigen()
  const agenda = useAgenda()
  const [text, setText] = useState('')
  // Woher der Text im Feld stammt: aus dem gespeicherten Entwurf oder gerade eben von
  // Echo. Ungespeicherte Fassungen duerfen beim Neuladen der Abfrage nicht verschwinden.
  const geladenVon = useRef<string | null>(null)
  const [frischGeschrieben, setFrischGeschrieben] = useState(false)
  const [hinweis, setHinweis] = useState<string | null>(null)

  const { data: stand, isLoading, error } = useQuery({
    queryKey: ['kompass-portrait'],
    queryFn: kompassApi.portrait,
  })

  // Den gespeicherten Entwurf EINMAL ins Feld holen, nicht bei jedem Abruf: Sonst
  // ueberschriebe ein Hintergrund-Refresh, was gerade getippt wurde.
  useEffect(() => {
    const entwurf = stand?.entwurf
    if (entwurf && geladenVon.current !== entwurf.updated_at) {
      geladenVon.current = entwurf.updated_at
      setText(entwurf.text)
    }
  }, [stand])

  const schreiben = useMutation({
    mutationFn: kompassApi.portraitSchreiben,
    onSuccess: v => {
      setHinweis(v.hinweis)
      if (v.text) {
        setText(v.text)
        setFrischGeschrieben(true)
        geladenVon.current = null
      }
    },
  })

  const sichern = useMutation({
    mutationFn: (t: string) => kompassApi.portraitSichern(t),
    onSuccess: p => {
      geladenVon.current = p.updated_at
      setFrischGeschrieben(false)
      qc.invalidateQueries({ queryKey: ['kompass-portrait'] })
    },
  })

  const bestaetigen = useMutation({
    mutationFn: async (t: string) => {
      // Immer erst sichern: Sonst gilt, was im Feld steht, nur scheinbar - bestaetigt
      // wuerde die zuletzt GESPEICHERTE Fassung, und die Aenderung waere still weg.
      await kompassApi.portraitSichern(t)
      return kompassApi.portraitBestaetigen()
    },
    onSuccess: () => {
      setText('')
      setHinweis(null)
      setFrischGeschrieben(false)
      geladenVon.current = null
      qc.invalidateQueries({ queryKey: ['kompass-portrait'] })
      qc.invalidateQueries({ queryKey: ['kompass'] })
    },
  })

  const verwerfen = useMutation({
    // Nur der gespeicherte Entwurf braucht eine Nachfrage. Ein Text, der nur im Feld
    // steht, ist noch nichts - dafuer zu fragen waere Theater.
    mutationFn: async () => {
      const gespeicherterEntwurf = !!stand?.entwurf
      if (gespeicherterEntwurf && !(await nachfragen({
        titel: 'Entwurf verwerfen?',
        text: 'Der Text ist danach weg. Deine Sätze, Momente und Vorhaben bleiben — '
          + 'ein neues Porträt lässt sich daraus jederzeit wieder schreiben.',
        knopf: 'Verwerfen',
        gefahr: true,
      }))) return
      if (gespeicherterEntwurf) await kompassApi.portraitEntwurfVerwerfen()
    },
    onSuccess: () => {
      setText('')
      setHinweis(null)
      setFrischGeschrieben(false)
      geladenVon.current = null
      qc.invalidateQueries({ queryKey: ['kompass-portrait'] })
      qc.invalidateQueries({ queryKey: ['kompass'] })
    },
  })

  // Der Fehler VOR dem Ladezustand: Ohne diesen Zweig bliebe die Seite bei einem
  // gescheiterten Abruf fuer immer im Skelett stehen.
  if (error) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[720px] px-6 py-8">
          <h1 className="page-title">Mein Selbstporträt</h1>
          <Fehlermeldung error={error} className="mt-3" />
        </div>
      </AppShell>
    )
  }

  if (isLoading || !stand) {
    return <AppShell><PageSkeleton cards={2} label="Dein Selbstporträt wird geladen" /></AppShell>
  }

  const imFeld = text.trim()
  const gespeichert = stand.entwurf?.text ?? ''
  const ungespeichert = imFeld.length > 0 && imFeld !== gespeichert.trim()
  const inArbeit = imFeld.length > 0 || !!stand.entwurf
  const laeuft = schreiben.isPending

  return (
    <AppShell>
      <div className="mx-auto max-w-[720px] px-6 py-8">
        <Link
          to="/app/kompass"
          className="text-[0.8rem] text-brand-muted no-underline transition-colors hover:text-navy"
        >
          ← Mein Kompass
        </Link>

        <header className="mb-6 mt-3">
          <h1 className="page-title">Mein Selbstporträt</h1>
          <p className="mt-1 max-w-[62ch] text-sm text-brand-muted">
            Ein zusammenhängender Text darüber, wie du dich gerade siehst — aus deinen
            Sätzen, deinen Momenten und dem, woran du arbeitest. Etwas, das du jemandem
            zeigen kannst.
          </p>
        </header>

        {/* ── Der Arbeitsplatz ──────────────────────────────────────────────── */}
        <section className="card card-hero card-static">
          {laeuft ? (
            <p className="flex items-center justify-center gap-2 py-10 text-[0.9rem] text-brand-muted">
              <span className="flex gap-1" aria-hidden="true">
                <span className="echo-welle h-1.5 w-1.5 rounded-full bg-accent" />
                <span className="echo-welle h-1.5 w-1.5 rounded-full bg-accent" />
                <span className="echo-welle h-1.5 w-1.5 rounded-full bg-accent" />
              </span>
              Echo liest alles noch einmal …
            </p>
          ) : inArbeit ? (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="card-title-lg">
                  {frischGeschrieben ? 'Echos Fassung' : 'Dein Entwurf'}
                </h2>
                <span className="text-[0.74rem] text-brand-muted">
                  {imFeld.length} / {MAX_ZEICHEN}
                </span>
              </div>
              <p className="mt-1 text-[0.84rem] leading-relaxed text-brand-muted">
                {frischGeschrieben
                  ? 'Ändere, was nicht stimmt, streich, was nicht hierher gehört. Gespeichert ist noch nichts.'
                  : 'Noch nicht bestätigt — du kannst weiterschreiben und später zurückkommen.'}
              </p>

              <textarea
                value={text}
                onChange={e => setText(e.target.value.slice(0, MAX_ZEICHEN))}
                rows={16}
                className="input mt-3 resize-y text-[0.98rem] leading-[1.75]"
                aria-label="Dein Selbstporträt"
              />

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={!imFeld || bestaetigen.isPending}
                  onClick={() => bestaetigen.mutate(text)}
                  className="btn-primary !px-5 !py-2 !text-sm disabled:opacity-50"
                >
                  {bestaetigen.isPending ? 'Wird bestätigt …' : 'So sehe ich mich'}
                </button>
                <button
                  type="button"
                  disabled={!ungespeichert || sichern.isPending}
                  onClick={() => sichern.mutate(text)}
                  className="btn-quiet !px-4 !py-2 !text-sm disabled:opacity-50"
                >
                  {sichern.isPending
                    ? 'Wird gesichert …'
                    : ungespeichert ? 'Für später sichern' : 'Gesichert'}
                </button>
                <button
                  type="button"
                  disabled={verwerfen.isPending}
                  onClick={() => verwerfen.mutate()}
                  className="ml-auto text-[0.82rem] text-brand-muted underline underline-offset-2 transition-colors hover:text-navy"
                >
                  Verwerfen
                </button>
              </div>

              {/* Ein zweiter Lauf ist erlaubt, steht aber klein und unten: Der Text im
                  Feld waere danach weg, und wer ihn schon bearbeitet hat, soll nicht
                  versehentlich darauf drücken. */}
              {stand.bereit && (
                <button
                  type="button"
                  onClick={() => schreiben.mutate()}
                  className="mt-3 border-t border-brand-border/60 pt-3 text-[0.8rem] text-brand-muted transition-colors hover:text-navy"
                >
                  Echo noch einmal schreiben lassen — das hier wird dabei überschrieben.
                </button>
              )}
            </>
          ) : stand.bereit ? (
            <div className="py-4 text-center">
              <h2 className="card-title-lg">
                {stand.verlauf.length === 0
                  ? 'Es ist genug da für ein erstes Porträt.'
                  : 'Seit dem letzten hat sich einiges getan.'}
              </h2>
              <p className="mx-auto mt-2 max-w-[48ch] text-[0.88rem] leading-relaxed text-brand-muted">
                Echo liest deine bestätigten Sätze, deine Momente der letzten Wochen und
                deine Vorhaben — und schreibt daraus ein paar Absätze. Du bearbeitest sie,
                bevor irgendetwas gilt.
              </p>
              <button
                type="button"
                onClick={() => schreiben.mutate()}
                className="btn-primary mt-4"
              >
                Echo schreiben lassen
              </button>
              <p className="mt-2 text-[0.74rem] text-brand-muted">
                Dauert einen Moment.
              </p>
            </div>
          ) : (
            // Kein gesperrter Knopf. Eine Aufforderung, die man nicht befolgen kann, ist
            // schlimmer als keine — hier steht stattdessen, woraus eines entsteht.
            <div className="py-3">
              <h2 className="card-title-lg">Noch nicht jetzt</h2>
              <p className="mt-2 max-w-[54ch] text-[0.9rem] leading-relaxed text-brand-muted">
                {stand.grund}
              </p>
              <p className="mt-3 max-w-[54ch] text-[0.84rem] leading-relaxed text-brand-muted">
                Ein Porträt entsteht aus dem, was du festgehalten hast — deshalb kommt es
                nicht auf Knopfdruck. Es soll sich von dem unterscheiden, das du beim
                letzten Mal gelesen hast.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/app/kompass/saetze" className="btn-quiet !px-4 !py-2 !text-sm">
                  Zu meinen Sätzen
                </Link>
                <Link to="/app/kompass/uebungen" className="btn-quiet !px-4 !py-2 !text-sm">
                  Eine Übung machen
                </Link>
              </div>
            </div>
          )}

          {hinweis && !laeuft && (
            <p className="mt-3 rounded-brand bg-brand-bg px-3 py-2 text-[0.84rem] leading-relaxed text-brand-muted">
              {hinweis}
            </p>
          )}

          <Fehlermeldung
            error={schreiben.error ?? sichern.error ?? bestaetigen.error ?? verwerfen.error}
            className="mt-3"
          />
        </section>

        {/* ── Die Entwicklungsanzeige ───────────────────────────────────────── */}
        {stand.verlauf.length > 0 && (
          <section className="mt-8">
            <h2 className="section-label">
              {stand.verlauf.length === 1 ? 'Dein Porträt' : 'Deine Porträts'}
            </h2>
            <p className="mt-1 max-w-[58ch] text-[0.82rem] leading-relaxed text-brand-muted">
              {stand.verlauf.length === 1
                ? 'Es bleibt so stehen, wie du es bestätigt hast. Beim nächsten kannst du beide nebeneinander lesen.'
                : 'Jedes bleibt so stehen, wie du es bestätigt hast. Nebeneinander gelesen zeigen sie, was sich bewegt hat.'}
            </p>
            <div className="mt-4 space-y-4">
              {stand.verlauf.map(p => (
                <Fassung
                  key={p.id}
                  portrait={p}
                  aufDerListe={agenda.istDrauf('portrait', p.id)}
                  onBesprechen={agenda.umschalten}
                />
              ))}
            </div>
          </section>
        )}

      </div>
    </AppShell>
  )
}

// ── Eine bestätigte Fassung ──────────────────────────────────────────────────
// Aufgeklappt, nicht als Liste von Titeln: Ein Porträt hat keinen Titel, und „Fassung vom
// 3. März" aufklappen zu müssen, um den eigenen Text zu lesen, ist eine Hürde ohne Zweck.
// Ältere sind eingeklappt, weil die Seite sonst nicht mehr endet.
function Fassung({ portrait, aufDerListe, onBesprechen }: {
  portrait: Portrait
  aufDerListe: boolean
  onBesprechen: (art: AgendaArt, zielId: string, drauf: boolean) => Promise<unknown>
}) {
  const [offen, setOffen] = useState(false)
  const datum = portrait.bestaetigt_at
    ? new Date(portrait.bestaetigt_at).toLocaleDateString('de-DE',
        { day: 'numeric', month: 'long', year: 'numeric' })
    : ''
  const lang = portrait.text.length > 420

  return (
    <article className="rounded-brand border border-brand-border bg-brand-card p-5 shadow-brand-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[0.82rem] font-semibold text-navy">{datum}</span>
        {portrait.bestaetigt_at && (
          <span className="text-[0.74rem] text-brand-muted">
            {altersWort(portrait.bestaetigt_at)}
          </span>
        )}
      </div>
      <div
        className={`mt-3 whitespace-pre-wrap text-[0.96rem] leading-[1.75] text-brand-text ${
          lang && !offen ? 'line-clamp-6' : ''
        }`}
      >
        {portrait.text}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {lang && (
          <button
            type="button"
            onClick={() => setOffen(o => !o)}
            className="text-[0.8rem] font-medium text-accent transition-colors hover:underline"
          >
            {offen ? 'Weniger' : 'Ganz lesen'}
          </button>
        )}
        <div className="-ml-2.5">
          <BesprechenKnopf
            art="portrait"
            zielId={portrait.id}
            markiert={aufDerListe}
            onUmschalten={onBesprechen}
          />
        </div>
      </div>
    </article>
  )
}
