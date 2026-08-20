/**
 * /app/paar/:coupleId/streit — „Wir haben uns gerade gestritten".
 *
 * Der häufigste Moment, in dem so eine App geöffnet wird, ist nicht „ich möchte ein Thema
 * anlegen", sondern der hier. Die Seite beginnt deshalb nicht bei einem Formular, sondern
 * beim Herunterkommen.
 *
 * Drei Schritte, in dieser Reihenfolge: **ankommen**, **sortieren**, **entscheiden**. Wer
 * noch im Adrenalin steckt, kann keine Lösung bauen — jeder gute Vorschlag zur falschen
 * Zeit wird als Druck erlebt.
 *
 * Technisch ist das kein zweiter Chat-Mechanismus, sondern ein Begleiter-Faden der Art
 * `deescalation`: eigener Verlauf, eigener Prompt, sonst dieselbe Maschinerie.
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import MarkdownMessage from '@/components/app/MarkdownMessage'
import { coupleCompanionApi } from '@/api/coupleCompanion'
import type { CoupleEchoConversation } from '@/api/coupleCompanion'
import { coupleMediationApi } from '@/api/coupleMediation'
import { apiErrorMessage } from '@/api/errors'
import CoupleSafetyNote from '@/components/couple/CoupleSafetyNote'

export default function CoupleDeescalationPage() {
  const { coupleId = '' } = useParams<{ coupleId: string }>()
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [begonnen, setBegonnen] = useState(false)
  const [festgehalten, setFestgehalten] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const gespraech = useQuery({
    queryKey: ['couple-deescalation', coupleId],
    queryFn: () => coupleCompanionApi.current(coupleId, 'deescalation'),
    enabled: !!coupleId,
    retry: false,
  })

  const send = useMutation({
    mutationFn: (content: string) => coupleCompanionApi.send(coupleId, content, 'deescalation'),
    onSuccess: (d: CoupleEchoConversation) => {
      qc.setQueryData(['couple-deescalation', coupleId], d)
      setText('')
    },
  })

  const abschliessen = useMutation({
    mutationFn: () => coupleCompanionApi.summarize(coupleId, 'deescalation'),
    onSuccess: s => {
      qc.invalidateQueries({ queryKey: ['couple-deescalation', coupleId] })
      qc.invalidateQueries({ queryKey: ['couple-dashboard', coupleId] })
      qc.invalidateQueries({ queryKey: ['couple-echo-summaries', coupleId] })
      // Ohne das stünde hier gleich wieder ein leeres Feld — als wäre nichts passiert.
      setFestgehalten(s.summary_text)
      setBegonnen(false)
    },
  })

  const nachrichten = gespraech.data?.messages ?? []
  const laeuft = begonnen || nachrichten.length > 0

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [nachrichten.length])

  return (
    <AppShell>
      <div className="mx-auto max-w-[760px] px-6 py-8">
        <Link to={`/app/paar/${coupleId}`} className="text-xs text-brand-muted hover:text-navy">
          ← Zurück zum Paarraum
        </Link>

        <h1 className="mt-3 text-xl font-bold text-navy">Ihr habt euch gerade gestritten</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-brand-muted">
          Hier muss nichts gelöst werden. Dieser Raum gehört dir allein – die andere Person
          sieht nichts davon.
        </p>

        {/* ── Abschluss ────────────────────────────────────────────── */}
        {festgehalten ? (
          <div className="card mt-6">
            <h2 className="text-sm font-bold text-navy">Festgehalten</h2>
            <p className="mt-1 text-xs text-brand-muted">
              Nur für dich gespeichert. Du findest es im Paarraum unter deinen
              Echo-Zusammenfassungen wieder.
            </p>
            <div className="mt-3 rounded-brand bg-brand-bg px-4 py-3">
              <MarkdownMessage content={festgehalten} />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link to={`/app/paar/${coupleId}`} className="btn-primary !py-2 !px-5 !text-sm no-underline">
                Zurück zum Paarraum
              </Link>
              <button
                onClick={() => { setFestgehalten(null); setBegonnen(true) }}
                className="text-xs text-brand-muted hover:text-navy"
              >
                Doch noch weiterschreiben
              </button>
            </div>
          </div>
        ) : !laeuft ? (
          <div className="card mt-6">
            <h2 className="text-sm font-bold text-navy">Erst ankommen</h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-brand-text">
              <p>
                Wenn es gerade eben war, ist dein Körper noch im Alarm. In dem Zustand klingt
                jeder Satz schärfer, als er gemeint ist – bei dir und bei ihr.
              </p>
              <p className="rounded-brand bg-brand-bg px-4 py-3 text-brand-muted">
                Atme ein paar Mal langsam aus – das Ausatmen länger als das Einatmen. Trink
                etwas. Wenn du kannst, geh kurz aus dem Raum. Zwanzig Minuten sind keine
                Flucht, sondern das, was der Körper braucht.
              </p>
              <p>
                <strong className="text-navy">Nichts muss heute entschieden werden.</strong>{' '}
                Kein Gespräch, keine Abmachung, keine Klärung. Das kann alles warten, bis es
                wieder trägt.
              </p>
            </div>

            <button
              onClick={() => setBegonnen(true)}
              className="btn-primary mt-5 !py-2.5 !px-6 !text-sm"
            >
              Ich bin so weit
            </button>
            <p className="mt-2 text-xs text-brand-muted">
              Danach kannst du erzählen, was passiert ist. Echo hört zu und ergreift für
              niemanden Partei.
            </p>
          </div>
        ) : (
          <>
            {/* ── Schritt 2: Sortieren ─────────────────────────────── */}
            <div className="card mt-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-navy">Erzähl, was passiert ist</h2>
                  <p className="mt-1 text-xs text-brand-muted">
                    Nichts davon muss gut formuliert sein.
                  </p>
                </div>
                {nachrichten.length > 2 && (
                  <button
                    onClick={() => abschliessen.mutate()}
                    disabled={abschliessen.isPending}
                    className="shrink-0 text-xs text-accent hover:underline disabled:opacity-50"
                  >
                    {abschliessen.isPending ? 'Fasse zusammen …' : 'Zusammenfassen & abschließen'}
                  </button>
                )}
              </div>

              {nachrichten.length > 0 && (
                <div className="mt-4 space-y-3 overflow-y-auto pr-1" style={{ maxHeight: '46vh' }}>
                  {nachrichten.map(m => (
                    <div
                      key={m.id}
                      className={m.role === 'echo'
                        ? 'rounded-brand border border-accent/25 px-3.5 py-3'
                        : 'rounded-brand bg-brand-bg px-3.5 py-2.5'}
                    >
                      <p className={`text-xs font-semibold ${
                        m.role === 'echo' ? 'text-accent' : 'text-navy'
                      }`}>
                        {m.role === 'echo' ? 'Echo' : 'Du'}
                      </p>
                      <div className="mt-1 text-sm text-brand-text">
                        {m.role === 'echo'
                          ? <MarkdownMessage content={m.content} />
                          : <p className="whitespace-pre-wrap">{m.content}</p>}
                      </div>
                    </div>
                  ))}
                  <div ref={endRef} />
                </div>
              )}

              <form
                onSubmit={e => { e.preventDefault(); if (text.trim()) send.mutate(text.trim()) }}
                className="mt-4"
              >
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  rows={4}
                  placeholder={nachrichten.length === 0
                    ? 'Was ist gerade passiert?'
                    : 'Schreib weiter …'}
                  className="input w-full resize-y !text-sm"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!text.trim() || send.isPending}
                  className="btn-primary mt-2 !py-2 !px-5 !text-sm disabled:opacity-50"
                >
                  {send.isPending ? 'Echo liest …' : 'Senden'}
                </button>
                {(send.isError || abschliessen.isError) && (
                  <p className="mt-2 text-sm text-red-600">
                    {apiErrorMessage(send.error ?? abschliessen.error)}
                  </p>
                )}
              </form>
            </div>

            {/* ── Schritt 3: Entscheiden ───────────────────────────── */}
            {nachrichten.length > 2 && (
              <div className="card mt-4">
                <h2 className="text-sm font-bold text-navy">Und jetzt?</h2>
                <p className="mt-1 text-xs text-brand-muted">
                  Nichts davon muss sein. Es für heute ruhen zu lassen ist auch eine Antwort.
                </p>
                <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
                  <Ausgang
                    to={`/app/paar/${coupleId}`}
                    titel="Etwas dalassen"
                    text="Wenn die Verbindung gerade wichtiger ist als die Klärung."
                  />
                  <ThemaDaraus coupleId={coupleId} />
                  <Ausgang
                    to={`/app/paar/${coupleId}/gespraeche`}
                    titel="Gespräch vorschlagen"
                    text="Wenn ihr beide bereit seid, moderiert darüber zu reden."
                  />
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-6">
          <CoupleSafetyNote />
        </div>
      </div>
    </AppShell>
  )
}

function Ausgang({ to, titel, text }: { to: string; titel: string; text: string }) {
  return (
    <Link
      to={to}
      className="rounded-brand border border-brand-border px-3.5 py-3 no-underline transition hover:border-accent/50"
    >
      <p className="text-sm font-semibold text-navy">{titel}</p>
      <p className="mt-0.5 text-[0.72rem] leading-snug text-brand-muted">{text}</p>
    </Link>
  )
}

/** Wenn es nicht das erste Mal war, gehört es in die Mediation statt in ein Gespräch. */
function ThemaDaraus({ coupleId }: { coupleId: string }) {
  const navigate = useNavigate()
  const [titel, setTitel] = useState('')
  const [offen, setOffen] = useState(false)

  const anlegen = useMutation({
    mutationFn: () => coupleMediationApi.create(coupleId, { title: titel.trim() }),
    onSuccess: t => navigate(`/app/paar/thema/${t.id}`),
  })

  if (!offen) {
    return (
      <button
        onClick={() => setOffen(true)}
        className="rounded-brand border border-brand-border px-3.5 py-3 text-left transition hover:border-accent/50"
      >
        <p className="text-sm font-semibold text-navy">Thema daraus machen</p>
        <p className="mt-0.5 text-[0.72rem] leading-snug text-brand-muted">
          Wenn das nicht das erste Mal war.
        </p>
      </button>
    )
  }

  return (
    <div className="rounded-brand border border-accent/40 px-3.5 py-3 sm:col-span-3">
      <p className="text-sm font-semibold text-navy">Worum geht es im Kern?</p>
      <input
        value={titel}
        onChange={e => setTitel(e.target.value)}
        placeholder="z. B. „Wie wir Aufgaben im Haushalt verteilen“"
        className="input mt-2 !text-sm"
        autoFocus
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          onClick={() => anlegen.mutate()}
          disabled={!titel.trim() || anlegen.isPending}
          className="btn-primary !py-1.5 !px-4 !text-xs disabled:opacity-50"
        >
          {anlegen.isPending ? 'Lege an …' : 'Thema anlegen'}
        </button>
        <button onClick={() => setOffen(false)} className="text-xs text-brand-muted hover:text-navy">
          Abbrechen
        </button>
      </div>
      {anlegen.isError && (
        <p className="mt-2 text-xs text-red-600">{apiErrorMessage(anlegen.error)}</p>
      )}
    </div>
  )
}
