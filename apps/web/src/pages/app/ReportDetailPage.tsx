/**
 * /app/cases/:caseId/reports/:reportId — Bericht ansehen & bearbeiten
 */
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import { reportsApi } from '@/api/reports'
import type { ReportType } from '@/types'

// ── Typ-Konfiguration ─────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<ReportType, {
  icon: string
  color: string
  bgColor: string
  borderColor: string
  printAccent: string
}> = {
  short:         { icon: '⚡', color: 'text-sky-700',    bgColor: 'bg-sky-50',    borderColor: 'border-sky-200',    printAccent: '#0369a1' },
  pattern:       { icon: '🔍', color: 'text-violet-700', bgColor: 'bg-violet-50', borderColor: 'border-violet-200', printAccent: '#5b21b6' },
  coaching_prep: { icon: '🎯', color: 'text-teal-700',   bgColor: 'bg-teal-50',   borderColor: 'border-teal-200',   printAccent: '#0f766e' },
  therapy_prep:  { icon: '🏥', color: 'text-indigo-700', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200', printAccent: '#3730a3' },
  progress:      { icon: '📈', color: 'text-amber-700',  bgColor: 'bg-amber-50',  borderColor: 'border-amber-200',  printAccent: '#b45309' },
  partner:       { icon: '✉️', color: 'text-rose-700',   bgColor: 'bg-rose-50',   borderColor: 'border-rose-200',   printAccent: '#be123c' },
}
const DEFAULT_CONFIG = TYPE_CONFIG.pattern

// ── Structured data types ─────────────────────────────────────────────────────

interface ScalePoint   { key: string; label: string; score: number; confidence: string }
interface ProfileScore { key: string; label: string; score: number }
interface TagCount     { tag: string; count: number }
interface ScenePoint   { title: string; date: string | null; distress: number | null }

type VisualItem =
  | { kind: 'pattern_tags';         tags: TagCount[] }
  | { kind: 'scales_dynamic';       scales: ScalePoint[] }
  | { kind: 'scales_personality';   scales: ScalePoint[] }
  | { kind: 'scene_timeline';       timeline: ScenePoint[] }
  | { kind: 'user_profile';         scores: ProfileScore[] }
  | { kind: 'person_profile';       scores: ProfileScore[]; patterns: string[] }

type RenderItem =
  | { kind: 'section'; section: { heading: string; text: string }; index: number }
  | VisualItem

// ── Build render list ─────────────────────────────────────────────────────────

function buildRenderList(
  sections: { heading: string; text: string }[],
  reportType: ReportType,
  content: Record<string, unknown>,
): RenderItem[] {
  const tags       = (content.pattern_tag_counts      as TagCount[]    | undefined) ?? []
  const dynamic    = (content.scales_dynamic          as ScalePoint[]  | undefined) ?? []
  const personality = (content.scales_personality     as ScalePoint[]  | undefined) ?? []
  const timeline   = (content.scene_timeline          as ScenePoint[]  | undefined) ?? []
  const upScores   = (content.user_profile_scores     as ProfileScore[] | undefined) ?? []
  const ppScores   = (content.person_profile_scores   as ProfileScore[] | undefined) ?? []
  const ppPatterns = (content.person_perceived_patterns as string[]    | undefined) ?? []

  const inserts: Array<{ after: number; item: VisualItem }> = []
  const add = (after: number, item: VisualItem) => inserts.push({ after, item })

  if (reportType === 'short') {
    if (tags.length > 0) add(0, { kind: 'pattern_tags', tags })
  } else if (reportType === 'pattern') {
    if (tags.length > 0)          add(3, { kind: 'pattern_tags', tags })
    if (dynamic.length > 0)       add(3, { kind: 'scales_dynamic', scales: dynamic })
    if (ppScores.length > 0)      add(6, { kind: 'person_profile', scores: ppScores, patterns: ppPatterns })
    if (personality.length > 0)   add(7, { kind: 'scales_personality', scales: personality })
    if (upScores.length > 0)      add(7, { kind: 'user_profile', scores: upScores })
  } else if (reportType === 'coaching_prep') {
    if (tags.length > 0)          add(4, { kind: 'pattern_tags', tags })
    if (ppScores.length > 0)      add(2, { kind: 'person_profile', scores: ppScores, patterns: ppPatterns })
    if (upScores.length > 0)      add(5, { kind: 'user_profile', scores: upScores })
  } else if (reportType === 'therapy_prep') {
    if (timeline.length > 0)      add(0, { kind: 'scene_timeline', timeline })
    if (dynamic.length > 0)       add(3, { kind: 'scales_dynamic', scales: dynamic })
    if (ppScores.length > 0)      add(6, { kind: 'person_profile', scores: ppScores, patterns: ppPatterns })
    if (personality.length > 0)   add(6, { kind: 'scales_personality', scales: personality })
    if (upScores.length > 0)      add(8, { kind: 'user_profile', scores: upScores })
  } else if (reportType === 'progress') {
    if (timeline.length > 0)      add(0, { kind: 'scene_timeline', timeline })
  }

  const items: RenderItem[] = []
  for (const ins of inserts.filter(i => i.after === 0)) items.push(ins.item)
  sections.forEach((section, i) => {
    items.push({ kind: 'section', section, index: i + 1 })
    for (const ins of inserts.filter(ins => ins.after === i + 1)) items.push(ins.item)
  })
  return items
}

// ── Main Component ────────────────────────────────────────────────────────────

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
    const label = report?.title ?? report?.type_label ?? 'diesen Bericht'
    if (window.confirm(`Bericht „${label}" wirklich löschen?`)) deleteMutation.mutate()
  }

  if (isLoading) {
    return (
      <AppShell>
        <CaseNav caseId={caseId!} />
        <div className="mx-auto max-w-[780px] px-6 py-16 text-center">
          <p className="text-sm text-brand-muted">Bericht wird geladen …</p>
        </div>
      </AppShell>
    )
  }

  if (isError || !report) {
    return (
      <AppShell>
        <CaseNav caseId={caseId!} />
        <div className="mx-auto max-w-[780px] px-6 py-10 space-y-4">
          <p className="text-sm text-red-600">Bericht konnte nicht geladen werden.</p>
          <button onClick={() => navigate(`/app/cases/${caseId}/reports`)}
            className="rounded-brand border border-brand-border bg-white px-4 py-2 text-sm font-medium text-navy">
            ← Zur Übersicht
          </button>
        </div>
      </AppShell>
    )
  }

  const sections: { heading: string; text: string }[] = report.content?.sections ?? []
  const cfg = TYPE_CONFIG[report.report_type as ReportType] ?? DEFAULT_CONFIG
  const createdAt = new Date(report.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
  const renderItems = buildRenderList(
    sections,
    report.report_type as ReportType,
    (report.content ?? {}) as Record<string, unknown>,
  )

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; font-family: Georgia, serif; }
          .report-page { max-width: 100% !important; padding: 0 !important; }
          .report-header { border-bottom: 2px solid ${cfg.printAccent}; padding-bottom: 16px; margin-bottom: 24px; }
          .report-title { font-size: 22px; font-weight: 700; color: #1a2235; margin: 0 0 4px 0; }
          .report-meta { font-size: 11px; color: #6b7280; }
          .report-disclaimer { font-size: 10px; color: #92400e; background: #fffbeb; border: 1px solid #fde68a; border-radius: 4px; padding: 8px 12px; margin-bottom: 24px; }
          .report-section { page-break-inside: avoid; margin-bottom: 20px; }
          .report-section-heading { font-size: 14px; font-weight: 700; color: #1a2235; margin: 0 0 8px 0; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb; }
          .report-section-text { font-size: 12px; line-height: 1.7; color: #374151; }
          .visual-block { page-break-inside: avoid; margin-bottom: 20px; }
          .scale-track { background: #f3f4f6; height: 8px; border-radius: 9999px; overflow: hidden; }
          .report-footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; }
        }
      `}</style>

      <AppShell>
        <div className="no-print"><CaseNav caseId={caseId!} /></div>

        <div className="mx-auto max-w-[820px] px-6 py-8 report-page">

          {/* Header */}
          <div className="report-header mb-6 pb-5 border-b border-brand-border">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-3 no-print ${cfg.bgColor} ${cfg.color} ${cfg.borderColor} border`}>
                  <span>{cfg.icon}</span>
                  <span>{report.type_label}</span>
                </div>
                <h1 className="report-title text-[1.35rem] font-bold text-navy leading-snug">
                  {report.title ?? report.type_label}
                </h1>
                <p className="report-meta text-xs text-brand-muted mt-1.5">
                  Erstellt am {createdAt} · {sections.length} Abschnitte
                </p>
              </div>
              <div className="no-print flex flex-col gap-2 flex-shrink-0">
                <button onClick={() => window.print()}
                  className="flex items-center gap-1.5 text-xs font-medium text-brand-muted hover:text-navy border border-brand-border rounded-brand px-3 py-1.5 bg-white hover:bg-brand-bg transition-colors">
                  <span>🖨</span> Als PDF speichern
                </button>
                {sections.length > 0 && !isEditing && (
                  <button
                    onClick={() => { setEditValues(sections.map(s => ({ heading: s.heading, text: s.text }))); setIsEditing(true) }}
                    className="flex items-center gap-1.5 text-xs font-medium text-brand-muted hover:text-navy border border-brand-border rounded-brand px-3 py-1.5 bg-white hover:bg-brand-bg transition-colors">
                    <span>✏️</span> Bearbeiten
                  </button>
                )}
                <button onClick={() => navigate(`/app/cases/${caseId}/reports`)}
                  className="text-xs font-medium text-brand-muted hover:text-navy px-3 py-1.5 transition-colors">
                  ← Übersicht
                </button>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="report-disclaimer mb-7 rounded-brand bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-[11px] text-amber-800 leading-relaxed">{report.disclaimer}</p>
          </div>

          {/* Content */}
          {sections.length > 0 ? (
            <div className="space-y-5">
              {isEditing ? (
                <>
                  {editValues.map((sec, i) => (
                    <div key={i} className={`rounded-brand border p-5 space-y-3 ${cfg.borderColor} ${cfg.bgColor}`}>
                      <input
                        className="w-full text-sm font-bold text-navy bg-white border border-brand-border rounded-brand px-3 py-2 focus:outline-none focus:ring-1 focus:ring-accent"
                        value={sec.heading}
                        onChange={e => { const n = [...editValues]; n[i] = { ...n[i], heading: e.target.value }; setEditValues(n) }}
                      />
                      <textarea
                        className="w-full text-sm text-brand-text bg-white border border-brand-border rounded-brand px-3 py-2 focus:outline-none focus:ring-1 focus:ring-accent resize-y"
                        rows={8}
                        value={sec.text}
                        onChange={e => { const n = [...editValues]; n[i] = { ...n[i], text: e.target.value }; setEditValues(n) }}
                      />
                    </div>
                  ))}
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => updateMutation.mutate(editValues)} disabled={updateMutation.isPending}
                      className="btn-primary !py-2 !px-4 !text-sm">
                      {updateMutation.isPending ? 'Speichern …' : 'Änderungen speichern'}
                    </button>
                    <button onClick={() => { setIsEditing(false); setEditValues([]) }}
                      className="rounded-brand border border-brand-border bg-white px-4 py-2 text-sm font-medium text-navy">
                      Abbrechen
                    </button>
                    {updateMutation.isError && <p className="text-xs text-red-600 self-center">Speichern fehlgeschlagen.</p>}
                  </div>
                </>
              ) : (
                renderItems.map((item, i) => {
                  if (item.kind === 'section') {
                    return <ReportSection key={`s${i}`} index={item.index} heading={item.section.heading} text={item.section.text} cfg={cfg} reportType={report.report_type as ReportType} />
                  }
                  if (item.kind === 'pattern_tags') {
                    return <PatternTagsSection key={`pt${i}`} tags={item.tags} cfg={cfg} />
                  }
                  if (item.kind === 'scales_dynamic') {
                    return <ScaleBarsSection key={`sd${i}`} scales={item.scales} title="Beziehungsdynamiken — Skalenwerte" subtitle="Einschätzung auf Basis deiner Szenen · Skala 0–5" mode="dynamic" />
                  }
                  if (item.kind === 'scales_personality') {
                    return <ScaleBarsSection key={`sp${i}`} scales={item.scales} title="Persönlichkeitsprofil der anderen Person" subtitle="Aus den Szenen abgeleitete Ausprägungen · Skala 0–5" mode="personality" />
                  }
                  if (item.kind === 'scene_timeline') {
                    return <SceneTimelineSection key={`tl${i}`} timeline={item.timeline} />
                  }
                  if (item.kind === 'user_profile') {
                    return <ProfileScoresSection key={`up${i}`} scores={item.scores} title="Mein Profil — Auswertung" subtitle="Eigene Angaben aus dem Nutzerprofil · Skala 1–5" mode="user" />
                  }
                  if (item.kind === 'person_profile') {
                    return <ProfileScoresSection key={`pp${i}`} scores={item.scores} title="Fallprofil — Auswertung" subtitle="Einschätzung der anderen Person · Skala 1–5" mode="person" patterns={item.patterns} />
                  }
                  return null
                })
              )}
            </div>
          ) : (
            <div className="card text-center py-8">
              <p className="text-sm text-brand-muted">Dieser Bericht hat keinen generierten Inhalt.</p>
            </div>
          )}

          {/* Footer */}
          {!isEditing && (
            <div className="no-print mt-10 pt-6 border-t border-brand-border flex items-center justify-between gap-4">
              <button onClick={() => navigate(`/app/cases/${caseId}/reports`)}
                className="text-sm text-brand-muted hover:text-navy transition-colors">
                ← Zurück zur Übersicht
              </button>
              <button onClick={handleDelete} disabled={deleteMutation.isPending}
                className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors disabled:opacity-40">
                {deleteMutation.isPending ? 'Wird gelöscht …' : 'Bericht löschen'}
              </button>
            </div>
          )}

          <div className="report-footer" style={{ display: 'none' }}>
            EchoB · Erstellt am {createdAt} · Dieser Bericht basiert ausschließlich auf Selbstauskünften und ersetzt keine professionelle Diagnose.
          </div>

        </div>
      </AppShell>
    </>
  )
}

// ── Text-Abschnitt ────────────────────────────────────────────────────────────

function ReportSection({ index, heading, text, cfg, reportType }: {
  index: number
  heading: string
  text: string
  cfg: typeof DEFAULT_CONFIG
  reportType: ReportType
}) {
  const isShort   = reportType === 'short'
  const isTherapy = reportType === 'therapy_prep'

  return (
    <div className={`report-section rounded-brand border overflow-hidden ${
      isShort ? 'border-sky-200' : isTherapy ? 'border-indigo-100 shadow-sm' : 'border-brand-border'
    }`}>
      <div className={`flex items-center gap-3 px-5 py-3 border-b ${
        isShort ? 'bg-sky-50 border-sky-200' : isTherapy ? 'bg-indigo-50 border-indigo-100' : `${cfg.bgColor} ${cfg.borderColor}`
      }`}>
        <span className={`text-[10px] font-bold uppercase tracking-widest opacity-60 ${cfg.color}`}>
          {String(index).padStart(2, '0')}
        </span>
        <h2 className={`report-section-heading text-sm font-bold leading-snug flex-1 ${isTherapy ? 'text-indigo-900' : 'text-navy'}`}>
          {heading}
        </h2>
      </div>
      <div className="px-5 py-4 bg-white">
        <SectionText text={text} isShort={isShort} />
      </div>
    </div>
  )
}

// ── Scale Bars ────────────────────────────────────────────────────────────────

function ScaleBarsSection({ scales, title, subtitle, mode }: {
  scales: ScalePoint[]
  title: string
  subtitle: string
  mode: 'dynamic' | 'personality'
}) {
  if (!scales || scales.length === 0) return null

  const barColor = (score: number, m: typeof mode) => {
    if (m === 'personality') {
      if (score >= 4) return 'bg-blue-600'
      if (score >= 3) return 'bg-blue-500'
      if (score >= 2) return 'bg-blue-400'
      return 'bg-blue-300'
    }
    if (score >= 4) return 'bg-red-500'
    if (score >= 3) return 'bg-amber-400'
    if (score >= 2) return 'bg-yellow-300'
    return 'bg-teal-300'
  }

  const confidenceDot = (c: string) =>
    c === 'high' ? 'bg-emerald-500' : c === 'medium' ? 'bg-amber-400' : 'bg-gray-300'

  return (
    <div className="visual-block rounded-brand border border-brand-border bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-brand-border bg-brand-bg">
        <span className="text-lg leading-none">{mode === 'personality' ? '🧠' : '📊'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-navy">{title}</p>
          <p className="text-[10px] text-brand-muted mt-0.5">{subtitle}</p>
        </div>
      </div>

      <div className="px-5 py-5">
        <div className="space-y-4">
          {scales.map(s => (
            <div key={s.key}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`h-2 w-2 rounded-full flex-shrink-0 ${confidenceDot(s.confidence)}`} title={`Konfidenz: ${s.confidence}`} />
                  <span className="text-xs font-medium text-navy">{s.label}</span>
                </div>
                <span className="text-xs font-bold text-brand-muted ml-3 flex-shrink-0 tabular-nums">
                  {s.score.toFixed(1)}<span className="font-normal opacity-50">/5</span>
                </span>
              </div>
              <div className="scale-track h-2.5 bg-brand-bg rounded-full overflow-hidden">
                <div
                  className={`h-full ${barColor(s.score, mode)} rounded-full`}
                  style={{ width: `${(s.score / 5) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-4 border-t border-brand-border flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] text-brand-muted">
          <span className="font-semibold text-navy">Konfidenz:</span>
          {[['Hoch', 'bg-emerald-500'], ['Mittel', 'bg-amber-400'], ['Gering', 'bg-gray-300']].map(([l, c]) => (
            <div key={l} className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${c}`} /><span>{l}</span>
            </div>
          ))}
          {mode === 'dynamic' && (
            <>
              <div className="w-px h-3 bg-brand-border" />
              {[['< 2 Gering', 'bg-teal-300'], ['2–3 Mäßig', 'bg-yellow-300'], ['3–4 Erhöht', 'bg-amber-400'], ['> 4 Hoch', 'bg-red-500']].map(([l, c]) => (
                <div key={l} className="flex items-center gap-1.5">
                  <div className={`h-2 w-4 rounded-sm ${c}`} /><span>{l}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Pattern Tags ──────────────────────────────────────────────────────────────

function PatternTagsSection({ tags, cfg }: { tags: TagCount[]; cfg: typeof DEFAULT_CONFIG }) {
  if (!tags || tags.length === 0) return null
  const maxCount = Math.max(...tags.map(t => t.count), 1)

  return (
    <div className="visual-block rounded-brand border border-brand-border bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-brand-border bg-brand-bg">
        <span className="text-lg leading-none">🏷️</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-navy">Erkannte Muster</p>
          <p className="text-[10px] text-brand-muted mt-0.5">Häufigkeit über alle Szenen · Größe entspricht der Häufigkeit</p>
        </div>
      </div>
      <div className="px-5 py-4 flex flex-wrap gap-2.5">
        {tags.map(({ tag, count }) => {
          const intensity = count / maxCount
          const isHigh = intensity > 0.6
          const isMed  = intensity > 0.35
          return (
            <div key={tag}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                isHigh ? `${cfg.bgColor} ${cfg.borderColor} ${cfg.color}` :
                isMed  ? 'bg-brand-bg border-brand-border text-navy' :
                         'bg-white border-brand-border text-brand-muted'
              }`}
              style={{ fontSize: isHigh ? '0.8rem' : isMed ? '0.74rem' : '0.68rem' }}
            >
              <span className={isHigh ? 'font-bold' : 'font-medium'}>{tag}</span>
              <span className={`inline-flex items-center justify-center min-w-[1.25rem] h-4 px-1 rounded-full text-[9px] font-bold ${
                isHigh ? `${cfg.bgColor} ${cfg.color} border ${cfg.borderColor}` : 'bg-brand-border/50 text-brand-muted'
              }`}>{count}×</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Scene Timeline ────────────────────────────────────────────────────────────

function SceneTimelineSection({ timeline }: { timeline: ScenePoint[] }) {
  if (!timeline || timeline.length === 0) return null
  const visible = timeline.slice(0, 14)

  const dotColor = (d: number | null) => {
    if (!d || d === 0) return 'bg-gray-300'
    if (d >= 4) return 'bg-red-500'
    if (d >= 3) return 'bg-amber-400'
    return 'bg-teal-400'
  }

  const formatDate = (d: string | null) => {
    if (!d) return ''
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return ''
    return dt.toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="visual-block rounded-brand border border-brand-border bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-brand-border bg-brand-bg">
        <span className="text-lg leading-none">📅</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-navy">Szenen-Verlauf</p>
          <p className="text-[10px] text-brand-muted mt-0.5">Dokumentierte Szenen chronologisch · Farbe = Belastungsintensität</p>
        </div>
        <span className="text-[10px] font-medium text-brand-muted flex-shrink-0">
          {timeline.length} Szene{timeline.length !== 1 ? 'n' : ''}
        </span>
      </div>

      <div className="px-5 py-5">
        <div className="flex flex-wrap gap-3">
          {visible.map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 w-12">
              <div className={`h-9 w-9 rounded-full shadow-sm border-2 border-white flex items-center justify-center text-white text-[10px] font-bold ${dotColor(s.distress)}`}>
                {s.distress && s.distress > 0 ? Math.round(s.distress) : '–'}
              </div>
              <div className="text-[8px] text-brand-muted text-center leading-tight line-clamp-2 w-full">
                {s.title.slice(0, 14)}{s.title.length > 14 ? '…' : ''}
              </div>
              {s.date && (
                <div className="text-[8px] text-brand-muted/60 text-center">{formatDate(s.date)}</div>
              )}
            </div>
          ))}
        </div>
        {timeline.length > 14 && (
          <p className="mt-3 text-[10px] text-brand-muted">+ {timeline.length - 14} weitere Szenen nicht dargestellt</p>
        )}
        <div className="mt-4 pt-3 border-t border-brand-border flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {[['Gering (1–2)', 'bg-teal-400'], ['Mittel (3)', 'bg-amber-400'], ['Hoch (4–5)', 'bg-red-500'], ['Nicht bewertet', 'bg-gray-300']].map(([l, c]) => (
            <div key={l} className="flex items-center gap-1.5">
              <div className={`h-3 w-3 rounded-full ${c}`} />
              <span className="text-[10px] text-brand-muted">{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Profile Scores ────────────────────────────────────────────────────────────

function ProfileScoresSection({ scores, title, subtitle, mode, patterns }: {
  scores: ProfileScore[]
  title: string
  subtitle: string
  mode: 'user' | 'person'
  patterns?: string[]
}) {
  if (!scores || scores.length === 0) return null

  const barColor = (score: number, m: typeof mode) => {
    if (m === 'user') {
      // Teal gradient — neutral, not alarm-coded
      if (score >= 4.5) return 'bg-teal-600'
      if (score >= 3.5) return 'bg-teal-500'
      if (score >= 2.5) return 'bg-teal-400'
      return 'bg-teal-300'
    }
    // Person profile: orange/red gradient for concerning traits
    if (score >= 4) return 'bg-orange-500'
    if (score >= 3) return 'bg-amber-400'
    if (score >= 2) return 'bg-yellow-300'
    return 'bg-gray-200'
  }

  const icon = mode === 'user' ? '👤' : '🔎'

  return (
    <div className="visual-block rounded-brand border border-brand-border bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-brand-border bg-brand-bg">
        <span className="text-lg leading-none">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-navy">{title}</p>
          <p className="text-[10px] text-brand-muted mt-0.5">{subtitle}</p>
        </div>
      </div>

      <div className="px-5 py-5">
        {/* Perceived patterns (person profile only) */}
        {patterns && patterns.length > 0 && (
          <div className="mb-5">
            <p className="text-[10px] font-semibold text-navy uppercase tracking-wide mb-2">
              Wahrgenommene Muster
            </p>
            <div className="flex flex-wrap gap-2">
              {patterns.map(p => (
                <span key={p} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Score bars — two-column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          {scores.map(s => (
            <div key={s.key}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-navy">{s.label}</span>
                <span className="text-xs font-bold text-brand-muted ml-2 flex-shrink-0 tabular-nums">
                  {s.score.toFixed(1)}<span className="font-normal opacity-50">/5</span>
                </span>
              </div>
              <div className="h-2.5 bg-brand-bg rounded-full overflow-hidden">
                <div
                  className={`h-full ${barColor(s.score, mode)} rounded-full`}
                  style={{ width: `${(s.score / 5) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-[10px] text-brand-muted leading-relaxed">
          {mode === 'user'
            ? 'Eigene Angaben aus dem Nutzerprofil — zeigt Ressourcen, Belastungsmuster und Reaktionstendenzen.'
            : 'Einschätzung auf Basis deiner Angaben zur anderen Person — nicht diagnostisch, nur beschreibend.'}
        </p>
      </div>
    </div>
  )
}

// ── Section Text ──────────────────────────────────────────────────────────────

function SectionText({ text, isShort }: { text: string; isShort: boolean }) {
  const paragraphs = text.split('\n\n').filter(Boolean)
  return (
    <div className={`space-y-2.5 report-section-text ${isShort ? 'text-sm' : 'text-[0.875rem]'} text-brand-text leading-relaxed`}>
      {paragraphs.map((para, i) => {
        const lines = para.split('\n')
        const isBulletList = lines.every(l => l.startsWith('- ') || l.trim() === '')
        if (isBulletList) {
          return (
            <ul key={i} className="space-y-1.5 pl-1">
              {lines.filter(l => l.startsWith('- ')).map((l, j) => (
                <li key={j} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent flex-shrink-0" />
                  <span>{l.slice(2)}</span>
                </li>
              ))}
            </ul>
          )
        }
        return <p key={i} className={isShort ? 'font-medium' : ''}>{para}</p>
      })}
    </div>
  )
}
