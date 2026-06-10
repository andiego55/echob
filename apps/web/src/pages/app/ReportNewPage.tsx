/**
 * /app/cases/:caseId/reports/new — Bericht erstellen
 */
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import { reportsApi } from '@/api/reports'
import { REPORT_TYPE_LABELS, type ReportType } from '@/types'

const REPORT_TYPES: { type: ReportType; desc: string }[] = [
  {
    type: 'short',
    desc: 'Kurze Fallzusammenfassung mit wichtigsten Themen und empfohlenem nächsten Schritt.',
  },
  {
    type: 'pattern',
    desc: 'Ausführlicher Bericht zu wiederkehrenden Mustern, Skalen und offenen Fragen.',
  },
  {
    type: 'coaching_prep',
    desc: 'Vorbereitung für ein Orientierungsgespräch oder Coaching-Paket.',
  },
  {
    type: 'therapy_prep',
    desc: 'Sachliche Zusammenfassung zur Vorbereitung auf professionelle psychologische Hilfe.',
  },
  {
    type: 'progress',
    desc: 'Verlaufsbericht nach längerer Nutzung – Veränderungen über Zeit.',
  },
]

export default function ReportNewPage() {
  const { caseId }  = useParams<{ caseId: string }>()
  const navigate    = useNavigate()
  const qc          = useQueryClient()
  const [selected, setSelected] = useState<ReportType | null>(null)
  const [title, setTitle]       = useState('')

  const mutation = useMutation({
    mutationFn: () => reportsApi.create(caseId!, {
      report_type: selected!,
      title: title || undefined,
    }),
    onSuccess: (report) => {
      qc.invalidateQueries({ queryKey: ['reports', caseId] })
      navigate(`/app/cases/${caseId}/reports/${report.id}`)
    },
  })

  return (
    <AppShell>
      <CaseNav caseId={caseId!} />

      <div className="mx-auto max-w-[680px] px-6 py-10">
        <span className="label">Bericht erstellen</span>
        <h1 className="mt-2 text-xl font-bold text-navy mb-2">Welchen Bericht möchtest du erstellen?</h1>
        <p className="text-sm text-brand-muted mb-8">
          Wähle einen Berichtstyp. EchoB erstellt den Bericht auf Basis deiner gespeicherten Daten.
        </p>

        <div className="space-y-3 mb-8">
          {REPORT_TYPES.map(({ type, desc }) => (
            <button
              key={type}
              type="button"
              onClick={() => setSelected(type)}
              className={`w-full text-left card transition-all ${
                selected === type
                  ? 'border-accent bg-accent/5'
                  : 'hover:border-accent/40'
              }`}
            >
              <p className="text-sm font-semibold text-navy mb-1">{REPORT_TYPE_LABELS[type]}</p>
              <p className="text-xs text-brand-muted">{desc}</p>
            </button>
          ))}
        </div>

        {selected && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-brand-text mb-1.5">
              Titel <span className="font-normal text-brand-muted">(optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`z.B. ${REPORT_TYPE_LABELS[selected]} – Juni 2026`}
              maxLength={200}
              className="w-full rounded-brand border border-brand-border bg-white px-4 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
        )}

        {mutation.isError && (
          <p role="alert" className="mb-4 text-sm text-red-600">
            Bericht konnte nicht erstellt werden. Bitte versuche es erneut.
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            disabled={!selected || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="btn-primary disabled:opacity-50"
          >
            {mutation.isPending ? 'Bericht wird erstellt …' : 'Bericht erstellen'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-outline">
            Abbrechen
          </button>
        </div>

        <p className="mt-6 text-xs text-brand-muted">
          Berichte basieren auf deinen eigenen Angaben. EchoB stellt keine Diagnosen und
          ersetzt keine professionelle psychologische Beratung.
        </p>
      </div>
    </AppShell>
  )
}
