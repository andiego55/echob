/**
 * „Erkenntnis festhalten" — der Weg vom Gespräch zum Artefakt.
 *
 * **Warum ein gemeinsamer Baustein.** Vier Dialoge führen denselben Ablauf: Fall-Echo,
 * Themen-, Hypothesen- und Selbsttest-Dialog. Der Unterschied zwischen ihnen ist eine
 * Zeichenkette (`threadType`) und im freien Chat zusätzlich die Sitzung — alles andere
 * wäre viermal dasselbe.
 *
 * **Der Ablauf ist die Bestätigung.** Klicken → Echo schlägt vor → Nutzer bearbeitet
 * Überschrift und Text → speichern. Vorher wird nichts abgelegt, und deshalb braucht ein
 * Artefakt kein „bestätigt"-Kennzeichen wie eine Szene. Der Text steht am Ende in seinen
 * Worten; ein Artefakt in Echos Worten wäre ein Zitat, keine Erkenntnis.
 *
 * **Der Knopf ist immer sichtbar, aber nicht immer scharf.** Nach zwei Nachrichten gibt es
 * nichts zu destillieren — ein Artefakt daraus wäre Rauschen und würde beibringen, dass
 * Artefakte billig sind. Die Sperre kostet keinen KI-Aufruf: Sie zählt Beiträge.
 */
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Fehlermeldung from '@/components/Fehlermeldung'
import { caseArtifactsApi, type ArtifactCandidate } from '@/api/caseArtifacts'

/** Ab so vielen eigenen Beiträgen lohnt sich das Destillieren. */
export const MIN_BEITRAEGE = 3

export const MAX_TITEL = 120
export const MAX_TEXT = 600

interface Props {
  caseId: string
  /** Aus welchem Dialog destilliert wird — `topic_self`, `hyp_clusterb`, `topic`, … */
  threadType: string
  /** Nur beim freien Fall-Echo: Dort hängt der Verlauf an einer Sitzung. */
  chatSessionId?: string | null
  /** Wie viele eigene Beiträge das Gespräch bisher hat. */
  eigeneBeitraege: number
  /** Ob gerade eine Antwort entsteht — dann wird nicht destilliert. */
  beschaeftigt?: boolean
}

export default function ArtefaktErzeugen({
  caseId, threadType, chatSessionId, eigeneBeitraege, beschaeftigt,
}: Props) {
  const [offen, setOffen] = useState(false)
  const zuFrueh = eigeneBeitraege < MIN_BEITRAEGE

  return (
    <>
      <button
        type="button"
        onClick={() => setOffen(true)}
        disabled={zuFrueh || beschaeftigt}
        title={zuFrueh
          ? `Dafür ist das Gespräch noch zu kurz — ab ${MIN_BEITRAEGE} eigenen Beiträgen.`
          : 'Echo destilliert die Essenz dieses Gesprächs. Du bearbeitest sie, bevor sie bleibt.'}
        className="btn-quiet !py-1.5 !px-3.5 !text-xs disabled:opacity-40"
      >
        Erkenntnis festhalten
      </button>

      {offen && (
        <Werkstatt
          caseId={caseId}
          threadType={threadType}
          chatSessionId={chatSessionId}
          onSchliessen={() => setOffen(false)}
        />
      )}
    </>
  )
}

// ── Der Dialog ────────────────────────────────────────────────────────────────

function Werkstatt({ caseId, threadType, chatSessionId, onSchliessen }: {
  caseId: string
  threadType: string
  chatSessionId?: string | null
  onSchliessen: () => void
}) {
  const qc = useQueryClient()
  const [gewaehlt, setGewaehlt] = useState<number | null>(null)
  const [titel, setTitel] = useState('')
  const [text, setText] = useState('')
  const [gespeichert, setGespeichert] = useState(false)

  const uebernehmen = (k: ArtifactCandidate, i: number) => {
    setGewaehlt(i)
    setTitel(k.titel)
    setText(k.text)
  }

  const vorschlaege = useMutation({
    mutationFn: () => caseArtifactsApi.extract(caseId, threadType, chatSessionId),
    onSuccess: (d) => {
      // Bei genau einem Kandidaten direkt in die Bearbeitung — eine Auswahl aus einem
      // Element ist keine Auswahl, sondern ein Klick zu viel.
      if (d.candidates.length === 1) uebernehmen(d.candidates[0], 0)
    },
  })

  // Beim Öffnen einmal destillieren. Der Aufruf gehört in einen Effekt, nicht in den
  // Renderdurchlauf — dort ausgelöst liefe er bei jedem Zustandswechsel erneut.
  const gestartet = useRef(false)
  useEffect(() => {
    if (gestartet.current) return
    gestartet.current = true
    vorschlaege.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const speichern = useMutation({
    mutationFn: () => {
      const k = gewaehlt != null ? vorschlaege.data?.candidates[gewaehlt] : undefined
      return caseArtifactsApi.create(caseId, {
        title: titel.trim(),
        body: text.trim(),
        source_thread: threadType,
        source_session: chatSessionId ?? null,
        replaces_id: k?.replaces_id ?? null,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case-artifacts', caseId] })
      setGespeichert(true)
    },
  })

  const kandidaten = vorschlaege.data?.candidates ?? []
  const bereit = titel.trim().length > 0 && text.trim().length > 0
  const abloesung = gewaehlt != null && kandidaten[gewaehlt]?.replaces_id

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Erkenntnis festhalten"
      onClick={e => { if (e.target === e.currentTarget) onSchliessen() }}
    >
      <div className="max-h-[92vh] w-full max-w-[42rem] overflow-y-auto rounded-t-brand-lg bg-white p-6 shadow-brand-lg sm:rounded-brand-lg">

        {gespeichert ? (
          <>
            <h2 className="card-title-lg">Festgehalten</h2>
            <p className="mt-2 text-sm text-brand-muted">
              {abloesung
                ? 'Die Notiz ersetzt eine frühere — die alte bleibt im Archiv als überholt stehen. '
                : 'Die Notiz liegt jetzt im Archiv und fließt in kommende Gespräche ein. '}
              Wenn sie irgendwann nicht mehr stimmt, setzt du sie dort auf „gilt nicht mehr".
            </p>
            <div className="mt-5 flex gap-3">
              <button onClick={onSchliessen} className="btn-primary !py-2 !px-5 !text-sm">
                Weiter im Gespräch
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="card-title-lg">Erkenntnis festhalten</h2>
            <p className="mt-1.5 text-sm text-brand-muted">
              Echo destilliert, was aus diesem Gespräch bleiben sollte. Es wird erst
              gespeichert, wenn du es abschickst — und in deinen Worten, nicht in seinen.
            </p>

            {vorschlaege.isPending && (
              <div className="mt-6 animate-pulse space-y-3" aria-live="polite">
                <p className="text-xs text-brand-muted">Echo liest das Gespräch …</p>
                <div className="h-4 w-2/3 rounded bg-brand-border/60" />
                <div className="h-4 w-1/2 rounded bg-brand-border/60" />
              </div>
            )}

            <Fehlermeldung error={vorschlaege.error ?? speichern.error} />

            {vorschlaege.isSuccess && kandidaten.length === 0 && (
              <div className="mt-5 rounded-brand border border-brand-border bg-brand-bg px-4 py-3.5">
                <p className="text-sm text-brand-text">
                  {vorschlaege.data.hinweis
                    ?? 'Aus diesem Gespräch lässt sich noch nichts destillieren, was nicht schon im Archiv steht.'}
                </p>
                <p className="mt-1.5 text-xs text-brand-muted">
                  Das ist kein Fehler — nicht jedes Gespräch bringt eine neue Erkenntnis.
                </p>
              </div>
            )}

            {/* Auswahl nur, wenn es wirklich etwas zu wählen gibt. */}
            {kandidaten.length > 1 && (
              <div className="mt-5">
                <p className="section-label">Echo schlägt {kandidaten.length} Notizen vor</p>
                <div className="mt-2 grid gap-2">
                  {kandidaten.map((k, i) => (
                    <button
                      key={i}
                      onClick={() => uebernehmen(k, i)}
                      className={`rounded-brand border px-4 py-3 text-left transition ${
                        gewaehlt === i
                          ? 'border-accent bg-accent/[0.06]'
                          : 'border-brand-border hover:border-accent/50 hover:bg-accent/[0.03]'
                      }`}
                    >
                      <span className="block text-sm font-semibold text-navy">{k.titel}</span>
                      <span className="mt-1 block text-xs text-brand-muted">{k.text}</span>
                      {k.begruendung && (
                        <span className="mt-1.5 block text-[0.7rem] italic text-brand-muted/80">
                          {k.begruendung}
                        </span>
                      )}
                      {k.replaces_id && (
                        <span className="mt-1.5 inline-block rounded-full bg-accent/10 px-2 py-0.5 text-[0.65rem] font-medium text-accent">
                          schärft eine frühere Notiz
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {gewaehlt != null && (
              <div className="mt-5 border-t border-brand-border pt-5">
                {abloesung && (
                  <p className="mb-3 rounded-brand border border-accent/30 bg-accent/[0.06] px-3.5 py-2.5 text-xs text-brand-text">
                    Diese Notiz <strong className="text-navy">ersetzt eine frühere</strong>.
                    Die alte wird nicht gelöscht — sie bleibt im Archiv als überholt stehen,
                    damit sichtbar bleibt, dass sich etwas bewegt hat.
                  </p>
                )}

                <label className="label" htmlFor="art-titel">Überschrift</label>
                <input
                  id="art-titel" value={titel} onChange={e => setTitel(e.target.value)}
                  maxLength={MAX_TITEL} className="input mt-1.5 w-full"
                />

                <label className="label mt-4 block" htmlFor="art-text">Die Notiz</label>
                <textarea
                  id="art-text" value={text} onChange={e => setText(e.target.value)}
                  rows={5} maxLength={MAX_TEXT}
                  className="input mt-1.5 w-full resize-y"
                />
                <p className="mt-1.5 text-xs text-brand-muted tabular-nums">
                  {text.length} / {MAX_TEXT} Zeichen · Schreib es um, bis es klingt wie du.
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-brand-border pt-4">
              {gewaehlt != null && (
                <button
                  onClick={() => speichern.mutate()}
                  disabled={!bereit || speichern.isPending}
                  className="btn-primary !py-2 !px-5 !text-sm disabled:opacity-50"
                >
                  {speichern.isPending ? 'Wird gespeichert …' : 'Festhalten'}
                </button>
              )}
              <button onClick={onSchliessen} className="btn-quiet !py-2 !px-4 !text-sm">
                {gewaehlt != null ? 'Abbrechen' : 'Schließen'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
