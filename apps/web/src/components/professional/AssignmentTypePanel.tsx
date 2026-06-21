/**
 * Reiter im Fall-Arbeitsplatz: EINE Zuweisungsart (Dialog/Fragebogen/Nachricht/
 * Ressource) anlegen + die bisherigen Einträge dieses Typs zeigen.
 * Ersetzt die gemischte „Zuweisen & Termine"-Sammelkarte (Reitermenü, Phase 1).
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { collabApi, type AssignmentType } from '@/api/collab'
import { professionalApi } from '@/api/professional'
import MessageThread, { threadFromPayload } from '@/components/MessageThread'

const inputCls =
  'w-full rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none focus:border-accent'

function fmt(dt: string) {
  return new Date(dt).toLocaleString('de-DE', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

const META: Record<AssignmentType, { title: string; intro: string; contentLabel: string; cta: string }> = {
  dialog: {
    title: 'Dialog-Vorschläge',
    intro: 'Bereite einen Echo-Dialog vor. Die interne Hypothese sieht nur Echo – nie die Klient:in.',
    contentLabel: 'Intention / Worum es gehen soll', cta: 'Dialog zuweisen',
  },
  questionnaire: {
    title: 'Fragebögen',
    intro: 'Stelle Skala-Fragen (1–5). Der Score erscheint, sobald die Klient:in antwortet.',
    contentLabel: 'Einleitung (optional)', cta: 'Fragebogen zuweisen',
  },
  message: {
    title: 'Nachrichten',
    intro: 'Schreibe der Klient:in. Sie kann im Thread antworten.',
    contentLabel: 'Nachricht an die Klient:in', cta: 'Nachricht senden',
  },
  resource: {
    title: 'Ressourcen',
    intro: 'Teile eine Ressource (Beschreibung + optionaler Link).',
    contentLabel: 'Beschreibung', cta: 'Ressource teilen',
  },
}

export default function AssignmentTypePanel({ caseId, type }: { caseId: string; type: AssignmentType }) {
  const qc = useQueryClient()
  const meta = META[type]
  const invalidate = () => qc.invalidateQueries({ queryKey: ['assignments', caseId] })
  const assignments = useQuery({
    queryKey: ['assignments', caseId], queryFn: () => collabApi.listAssignments(caseId),
  })
  const items = (assignments.data ?? []).filter(a => a.type === type)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [hypothesis, setHypothesis] = useState('')
  const [url, setUrl] = useState('')
  const [questions, setQuestions] = useState('')

  const create = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {}
      if (type === 'message') payload.body = content
      if (type === 'dialog') {
        payload.intention = content
        if (hypothesis.trim()) payload.hypothesis_for_echo = hypothesis
      }
      if (type === 'questionnaire') {
        payload.intro = content
        const qLines = questions.split('\n').map(s => s.trim()).filter(Boolean)
        if (qLines.length) {
          payload.questions = qLines.map((label, i) => ({ key: `q${i}`, label, type: 'likert', max: 5 }))
          payload.scoring = { type: 'avg' }
        }
      }
      if (type === 'resource') { payload.text = content; if (url.trim()) payload.url = url }
      return collabApi.createAssignment(caseId, { type, title: title.trim() || null, payload })
    },
    onSuccess: () => {
      setTitle(''); setContent(''); setHypothesis(''); setUrl(''); setQuestions(''); invalidate()
    },
  })
  const proReply = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => collabApi.proReplyMessage(caseId, id, text),
    onSuccess: () => invalidate(),
  })

  // Aus der Ressourcen-Bibliothek teilen (nur Typen mit Vorlagen; Dialog hat keine)
  const templates = useQuery({
    queryKey: ['prof-templates'], queryFn: professionalApi.templates, enabled: type !== 'dialog',
  })
  const myTemplates = (templates.data ?? []).filter(t => t.type === type)
  const shareTpl = useMutation({
    mutationFn: (templateId: string) => professionalApi.shareTemplate(caseId, templateId),
    onSuccess: () => invalidate(),
  })

  // Fragebogen: Fragen ODER Einleitung reichen; sonst ist Inhalt Pflicht.
  const canSubmit = type === 'questionnaire'
    ? content.trim().length > 0 || questions.trim().length > 0
    : content.trim().length > 0

  return (
    <div className="space-y-4">
      <div className="card border-accent/30">
        <h2 className="text-sm font-bold text-navy mb-1">{meta.title}</h2>
        <p className="text-xs text-brand-muted mb-3">{meta.intro}</p>
        <form onSubmit={e => { e.preventDefault(); if (canSubmit) create.mutate() }} className="space-y-2.5">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titel (optional)" className={inputCls} />
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={3} placeholder={meta.contentLabel} className={inputCls} />
          {type === 'dialog' && (
            <input value={hypothesis} onChange={e => setHypothesis(e.target.value)}
              placeholder="Interne Hypothese für Echo (optional, nicht sichtbar für Klient:in)" className={inputCls} />
          )}
          {type === 'resource' && (
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Link (optional)" className={inputCls} />
          )}
          {type === 'questionnaire' && (
            <>
              <textarea value={questions} onChange={e => setQuestions(e.target.value)} rows={4}
                placeholder="Fragen – eine pro Zeile (Skala 1–5). Leer lassen = nur Freitext-Antwort." className={inputCls} />
              <p className="text-[11px] text-brand-muted -mt-1.5">Jede Zeile wird eine Skala-Frage (1–5); Auswertung als Durchschnitt.</p>
            </>
          )}
          <button type="submit" disabled={create.isPending || !canSubmit} className="btn-primary !py-2 !text-sm disabled:opacity-60">
            {create.isPending ? 'Wird gesendet …' : meta.cta}
          </button>
        </form>
      </div>

      {myTemplates.length > 0 && (
        <div className="card">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted mb-3">Aus Bibliothek teilen</p>
          <ul className="space-y-2 text-sm">
            {myTemplates.map(t => (
              <li key={t.id} className="flex items-center justify-between gap-3">
                <span className="text-brand-text truncate">{t.title || '(ohne Titel)'}</span>
                <button
                  onClick={() => shareTpl.mutate(t.id)}
                  disabled={shareTpl.isPending}
                  className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-brand border border-accent/40 text-accent hover:bg-accent/5 disabled:opacity-50"
                >
                  Teilen
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {items.length > 0 && (
        <div className="card">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted mb-3">Bisher</p>
          {type === 'message' ? (
            <div className="space-y-3">
              {items.map(a => (
                <div key={a.id} className="rounded-brand border border-brand-border p-3">
                  <div className="flex justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold text-navy">{a.title || 'Nachricht'}</span>
                    <span className="text-[11px] text-brand-muted">{fmt(a.created_at)}</span>
                  </div>
                  <MessageThread messages={threadFromPayload(a.payload)} mySide="professional"
                    onSend={t => proReply.mutate({ id: a.id, text: t })} busy={proReply.isPending} />
                </div>
              ))}
            </div>
          ) : (
            <ul className="space-y-2 text-sm">
              {items.map(a => {
                const score = type === 'questionnaire' ? (a.response as { score?: number } | null)?.score : undefined
                return (
                  <li key={a.id} className="flex items-center justify-between gap-3 border-b border-brand-border pb-2 last:border-0 last:pb-0">
                    <span className="text-brand-text">{a.title || '–'}</span>
                    <span className="flex items-center gap-2 text-xs text-brand-muted shrink-0">
                      {score != null && <span className="font-semibold text-accent">Ø {score}</span>}
                      <span>{a.status}</span>
                      <span>{fmt(a.created_at)}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
