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
import QuestionnaireBuilder from '@/components/professional/QuestionnaireBuilder'
import QuestionnaireEvaluation from '@/components/professional/QuestionnaireEvaluation'
import MarkdownMessage from '@/components/app/MarkdownMessage'
import { isValidQuestion, type Answer, type Question } from '@/lib/questionnaire'

const inputCls =
  'w-full rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none focus:border-accent'

export const DIALOG_PLACEHOLDER = `Worum geht es? Was soll Echo mit der Klient:in erkunden – und worauf achten? Dieser Rahmen steuert Echo im Dialog (er darf ruhig ausführlich sein).

Beispiel:
Thema: Umgang mit Schuldgefühlen nach einem Streit.
Echo soll behutsam erkunden, wie sich die Schuld anfühlt und woran die Klient:in sie festmacht – ohne zu bewerten oder Ratschläge zu geben. Auf Selbstabwertung achten und sanft spiegeln. Am Ende offen lassen, kein Lösungsdruck.`

function fmt(dt: string) {
  return new Date(dt).toLocaleString('de-DE', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function TypeIcon({ type }: { type: AssignmentType }) {
  const p = {
    className: 'h-4 w-4 shrink-0 text-brand-muted', viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  }
  if (type === 'message')
    return <svg {...p}><path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" /></svg>
  if (type === 'dialog')
    return <svg {...p}><path d="M4 5h11a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" /><path d="M7.5 8.5h5M7.5 11h3" /></svg>
  if (type === 'questionnaire')
    return <svg {...p}><rect x="8" y="3" width="8" height="4" rx="1" /><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><path d="M9 12h6M9 16h4" /></svg>
  return <svg {...p}><path d="M10 13.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5l-1 1" /><path d="M14 10.5a3.5 3.5 0 0 0-5 0L6.5 13a3.5 3.5 0 0 0 5 5l1-1" /></svg>
}

function StatusChip({ status, doneLabel = 'Erledigt' }: { status: string; doneLabel?: string }) {
  const done = status === 'completed'
  return (
    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-medium ${
      done ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
    }`}>
      {done ? doneLabel : 'Offen'}
    </span>
  )
}

function Chevron() {
  return (
    <svg className="h-4 w-4 shrink-0 text-brand-muted transition-transform group-open:rotate-180"
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
    </svg>
  )
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
  const [questions, setQuestions] = useState<Question[]>([])
  const [due, setDue] = useState('')
  const [keywords, setKeywords] = useState('')

  const create = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {}
      if (type === 'message') payload.body = content
      if (type === 'dialog') {
        payload.intention = content
        if (hypothesis.trim()) payload.hypothesis_for_echo = hypothesis
        const kw = keywords.split(/[\n,]/).map(s => s.trim()).filter(Boolean)
        if (kw.length) payload.keywords = kw
      }
      if (type === 'questionnaire') {
        payload.intro = content
        const valid = questions.filter(isValidQuestion)
        if (valid.length) {
          payload.questions = valid
          payload.scoring = { type: 'avg' }
        }
      }
      if (type === 'resource') { payload.text = content; if (url.trim()) payload.url = url }
      return collabApi.createAssignment(caseId, {
        type, title: title.trim() || null, payload,
        due_at: due ? new Date(due).toISOString() : null,
      })
    },
    onSuccess: () => {
      setTitle(''); setContent(''); setHypothesis(''); setUrl(''); setQuestions([])
      setDue(''); setKeywords(''); invalidate()
    },
  })
  const proReply = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => collabApi.proReplyMessage(caseId, id, text),
    onSuccess: () => invalidate(),
  })

  // Aus der Ressourcen-Bibliothek teilen (Vorlagen des jeweiligen Typs)
  const templates = useQuery({
    queryKey: ['prof-templates'], queryFn: professionalApi.templates,
  })
  const myTemplates = (templates.data ?? []).filter(t => t.type === type)
  const shareTpl = useMutation({
    mutationFn: (templateId: string) => professionalApi.shareTemplate(caseId, templateId),
    onSuccess: () => invalidate(),
  })

  // Fragebogen: Fragen ODER Einleitung reichen; sonst ist Inhalt Pflicht.
  const canSubmit = type === 'questionnaire'
    ? content.trim().length > 0 || questions.filter(isValidQuestion).length > 0
    : content.trim().length > 0

  return (
    <div className="space-y-4">
      <div className="card border-accent/30">
        <h2 className="text-sm font-bold text-navy mb-1">{meta.title}</h2>
        <p className="text-xs text-brand-muted mb-3">{meta.intro}</p>
        <form onSubmit={e => { e.preventDefault(); if (canSubmit) create.mutate() }} className="space-y-2.5">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titel (optional)" className={inputCls} />
          <textarea value={content} onChange={e => setContent(e.target.value)}
            rows={type === 'dialog' ? 7 : 3}
            placeholder={type === 'dialog' ? DIALOG_PLACEHOLDER : meta.contentLabel} className={inputCls} />
          {type === 'dialog' && (
            <input value={hypothesis} onChange={e => setHypothesis(e.target.value)}
              placeholder="Interne Hypothese für Echo (optional, nicht sichtbar für Klient:in)" className={inputCls} />
          )}
          {type === 'dialog' && (
            <textarea value={keywords} onChange={e => setKeywords(e.target.value)} rows={2}
              placeholder="Stichworte – eine pro Zeile. Die Klient:in kann sie im Dialog anklicken (optional)." className={inputCls} />
          )}
          {type === 'resource' && (
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Link (optional)" className={inputCls} />
          )}
          {type === 'questionnaire' && (
            <QuestionnaireBuilder value={questions} onChange={setQuestions} />
          )}
          <label className="flex items-center gap-2 text-xs text-brand-muted">
            <span className="shrink-0">Fällig bis (optional)</span>
            <input type="date" value={due} onChange={e => setDue(e.target.value)} className={inputCls + ' max-w-[180px]'} />
          </label>
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
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="flex items-center gap-2 min-w-0">
                      <TypeIcon type="message" />
                      <span className="text-sm font-medium text-navy truncate">{a.title || 'Nachricht'}</span>
                    </span>
                    <span className="text-[11px] text-brand-muted shrink-0">{fmt(a.created_at)}</span>
                  </div>
                  <MessageThread messages={threadFromPayload(a.payload)} mySide="professional"
                    onSend={t => proReply.mutate({ id: a.id, text: t })} busy={proReply.isPending} />
                </div>
              ))}
            </div>
          ) : type === 'questionnaire' ? (
            <div className="space-y-2">
              {(() => {
                const scores = items
                  .filter(a => a.status === 'completed')
                  .map(a => (a.response as { score?: number } | null)?.score)
                  .filter((s): s is number => s != null)
                  .reverse()
                return scores.length >= 2 ? (
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-brand-muted">Verlauf:</span>
                    {scores.map((s, i) => (
                      <span key={i} className="flex items-center gap-1.5">
                        {i > 0 && <span className="text-brand-muted/40">→</span>}
                        <span className="rounded bg-accent/10 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-accent">Ø {s}</span>
                      </span>
                    ))}
                  </div>
                ) : null
              })()}
              {items.map(a => {
                const resp = a.response as { answers?: Record<string, Answer>; score?: number } | null
                const qs = (a.payload as { questions?: Question[] }).questions ?? []
                const done = a.status === 'completed' && !!resp?.answers
                return (
                  <details key={a.id} className="group rounded-brand border border-brand-border p-3 open:border-accent/30">
                    <summary className="flex items-center justify-between gap-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center gap-2 min-w-0">
                        <TypeIcon type="questionnaire" />
                        <span className="text-sm font-medium text-navy truncate">{a.title || 'Fragebogen'}</span>
                      </span>
                      <span className="flex items-center gap-2 shrink-0">
                        {resp?.score != null && (
                          <span className="rounded bg-accent/10 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-accent">Ø {resp.score}</span>
                        )}
                        <StatusChip status={a.status} doneLabel="Beantwortet" />
                        <Chevron />
                      </span>
                    </summary>
                    <div className="mt-3">
                      {done
                        ? <QuestionnaireEvaluation questions={qs} answers={resp!.answers!} score={resp?.score} />
                        : (
                          <p className="flex items-center gap-1.5 text-xs text-brand-muted">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                            Noch nicht beantwortet · {qs.length} {qs.length === 1 ? 'Frage' : 'Fragen'}
                          </p>
                        )}
                    </div>
                  </details>
                )
              })}
            </div>
          ) : type === 'dialog' ? (
            <div className="space-y-2">
              {items.map(a => {
                const resp = a.response as { summary?: string; note?: string } | null
                const intention = (a.payload as { intention?: string }).intention
                return (
                  <details key={a.id} className="group rounded-brand border border-brand-border p-3 open:border-accent/30">
                    <summary className="flex items-center justify-between gap-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center gap-2 min-w-0">
                        <TypeIcon type="dialog" />
                        <span className="text-sm font-medium text-navy truncate">{a.title || 'Dialog'}</span>
                      </span>
                      <span className="flex items-center gap-2 shrink-0">
                        <StatusChip status={a.status} doneLabel="Abgeschlossen" />
                        <Chevron />
                      </span>
                    </summary>
                    <div className="mt-3 text-sm">
                      {resp?.summary ? (
                        <>
                          <p className="text-xs font-semibold text-brand-muted mb-1">Zusammenfassung der Klient:in</p>
                          <div className="rounded-brand border border-brand-border bg-brand-bg p-3 text-brand-text leading-relaxed">
                            <MarkdownMessage content={resp.summary} />
                          </div>
                          {resp.note && (
                            <>
                              <p className="text-xs font-semibold text-brand-muted mt-3 mb-1">Notiz der Klient:in</p>
                              <p className="text-brand-text whitespace-pre-wrap">{resp.note}</p>
                            </>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-brand-muted">
                          {intention ? `Intention: ${intention} · ` : ''}noch keine Zusammenfassung
                        </p>
                      )}
                    </div>
                  </details>
                )
              })}
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map(a => (
                <li key={a.id} className="flex items-center justify-between gap-3 rounded-brand border border-brand-border px-3 py-2">
                  <span className="flex items-center gap-2 min-w-0">
                    <TypeIcon type={type} />
                    <span className="text-sm text-navy truncate">{a.title || '–'}</span>
                  </span>
                  <span className="flex items-center gap-2 shrink-0 text-[11px] text-brand-muted">
                    <StatusChip status={a.status} />
                    <span>{fmt(a.created_at)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
