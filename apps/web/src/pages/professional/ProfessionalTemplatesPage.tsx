/**
 * /professional/templates — Ressourcen-Bibliothek der Fachperson.
 * Wiederverwendbare Vorlagen (Fragebogen, Ressource/Link, Textbaustein) einmal
 * anlegen; geteilt werden sie aus einem Fall heraus („Aus Bibliothek teilen").
 * Dateien (Bilder/PDFs/Präsentationen) folgen als Phase 4.
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import ProfessionalShell from '@/components/professional/ProfessionalShell'
import { Spinner } from '@/components/auth/ProfessionalRoute'
import { professionalApi, type TemplateType } from '@/api/professional'

const TYPE_OPTIONS: { value: TemplateType; label: string; contentLabel: string }[] = [
  { value: 'resource', label: 'Ressource / Link', contentLabel: 'Beschreibung' },
  { value: 'questionnaire', label: 'Fragebogen', contentLabel: 'Einleitung (optional)' },
  { value: 'message', label: 'Textbaustein', contentLabel: 'Text' },
]
const TYPE_LABEL: Record<TemplateType, string> = {
  resource: 'Ressource', questionnaire: 'Fragebogen', message: 'Textbaustein',
}
const inputCls =
  'w-full rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none focus:border-accent'

export default function ProfessionalTemplatesPage() {
  const qc = useQueryClient()
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['prof-templates'], queryFn: professionalApi.templates,
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['prof-templates'] })

  const [type, setType] = useState<TemplateType>('resource')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [url, setUrl] = useState('')
  const [questions, setQuestions] = useState('')
  const opt = TYPE_OPTIONS.find(o => o.value === type)!

  const create = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {}
      if (type === 'message') payload.body = content
      if (type === 'resource') { payload.text = content; if (url.trim()) payload.url = url }
      if (type === 'questionnaire') {
        payload.intro = content
        const qLines = questions.split('\n').map(s => s.trim()).filter(Boolean)
        if (qLines.length) {
          payload.questions = qLines.map((label, i) => ({ key: `q${i}`, label, type: 'likert', max: 5 }))
          payload.scoring = { type: 'avg' }
        }
      }
      return professionalApi.templateCreate({ type, title: title.trim() || null, payload })
    },
    onSuccess: () => { setTitle(''); setContent(''); setUrl(''); setQuestions(''); invalidate() },
  })
  const del = useMutation({
    mutationFn: (id: string) => professionalApi.templateDelete(id),
    onSuccess: invalidate,
  })

  const canSubmit = type === 'questionnaire'
    ? content.trim().length > 0 || questions.trim().length > 0
    : content.trim().length > 0

  if (isLoading) return <Spinner />

  return (
    <ProfessionalShell>
      <div className="mx-auto max-w-[1100px] px-6 py-10">
        <h1 className="text-2xl font-bold text-navy">Ressourcen-Bibliothek</h1>
        <p className="mt-1 text-sm text-brand-muted mb-8">
          Lege Vorlagen einmal an und teile sie bequem aus einem Fall heraus („Aus Bibliothek teilen").
        </p>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Neue Vorlage */}
          <div className="card border-accent/30 self-start">
            <h2 className="text-sm font-bold text-navy mb-3">Neue Vorlage</h2>
            <form onSubmit={e => { e.preventDefault(); if (canSubmit) create.mutate() }} className="space-y-2.5">
              <div className="flex gap-2">
                <select value={type} onChange={e => setType(e.target.value as TemplateType)} className={inputCls + ' max-w-[48%]'}>
                  {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titel" className={inputCls} />
              </div>
              <textarea value={content} onChange={e => setContent(e.target.value)} rows={3} placeholder={opt.contentLabel} className={inputCls} />
              {type === 'resource' && (
                <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Link (optional)" className={inputCls} />
              )}
              {type === 'questionnaire' && (
                <>
                  <textarea value={questions} onChange={e => setQuestions(e.target.value)} rows={4}
                    placeholder="Fragen – eine pro Zeile (Skala 1–5). Leer lassen = nur Freitext." className={inputCls} />
                  <p className="text-[11px] text-brand-muted -mt-1.5">Jede Zeile wird eine Skala-Frage (1–5); Auswertung als Durchschnitt.</p>
                </>
              )}
              <button type="submit" disabled={create.isPending || !canSubmit} className="btn-primary !py-2 !text-sm disabled:opacity-60">
                {create.isPending ? 'Wird gespeichert …' : 'Vorlage speichern'}
              </button>
            </form>
          </div>

          {/* Bibliothek */}
          <div>
            {templates.length === 0 ? (
              <div className="card text-center py-10">
                <div className="text-3xl mb-2">📚</div>
                <p className="text-sm text-brand-muted">Noch keine Vorlagen. Leg links die erste an.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map(t => (
                  <div key={t.id} className="card flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] uppercase tracking-wide text-accent font-semibold">{TYPE_LABEL[t.type]}</span>
                      </div>
                      <p className="text-sm font-semibold text-navy truncate">{t.title || '(ohne Titel)'}</p>
                      <p className="text-xs text-brand-muted truncate">
                        {String((t.payload as { text?: string; body?: string; intro?: string }).text
                          ?? (t.payload as { body?: string }).body
                          ?? (t.payload as { intro?: string }).intro ?? '')}
                      </p>
                    </div>
                    <button
                      onClick={() => { if (window.confirm('Diese Vorlage löschen?')) del.mutate(t.id) }}
                      disabled={del.isPending}
                      className="shrink-0 text-xs text-brand-muted hover:text-red-600 transition-colors disabled:opacity-40"
                    >
                      Löschen
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProfessionalShell>
  )
}
