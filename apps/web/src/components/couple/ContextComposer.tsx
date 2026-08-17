/**
 * Kontext-Composer: der einzige Weg, wie Wissen aus deinem Fall in eine Paarsitzung kommt.
 *
 * Ablauf bewusst dreistufig: Elemente wählen → KI schreibt einen Entwurf (nur für dich) →
 * du bearbeitest ihn und gibst ihn ausdrücklich frei. Erst der freigegebene Text geht an
 * Echo und ist im Raum sichtbar. Nichts davon passiert automatisch.
 */
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { casesApi } from '@/api/cases'
import { coupleSessionsApi } from '@/api/coupleSessions'
import { apiErrorMessage } from '@/api/errors'

interface Props {
  sessionId: string
  disabled?: boolean
}

export default function ContextComposer({ sessionId, disabled = false }: Props) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [elements, setElements] = useState<string[]>([])
  const [caseId, setCaseId] = useState('')
  const [focus, setFocus] = useState('')
  const [text, setText] = useState('')
  const [instruction, setInstruction] = useState('')

  const { data: ctx } = useQuery({
    queryKey: ['couple-context', sessionId],
    queryFn: () => coupleSessionsApi.getContext(sessionId),
    enabled: !!sessionId,
  })
  const { data: casesData } = useQuery({ queryKey: ['cases'], queryFn: casesApi.list })
  const cases = (casesData?.cases ?? []).filter(c => !c.archived_at)

  // Bestehenden Text übernehmen, ohne laufendes Tippen zu überschreiben.
  useEffect(() => {
    if (!ctx || text) return
    setText(ctx.confirmed_text ?? ctx.draft_text ?? '')
    setInstruction(ctx.instruction ?? '')
    if (ctx.source_elements.length) setElements(ctx.source_elements)
  }, [ctx]) // eslint-disable-line react-hooks/exhaustive-deps

  const draft = useMutation({
    mutationFn: () => coupleSessionsApi.draftContext(sessionId, {
      case_id: caseId, elements, focus: focus.trim() || null,
    }),
    onSuccess: d => { setText(d.draft_text ?? ''); qc.setQueryData(['couple-context', sessionId], d) },
  })

  const confirm = useMutation({
    mutationFn: () => coupleSessionsApi.saveContext(sessionId, {
      confirmed_text: text.trim(), instruction: instruction.trim() || null,
    }),
    onSuccess: d => {
      qc.setQueryData(['couple-context', sessionId], d)
      qc.invalidateQueries({ queryKey: ['couple-session', sessionId] })
    },
  })

  const available = ctx?.available_elements ?? {}
  const max = ctx?.max_chars ?? 6000
  const tooLong = text.length > max

  function toggle(key: string) {
    setElements(prev => prev.includes(key) ? prev.filter(e => e !== key) : [...prev, key])
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-navy">Dein Beitrag</h2>
          <p className="mt-1 text-xs text-brand-muted">
            {ctx?.confirmed_at ? 'Freigegeben – Echo kennt ihn.' : 'Noch nicht freigegeben.'}
          </p>
        </div>
        <button onClick={() => setOpen(o => !o)} className="text-xs text-accent hover:underline shrink-0">
          {open ? 'Zuklappen' : 'Bearbeiten'}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-4">
          {/* Schritt 1: Elemente wählen */}
          <div className="rounded-brand border border-brand-border p-3.5">
            <p className="text-xs font-semibold text-navy">1. Woraus soll der Entwurf entstehen?</p>
            <p className="mt-1 text-[0.7rem] leading-relaxed text-brand-muted">
              Aus diesen Elementen deines Falls schreibt Echo dir einen Vorschlag. Der Inhalt
              selbst wandert nicht in die Sitzung – nur der Text, den du danach freigibst.
            </p>

            {cases.length > 0 && (
              <select value={caseId} onChange={e => setCaseId(e.target.value)} className="input mt-2.5 !text-xs">
                <option value="">Fall wählen …</option>
                {cases.map(c => (
                  <option key={c.id} value={c.id}>{c.person_name || c.main_concern || 'Fall'}</option>
                ))}
              </select>
            )}

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {Object.entries(available).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => toggle(key)}
                  className={`rounded-full border px-2.5 py-1 text-[0.7rem] transition ${
                    elements.includes(key)
                      ? 'border-accent bg-accent/10 text-accent font-medium'
                      : 'border-brand-border text-brand-muted hover:border-navy/30'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <input
              value={focus}
              onChange={e => setFocus(e.target.value)}
              placeholder="Worauf soll Echo besonders achten? (optional)"
              className="input mt-2.5 !text-xs"
            />

            <button
              onClick={() => draft.mutate()}
              disabled={!caseId || elements.length === 0 || draft.isPending || disabled}
              className="btn-outline !py-1.5 !px-3.5 !text-xs mt-2.5 disabled:opacity-50"
            >
              {draft.isPending ? 'Echo schreibt …' : 'Entwurf erzeugen'}
            </button>
            {draft.isError && (
              <p className="mt-2 text-xs text-red-600">{apiErrorMessage(draft.error)}</p>
            )}
          </div>

          {/* Schritt 2: bearbeiten + freigeben */}
          <div className="rounded-brand border border-brand-border p-3.5">
            <p className="text-xs font-semibold text-navy">2. Prüfen, ändern, freigeben</p>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={9}
              placeholder="Du kannst auch einfach selbst schreiben, was Echo für diese Sitzung wissen soll."
              className="input mt-2 w-full resize-y !text-xs"
            />
            <p className={`mt-1 text-[0.68rem] ${tooLong ? 'text-red-600' : 'text-brand-muted'}`}>
              {text.length} / {max} Zeichen
            </p>

            <input
              value={instruction}
              onChange={e => setInstruction(e.target.value)}
              placeholder="Anweisung an Echo, z. B. „bitte nicht über meine Familie sprechen“"
              className="input mt-2 !text-xs"
            />

            <button
              onClick={() => confirm.mutate()}
              disabled={!text.trim() || tooLong || confirm.isPending || disabled}
              className="btn-primary !py-1.5 !px-3.5 !text-xs mt-2.5 disabled:opacity-50"
            >
              {confirm.isPending ? 'Gebe frei …' : 'Für die Sitzung freigeben'}
            </button>
            {confirm.isError && (
              <p className="mt-2 text-xs text-red-600">{apiErrorMessage(confirm.error)}</p>
            )}
            <p className="mt-2 text-[0.68rem] leading-relaxed text-brand-muted">
              Freigegeben heißt: Echo kennt diesen Text – und deine Partnerperson sieht ihn
              im Raum. Alles andere aus deinem Fall bleibt privat.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
