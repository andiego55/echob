/**
 * /professional/register — Account zur Fachperson machen.
 * Erreichbar nach Login über den Einladungslink (?role=professional).
 */
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { professionalApi } from '@/api/professional'
import { useProfessional, Spinner } from '@/components/auth/ProfessionalRoute'

export default function ProfessionalRegisterPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: existing, isLoading: roleLoading } = useProfessional()

  const [displayName, setDisplayName] = useState('')
  const [title, setTitle] = useState('')

  const mutation = useMutation({
    mutationFn: () => professionalApi.register({ display_name: displayName.trim(), title: title.trim() || null }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['professional-me'] })
      navigate('/professional', { replace: true })
    },
  })

  if (loading || (session && roleLoading)) return <Spinner />
  if (!session) return <Navigate to="/auth?role=professional" replace />
  if (existing) return <Navigate to="/professional" replace />

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <header className="bg-navy border-b border-white/[0.07] px-6 py-4">
        <span className="text-[1.2rem] font-extrabold tracking-[-0.02em] text-white">
          Echo<span className="text-accent">B</span>
        </span>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md card">
          <span className="label">Fachpersonen-Zugang</span>
          <h1 className="mt-1 text-xl font-bold text-navy">Profil als Fachperson anlegen</h1>
          <p className="mt-2 text-sm text-brand-muted mb-6">
            Mit diesem Profil siehst du Fälle, die Nutzer:innen ausdrücklich für dich freigeben.
            Du erhältst ausschließlich Inhalte, die freigegeben wurden.
          </p>

          <form
            onSubmit={(e) => { e.preventDefault(); if (displayName.trim()) mutation.mutate() }}
            className="space-y-4"
          >
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text">Anzeigename</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="z. B. Dr. A. Muster"
                maxLength={120}
                className="w-full rounded-brand border border-brand-border bg-white px-4 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text">Fachrichtung / Rolle (optional)</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="z. B. Psychologische Beratung"
                maxLength={160}
                className="w-full rounded-brand border border-brand-border bg-white px-4 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>

            {mutation.isError && (
              <p className="rounded-brand border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                Speichern fehlgeschlagen. Bitte versuche es erneut.
              </p>
            )}

            <button type="submit" disabled={mutation.isPending || !displayName.trim()} className="btn-primary w-full">
              {mutation.isPending ? 'Wird angelegt …' : 'Fachpersonen-Profil anlegen'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
