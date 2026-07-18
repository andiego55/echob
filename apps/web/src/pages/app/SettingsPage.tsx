/**
 * /app/settings — Nutzer-Einstellungen (⚙️). Aktuell: Echo-Aussteuerung.
 * Künftiges Zuhause für weitere Usereinstellungen.
 */
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import EchoSteeringForm, { type EchoModeOption, type EchoSteeringValue } from '@/components/settings/EchoSteeringForm'
import ConnectProfessionalCard from '@/components/settings/ConnectProfessionalCard'
import SubscriptionCard from '@/components/settings/SubscriptionCard'
import UsageCard from '@/components/settings/UsageCard'
import PasswordCard from '@/components/settings/PasswordCard'
import DataAccountCard from '@/components/settings/DataAccountCard'
import NotificationsBanner from '@/components/NotificationsBanner'
import { profileApi } from '@/api/profile'

const USER_MODES: EchoModeOption[] = [
  { key: 'base', name: 'Basis — ruhig sortieren',
    description: 'Ruhig, verständlich, niedrigschwellig. Sortiert die Situation, trennt Beobachtung, Gefühl und Interpretation und fragt vorsichtig nach.' },
  { key: 'stabilize', name: 'Stabilisieren — erstmal runterkommen',
    description: 'Wenn du aufgewühlt oder überflutet bist: beruhigt, verlangsamt, hilft beim Grounding. Keine tiefen Analysen, keine Konfrontation.' },
  { key: 'clarity', name: 'Klarheit — sortieren, was passiert ist',
    description: 'Macht aus Chaos Struktur: Was ist passiert? Was weiß ich sicher? Was interpretiere ich? Was war mein Gefühl? Was brauche ich jetzt?' },
  { key: 'radical', name: 'Radikale Offenheit — ehrlich mit mir selbst',
    description: 'Fragt direkter nach eigenen Anteilen, blinden Flecken und Mustern — respektvoll und ohne Beschämung.',
    warning: 'Dieser Modus fragt direkter nach eigenen Anteilen. Nicht geeignet, wenn du gerade sehr aufgewühlt bist.' },
  { key: 'analysis', name: 'Klartext — nüchterne Analyse',
    description: 'Sachlich, strukturiert und direkt — Klarheit vor Trost. Ordnet Muster und mögliche Einschätzungen klar ein (immer als gekennzeichnete Vermutung, nie als Diagnose) und dreht zurück zu deinem nächsten Schritt.',
    warning: 'Ordnet nüchtern ein, ohne zu trösten. Weniger geeignet, wenn du gerade Halt oder Beruhigung brauchst.' },
]

export default function SettingsPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['echo-settings'], queryFn: profileApi.getEchoSettings })
  const [val, setVal] = useState<EchoSteeringValue | null>(null)

  useEffect(() => {
    if (data) setVal({
      modeKey: data.echo_mode, tone: data.echo_tone,
      depth: data.echo_depth, custom: data.echo_custom_steering,
    })
  }, [data])

  const save = useMutation({
    mutationFn: (v: EchoSteeringValue) => profileApi.saveEchoSettings({
      echo_mode: v.modeKey, echo_tone: v.tone, echo_depth: v.depth, echo_custom_steering: v.custom,
    }),
    onSuccess: res => qc.setQueryData(['echo-settings'], res),
  })

  const dirty = !!(val && data && (
    val.modeKey !== data.echo_mode || val.tone !== data.echo_tone ||
    val.depth !== data.echo_depth || (val.custom ?? null) !== (data.echo_custom_steering ?? null)
  ))

  return (
    <AppShell>
      <div className="mx-auto max-w-[680px] px-6 py-10">
        <h1 className="text-2xl font-bold text-navy">Einstellungen</h1>
        <p className="mt-1 text-sm text-brand-muted">
          Hier stimmst du Echo auf dich ab. Weitere Einstellungen folgen.
        </p>

        <NotificationsBanner />

        <div className="mt-8 card">
          <h2 className="text-lg font-semibold text-navy">Wie Echo mit dir spricht</h2>
          <p className="mt-1 text-sm text-brand-muted">
            Wähle einen Modus und justiere optional nach. Du kannst das jederzeit ändern.
            Sicherheit und Krisenhilfe bleiben in jedem Modus aktiv.
          </p>
          <div className="mt-6">
            {isLoading || !val
              ? <p className="text-sm text-brand-muted">Wird geladen …</p>
              : <EchoSteeringForm presetLabel="Echo-Modus" modes={USER_MODES} value={val} onChange={setVal} />}
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

        <ConnectProfessionalCard />
        <SubscriptionCard />
        <UsageCard />
        <PasswordCard />
        <DataAccountCard />
      </div>
    </AppShell>
  )
}
