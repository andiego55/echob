/**
 * /student/register — Studierenden-Konto per Einladungscode anlegen.
 * Erreichbar nach Login (Signup mit ?role=student) oder direkt mit Code.
 */
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { studentApi } from '@/api/student'
import { useStudent, Spinner } from '@/components/auth/StudentRoute'

export default function StudentRegisterPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: existing, isLoading: roleLoading } = useStudent()

  const [code, setCode] = useState('')
  const [displayName, setDisplayName] = useState('')

  const mutation = useMutation({
    mutationFn: () => studentApi.accept({ code: code.trim(), display_name: displayName.trim() || null }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['student-me'] })
      navigate('/student/dashboard', { replace: true })
    },
  })

  if (loading || (session && roleLoading)) return <Spinner />
  if (!session) return <Navigate to="/auth?role=student" replace />
  if (existing) return <Navigate to="/student/dashboard" replace />

  const canSubmit = !!code.trim()

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <header className="bg-navy border-b border-white/[0.07] px-6 py-4">
        <span className="text-[1.2rem] font-extrabold tracking-[-0.02em] text-white">
          Echo<span className="text-accent">B</span>
        </span>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md card">
          <span className="label">Studierenden-Zugang</span>
          <h1 className="mt-1 text-xl font-bold text-navy">Mit Einladungscode beitreten</h1>
          <p className="mt-2 text-sm text-brand-muted mb-6">
            Gib den Code ein, den du von deinem Ausbildungsinstitut erhalten hast. Danach kannst du
            an den freigegebenen Fallbeispielen arbeiten.
          </p>

          <form
            onSubmit={(e) => { e.preventDefault(); if (canSubmit) mutation.mutate() }}
            className="space-y-4"
          >
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text">Einladungscode</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="z. B. ABCD-2345"
                maxLength={20}
                className="w-full rounded-brand border border-brand-border bg-white px-4 py-2.5 text-sm tracking-wide outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text">Anzeigename (optional)</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="z. B. Studierende:r M."
                maxLength={120}
                className="w-full rounded-brand border border-brand-border bg-white px-4 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>

            {mutation.isError && (
              <p className="rounded-brand border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                Beitritt fehlgeschlagen – ist der Code korrekt und noch gültig?
              </p>
            )}

            <button type="submit" disabled={mutation.isPending || !canSubmit} className="btn-primary w-full">
              {mutation.isPending ? 'Wird beigetreten …' : 'Beitreten'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
