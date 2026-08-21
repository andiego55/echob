/**
 * /app/paar/beitreten/:code — Kopplungscode einlösen.
 *
 * Zeigt vor dem Verbinden ausdrücklich, was die Kopplung bedeutet – und was sie NICHT
 * bedeutet (kein Zugriff auf den eigenen Fall).
 */
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import { casesApi } from '@/api/cases'
import { coupleApi, formatCoupleCode } from '@/api/couple'
import IsolationNotice from '@/components/couple/IsolationNotice'
import Fehlermeldung from '@/components/Fehlermeldung'

export default function CoupleJoinPage() {
  const { code = '' } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [caseId, setCaseId] = useState('')

  const { data: check, isLoading, isError } = useQuery({
    queryKey: ['couple-invite', code],
    queryFn: () => coupleApi.checkCode(code),
    enabled: !!code,
    retry: false,
  })

  const { data } = useQuery({ queryKey: ['cases'], queryFn: casesApi.list })
  const cases = (data?.cases ?? []).filter(c => !c.archived_at)

  const accept = useMutation({
    mutationFn: () => coupleApi.accept(code, caseId || null),
    onSuccess: result => {
      qc.invalidateQueries({ queryKey: ['couple-links'] })
      if (result.couple_id) navigate(`/app/paar/${result.couple_id}`)
    },
  })

  const invalid = isError || (check && !check.valid)

  return (
    <AppShell>
      <div className="mx-auto max-w-[640px] px-6 py-8 space-y-6">
        <div>
          <span className="label">Für Paare</span>
          <h1 className="page-title mt-1">Verbindung annehmen</h1>
          <p className="mt-2 text-sm text-brand-muted">
            Code <span className="font-semibold text-navy tracking-[0.15em]">{formatCoupleCode(code.toUpperCase())}</span>
          </p>
        </div>

        {isLoading && <div className="card text-sm text-brand-muted">Prüfe Code …</div>}

        {invalid && (
          <div className="card">
            <h2 className="card-title">Code nicht einlösbar</h2>
            <p className="mt-2 text-sm text-brand-muted">
              Dieser Kopplungscode ist unbekannt, bereits verwendet oder zurückgezogen worden.
              Bitte die einladende Person um einen neuen Code.
            </p>
            <Link to="/app/paar" className="btn-quiet !py-2 !px-4 !text-sm mt-4 inline-block">
              Zur Übersicht
            </Link>
          </div>
        )}

        {check?.valid && (
          <>
            <IsolationNotice />

            {cases.length > 0 && (
              <div className="card">
                <h2 className="card-title">Bezug zu einem Fall (optional)</h2>
                <select value={caseId} onChange={e => setCaseId(e.target.value)} className="input mt-3">
                  <option value="">Ohne Fallbezug</option>
                  {cases.map(c => (
                    <option key={c.id} value={c.id}>{c.person_name || c.main_concern || 'Fall'}</option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-brand-muted">
                  Hilft dir später beim Vorbereiten. Die andere Person bekommt dadurch keinen
                  Einblick in diesen Fall.
                </p>
              </div>
            )}

            <div className="card">
              <button
                onClick={() => accept.mutate()}
                disabled={accept.isPending}
                className="btn-primary !py-2 !px-5 !text-sm disabled:opacity-50"
              >
                {accept.isPending ? 'Verbinde …' : 'Verbindung annehmen'}
              </button>
              <Fehlermeldung error={accept.error} className="mt-3" />
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
