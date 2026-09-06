/**
 * Die Arbeitsmappe eines Falls.
 *
 * **Was sie zeigt, ist eine Reihenfolge und keine Liste.** Oben, was noch offen ist —
 * daran arbeitet man. Darunter, was sich bewährt hat. Ganz unten, was sich nicht bewährt
 * hat, eingeklappt. Diese Reihenfolge ist die eigentliche Aussage: Eine Arbeitsmappe, in
 * der alles gleich aussieht, ist ein Zettelkasten.
 *
 * **Warum Verworfenes nicht verschwindet.** Es ist ein Ergebnis, kein Fehler. Wer im Juni
 * eine Hypothese fallen lässt, hat etwas gelernt — und im September will man wissen, dass
 * man diesen Weg schon gegangen ist. Echo bekommt es aus demselben Grund mit: damit es
 * denselben Gedanken nicht als frische Einsicht zurückgibt.
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  findingsApi, FINDING_KIND_LABELS, type Finding, type FindingStatus,
} from '@/api/professionalFindings'

const KIND_FARBE: Record<string, string> = {
  hypothese:   'bg-accent/10 text-accent',
  beobachtung: 'bg-navy/[0.07] text-navy',
  frage:       'bg-sky-50 text-sky-700',
  impuls:      'bg-emerald-50 text-emerald-700',
  achtung:     'bg-amber-50 text-amber-700',
}

function datum(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function Eintrag({ caseId, e }: { caseId: string; e: Finding }) {
  const qc = useQueryClient()
  const [bearbeiten, setBearbeiten] = useState(false)
  const [text, setText] = useState(e.body)

  const aendern = useMutation({
    mutationFn: (daten: Parameters<typeof findingsApi.update>[2]) =>
      findingsApi.update(caseId, e.id, daten),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prof-findings', caseId] }); setBearbeiten(false) },
  })
  const loeschen = useMutation({
    mutationFn: () => findingsApi.remove(caseId, e.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prof-findings', caseId] }),
  })

  return (
    <div className="rounded-brand border border-brand-border bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${KIND_FARBE[e.kind] ?? ''}`}>
          {FINDING_KIND_LABELS[e.kind]}
        </span>
        {e.beleg && (
          <span className="rounded-[5px] border-b border-dotted border-accent/60 bg-accent/[0.07] px-1 text-[0.68rem] font-medium text-accent">
            {e.beleg}
          </span>
        )}
        <span className="ml-auto text-[0.68rem] text-brand-muted">{datum(e.created_at)}</span>
      </div>

      <p className="mt-1.5 text-sm font-semibold text-navy">{e.title}</p>

      {bearbeiten ? (
        <>
          <textarea
            value={text}
            onChange={ev => setText(ev.target.value)}
            rows={4}
            className="mt-1.5 w-full resize-y rounded-brand border border-brand-border px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <div className="mt-1.5 flex justify-end gap-2">
            <button onClick={() => { setText(e.body); setBearbeiten(false) }}
              className="px-2 py-1 text-xs text-brand-muted hover:text-navy">Abbrechen</button>
            <button onClick={() => aendern.mutate({ body: text })} disabled={aendern.isPending || !text.trim()}
              className="rounded border border-accent bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent disabled:opacity-40">
              Speichern
            </button>
          </div>
        </>
      ) : (
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-brand-text">{e.body}</p>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-brand-border pt-2">
        {/* Der eigentliche fachliche Zug: entscheiden, ob sich etwas bewaehrt hat. */}
        {e.status === 'offen' ? (
          <>
            <button onClick={() => aendern.mutate({ status: 'bestaetigt' })}
              className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[0.7rem] text-emerald-700 hover:border-emerald-400">
              Hat sich bestätigt
            </button>
            <button onClick={() => aendern.mutate({ status: 'verworfen' })}
              className="rounded-full border border-brand-border px-2.5 py-1 text-[0.7rem] text-brand-muted hover:border-navy/40 hover:text-navy">
              Hat sich nicht bestätigt
            </button>
          </>
        ) : (
          <button onClick={() => aendern.mutate({ status: 'offen' })}
            className="rounded-full border border-brand-border px-2.5 py-1 text-[0.7rem] text-brand-muted hover:border-accent hover:text-accent">
            Wieder offen
          </button>
        )}
        {!bearbeiten && (
          <button onClick={() => setBearbeiten(true)}
            className="text-[0.7rem] text-brand-muted hover:text-navy">Bearbeiten</button>
        )}
        <button
          onClick={() => { if (window.confirm('Diesen Eintrag löschen?')) loeschen.mutate() }}
          className="ml-auto text-[0.7rem] text-brand-muted hover:text-red-600"
        >
          Löschen
        </button>
      </div>
    </div>
  )
}

export default function ArbeitsmappePanel({ caseId }: { caseId: string }) {
  const { data: eintraege = [], isLoading } = useQuery({
    queryKey: ['prof-findings', caseId],
    queryFn: () => findingsApi.list(caseId),
    enabled: !!caseId,
  })
  const [verworfeneZeigen, setVerworfeneZeigen] = useState(false)

  const von = (s: FindingStatus) => eintraege.filter(e => e.status === s)
  const offen = von('offen')
  const bestaetigt = von('bestaetigt')
  const verworfen = von('verworfen')

  if (isLoading) return <p className="text-sm text-brand-muted">Lädt …</p>

  if (eintraege.length === 0) {
    return (
      <div className="rounded-brand border border-dashed border-brand-border bg-white px-5 py-6">
        <p className="text-sm font-semibold text-navy">Noch nichts abgelegt</p>
        <p className="mt-1.5 max-w-[60ch] text-sm leading-relaxed text-brand-muted">
          Die Arbeitsmappe sammelt, was du aus den Gesprächen mit Echo mitnimmst:
          Hypothesen, die sich noch bewähren müssen, konkrete Beobachtungen, Fragen für den
          nächsten Termin. Im Echo-Dialog steht unter jeder Antwort
          <span className="mx-1 rounded-full border border-brand-border px-1.5 py-0.5 text-[0.7rem]">In die Arbeitsmappe</span>
          — markiere vorher einen Satz, dann wird nur er übernommen.
        </p>
        <p className="mt-2 text-xs text-brand-muted/80">
          Echo kennt die Mappe im nächsten Gespräch: Verworfenes schlägt es nicht erneut vor.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-navy">
          Offen <span className="font-normal text-brand-muted">({offen.length})</span>
        </h3>
        {offen.length === 0
          ? <p className="text-sm text-brand-muted">Nichts offen.</p>
          : <div className="space-y-2.5">{offen.map(e => <Eintrag key={e.id} caseId={caseId} e={e} />)}</div>}
      </section>

      {bestaetigt.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-navy">
            Bestätigt <span className="font-normal text-brand-muted">({bestaetigt.length})</span>
          </h3>
          <div className="space-y-2.5">{bestaetigt.map(e => <Eintrag key={e.id} caseId={caseId} e={e} />)}</div>
        </section>
      )}

      {verworfen.length > 0 && (
        <section>
          <button
            onClick={() => setVerworfeneZeigen(v => !v)}
            className="mb-2 text-sm font-semibold text-brand-muted hover:text-navy"
          >
            {verworfeneZeigen ? '▾' : '▸'} Nicht bestätigt ({verworfen.length})
          </button>
          {verworfeneZeigen && (
            <>
              <p className="mb-2 max-w-[60ch] text-xs leading-relaxed text-brand-muted">
                Bleibt stehen, weil es ein Ergebnis ist: Du bist diesen Weg schon gegangen.
                Echo bekommt es mit und schlägt es nicht erneut vor.
              </p>
              <div className="space-y-2.5 opacity-75">
                {verworfen.map(e => <Eintrag key={e.id} caseId={caseId} e={e} />)}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  )
}
