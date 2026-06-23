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

        <PracticeSection />
      </div>
    </ProfessionalShell>
  )
}

/** Praxis-Verwaltung: Name, Mitglieder/Rollen, Einladungen. Fallinhalte bleiben least-access. */
function PracticeSection() {
  const qc = useQueryClient()
  const { data: org, isLoading } = useQuery({ queryKey: ['pro-org'], queryFn: professionalApi.org })
  const { data: invites = [] } = useQuery({
    queryKey: ['pro-org-invites'], queryFn: professionalApi.orgInvitesIncoming,
  })

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  useEffect(() => { if (org) setName(org.name) }, [org])

  const isAdmin = org?.role === 'owner' || org?.role === 'admin'

  const rename = useMutation({
    mutationFn: () => professionalApi.orgRename(name.trim()),
    onSuccess: (o) => qc.setQueryData(['pro-org'], o),
  })
  const invite = useMutation({
    mutationFn: () => professionalApi.orgInviteMember(email.trim()),
    onSuccess: () => setEmail(''),
  })
  const role = useMutation({
    mutationFn: (v: { userId: string; role: 'admin' | 'member' }) =>
      professionalApi.orgMemberRole(v.userId, v.role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pro-org'] }),
  })
  const remove = useMutation({
    mutationFn: (userId: string) => professionalApi.orgMemberRemove(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pro-org'] }),
  })
  const accept = useMutation({
    mutationFn: (id: string) => professionalApi.orgInviteAccept(id),
    onSuccess: (o) => {
      qc.setQueryData(['pro-org'], o)
      qc.invalidateQueries({ queryKey: ['pro-org-invites'] })
      qc.invalidateQueries({ queryKey: ['prof-report-templates'] })
      qc.invalidateQueries({ queryKey: ['prof-note-templates'] })
    },
  })

  if (isLoading || !org) return null

  const roleLabel = (r: string) => (r === 'owner' ? 'Inhaber:in' : r === 'admin' ? 'Admin' : 'Mitglied')

  return (
    <div className="mt-8 card">
      <h2 className="text-lg font-semibold text-navy">Praxis</h2>
      <p className="mt-1 text-sm text-brand-muted">
        Mehrere Fachpersonen arbeiten in einer Praxis zusammen und teilen Vorlagen. Fallinhalte
        bleiben bei der behandelnden Fachperson.
      </p>

      {invites.length > 0 && (
        <div className="mt-4 space-y-2">
          {invites.map(i => (
            <div key={i.id}
              className="flex items-center justify-between gap-3 rounded-brand border border-accent/40 bg-accent/5 px-4 py-2.5">
              <span className="text-sm text-navy">Einladung in „{i.org_name}"</span>
              <button onClick={() => accept.mutate(i.id)} disabled={accept.isPending}
                className="text-sm font-semibold px-3 py-1 rounded-brand bg-accent text-white hover:bg-accent/90 disabled:opacity-50">
                Annehmen
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5">
        <label className="block text-sm font-medium text-navy mb-1">Name der Praxis</label>
        <div className="flex items-center gap-2">
          <input value={name} onChange={e => setName(e.target.value)} disabled={!isAdmin} maxLength={160}
            className="flex-1 rounded-brand border border-brand-border bg-white px-3 py-1.5 text-sm outline-none focus:border-accent disabled:bg-brand-bg" />
          {isAdmin && (
            <button onClick={() => rename.mutate()}
              disabled={rename.isPending || !name.trim() || name.trim() === org.name}
              className="text-sm font-semibold px-3 py-1.5 rounded-brand bg-accent text-white hover:bg-accent/90 disabled:opacity-50">
              Speichern
            </button>
          )}
        </div>
      </div>

      <div className="mt-5">
        <div className="text-sm font-medium text-navy mb-2">Mitglieder ({org.members.length})</div>
        <div className="space-y-1.5">
          {org.members.map(m => (
            <div key={m.user_id}
              className="flex items-center justify-between gap-3 rounded-brand border border-brand-border px-3 py-2">
              <div className="min-w-0">
                <div className="text-sm font-medium text-navy truncate">
                  {m.display_name || m.email || 'Fachperson'}
                </div>
                {m.email && <div className="text-[11px] text-brand-muted truncate">{m.email}</div>}
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand-bg border border-brand-border text-brand-muted">
                  {roleLabel(m.role)}
                </span>
                {isAdmin && m.role !== 'owner' && m.user_id !== org.members.find(x => x.role === 'owner')?.user_id && (
                  <>
                    <button
                      onClick={() => role.mutate({ userId: m.user_id, role: m.role === 'admin' ? 'member' : 'admin' })}
                      className="text-xs text-brand-muted hover:text-accent">
                      {m.role === 'admin' ? 'zu Mitglied' : 'zu Admin'}
                    </button>
                    <button
                      onClick={() => { if (window.confirm('Mitglied entfernen?')) remove.mutate(m.user_id) }}
                      className="text-xs text-brand-muted hover:text-red-600">
                      Entfernen
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {isAdmin && (
        <div className="mt-5 border-t border-brand-border pt-4">
          <label className="block text-sm font-medium text-navy mb-1">Mitglied einladen</label>
          <div className="flex items-center gap-2">
            <input value={email} onChange={e => setEmail(e.target.value)} type="email"
              placeholder="kolleg:in@praxis.de"
              className="flex-1 rounded-brand border border-brand-border bg-white px-3 py-1.5 text-sm outline-none focus:border-accent" />
            <button onClick={() => invite.mutate()} disabled={invite.isPending || !email.trim()}
              className="text-sm font-semibold px-3 py-1.5 rounded-brand bg-accent text-white hover:bg-accent/90 disabled:opacity-50">
              Einladen
            </button>
          </div>
          {invite.isSuccess && <p className="mt-1 text-xs text-green-700">Einladung gesendet ✓</p>}
          {invite.isError && <p className="mt-1 text-xs text-red-600">Einladung fehlgeschlagen.</p>}
        </div>
      )}
    </div>
  )
}
