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
import { professionalApi, type TemplateType, type ProfessionalTemplate } from '@/api/professional'
import QuestionnaireBuilder from '@/components/professional/QuestionnaireBuilder'
import { isValidQuestion, type Question } from '@/lib/questionnaire'

const TYPE_OPTIONS: { value: TemplateType; label: string; contentLabel: string }[] = [
  { value: 'resource', label: 'Ressource / Link', contentLabel: 'Beschreibung' },
  { value: 'questionnaire', label: 'Fragebogen', contentLabel: 'Einleitung (optional)' },
  { value: 'message', label: 'Textbaustein', contentLabel: 'Text' },
  { value: 'dialog', label: 'Dialog-Vorschlag', contentLabel: 'Intention / Worum es gehen soll' },
]
const TYPE_LABEL: Record<TemplateType, string> = {
  resource: 'Ressource', questionnaire: 'Fragebogen', message: 'Textbaustein', dialog: 'Dialog',
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
  const [questions, setQuestions] = useState<Question[]>([])
  const [hypothesis, setHypothesis] = useState('')
  const [filter, setFilter] = useState<TemplateType | 'all'>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const opt = TYPE_OPTIONS.find(o => o.value === type)!

  const resetForm = () => {
    setEditingId(null); setTitle(''); setContent(''); setUrl(''); setQuestions([]); setHypothesis('')
  }
  const startEdit = (t: ProfessionalTemplate) => {
    const p = t.payload as Record<string, unknown>
    setEditingId(t.id)
    setType(t.type)
    setTitle(t.title ?? '')
    setContent(String(p.text ?? p.body ?? p.intro ?? p.intention ?? ''))
    setUrl(String(p.url ?? ''))
    setHypothesis(String(p.hypothesis_for_echo ?? ''))
    setQuestions(Array.isArray(p.questions) ? (p.questions as Question[]) : [])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const save = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {}
      if (type === 'message') payload.body = content
      if (type === 'resource') { payload.text = content; if (url.trim()) payload.url = url }
      if (type === 'dialog') {
        payload.intention = content
        if (hypothesis.trim()) payload.hypothesis_for_echo = hypothesis
      }
      if (type === 'questionnaire') {
        payload.intro = content
        const valid = questions.filter(isValidQuestion)
        if (valid.length) {
          payload.questions = valid
          payload.scoring = { type: 'avg' }
        }
      }
      return editingId
        ? professionalApi.templateUpdate(editingId, { title: title.trim() || null, payload })
        : professionalApi.templateCreate({ type, title: title.trim() || null, payload })
    },
    onSuccess: () => { resetForm(); invalidate() },
  })
  const del = useMutation({
    mutationFn: (id: string) => professionalApi.templateDelete(id),
    onSuccess: invalidate,
  })

  const canSubmit = type === 'questionnaire'
    ? content.trim().length > 0 || questions.filter(isValidQuestion).length > 0
    : content.trim().length > 0
  const shown = templates.filter(t => filter === 'all' || t.type === filter)

  if (isLoading) return <Spinner />

  return (
    <ProfessionalShell>
      <div className="mx-auto max-w-[1100px] px-6 py-10">
        <h1 className="text-2xl font-bold text-navy">Ressourcen-Bibliothek</h1>
        <p className="mt-1 text-sm text-brand-muted mb-8">
          Lege Vorlagen einmal an und teile sie bequem aus einem Fall heraus („Aus Bibliothek teilen").
        </p>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Neue / Vorlage bearbeiten */}
          <div className="card border-accent/30 self-start">
            <h2 className="text-sm font-bold text-navy mb-3">{editingId ? 'Vorlage bearbeiten' : 'Neue Vorlage'}</h2>
            <form onSubmit={e => { e.preventDefault(); if (canSubmit) save.mutate() }} className="space-y-2.5">
              <div className="flex gap-2">
                <select value={type} disabled={!!editingId} onChange={e => setType(e.target.value as TemplateType)} className={inputCls + ' max-w-[48%] disabled:opacity-60'}>
                  {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titel" className={inputCls} />
              </div>
              <textarea value={content} onChange={e => setContent(e.target.value)} rows={3} placeholder={opt.contentLabel} className={inputCls} />
              {type === 'resource' && (
                <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Link (optional)" className={inputCls} />
              )}
              {type === 'dialog' && (
                <input value={hypothesis} onChange={e => setHypothesis(e.target.value)}
                  placeholder="Interne Hypothese für Echo (optional, nicht für Klient:in sichtbar)" className={inputCls} />
              )}
              {type === 'questionnaire' && (
                <QuestionnaireBuilder value={questions} onChange={setQuestions} />
              )}
              <div className="flex items-center gap-3">
                <button type="submit" disabled={save.isPending || !canSubmit} className="btn-primary !py-2 !text-sm disabled:opacity-60">
                  {save.isPending ? 'Wird gespeichert …' : editingId ? 'Aktualisieren' : 'Vorlage speichern'}
                </button>
                {editingId && (
                  <button type="button" onClick={resetForm} className="text-sm text-brand-muted hover:text-navy">Abbrechen</button>
                )}
              </div>
            </form>
          </div>

          {/* Bibliothek */}
          <div>
            {templates.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {(['all', 'resource', 'questionnaire', 'message', 'dialog'] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filter === f ? 'border-accent bg-accent/10 text-accent font-semibold' : 'border-brand-border text-brand-muted hover:text-navy'}`}>
                    {f === 'all' ? 'Alle' : TYPE_LABEL[f]}
                  </button>
                ))}
              </div>
            )}
            {templates.length === 0 ? (
              <div className="card text-center py-10">
                <div className="text-3xl mb-2">📚</div>
                <p className="text-sm text-brand-muted">Noch keine Vorlagen. Leg links die erste an.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {shown.length === 0 && <p className="text-sm text-brand-muted">Nichts in diesem Filter.</p>}
                {shown.map(t => (
                  <div key={t.id}
                    onClick={() => startEdit(t)}
                    className={`card flex items-start justify-between gap-3 cursor-pointer transition-colors hover:border-accent/40 ${editingId === t.id ? 'border-accent' : ''}`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] uppercase tracking-wide text-accent font-semibold">{TYPE_LABEL[t.type]}</span>
                      </div>
                      <p className="text-sm font-semibold text-navy truncate">{t.title || '(ohne Titel)'}</p>
                      <p className="text-xs text-brand-muted truncate">
                        {String((t.payload as Record<string, string>).text
                          ?? (t.payload as Record<string, string>).body
                          ?? (t.payload as Record<string, string>).intro
                          ?? (t.payload as Record<string, string>).intention ?? '')}
                      </p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); if (window.confirm('Diese Vorlage löschen?')) del.mutate(t.id) }}
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
