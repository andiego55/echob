/**
 * /institute/students — Studierende einladen und verwalten.
 * Einladung erzeugt einen Code (+ Link-Token); Kontingent wird serverseitig geprüft.
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import InstituteShell from '@/components/institute/InstituteShell'
import { instituteApi } from '@/api/institute'
import type { StudentInvite } from '@/types'

export default function InstituteStudentsPage() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['institute-students'], queryFn: instituteApi.listStudents })
  const [label, setLabel] = useState('')

  const invite = useMutation({
    mutationFn: () => instituteApi.inviteStudent(label.trim() || null),
    onSuccess: () => { setLabel(''); qc.invalidateQueries({ queryKey: ['institute-students'] }) },
  })
  const revoke = useMutation({
    mutationFn: (id: string) => instituteApi.revokeStudentInvite(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['institute-students'] }),
  })
  const remove = useMutation({
    mutationFn: (id: string) => instituteApi.removeStudent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['institute-students'] }),
  })

  const quota = data?.quota ?? 0
  const used = (data?.students.length ?? 0) + (data?.invites.length ?? 0)
  const full = used >= quota

  return (
    <InstituteShell>
      <div className="mx-auto max-w-[860px] px-6 py-10">
        <h1 className="text-2xl font-bold text-navy">Studierende</h1>
        <p className="mt-1 text-sm text-brand-muted">
          Laden Sie Studierende per Code ein. Belegt: <strong className="text-navy">{used}</strong> / {quota} Plätze.
        </p>

        {/* Einladen */}
        <div className="card mt-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1.5 block text-sm font-medium text-brand-text">Interner Merker (optional)</label>
              <input
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="z. B. Kohorte 2026"
                maxLength={160}
                className="w-full rounded-brand border border-brand-border bg-white px-4 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
            <button
              onClick={() => invite.mutate()}
              disabled={invite.isPending || full}
              title={full ? 'Kontingent erreicht' : undefined}
              className="btn-primary !py-2.5 !px-5 !text-sm"
            >
              + Einladen
            </button>
          </div>
          {full && (
            <p className="mt-2 text-xs text-brand-muted">Kontingent erreicht – bestehende Einladungen zurückziehen oder Plätze aufstocken.</p>
          )}
        </div>

        {/* Offene Einladungen */}
        {data && data.invites.length > 0 && (
          <div className="mt-8">
            <p className="mb-3 text-sm font-semibold text-navy">Offene Einladungen</p>
            <div className="space-y-2">
              {data.invites.map(inv => <InviteRow key={inv.id} invite={inv} onRevoke={() => revoke.mutate(inv.id)} />)}
            </div>
          </div>
        )}

        {/* Aktive Studierende */}
        <div className="mt-8">
          <p className="mb-3 text-sm font-semibold text-navy">Aktive Studierende</p>
          {!data || data.students.length === 0 ? (
            <p className="text-sm text-brand-muted">Noch niemand beigetreten.</p>
          ) : (
            <div className="space-y-2">
              {data.students.map(s => (
                <div key={s.id} className="flex items-center justify-between gap-3 rounded-brand border border-brand-border bg-white px-4 py-2.5">
                  <span className="text-sm font-medium text-navy">{s.display_name || 'Studierende:r'}</span>
                  <button
                    onClick={() => { if (window.confirm('Studierende:n entfernen?')) remove.mutate(s.id) }}
                    className="text-xs text-brand-muted/70 hover:text-red-500 transition-colors"
                  >
                    Entfernen
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </InstituteShell>
  )
}

function InviteRow({ invite, onRevoke }: { invite: StudentInvite; onRevoke: () => void }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(invite.code); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* ignore */ }
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-brand border border-brand-border bg-white px-4 py-2.5">
      <div className="flex items-center gap-3">
        <span className="rounded-brand bg-brand-bg px-3 py-1 font-mono text-sm font-bold tracking-wider text-navy">{invite.code}</span>
        {invite.label && <span className="text-xs text-brand-muted">{invite.label}</span>}
      </div>
      <div className="flex items-center gap-3">
        <button onClick={copy} className="text-xs font-semibold text-accent hover:text-navy transition-colors">
          {copied ? 'Kopiert ✓' : 'Code kopieren'}
        </button>
        <button onClick={onRevoke} className="text-xs text-brand-muted/70 hover:text-red-500 transition-colors">
          Zurückziehen
        </button>
      </div>
    </div>
  )
}
