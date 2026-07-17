/**
 * /institute/settings — KI-Aussteuerung (Haus-Stil), fließt in das freie Echo-Gespräch der Studierenden.
 */
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import InstituteShell from '@/components/institute/InstituteShell'
import { instituteApi } from '@/api/institute'
import type { InstituteEchoSettings } from '@/types'

const APPROACHES = [
  { value: 'balanced', name: 'Ausgewogen', desc: 'Integrativ, ressourcen- und beziehungsorientiert.' },
  { value: 'systemic', name: 'Systemisch', desc: 'Beziehungsdynamik, Muster, Kontext statt Schuld.' },
  { value: 'person_centered', name: 'Personzentriert', desc: 'Empathie, Wertschätzung, nah am Erleben (Rogers).' },
  { value: 'cbt', name: 'Verhaltenstherapeutisch (CBT)', desc: 'Gedanken–Gefühle–Verhalten, konkrete Schritte.' },
  { value: 'solution_focused', name: 'Lösungsorientiert', desc: 'Ziele, Ressourcen, Ausnahmen vom Problem.' },
  { value: 'analytical', name: 'Nüchtern-analytisch', desc: 'Sachlich, strukturiert, hypothesengeleitet.' },
]

function Slider({ label, low, high, value, onChange }: {
  label: string; low: string; high: string; value: number; onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-navy">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-24 shrink-0 text-right text-[11px] text-brand-muted">{low}</span>
        <div className="flex flex-1 gap-1">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} onClick={() => onChange(n)}
              className={`h-8 flex-1 rounded-brand border text-xs font-semibold transition-colors ${
                value === n ? 'border-accent bg-accent text-white' : 'border-brand-border text-brand-muted hover:border-accent/50'
              }`}>
              {n === 3 ? '–' : n}
            </button>
          ))}
        </div>
        <span className="w-24 shrink-0 text-[11px] text-brand-muted">{high}</span>
      </div>
    </div>
  )
}

export default function InstituteSettingsPage() {
  const qc = useQueryClient()
  const [approach, setApproach] = useState('balanced')
  const [tone, setTone] = useState(3)
  const [depth, setDepth] = useState(3)
  const [custom, setCustom] = useState('')
  const [savedOk, setSavedOk] = useState(false)

  const { data } = useQuery({ queryKey: ['institute-echo-settings'], queryFn: () => instituteApi.echoSettings() })
  useEffect(() => {
    if (!data) return
    setApproach(data.echo_approach ?? 'balanced')
    setTone(data.echo_tone ?? 3)
    setDepth(data.echo_depth ?? 3)
    setCustom(data.echo_custom_steering ?? '')
  }, [data])

  const save = useMutation({
    mutationFn: () => {
      const payload: InstituteEchoSettings = {
        echo_approach: approach,
        echo_tone: tone,
        echo_depth: depth,
        echo_custom_steering: custom.trim() || null,
      }
      return instituteApi.echoSettingsUpdate(payload)
    },
    onSuccess: (d) => { qc.setQueryData(['institute-echo-settings'], d); setSavedOk(true); setTimeout(() => setSavedOk(false), 2000) },
  })

  return (
    <InstituteShell>
      <div className="mx-auto max-w-[760px] px-6 py-8 space-y-6">
        <header>
          <h1 className="text-xl font-bold text-navy">KI-Aussteuerung</h1>
          <p className="mt-1 max-w-xl text-sm text-brand-muted">
            Lege den Haus-Stil fest, in dem Echo mit deinen Studierenden im freien Fall-Gespräch arbeitet.
            Sicherheit, Krisenlogik und das Diagnoseverbot bleiben davon unberührt – die Aussteuerung ist nachrangig.
          </p>
        </header>

        <section className="card">
          <h2 className="mb-3 text-sm font-bold text-navy">Ansatz</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {APPROACHES.map(a => (
              <button key={a.value} onClick={() => { setApproach(a.value); setSavedOk(false) }}
                className={`rounded-brand border px-3 py-2 text-left transition-colors ${
                  approach === a.value ? 'border-accent bg-accent/5' : 'border-brand-border hover:border-accent/50'
                }`}>
                <div className="text-sm font-semibold text-navy">{a.name}</div>
                <div className="text-[11px] text-brand-muted">{a.desc}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="card space-y-5">
          <h2 className="text-sm font-bold text-navy">Ton &amp; Tiefe</h2>
          <Slider label="Ton" low="sanft" high="direkt" value={tone} onChange={v => { setTone(v); setSavedOk(false) }} />
          <Slider label="Tiefe" low="knapp" high="ausführlich" value={depth} onChange={v => { setDepth(v); setSavedOk(false) }} />
          <p className="text-[11px] text-brand-muted">„–" (Mitte) = neutral, kein besonderer Einfluss.</p>
        </section>

        <section className="card">
          <h2 className="mb-1.5 text-sm font-bold text-navy">Freitext (optional)</h2>
          <p className="mb-2 text-xs text-brand-muted">
            Worauf soll Echo besonders achten, wie soll es klingen? Nachrangig – ändert nie Rolle, Sicherheit oder Diagnoseverbot.
          </p>
          <textarea value={custom} onChange={e => { setCustom(e.target.value.slice(0, 600)); setSavedOk(false) }} rows={3}
            placeholder="z. B. Betone das Trennen von Beobachtung und Deutung; ermutige zu offenen Fragen."
            className="w-full resize-y rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />
          <p className="mt-1 text-right text-[11px] text-brand-muted">{custom.length}/600</p>
        </section>

        <div className="flex items-center gap-3">
          <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-primary !py-2 !px-5 !text-sm">
            {save.isPending ? 'Wird gespeichert …' : savedOk ? '✓ Gespeichert' : 'Speichern'}
          </button>
          {save.isError && <span className="text-xs text-red-600">Speichern fehlgeschlagen.</span>}
        </div>
      </div>
    </InstituteShell>
  )
}
