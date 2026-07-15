/**
 * /institute/dashboard — Cockpit des Ausbildungsinstituts.
 * Kontingent-Überblick + generierte Beispielfälle (Karten) + Einstieg in die Generierung.
 */
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import InstituteShell from '@/components/institute/InstituteShell'
import { useInstitute } from '@/components/auth/InstituteRoute'
import { instituteApi } from '@/api/institute'
import type { ExampleSummary } from '@/types'

export default function InstituteDashboardPage() {
  const { data: institute } = useInstitute()
  const { data: examples } = useQuery({
    queryKey: ['institute-examples'],
    queryFn: instituteApi.listExamples,
  })

  const list = examples ?? []
  const used = list.length
  const quota = institute?.example_quota ?? 0

  return (
    <InstituteShell>
      <div className="mx-auto max-w-[1100px] px-6 py-10">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy">{institute?.name ?? 'Ausbildungsinstitut'}</h1>
            <p className="mt-1 text-sm text-brand-muted">
              Generieren Sie Beispielfälle und geben Sie sie an Ihre Studierenden frei.
            </p>
          </div>
          <Link
            to="/institute/examples/new"
            className={`btn-primary shrink-0 !py-2 !px-5 !text-sm ${used >= quota ? 'pointer-events-none opacity-40' : ''}`}
            title={used >= quota ? 'Kontingent erreicht' : undefined}
          >
            + Beispielfall generieren
          </Link>
        </div>

        {/* Kontingent */}
        <div className="mb-6 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 rounded-brand border border-brand-border bg-white px-5 py-3 text-sm">
          <span className="text-brand-muted">
            <strong className="font-bold text-navy">{used}</strong> / {quota} Beispielfälle
          </span>
          <span className="text-brand-border">·</span>
          <span className="text-brand-muted">
            <strong className="font-bold text-navy">{institute?.student_quota ?? 0}</strong> Studierenden-Plätze
          </span>
        </div>

        {list.length === 0 ? (
          <div className="card mx-auto max-w-md py-14 text-center">
            <h2 className="mb-2 text-lg font-semibold text-navy">Noch keine Beispielfälle</h2>
            <p className="mx-auto mb-6 max-w-xs text-sm leading-relaxed text-brand-muted">
              Erzeugen Sie Ihren ersten prototypischen Fall – EchoB generiert Szenen und Onboarding,
              die Sie danach prüfen und ablegen.
            </p>
            <Link to="/institute/examples/new" className="btn-primary !py-2 !px-5 !text-sm">
              Ersten Beispielfall generieren
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map(ex => <ExampleCard key={ex.id} example={ex} />)}
          </div>
        )}
      </div>
    </InstituteShell>
  )
}

function ExampleCard({ example: ex }: { example: ExampleSummary }) {
  const published = ex.status === 'published'
  return (
    <Link
      to={`/institute/examples/${ex.id}`}
      className="card block no-underline transition-all hover:border-accent/40 hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
          published ? 'bg-green-100 text-green-700' : 'bg-brand-border/40 text-brand-muted'
        }`}>
          {published ? 'Veröffentlicht' : 'Entwurf'}
        </span>
        {ex.has_partner && (
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">Paar</span>
        )}
      </div>
      <p className="text-sm font-semibold text-navy leading-snug">{ex.title}</p>
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-[11px] text-brand-muted/80">{ex.scene_count} Szenen</span>
        <span className="text-xs font-medium text-accent shrink-0">Öffnen →</span>
      </div>
    </Link>
  )
}
