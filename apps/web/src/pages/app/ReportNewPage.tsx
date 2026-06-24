/**
 * /app/cases/:caseId/reports/new — Bericht erstellen
 */
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import { reportsApi } from '@/api/reports'
import { subscriptionApi } from '@/api/subscription'
import { apiErrorText } from '@/utils/apiError'
import type { ReportType } from '@/types'

const TRIAL_ALLOWED: ReportType[] = ['short', 'coaching_prep']

const REPORT_TYPES: {
  type: ReportType
  icon: string
  label: string
  tagline: string
  desc: string
  audience: string
  sections: number
  accentClass: string
}[] = [
  {
    type: 'short',
    icon: '⚡',
    label: 'Kurzbericht',
    tagline: 'Kompakte Orientierung auf einen Blick',
    desc: 'Die wesentlichen Muster und genau ein nächster Schritt — verdichtet auf das Wichtigste. Ideal wenn du schnell eine Einordnung brauchst.',
    audience: 'Für dich selbst',
    sections: 3,
    accentClass: 'border-sky-300 bg-sky-50',
  },
  {
    type: 'pattern',
    icon: '🔍',
    label: 'Musterbericht',
    tagline: 'Tiefe Analyse der Beziehungsdynamiken',
    desc: 'Umfassende Auswertung aller Szenen, Muster und Skalenwerte — mit grafischer Auswertung der Persönlichkeitsdimensionen und Belastungsdynamiken.',
    audience: 'Für dich selbst',
    sections: 9,
    accentClass: 'border-violet-300 bg-violet-50',
  },
  {
    type: 'coaching_prep',
    icon: '🎯',
    label: 'Coaching-Vorbereitung',
    tagline: 'Optimal vorbereitet ins Coaching-Gespräch',
    desc: 'Strukturiert dein Anliegen, Ziele und Ressourcen so, dass ein Coach sofort produktiv mit dir arbeiten kann. Passend zur App-Einführung bei EchoB.',
    audience: 'Für dich & deinen Coach',
    sections: 6,
    accentClass: 'border-teal-300 bg-teal-50',
  },
  {
    type: 'therapy_prep',
    icon: '🏥',
    label: 'Therapie- & Beratungsvorbereitung',
    tagline: 'Professionelle Dokumentation für Fachpersonen',
    desc: 'Vollständige klinische Erstdokumentation im Fachvokabular von Psychotherapeut:innen — mit Skalenwerten, Belastungsverlauf und Ressourceneinschätzung.',
    audience: 'Für Therapeut:in oder Berater:in',
    sections: 9,
    accentClass: 'border-indigo-300 bg-indigo-50',
  },
  {
    type: 'progress',
    icon: '📈',
    label: 'Verlaufsbericht',
    tagline: 'Veränderungen über Zeit sichtbar machen',
    desc: 'Vergleicht frühere und aktuelle Szenen und zeigt, was sich verändert hat — in der Situation und in dir. Setzt mehrere Szenen über einen längeren Zeitraum voraus.',
    audience: 'Für dich selbst',
    sections: 6,
    accentClass: 'border-amber-300 bg-amber-50',
  },
]

export default function ReportNewPage() {
  const { caseId }  = useParams<{ caseId: string }>()
  const navigate    = useNavigate()
  const qc          = useQueryClient()
  const [selected, setSelected] = useState<ReportType | null>(null)
  const [title, setTitle]       = useState('')

  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionApi.getStatus,
  })
  const isTrial = subscription?.plan === 'trial'
  const isLocked = (type: ReportType) => isTrial && !TRIAL_ALLOWED.includes(type)

  const selectedDef = REPORT_TYPES.find(r => r.type === selected)

  const mutation = useMutation({
    mutationFn: () => reportsApi.create(caseId!, {
      report_type: selected!,
      title: title.trim() || undefined,
    }),
    onSuccess: (report) => {
      qc.invalidateQueries({ queryKey: ['reports', caseId] })
      navigate(`/app/cases/${caseId}/reports/${report.id}`)
    },
  })

  if (mutation.isPending) {
    return (
      <AppShell>
        <CaseNav caseId={caseId!} />
        <div className="mx-auto max-w-[640px] px-6 py-20 text-center">
          <div className="text-4xl mb-5">✍️</div>
          <h2 className="text-lg font-bold text-navy mb-2">Bericht wird erstellt …</h2>
          <p className="text-sm text-brand-muted max-w-sm mx-auto leading-relaxed">
            Echo analysiert deine Szenen und Daten. Das kann 15–30 Sekunden dauern.
          </p>
          <div className="mt-6 flex justify-center gap-1.5">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="h-2 w-2 rounded-full bg-accent animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <CaseNav caseId={caseId!} />

      <div className="mx-auto max-w-[820px] px-6 py-10">
        <span className="label">Bericht erstellen</span>
        <h1 className="mt-2 text-xl font-bold text-navy mb-1">
          Welchen Bericht möchtest du erstellen?
        </h1>
        <p className="text-sm text-brand-muted mb-8">
          EchoB generiert den Bericht auf Basis deiner gespeicherten Szenen, Profile und Dialoge.
        </p>

        {/* Typ-Auswahl */}
        <div className="grid gap-3 sm:grid-cols-2 mb-8">
          {REPORT_TYPES.map(({ type, icon, label, tagline, desc, audience, sections, accentClass }) => {
            const locked = isLocked(type)
            return (
              <button
                key={type}
                type="button"
                onClick={() => { if (!locked) { setSelected(type); setTitle('') } }}
                className={`text-left rounded-brand border-2 p-5 transition-all ${
                  locked
                    ? 'border-brand-border bg-brand-bg/50 opacity-60 cursor-not-allowed'
                    : selected === type
                      ? accentClass + ' shadow-sm'
                      : 'border-brand-border bg-white hover:border-accent/40 hover:bg-brand-bg'
                }`}
              >
                <div className="flex items-start gap-3 mb-2">
                  <span className="text-2xl leading-none mt-0.5">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-navy leading-snug">{label}</p>
                      {locked && (
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                          Abo
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-medium text-accent mt-0.5">{tagline}</p>
                  </div>
                </div>
                <p className="text-xs text-brand-muted leading-relaxed mt-2">{desc}</p>
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-[10px] text-brand-muted/70 font-medium uppercase tracking-wide">
                    {sections} Abschnitte
                  </span>
                  <span className="text-brand-muted/40">·</span>
                  <span className="text-[10px] text-brand-muted/70 font-medium uppercase tracking-wide">
                    {audience}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Trial-Hinweis */}
        {isTrial && (
          <div className="mb-6 flex items-center justify-between gap-3 rounded-brand border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs text-amber-700">
              Im Testzugang verfügbar: <strong>Kurzbericht</strong> und <strong>Coaching-Vorbereitung</strong>.
              Alle weiteren Berichte sind im Abo enthalten.
            </p>
            <Link to="/app/upgrade" className="text-xs font-semibold text-accent shrink-0 hover:underline">
              Upgrade →
            </Link>
          </div>
        )}

        {/* Optionaler Titel */}
        {selected && (
          <div className="mb-6 rounded-brand border border-brand-border bg-white p-5">
            <label className="block text-sm font-semibold text-navy mb-1">
              Titel <span className="font-normal text-brand-muted">(optional)</span>
            </label>
            <p className="text-xs text-brand-muted mb-3">
              Ohne Titel wird „{selectedDef?.label}" als Bezeichnung verwendet.
            </p>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`z. B. ${selectedDef?.label} – ${new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}`}
              maxLength={200}
              className="w-full rounded-brand border border-brand-border bg-brand-bg px-4 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
        )}

        {mutation.isError && (
          <div className="mb-4 rounded-brand border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">
              {apiErrorText(mutation.error, 'Bericht konnte nicht erstellt werden. Bitte stelle sicher, dass du bestätigte Szenen gespeichert hast, und versuche es erneut.')}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            disabled={!selected}
            onClick={() => mutation.mutate()}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Bericht erstellen
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-outline">
            Abbrechen
          </button>
        </div>

        <p className="mt-6 text-xs text-brand-muted max-w-lg leading-relaxed">
          Berichte basieren ausschließlich auf deinen eigenen Angaben und ersetzen keine psychologische
          Diagnose oder professionelle Beratung.
        </p>
      </div>
    </AppShell>
  )
}
