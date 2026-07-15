/**
 * /institute/submissions — Inbox: Fallarbeiten der Studierenden zum Sichten.
 */
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import InstituteShell from '@/components/institute/InstituteShell'
import { instituteApi } from '@/api/institute'

function fmt(d: string | null): string {
  if (!d) return ''
  return new Date(d).toLocaleString('de-DE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function InstituteSubmissionsPage() {
  const navigate = useNavigate()
  const { data: subs = [], isLoading } = useQuery({
    queryKey: ['institute-submissions'],
    queryFn: () => instituteApi.submissions(),
  })

  return (
    <InstituteShell>
      <div className="mx-auto max-w-[1000px] px-6 py-8 space-y-5">
        <header>
          <h1 className="text-xl font-bold text-navy">Einreichungen</h1>
          <p className="text-sm text-brand-muted mt-1">
            Fallarbeiten deiner Studierenden – zum Sichten und Rückmelden.
          </p>
        </header>

        {isLoading ? (
          <p className="text-sm text-brand-muted">Lädt …</p>
        ) : subs.length === 0 ? (
          <div className="card text-sm text-brand-muted">Noch keine Einreichungen.</div>
        ) : (
          <div className="space-y-2">
            {subs.map(s => (
              <button
                key={s.id}
                onClick={() => navigate(`/institute/submissions/${s.id}`)}
                className="card w-full text-left hover:border-accent/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy truncate">{s.title || 'Fallbeispiel'}</p>
                    <p className="text-xs text-brand-muted mt-0.5">{s.student_name} · {fmt(s.created_at)}</p>
                  </div>
                  <span className={`shrink-0 text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                    s.status === 'reviewed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {s.status === 'reviewed' ? 'Gesichtet' : 'Neu'}
                  </span>
                </div>
                {s.message && <p className="mt-2 text-sm text-brand-text line-clamp-2">{s.message}</p>}
              </button>
            ))}
          </div>
        )}
      </div>
    </InstituteShell>
  )
}
