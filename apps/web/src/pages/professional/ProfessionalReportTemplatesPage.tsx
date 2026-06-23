/**
 * /professional/report-templates — eigene Berichtsvorlagen verwalten.
 * Eine Vorlage ist eine Anweisung, mit der Echo aus den Falldaten einen Bericht erzeugt.
 * Optional entwirft Echo aus einer Kurzbeschreibung eine ausgearbeitete Vorlage.
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import ProfessionalShell from '@/components/professional/ProfessionalShell'
import { professionalApi } from '@/api/professional'
import type { ProReportTemplate } from '@/types'

export default function ProfessionalReportTemplatesPage() {
  const qc = useQueryClient()
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['prof-report-templates'],
    queryFn: () => professionalApi.reportTemplates(),
  })

  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [instruction, setInstruction] = useState('')
  const [assistDesc, setAssistDesc] = useState('')

  const reset = () => { setEditingId(null); setName(''); setInstruction(''); setAssistDesc('') }

  const startEdit = (t: ProReportTemplate) => {
    setEditingId(t.id); setName(t.name); setInstruction(t.instruction); setAssistDesc('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const save = useMutation({
    mutationFn: () =>
      editingId
        ? professionalApi.reportTemplateUpdate(editingId, { name: name.trim(), instruction })
        : professionalApi.reportTemplateCreate({ name: name.trim(), instruction }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prof-report-templates'] }); reset() },
  })
  const del = useMutation({
    mutationFn: (id: string) => professionalApi.reportTemplateDelete(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['prof-report-templates'] })
      if (editingId === id) reset()
    },
  })
  const assist = useMutation({
    mutationFn: () => professionalApi.reportTemplateAssist(assistDesc),
    onSuccess: (res) => setInstruction(res.instruction),
  })

  const canSave = name.trim().length > 0 && instruction.trim().length > 0

  return (
    <ProfessionalShell>
      <div className="mx-auto max-w-[820px] px-6 py-10">
        <h1 className="text-2xl font-bold text-navy">Berichtsvorlagen</h1>
        <p className="mt-1 text-sm text-brand-muted">
          Eine Vorlage ist eine Anweisung, mit der Echo aus den Falldaten einen Bericht erzeugt.
          Schreibe sie selbst — oder lass Echo aus einer kurzen Beschreibung einen Vorschlag entwerfen.
        </p>

        {/* Editor */}
        <div className="mt-8 card space-y-4">
          <h2 className="text-lg font-semibold text-navy">
            {editingId ? 'Vorlage bearbeiten' : 'Neue Vorlage'}
          </h2>

          {/* Echo-Assist */}
          <div className="rounded-brand border border-brand-border bg-brand-bg p-4">
            <label className="block text-xs font-semibold text-navy uppercase tracking-wide mb-1.5">
              Echo-Vorschlag (optional)
            </label>
            <textarea
              value={assistDesc} onChange={e => setAssistDesc(e.target.value)} rows={2}
              placeholder="Beschreibe kurz dein Ziel, z. B. „Kompakter Bericht für die Krankenkasse mit Anamnese, Befund und Empfehlung.“"
              className="w-full rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              onClick={() => assist.mutate()} disabled={!assistDesc.trim() || assist.isPending}
              className="mt-2 text-sm font-medium px-3 py-1.5 rounded-brand border border-accent text-accent hover:bg-accent/5 disabled:opacity-40"
            >
              {assist.isPending ? 'Echo entwirft …' : '✨ Echo-Vorschlag erstellen'}
            </button>
            {assist.isError && (
              <p className="mt-2 text-xs text-red-600">Vorschlag fehlgeschlagen. Bitte erneut versuchen.</p>
            )}
            <p className="mt-2 text-[11px] text-brand-muted">
              Der Vorschlag füllt das Anweisungsfeld unten — du kannst ihn danach frei anpassen.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-navy mb-1">Name</label>
            <input
              value={name} onChange={e => setName(e.target.value)} maxLength={160}
              placeholder="z. B. Kassenbericht"
              className="w-full rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Anweisung</label>
            <textarea
              value={instruction} onChange={e => setInstruction(e.target.value)} rows={10}
              placeholder="Beschreibe Zweck, Ton und die gewünschten Abschnitte des Berichts …"
              className="w-full rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          <div className="flex items-center gap-3 border-t border-brand-border pt-4">
            <button
              onClick={() => save.mutate()} disabled={!canSave || save.isPending}
              className="text-sm font-semibold px-4 py-2 rounded-brand bg-accent text-white hover:bg-accent/90 disabled:opacity-50"
            >
              {save.isPending ? 'Speichern …' : editingId ? 'Änderungen speichern' : 'Vorlage speichern'}
            </button>
            {editingId && (
              <button onClick={reset} className="text-sm text-brand-muted hover:text-navy">Abbrechen</button>
            )}
            {save.isError && <span className="text-sm text-red-600">Speichern fehlgeschlagen.</span>}
          </div>
        </div>

        {/* Liste */}
        <div className="mt-8">
          <h2 className="text-sm font-bold text-navy mb-3">Meine Vorlagen</h2>
          {isLoading ? (
            <p className="text-sm text-brand-muted">Wird geladen …</p>
          ) : templates.length === 0 ? (
            <p className="text-sm text-brand-muted">Noch keine eigenen Vorlagen.</p>
          ) : (
            <div className="space-y-2">
              {templates.map(t => (
                <div key={t.id} className="rounded-brand border border-brand-border bg-white px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-navy">{t.name}</div>
                      <p className="text-xs text-brand-muted mt-0.5 line-clamp-2 whitespace-pre-wrap">
                        {t.instruction}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-3">
                      <button onClick={() => startEdit(t)}
                        className="text-xs text-brand-muted hover:text-accent transition-colors">
                        Bearbeiten
                      </button>
                      <button
                        onClick={() => { if (window.confirm('Diese Vorlage löschen?')) del.mutate(t.id) }}
                        disabled={del.isPending}
                        className="text-xs text-brand-muted hover:text-red-600 transition-colors disabled:opacity-40"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProfessionalShell>
  )
}
