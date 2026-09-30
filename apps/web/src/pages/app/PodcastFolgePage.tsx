/**
 * /app/cases/:caseId/podcast/:podcastId — eine Folge: Skript, Stimme, Abspieler.
 *
 * **Drei Zustände, und der Weg dazwischen ist die ganze Seite.**
 *
 *   `skript`  Der Text steht. Man kann ihn lesen und verwerfen, bevor er gesprochen wird.
 *   `fertig`  Oben der Abspieler, darunter der Text zum Mitlesen.
 *   `fehler`  Was fertig ist, bleibt. Weitermachen nimmt nur den Rest.
 *
 * **Warum der Text vor der Stimme steht.** Niemand sollte einen Text über sein Leben zum
 * ersten Mal als Stimme hören, ohne ihn vorher gesehen zu haben. Zwischen Erzeugen und Hören
 * gehört ein Moment, in dem man Nein sagen kann.
 */
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import Fehlermeldung from '@/components/Fehlermeldung'
import { PageSkeleton } from '@/components/Skeleton'
import { useBestaetigen } from '@/components/Bestaetigung'
import Abspieler, { zeit } from '@/components/app/podcast/Abspieler'
import { podcastApi } from '@/api/podcast'
import { profileApi } from '@/api/profile'
import { istEndgueltigWeg } from '@/api/errors'

export default function PodcastFolgePage() {
  const { caseId, podcastId } = useParams<{ caseId: string; podcastId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const bestaetigen = useBestaetigen()
  const [titelEntwurf, setTitelEntwurf] = useState<string | null>(null)
  const [ladeFehler, setLadeFehler] = useState<string | null>(null)

  const folge = useQuery({
    queryKey: ['podcast', caseId, podcastId],
    queryFn: () => podcastApi.holen(caseId!, podcastId!),
    enabled: !!caseId && !!podcastId,
  })

  // Der Sicherheitsstand steht im eigenen Profil, nicht am Fall. Er wird nur gelesen, um
  // EINEN Satz zu zeigen — schlägt der Abruf fehl, fällt der Satz weg und nicht die Seite.
  const profil = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileApi.get(),
    staleTime: 5 * 60_000,
  })

  const sprechen = useMutation({
    mutationFn: () => podcastApi.sprechen(caseId!, podcastId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['podcast', caseId, podcastId] })
      qc.invalidateQueries({ queryKey: ['podcasts', caseId] })
      qc.invalidateQueries({ queryKey: ['usage-status'] })
    },
  })

  const umbenennen = useMutation({
    mutationFn: (titel: string) => podcastApi.umbenennen(caseId!, podcastId!, titel),
    onSuccess: () => {
      setTitelEntwurf(null)
      qc.invalidateQueries({ queryKey: ['podcast', caseId, podcastId] })
      qc.invalidateQueries({ queryKey: ['podcasts', caseId] })
    },
  })

  const loeschen = useMutation({
    mutationFn: () => podcastApi.loeschen(caseId!, podcastId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['podcasts', caseId] })
      navigate(`/app/cases/${caseId}/podcast`)
    },
  })

  /** Fragen, dann loeschen. Die Nachfrage ist rot: Es gibt kein Zurueck. */
  const loeschenFragen = async () => {
    if (await bestaetigen({
      titel: 'Diese Folge löschen?',
      text: 'Das Skript und alle Aufnahmen werden gelöscht. Das lässt sich nicht '
        + 'zurückholen.',
      knopf: 'Löschen',
      gefahr: true,
    })) loeschen.mutate()
  }

  /**
   * Die ganze Folge herunterladen.
   *
   * Der Umweg über einen Blob statt eines Links: Die Bytes liegen hinter einem Endpunkt mit
   * Rechteprüfung, und eine Adresse, die ohne Anmeldung funktioniert, soll es nicht geben.
   */
  const herunterladen = async () => {
    setLadeFehler(null)
    try {
      const blob = await podcastApi.ganzeFolgeHolen(caseId!, podcastId!)
      const roh = folge.data?.titel || folge.data?.format_label || 'Folge'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${roh.replace(/[^\p{L}\p{N} _-]/gu, '')}.mp3`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setLadeFehler('Der Download hat nicht geklappt. Versuch es noch einmal.')
    }
  }

  if (folge.isLoading) {
    return (
      <AppShell>
        <CaseNav caseId={caseId!} />
        <div className="mx-auto max-w-[900px] px-6 py-8"><PageSkeleton /></div>
      </AppShell>
    )
  }

  // Nur bei einem echten „weg“ die Seite wegwerfen — nicht bei einem Verbindungsabbruch.
  if (istEndgueltigWeg(folge.error)) {
    return (
      <AppShell>
        <CaseNav caseId={caseId!} />
        <div className="mx-auto max-w-[900px] px-6 py-8">
          <h1 className="page-title">Diese Folge gibt es nicht mehr</h1>
          <Link to={`/app/cases/${caseId}/podcast`}
            className="mt-4 inline-block text-sm text-accent">
            Zurück zu deinen Folgen
          </Link>
        </div>
      </AppShell>
    )
  }

  const f = folge.data
  if (!f) {
    return (
      <AppShell>
        <CaseNav caseId={caseId!} />
        <div className="mx-auto max-w-[900px] px-6 py-8">
          <Fehlermeldung error={folge.error} />
        </div>
      </AppShell>
    )
  }

  const kapitel = f.kapitel ?? []
  const gesprochen = kapitel.filter(k => k.gesprochen).length
  const offen = kapitel.length - gesprochen
  // **Folgen ohne einen einzigen Kapiteltext.** Die gibt es seit dem Umbau nicht mehr neu
  // — aber wer welche hat, stand vorher auf einer Seite, auf der nichts zu tun war: kein
  // Abspieler (nichts gesprochen), kein Sprechen-Knopf (nichts zu sprechen), ein leeres
  // Skript. Genau die Sackgasse, wegen der gefragt wurde, wie man denn abspielt.
  const leer = kapitel.length === 0
  const sicherheitshinweis =
    (profil.data?.safety_status ?? 'no_indication') !== 'no_indication'

  return (
    <AppShell>
      <CaseNav caseId={caseId!} />
      <div className="mx-auto max-w-[900px] px-6 py-8">
        <Link to={`/app/cases/${caseId}/podcast`}
          className="text-[0.8rem] text-brand-muted no-underline hover:text-navy">
          ← Deine Folgen
        </Link>

        {/* Der Titel gehört der Person. Das Modell schlägt einen vor; wer ihn ändert, hat
            das letzte Wort. */}
        {titelEntwurf === null ? (
          <h1 className="page-title mt-2 flex flex-wrap items-baseline gap-3">
            {f.titel || f.format_label}
            <button type="button"
              onClick={() => setTitelEntwurf(f.titel ?? '')}
              className="text-[0.75rem] font-normal text-brand-muted hover:text-accent">
              umbenennen
            </button>
          </h1>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              value={titelEntwurf}
              onChange={e => setTitelEntwurf(e.target.value)}
              maxLength={120}
              autoFocus
              placeholder={f.format_label}
              className="input-brand min-w-0 flex-1"
              onKeyDown={e => { if (e.key === 'Enter') umbenennen.mutate(titelEntwurf) }}
            />
            <button type="button" onClick={() => umbenennen.mutate(titelEntwurf)}
              disabled={umbenennen.isPending}
              className="btn-primary !py-2 !px-4 !text-xs">Speichern</button>
            <button type="button" onClick={() => setTitelEntwurf(null)}
              className="text-xs text-brand-muted hover:text-navy">Abbrechen</button>
          </div>
        )}

        <p className="mt-1.5 text-[0.82rem] text-brand-muted">
          {f.format_label} · {f.stimme_label}
          {f.sekunden ? ` · ${zeit(f.sekunden)}` : ''}
          {kapitel.length ? ` · ${kapitel.length} Kapitel` : ''}
        </p>

        {/* Der Sprech-Fehler steht NICHT hier, sondern unten am Sprechen-Knopf. Dasselbe
            hatte ich im Studio zweimal falsch: Rückmeldung am Seitenkopf ist bei einer
            langen Seite außerhalb des Bildes, und wer unten klickt, sieht nichts. */}
        <Fehlermeldung error={umbenennen.error ?? loeschen.error} className="mt-4" />
        {ladeFehler && <p role="alert" className="mt-4 text-sm text-red-600">{ladeFehler}</p>}

        {leer && (
          <section className="mt-6 rounded-brand-lg border border-amber-300/60 bg-amber-50 p-5">
            <h2 className="text-[0.95rem] font-bold text-amber-900">
              Zu dieser Folge ist kein Text entstanden
            </h2>
            <p className="mt-1.5 max-w-[62ch] text-[0.86rem] leading-relaxed text-amber-900">
              Beim Erzeugen ist etwas abgebrochen, bevor das Skript geschrieben war. Daran
              lässt sich nichts mehr retten — lösch die Folge und bestell eine neue. Deine
              Einstellungen siehst du oben, du kannst sie genauso wieder wählen.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => void loeschenFragen()}
                className="btn-primary !py-2 !px-4 !text-xs">
                Folge löschen
              </button>
              <Link to={`/app/cases/${caseId}/podcast`}
                className="text-[0.8rem] text-amber-900 underline">
                Zurück zu deinen Folgen
              </Link>
            </div>
          </section>
        )}

        {/* ── Der Abspieler ───────────────────────────────────────────────── */}
        {gesprochen > 0 && (
          <div className="mt-6">
            <Abspieler caseId={caseId!} podcastId={podcastId!} kapitel={kapitel} />
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <button type="button" onClick={() => void herunterladen()}
                className="text-[0.8rem] font-medium text-accent hover:underline">
                Als Datei herunterladen
              </button>
              <button type="button" onClick={() => void loeschenFragen()}
                className="text-[0.8rem] text-brand-muted hover:text-red-600">
                Folge löschen
              </button>
            </div>
          </div>
        )}

        {/* ── Der Knopf, der Kontingent kostet ────────────────────────────── */}
        {offen > 0 && !leer && (
          <section className="mt-6 rounded-brand-lg border border-brand-border bg-white p-5">
            <h2 className="card-title-lg">
              {gesprochen === 0 ? 'Noch nicht gesprochen' : `Noch ${offen} Kapitel offen`}
            </h2>
            <p className="mt-1.5 max-w-[62ch] text-[0.86rem] leading-relaxed text-brand-muted">
              {gesprochen === 0
                ? 'Lies den Text erst durch. Wenn er passt, wird daraus eine Aufnahme — '
                  + 'das dauert ein paar Minuten und zählt auf dein Monatskontingent.'
                : 'Die fertigen Kapitel bleiben. Weitermachen spricht nur die restlichen — '
                  + 'du zahlst nichts doppelt.'}
            </p>

            {/* Eine Tonaufnahme über die eigene Beziehung ist im Nebenzimmer sofort das,
                was sie ist. Für Menschen in kontrollierenden Beziehungen ist das kein
                theoretisches Risiko — deshalb ein Satz davor, und kein Verbot. */}
            {sicherheitshinweis && (
              <p className="mt-4 rounded-brand border border-amber-300/60 bg-amber-50 px-4 py-3 text-[0.84rem] leading-relaxed text-amber-900">
                Eine Aufnahme kann mitgehört werden — anders als ein Text auf dem Bildschirm.
                Überleg kurz, wo und mit welchen Kopfhörern du sie hören willst.
              </p>
            )}

            <Fehlermeldung error={sprechen.error} className="mt-4" />

            {/* Mehrere Minuten Stille an einem Knopf sieht aus wie ein Fehler — und das
                ist hier der laengste Vorgang im ganzen Programm. Also ein Rad, eine
                ehrliche Zahl und der Satz, dass nichts verloren geht. */}
            {sprechen.isPending ? (
              <div
                role="status"
                aria-live="polite"
                className="mt-4 flex items-start gap-3 rounded-brand border border-accent/40 bg-accent/[0.06] px-5 py-4"
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-accent/30 border-t-accent"
                />
                <span className="min-w-0 text-[0.86rem] leading-relaxed text-navy">
                  <strong className="font-semibold">Wird gesprochen.</strong> {offen}{' '}
                  Kapitel, eines nach dem anderen. Das braucht ein paar Minuten. Jedes wird
                  gespeichert, sobald es fertig ist — lass die Seite offen. Bricht etwas ab,
                  bleibt alles Fertige erhalten, und du zahlst nichts doppelt.
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => sprechen.mutate()}
                className="btn-primary !py-2.5 !px-5 !text-sm mt-4"
              >
                {sprechen.error ? 'Noch einmal versuchen'
                  : gesprochen === 0 ? 'Jetzt sprechen lassen' : 'Weitermachen'}
              </button>
            )}

            {f.status === 'fehler' && f.fehler && (
              <p className="mt-3 text-[0.78rem] leading-relaxed text-brand-muted">
                Beim letzten Versuch ist es abgebrochen. Der Grund, den der Server gemeldet
                hat: {f.fehler}
              </p>
            )}
          </section>
        )}

        {/* ── Das Skript ──────────────────────────────────────────────────── */}
        {!leer && (
        <section className="mt-8">
          <h2 className="card-title-lg">Das Skript</h2>
          <p className="mt-1 max-w-[62ch] text-[0.82rem] leading-relaxed text-brand-muted">
            Der Text, den die Stimme spricht — zum Mitlesen. Die Kapitelüberschriften werden
            nicht mitgesprochen.
          </p>
          <div className="mt-4 space-y-6">
            {kapitel.map(k => (
              <article key={k.id}>
                <h3 className="flex items-baseline gap-2 text-[0.95rem] font-bold text-navy">
                  <span className="text-[0.75rem] tabular-nums text-brand-muted">{k.nr}</span>
                  {k.titel}
                  {k.gesprochen && (
                    <span className="text-[0.7rem] font-normal text-accent">
                      {zeit(k.sekunden)}
                    </span>
                  )}
                </h3>
                <p className="mt-1.5 whitespace-pre-wrap text-[0.92rem] leading-[1.75] text-brand-text">
                  {k.text}
                </p>
              </article>
            ))}
          </div>
        </section>
        )}

        {gesprochen === 0 && !leer && (
          <button type="button" onClick={() => void loeschenFragen()}
            className="mt-8 text-[0.8rem] text-brand-muted hover:text-red-600">
            Folge löschen
          </button>
        )}
      </div>
    </AppShell>
  )
}
