/**
 * Aus einer Echo-Antwort einen Eintrag in der Arbeitsmappe machen.
 *
 * **Der Kern des Ganzen: markierter Text gewinnt.** In einer Antwort steht selten alles,
 * was man behalten will — meist ist es ein Satz. Wer vor dem Klick etwas markiert hat,
 * bekommt genau das ins Feld; sonst die ganze Antwort. Das ist der Unterschied zwischen
 * „ich lege den Text ab" und „ich nehme einen Gedanken mit".
 *
 * **Der Titel wird vorgeschlagen, nicht verlangt.** Ein Pflichtfeld an dieser Stelle
 * bremst genau die Bewegung, um die es geht. Der erste Satz ist fast immer brauchbar und
 * lässt sich in zwei Sekunden überschreiben.
 *
 * **Der Bezug wird gelesen, nicht getippt.** Steht im übernommenen Text „Szene 12", wird
 * daraus der Bezug des Eintrags — dieselbe Schreibweise, die auch die Verweise im Chat
 * erkennen (siehe `lib/belege`).
 */
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  findingsApi, FINDING_KIND_HINTS, FINDING_KIND_LABELS, type FindingKind,
} from '@/api/professionalFindings'

const ARTEN: FindingKind[] = ['hypothese', 'beobachtung', 'frage', 'impuls', 'achtung']

/** Dieselbe Schreibweise wie in `lib/belege` — bewusst, damit beides zusammenpasst. */
const BELEG = /\b(Szene|Dokument|Erkenntnis)\s+(\d{1,3})\b/

/** Der erste Satz, gekürzt — ein Vorschlag, kein Urteil. */
function titelVorschlag(text: string): string {
  const ersterSatz = text.trim().split(/(?<=[.!?])\s/)[0] ?? text
  const roh = ersterSatz.replace(/^[#*\-\s]+/, '').trim()
  return roh.length > 90 ? `${roh.slice(0, 90).trimEnd()} …` : roh
}

export default function ArbeitsmappeUebernehmen({
  caseId, antwort, sessionId, messageId, onFertig,
}: {
  caseId: string
  /** Der volle Text der Antwort — Rückfall, wenn nichts markiert ist. */
  antwort: string
  sessionId: string | null
  messageId: string | null
  onFertig?: () => void
}) {
  const qc = useQueryClient()
  const [offen, setOffen] = useState(false)
  const [art, setArt] = useState<FindingKind>('hypothese')
  const [titel, setTitel] = useState('')
  const [text, setText] = useState('')
  const [beleg, setBeleg] = useState<string | null>(null)
  const feld = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { if (offen) feld.current?.focus() }, [offen])

  const speichern = useMutation({
    mutationFn: () => findingsApi.create(caseId, {
      title: titel.trim() || titelVorschlag(text),
      body: text.trim(),
      kind: art,
      source_session: sessionId,
      source_message: messageId,
      beleg,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prof-findings', caseId] })
      setOffen(false)
      onFertig?.()
    },
  })

  const oeffnen = () => {
    // Was markiert ist, gewinnt. `toString()` liefert nur Text, keine Auszeichnung -
    // genau richtig, denn abgelegt wird der Gedanke, nicht das Markup.
    const markiert = window.getSelection()?.toString().trim() ?? ''
    const inhalt = markiert || antwort
    setText(inhalt)
    setTitel(titelVorschlag(inhalt))
    setBeleg(inhalt.match(BELEG)?.[0] ?? null)
    setArt(markiert ? 'beobachtung' : 'hypothese')
    setOffen(true)
  }

  if (!offen) {
    return (
      <button
        onClick={oeffnen}
        title="Markiere vorher einen Satz, um nur ihn zu übernehmen"
        className="rounded-full border border-brand-border px-2.5 py-1 text-[0.7rem] text-brand-muted transition-colors hover:border-accent hover:text-accent"
      >
        In die Arbeitsmappe
      </button>
    )
  }

  return (
    <div className="mt-2 rounded-brand border border-accent/40 bg-accent/[0.04] p-3">
      <div className="flex flex-wrap gap-1.5">
        {ARTEN.map(a => (
          <button
            key={a}
            onClick={() => setArt(a)}
            title={FINDING_KIND_HINTS[a]}
            className={`rounded-full border px-2.5 py-1 text-[0.7rem] transition-colors ${
              art === a
                ? 'border-accent bg-accent/15 font-medium text-accent'
                : 'border-brand-border text-brand-muted hover:border-accent/50'
            }`}
          >
            {FINDING_KIND_LABELS[a]}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[0.68rem] text-brand-muted">{FINDING_KIND_HINTS[art]}</p>

      <input
        value={titel}
        onChange={e => setTitel(e.target.value)}
        placeholder="Kurzer Titel"
        className="mt-2.5 w-full rounded-brand border border-brand-border bg-white px-3 py-1.5 text-sm outline-none focus:border-accent"
      />
      <textarea
        ref={feld}
        value={text}
        onChange={e => setText(e.target.value)}
        rows={5}
        className="mt-2 w-full resize-y rounded-brand border border-brand-border bg-white px-3 py-2 text-sm leading-relaxed outline-none focus:border-accent"
      />

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[0.68rem] text-brand-muted">
          {beleg ? <>Bezug: <b className="font-medium text-accent">{beleg}</b></> : 'kein Bezug erkannt'}
        </span>
        <div className="flex gap-2">
          <button onClick={() => setOffen(false)} className="px-3 py-1.5 text-xs text-brand-muted hover:text-navy">
            Abbrechen
          </button>
          <button
            onClick={() => speichern.mutate()}
            disabled={speichern.isPending || !text.trim()}
            className="rounded border border-accent bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20 disabled:opacity-40"
          >
            {speichern.isPending ? 'Legt ab …' : 'Ablegen'}
          </button>
        </div>
      </div>
      {speichern.isError && (
        <p className="mt-1.5 text-[0.7rem] text-red-600">Konnte nicht abgelegt werden.</p>
      )}
    </div>
  )
}
