/**
 * /professional/settings — Fachpersonen-Einstellungen (⚙️). Aktuell: Echo-Aussteuerung
 * (therapeutischer Ansatz für die Vorbereitung). Echo bleibt ohne Diagnosen/Therapieanweisungen.
 */
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import ProfessionalShell from '@/components/professional/ProfessionalShell'
import EchoSteeringForm, { type EchoModeOption, type EchoSteeringValue } from '@/components/settings/EchoSteeringForm'
import { professionalApi } from '@/api/professional'

const PRO_APPROACHES: EchoModeOption[] = [
  { key: 'balanced', name: 'Ausgewogen',
    description: 'Integrativ, ressourcen- und beziehungsorientiert. Wählt je nach freigegebenem Material das passende Vorgehen.' },
  { key: 'systemic', name: 'Systemisch',
    description: 'Fokus auf Beziehungsdynamik, Muster und Kontext statt Schuld; schlägt zirkuläre und hypothetische Fragen vor.' },
  { key: 'person_centered', name: 'Personzentriert',
    description: 'Humanistisch (Rogers): Empathie, Wertschätzung, nah am Erleben — ohne vorschnelle Deutungen.' },
  { key: 'cbt', name: 'Verhaltenstherapeutisch (CBT)',
    description: 'Gedanken–Gefühle–Verhalten, Auslöser und Konsequenzen, kleine überprüfbare nächste Schritte.' },
  { key: 'solution_focused', name: 'Lösungsorientiert',
    description: 'Ziele, Ressourcen und Ausnahmen vom Problem; Skalierungs- und Ausnahmefragen statt Problemanalyse.' },
]

export default function ProfessionalSettingsPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['pro-echo-settings'], queryFn: professionalApi.getEchoSettings,
  })
  const [val, setVal] = useState<EchoSteeringValue | null>(null)

  useEffect(() => {
    if (data) setVal({
      modeKey: data.echo_approach, tone: data.echo_tone,
      depth: data.echo_depth, custom: data.echo_custom_steering,
    })
  }, [data])

  const save = useMutation({
    mutationFn: (v: EchoSteeringValue) => professionalApi.saveEchoSettings({
      echo_approach: v.modeKey, echo_tone: v.tone, echo_depth: v.depth, echo_custom_steering: v.custom,
    }),
    onSuccess: res => qc.setQueryData(['pro-echo-settings'], res),
  })

  const dirty = !!(val && data && (
    val.modeKey !== data.echo_approach || val.tone !== data.echo_tone ||
    val.depth !== data.echo_depth || (val.custom ?? null) !== (data.echo_custom_steering ?? null)
  ))

  return (
    <ProfessionalShell>
      <div className="mx-auto max-w-[680px] px-6 py-10">
        <h1 className="text-2xl font-bold text-navy">Einstellungen</h1>
        <p className="mt-1 text-sm text-brand-muted">
          Hier stimmst du Echo auf deine Arbeitsweise ab. Weitere Einstellungen folgen.
        </p>

        <div className="mt-8 card">
          <h2 className="text-lg font-semibold text-navy">Therapeutischer Ansatz für Echo</h2>
          <p className="mt-1 text-sm text-brand-muted">
            Prägt nur den Stil, in dem Echo dich bei der Fallvorbereitung unterstützt
            (z. B. welche Fragen es vorschlägt). Echo stellt weiterhin keine Diagnosen und gibt
            keine Therapieanweisungen — nur auf Basis des freigegebenen Materials.
          </p>
          <div className="mt-6">
            {isLoading || !val
              ? <p className="text-sm text-brand-muted">Wird geladen …</p>
              : <EchoSteeringForm
                  presetLabel="Ansatz"
                  modes={PRO_APPROACHES}
                  value={val}
                  onChange={setVal}
                  customHint="Beschreibe, worauf Echo bei deiner Vorbereitung besonders achten soll. Das passt nur Stil und Schwerpunkt an."
                />}
          </div>
          {val && (
            <div className="mt-6 flex items-center gap-3 border-t border-brand-border pt-5">
              <button
                onClick={() => save.mutate(val)} disabled={!dirty || save.isPending}
                className="text-sm font-semibold px-4 py-2 rounded-brand bg-accent text-white hover:bg-accent/90 disabled:opacity-50"
              >
                {save.isPending ? 'Wird gespeichert …' : 'Speichern'}
              </button>
              {save.isSuccess && !dirty && <span className="text-sm text-green-700">Gespeichert ✓</span>}
              {save.isError && <span className="text-sm text-red-600">Speichern fehlgeschlagen.</span>}
            </div>
          )}
        </div>
      </div>
    </ProfessionalShell>
  )
}
