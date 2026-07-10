/**
 * /professional/couples/:coupleId/reports/:reportId — Paar-Bericht ansehen,
 * bearbeiten, als PDF speichern (Druck) oder als .md-Datei herunterladen.
 * Nur hinter bestehender Kopplung (Server liefert 404, wenn entkoppelt).
 */
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import ProfessionalShell from '@/components/professional/ProfessionalShell'
import { Spinner } from '@/components/auth/ProfessionalRoute'
import { professionalApi } from '@/api/professional'
import MarkdownMessage from '@/components/app/MarkdownMessage'

const sourceLabel = (s: string) =>
  s === 'template' ? 'Aus Vorlage' : 'Paaranalyse-Bericht'

const iconCls = 'h-3.5 w-3.5'
const btnCls =
  'flex items-center gap-1.5 rounded-brand border border-brand-border bg-white px-3 py-1.5 text-xs font-medium text-brand-muted transition-colors hover:bg-brand-bg hover:text-navy'

export default function CoupleReportDetailPage() {
  const { coupleId, reportId } = useParams<{ coupleId: string; reportId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const backTo = `/professional/couples/${coupleId}/echo`

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ['couple-report', coupleId, reportId],
    queryFn: () => professionalApi.getCoupleReport(coupleId!, reportId!),
    enabled: !!coupleId && !!reportId,
  })

  const [isEditing, setIsEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [sectionDraft, setSectionDraft] = useState<{ heading: string; text: string }[]>([])

  const update = useMutation({
    mutationFn: (payload: { title?: string | null; sections?: { heading: string; text: string }[] }) =>
      professionalApi.updateCoupleReport(coupleId!, reportId!, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['couple-report', coupleId, reportId] })
      qc.invalidateQueries({ queryKey: ['couple-reports', coupleId] })
      setIsEditing(false)
    },
  })
  const del = useMutation({
    mutationFn: () => professionalApi.deleteCoupleReport(coupleId!, reportId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['couple-reports', coupleId] })
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
          <p className="text-sm text-red-600">Bericht konnte nicht geladen werden (entkoppelt oder gelöscht?).</p>
          <Link to={backTo}
            className="inline-block rounded-brand border border-brand-border bg-white px-4 py-2 text-sm font-medium text-navy no-underline">
            ← Zur Paar-Analyse
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

  const downloadMd = () => {
    const title = report.title || sourceLabel(report.source)
    const md = [
      `# ${title}`,
      `_Erstellt am ${createdAt} · EchoB Paar-Analyse_`,
      ...sections.map(s => `## ${s.heading}\n\n${s.text}`),
      '---',
      `_${report.disclaimer}_`,
    ].join('\n\n')
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/[^\wäöüÄÖÜß -]+/g, '_').trim().slice(0, 60) || 'Paar-Bericht'}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; font-family: Georgia, serif; }
          .report-page { max-width: 100% !important; padding: 0 !important; }
          .report-section { page-break-inside: avoid; margin-bottom: 20px; }
        }
      `}</style>

      <ProfessionalShell>
        <div className="mx-auto max-w-[820px] px-6 py-8 report-page">

          <div className="mb-6 pb-5 border-b border-brand-border">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="no-print mb-3 inline-flex items-center rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-accent">
                  {sourceLabel(report.source)}
                </div>
                {isEditing ? (
                  <input
                    value={titleDraft} onChange={e => setTitleDraft(e.target.value)} maxLength={200}
                    placeholder="Titel"
                    className="w-full rounded-brand border border-brand-border bg-white px-3 py-1.5 text-[1.35rem] font-bold leading-snug text-navy focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                ) : (
                  <h1 className="text-[1.35rem] font-bold leading-snug text-navy">
                    {report.title || sourceLabel(report.source)}
                  </h1>
                )}
                <p className="mt-1.5 text-xs text-brand-muted">Erstellt am {createdAt} · {sections.length} Abschnitte</p>
              </div>
              <div className="no-print flex flex-col gap-2 flex-shrink-0">
                <button onClick={() => window.print()} className={btnCls}>
                  <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M6 14h12v7H6z" /></svg>
                  Als PDF speichern
                </button>
                <button onClick={downloadMd} className={btnCls}>
                  <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M8 11l4 4 4-4M5 19h14" /></svg>
                  Herunterladen (.md)
                </button>
                {!isEditing && sections.length > 0 && (
                  <button onClick={startEdit} className={btnCls}>
                    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
                    Bearbeiten
                  </button>
                )}
                <Link to={backTo} className="px-3 py-1.5 text-xs font-medium text-brand-muted no-underline transition-colors hover:text-navy">
                  ← Zur Paar-Analyse
                </Link>
              </div>
            </div>
          </div>

          <div className="mb-7 rounded-brand border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-[11px] leading-relaxed text-amber-800">{report.disclaimer}</p>
          </div>

          {isEditing ? (
            <div className="space-y-5">
              {sectionDraft.map((sec, i) => (
                <div key={i} className="space-y-3 rounded-brand border border-accent/40 bg-brand-bg p-5">
                  <input
                    className="w-full rounded-brand border border-brand-border bg-white px-3 py-2 text-sm font-bold text-navy focus:outline-none focus:ring-1 focus:ring-accent"
                    value={sec.heading}
                    onChange={e => { const n = [...sectionDraft]; n[i] = { ...n[i], heading: e.target.value }; setSectionDraft(n) }}
                  />
                  <textarea
                    className="w-full resize-y rounded-brand border border-brand-border bg-white px-3 py-2 text-sm text-brand-text focus:outline-none focus:ring-1 focus:ring-accent"
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
                  className="rounded-brand bg-accent px-4 py-1.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50">
                  {update.isPending ? 'Speichern …' : 'Änderungen speichern'}
                </button>
                <button onClick={() => setIsEditing(false)} disabled={update.isPending}
                  className="rounded-brand border border-brand-border bg-white px-4 py-1.5 text-sm font-medium text-navy">
                  Abbrechen
                </button>
                {update.isError && <p className="self-center text-xs text-red-600">Speichern fehlgeschlagen.</p>}
              </div>
            </div>
          ) : sections.length > 0 ? (
            <div className="space-y-5">
              {sections.map((sec, i) => (
                <div key={i} className="report-section overflow-hidden rounded-brand border border-brand-border">
                  <div className="flex items-center gap-3 border-b border-brand-border bg-brand-bg px-5 py-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-accent opacity-70">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h2 className="flex-1 text-sm font-bold leading-snug text-navy">{sec.heading}</h2>
                  </div>
                  <div className="bg-white px-5 py-4 text-sm leading-relaxed text-brand-text">
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

          {!isEditing && (
            <div className="no-print mt-10 flex items-center justify-between gap-4 border-t border-brand-border pt-6">
              <Link to={backTo} className="text-sm text-brand-muted no-underline transition-colors hover:text-navy">
                ← Zurück zur Paar-Analyse
              </Link>
              <button
                onClick={() => { if (window.confirm('Diesen Bericht wirklich löschen?')) del.mutate() }}
                disabled={del.isPending}
                className="text-xs font-medium text-red-500 transition-colors hover:text-red-700 disabled:opacity-40">
                {del.isPending ? 'Wird gelöscht …' : 'Bericht löschen'}
              </button>
            </div>
          )}
        </div>
      </ProfessionalShell>
    </>
  )
}
