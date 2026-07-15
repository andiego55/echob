/**
 * /institute/register — Account zum Ausbildungsinstitut machen.
 * Invite-gated: benötigt einen gültigen Zugangscode. Erreichbar nach Login
 * über den Signup mit ?role=institute.
 */
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { instituteApi } from '@/api/institute'
import { useInstitute, Spinner } from '@/components/auth/InstituteRoute'

export default function InstituteRegisterPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: existing, isLoading: roleLoading } = useInstitute()

  const [name, setName] = useState('')
  const [contactName, setContactName] = useState('')
  const [accessCode, setAccessCode] = useState('')

  const mutation = useMutation({
    mutationFn: () => instituteApi.register({
      name: name.trim(),
      contact_name: contactName.trim() || null,
      access_code: accessCode.trim(),
    }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['institute-me'] })
      navigate('/institute/dashboard', { replace: true })
    },
  })

  if (loading || (session && roleLoading)) return <Spinner />
  if (!session) return <Navigate to="/auth?role=institute" replace />
  if (existing) return <Navigate to="/institute/dashboard" replace />

  const canSubmit = !!name.trim() && !!accessCode.trim()

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <header className="bg-navy border-b border-white/[0.07] px-6 py-4">
        <span className="text-[1.2rem] font-extrabold tracking-[-0.02em] text-white">
          Echo<span className="text-accent">B</span>
        </span>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md card">
          <span className="label">Ausbildungsinstitut</span>
          <h1 className="mt-1 text-xl font-bold text-navy">Institut-Konto anlegen</h1>
          <p className="mt-2 text-sm text-brand-muted mb-6">
            Mit diesem Konto generieren Sie KI-gestützte Beispielfälle und geben sie an Ihre
            Studierenden frei. Die Registrierung ist per Zugangscode freigeschaltet.
          </p>

          <form
            onSubmit={(e) => { e.preventDefault(); if (canSubmit) mutation.mutate() }}
            className="space-y-4"
          >
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text">Institutsname</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="z. B. Institut für Paartherapie München"
                maxLength={200}
                className="w-full rounded-brand border border-brand-border bg-white px-4 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text">Didaktische Leitung (optional)</label>
              <input
                type="text"
                value={contactName}
                onChange={e => setContactName(e.target.value)}
                placeholder="z. B. Dr. A. Muster"
                maxLength={200}
                className="w-full rounded-brand border border-brand-border bg-white px-4 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text">Zugangscode</label>
              <input
                type="text"
                value={accessCode}
                onChange={e => setAccessCode(e.target.value)}
                placeholder="Von EchoB erhalten"
                maxLength={100}
                className="w-full rounded-brand border border-brand-border bg-white px-4 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>

            {mutation.isError && (
              <p className="rounded-brand border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                Registrierung fehlgeschlagen – ist der Zugangscode korrekt und noch gültig?
              </p>
            )}

            <button type="submit" disabled={mutation.isPending || !canSubmit} className="btn-primary w-full">
              {mutation.isPending ? 'Wird angelegt …' : 'Institut-Konto anlegen'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
