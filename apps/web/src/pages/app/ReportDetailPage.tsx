/**
 * /app/cases/:caseId/reports/:reportId — Bericht ansehen & bearbeiten
 */
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import { reportsApi } from '@/api/reports'

export default function ReportDetailPage() {
  const { caseId, reportId } = useParams<{ caseId: string; reportId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ['report', caseId, reportId],
    queryFn: () => reportsApi.get(caseId!, reportId!),
    enabled: !!caseId && !!reportId,
  })

  const [editValues, setEditValues] = useState<{ heading: string; text: string }[]>([])
  const [isEditing, setIsEditing] = useState(false)

  const updateMutation = useMutation({
    mutationFn: (sections: { heading: string; text: string }[]) =>
      reportsApi.update(caseId!, reportId!, sections),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report', caseId, reportId] })
      setIsEditing(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => reportsApi.delete(caseId!, reportId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports', caseId] })
      navigate(`/app/cases/${caseId}/reports`)
    },
  })

  const handleDelete = () => {
    const title = report?.title ?? report?.type_label ?? 'diesen Bericht'
    if (window.confirm(`Bericht „${title}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      deleteMutation.mutate()
    }
  }

  const handleStartEdit = () => {
    setEditValues(sections.map(s => ({ heading: s.heading, text: s.text })))
    setIsEditing(true)
  }

  const handleSave = () => {
    updateMutation.mutate(editValues)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditValues([])
  }

  if (isLoading) {
    return (
      <AppShell>
        <CaseNav caseId={caseId!} />
        <div className="px-6 py-10 text-sm text-brand-muted">Bericht wird geladen …</div>
      </AppShell>
    )
  }

  if (isError || !report) {
    return (
      <AppShell>
        <CaseNav caseId={caseId!} />
        <div className="mx-auto max-w-[780px] px-6 py-10 space-y-4">
          <p className="text-sm text-red-600">Bericht konnte nicht geladen werden.</p>
          <button
            onClick={() => navigate(`/app/cases/${caseId}/reports`)}
            className="rounded-brand border border-brand-border bg-white px-4 py-2 text-sm font-medium text-navy hover:bg-brand-bg transition-colors"
          >
            ← Zur Übersicht
          </button>
        </div>
      </AppShell>
    )
  }

  const sections: { heading: string; text: string }[] = report.content?.sections ?? []

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .card { box-shadow: none; border: 1px solid #e5e7eb; page-break-inside: avoid; }
        }
      `}</style>

      <AppShell>
        <div className="no-print">
          <CaseNav caseId={caseId!} />
        </div>

        <div className="mx-auto max-w-[780px] px-6 py-8">
          {/* Header */}
          <div className="mb-6">
            <span className="label mb-2 no-print">{report.type_label}</span>
            <h1 className="mt-1 text-xl font-bold text-navy">
              {report.title ?? report.type_label}
            </h1>
            <p className="text-xs text-brand-muted mt-1">
              Erstellt am {new Date(report.created_at).toLocaleDateString('de-DE', {
                day: '2-digit', month: 'long', year: 'numeric',
              })}
            </p>
          </div>

          {/* Disclaimer */}
          <div className="mb-6 rounded-brand bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-xs text-amber-800">{report.disclaimer}</p>
          </div>

          {/* Abschnitte */}
          {sections.length > 0 ? (
            <div className="space-y-5">
              {isEditing ? (
                editValues.map((sec, i) => (
                  <div key={i} className="card space-y-2">
                    <input
                      className="w-full text-sm font-bold text-navy border border-brand-border rounded px-3 py-1.5 bg-brand-bg focus:outline-none focus:ring-1 focus:ring-accent"
                      value={sec.heading}
                      onChange={e => {
                        const next = [...editValues]
                        next[i] = { ...next[i], heading: e.target.value }
                        setEditValues(next)
                      }}
                    />
                    <textarea
                      className="w-full text-sm text-brand-text border border-brand-border rounded px-3 py-2 bg-brand-bg focus:outline-none focus:ring-1 focus:ring-accent resize-y"
                      rows={6}
                      value={sec.text}
                      onChange={e => {
                        const next = [...editValues]
                        next[i] = { ...next[i], text: e.target.value }
                        setEditValues(next)
                      }}
                    />
                  </div>
                ))
              ) : (
                sections.map((section, i) => (
                  <div key={i} className="card">
                    <h2 className="text-sm font-bold text-navy mb-2">{section.heading}</h2>
                    <p className="text-sm text-brand-text whitespace-pre-wrap">{section.text}</p>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="card text-center py-8">
              <p className="text-sm text-brand-muted">
                Dieser Bericht hat noch keinen generierten Inhalt.
              </p>
            </div>
          )}

          {/* Aktionen */}
          <div className="mt-8 flex gap-3 flex-wrap items-center no-print">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="btn-primary !py-2 !px-4 !text-sm"
                >
                  {updateMutation.isPending ? 'Speichern …' : 'Änderungen speichern'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="rounded-brand border border-brand-border bg-white px-4 py-2 text-sm font-medium text-navy hover:bg-brand-bg transition-colors"
                >
                  Abbrechen
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => window.print()}
                  className="rounded-brand border border-brand-border bg-white px-4 py-2 text-sm font-medium text-navy hover:bg-brand-bg transition-colors"
                >
                  Als PDF speichern
                </button>
                {sections.length > 0 && (
                  <button
                    onClick={handleStartEdit}
                    className="rounded-brand border border-brand-border bg-white px-4 py-2 text-sm font-medium text-navy hover:bg-brand-bg transition-colors"
                  >
                    Bericht bearbeiten
                  </button>
                )}
                <button
                  onClick={() => navigate(`/app/cases/${caseId}/reports`)}
                  className="rounded-brand border border-brand-border bg-white px-4 py-2 text-sm font-medium text-navy hover:bg-brand-bg transition-colors"
                >
                  ← Zur Übersicht
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="rounded-brand border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                >
                  {deleteMutation.isPending ? 'Wird gelöscht …' : 'Bericht löschen'}
                </button>
              </>
            )}
            {updateMutation.isError && (
              <p className="text-xs text-red-600 w-full">Speichern fehlgeschlagen. Bitte erneut versuchen.</p>
            )}
          </div>
        </div>
      </AppShell>
    </>
  )
}
