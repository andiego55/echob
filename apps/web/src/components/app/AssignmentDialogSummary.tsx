/**
 * Zugewiesener Dialog → zusammenfassen & an die Fachperson senden.
 * Erscheint im Echo-Chat, wenn der Dialog von einer Fachperson zugewiesen wurde.
 * Die Zusammenfassung fließt NICHT in Echos Fallkontext (liegt nur in der Zuweisung).
 */
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { echoApi } from '@/api/echo'
import { collabApi } from '@/api/collab'
import MarkdownMessage from '@/components/app/MarkdownMessage'

export default function AssignmentDialogSummary({
  caseId, assignmentId,
}: { caseId: string; assignmentId: string }) {
  const [summary, setSummary] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(false)

  const gen = useMutation({
    mutationFn: () => echoApi.summarizeAssignmentDialog(caseId, assignmentId),
    onSuccess: d => setSummary(d.summary),
  })
  const send = useMutation({
    mutationFn: () =>
      collabApi.sendDialogSummary(assignmentId, { summary: summary ?? '', note: note.trim() || undefined }),
    onSuccess: () => setSent(true),
  })

  if (sent) {
    return (
      <div className="card border-accent/30 text-sm text-green-700">
        ✓ Zusammenfassung an deine Fachperson gesendet.
      </div>
    )
  }

  return (
    <div className="card border-accent/30">
      <h3 className="text-sm font-bold text-navy mb-1">Dialog zusammenfassen</h3>
      <p className="text-xs text-brand-muted mb-3">
        Fasse diesen Dialog zusammen und sende ihn an deine Fachperson. Die Zusammenfassung fließt
        nicht in Echos Fallkontext ein.
      </p>

      {!summary ? (
        <button onClick={() => gen.mutate()} disabled={gen.isPending}
          className="btn-primary !py-2 !text-sm disabled:opacity-60">
          {gen.isPending ? 'Wird zusammengefasst …' : 'Zusammenfassen'}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="rounded-brand border border-brand-border bg-brand-bg p-3 text-sm text-brand-text leading-relaxed">
            <MarkdownMessage content={summary} />
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-text mb-1">Notiz an die Fachperson (optional)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
              className="w-full rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => send.mutate()} disabled={send.isPending}
              className="btn-primary !py-2 !text-sm disabled:opacity-60">
              {send.isPending ? 'Wird gesendet …' : 'An Fachperson senden'}
            </button>
            <button onClick={() => gen.mutate()} disabled={gen.isPending}
              className="text-sm text-brand-muted hover:text-navy">
              Neu zusammenfassen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
