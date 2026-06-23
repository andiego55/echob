/**
 * /professional/cases/:caseId/reports/:reportId — Fallbericht ansehen, bearbeiten, drucken.
 * Nur hinter aktiver Freigabe (Server liefert 404 bei Widerruf/kein Zugriff).
 */
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import ProfessionalShell from '@/components/professional/ProfessionalShell'
import { Spinner } from '@/components/auth/ProfessionalRoute'
import { professionalApi } from '@/api/professional'
import MarkdownMessage from '@/components/app/MarkdownMessage'

const SOURCE_LABELS: Record<string, string> = {
  'standard:verlauf': 'Verlaufsbericht',
  'standard:uebergabe': 'Übergabe-/Überweisungsbericht',
  'standard:standort': 'Fall-Standortbestimmung',
}
const sourceLabel = (s: string) => SOURCE_LABELS[s] || (s === 'template' ? 'Eigene Vorlage' : 'Bericht')

export default function ProfessionalReportDetailPage() {
  const { caseId, reportId } = useParams<{ caseId: string; reportId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const backTo = `/professional/cases/${caseId}?tab=reports`

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ['prof-report', caseId, reportId],
    queryFn: () => professionalApi.caseReport(caseId!, reportId!),
    enabled: !!caseId && !!reportId,
  })

  const [isEditing, setIsEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [sectionDraft, setSectionDraft] = useState<{ heading: string; text: string }[]>([])

  const update = useMutation({
    mutationFn: (payload: { title?: string | null; sections?: { heading: string; text: string }[] }) =>
      professionalApi.caseReportUpdate(caseId!, reportId!, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prof-report', caseId, reportId] })
      setIsEditing(false)
    },
  })
  const del = useMutation({
    mutationFn: () => professionalApi.caseReportDelete(caseId!, reportId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prof-case-reports', caseId] })
      navigate(backTo)
    },
  })

  if (isLoading) {
    return (
      <ProfessionalShell>
        <div className="mx-auto max-w-[820px] px-6 py-16 flex justify-center"><Spinner /></div>
      </ProfessionalShell>
    )
  }
  if (isError || !report) {
    return (
      <ProfessionalShell>
        <div className="mx-auto max-w-[820px] px-6 py-10 space-y-4">
          <p className="text-sm text-red-600">Bericht konnte nicht geladen werden (kein Zugriff?).</p>
          <Link to={backTo}
            className="inline-block rounded-brand border border-brand-border bg-white px-4 py-2 text-sm font-medium text-navy no-underline">
            ← Zur Übersicht
          </Link>
        </div>
      </ProfessionalShell>
    )
  }

  const sections = report.content?.sections ?? []
  const createdAt = new Date(report.created_at).toLocaleDateString(
    'de-DE', { day: '2-digit', month: 'long', year: 'numeric' })

  const startEdit = () => {
    setTitleDraft(report.title ?? '')
    setSectionDraft(sections.map(s => ({ heading: s.heading, text: s.text })))
    setIsEditing(true)
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; font-family: Georgia, serif; }
          .report-page { max-width: 100% !important; padding: 0 !important; }
          .report-header { border-bottom: 2px solid #1a2235; padding-bottom: 16px; margin-bottom: 24px; }
          .report-title { font-size: 22px; font-weight: 700; color: #1a2235; margin: 0 0 4px 0; }
          .report-meta { font-size: 11px; color: #6b7280; }
          .report-disclaimer { font-size: 10px; color: #92400e; background: #fffbeb; border: 1px solid #fde68a; border-radius: 4px; padding: 8px 12px; margin-bottom: 24px; }
          .report-section { page-break-inside: avoid; margin-bottom: 20px; }
          .report-section-heading { font-size: 14px; font-weight: 700; color: #1a2235; margin: 0 0 8px 0; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb; }
          .report-section-text { font-size: 12px; line-height: 1.7; color: #374151; }
          .report-footer-print { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; }
        }
      `}</style>

      <ProfessionalShell>
        <div className="mx-auto max-w-[820px] px-6 py-8 report-page">

          {/* Header */}
          <div className="report-header mb-6 pb-5 border-b border-brand-border">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-3 bg-accent/10 text-accent no-print">
                  {sourceLabel(report.source)}
                </div>
                {isEditing ? (
                  <input
                    value={titleDraft} onChange={e => setTitleDraft(e.target.value)} maxLength={200}
                    placeholder="Titel"
                    className="report-title w-full text-[1.35rem] font-bold text-navy leading-snug bg-white border border-brand-border rounded-brand px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                ) : (
                  <h1 className="report-title text-[1.35rem] font-bold text-navy leading-snug">
                    {report.title || sourceLabel(report.source)}
                  </h1>
                )}
                <p className="report-meta text-xs text-brand-muted mt-1.5">
                  Erstellt am {createdAt} · {sections.length} Abschnitte
                </p>
              </div>
              <div className="no-print flex flex-col gap-2 flex-shrink-0">
                <button onClick={() => window.print()}
                  className="flex items-center gap-1.5 text-xs font-medium text-brand-muted hover:text-navy border border-brand-border rounded-brand px-3 py-1.5 bg-white hover:bg-brand-bg transition-colors">
                  <span>🖨</span> Als PDF speichern
                </button>
                {!isEditing && sections.length > 0 && (
                  <button onClick={startEdit}
                    className="flex items-center gap-1.5 text-xs font-medium text-brand-muted hover:text-navy border border-brand-border rounded-brand px-3 py-1.5 bg-white hover:bg-brand-bg transition-colors">
                    <span>✏️</span> Bearbeiten
                  </button>
                )}
                <Link to={backTo}
                  className="text-xs font-medium text-brand-muted hover:text-navy px-3 py-1.5 transition-colors no-underline">
                  ← Übersicht
                </Link>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="report-disclaimer mb-7 rounded-brand bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-[11px] text-amber-800 leading-relaxed">{report.disclaimer}</p>
          </div>

          {/* Inhalt */}
          {isEditing ? (
            <div className="space-y-5">
              {sectionDraft.map((sec, i) => (
                <div key={i} className="rounded-brand border border-accent/40 bg-brand-bg p-5 space-y-3">
                  <input
                    className="w-full text-sm font-bold text-navy bg-white border border-brand-border rounded-brand px-3 py-2 focus:outline-none focus:ring-1 focus:ring-accent"
                    value={sec.heading}
                    onChange={e => { const n = [...sectionDraft]; n[i] = { ...n[i], heading: e.target.value }; setSectionDraft(n) }}
                  />
                  <textarea
                    className="w-full text-sm text-brand-text bg-white border border-brand-border rounded-brand px-3 py-2 focus:outline-none focus:ring-1 focus:ring-accent resize-y"
                    rows={9}
                    value={sec.text}
                    onChange={e => { const n = [...sectionDraft]; n[i] = { ...n[i], text: e.target.value }; setSectionDraft(n) }}
                  />
                </div>
              ))}
              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  onClick={() => update.mutate({ title: titleDraft.trim() || null, sections: sectionDraft })}
                  disabled={update.isPending}
                  className="text-sm font-semibold px-4 py-1.5 rounded-brand bg-accent text-white hover:bg-accent/90 disabled:opacity-50">
                  {update.isPending ? 'Speichern …' : 'Änderungen speichern'}
                </button>
                <button onClick={() => setIsEditing(false)} disabled={update.isPending}
                  className="rounded-brand border border-brand-border bg-white px-4 py-1.5 text-sm font-medium text-navy">
                  Abbrechen
                </button>
                {update.isError && <p className="text-xs text-red-600 self-center">Speichern fehlgeschlagen.</p>}
              </div>
            </div>
          ) : sections.length > 0 ? (
            <div className="space-y-5">
              {sections.map((sec, i) => (
                <div key={i} className="report-section rounded-brand border border-brand-border overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-3 border-b border-brand-border bg-brand-bg">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-accent opacity-70">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h2 className="report-section-heading text-sm font-bold leading-snug flex-1 text-navy">
                      {sec.heading}
                    </h2>
                  </div>
                  <div className="report-section-text px-5 py-4 bg-white text-sm text-brand-text leading-relaxed">
                    <MarkdownMessage content={sec.text} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-8">
              <p className="text-sm text-brand-muted">Dieser Bericht hat keinen generierten Inhalt.</p>
            </div>
          )}

          {/* Footer */}
          {!isEditing && (
            <div className="no-print mt-10 pt-6 border-t border-brand-border flex items-center justify-between gap-4">
              <Link to={backTo} className="text-sm text-brand-muted hover:text-navy transition-colors no-underline">
                ← Zurück zur Übersicht
              </Link>
              <button
                onClick={() => { if (window.confirm('Diesen Bericht wirklich löschen?')) del.mutate() }}
                disabled={del.isPending}
                className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors disabled:opacity-40">
                {del.isPending ? 'Wird gelöscht …' : 'Bericht löschen'}
              </button>
            </div>
          )}

          <div className="report-footer-print" style={{ display: 'none' }}>
            EchoB · Erstellt am {createdAt} · KI-gestützte fachliche Einschätzung, keine klinische Diagnose — fachlich zu validieren.
          </div>

        </div>
      </ProfessionalShell>
    </>
  )
}
