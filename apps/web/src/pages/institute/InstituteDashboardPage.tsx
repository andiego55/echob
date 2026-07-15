/**
 * /institute/dashboard — Cockpit des Ausbildungsinstituts.
 * Phase 1: Kontingent-Überblick + Einstieg in die KI-Fallgenerierung.
 */
import { Link } from 'react-router-dom'
import InstituteShell from '@/components/institute/InstituteShell'
import { useInstitute } from '@/components/auth/InstituteRoute'

export default function InstituteDashboardPage() {
  const { data: institute } = useInstitute()

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
          <Link to="/institute/examples/new" className="btn-primary shrink-0 !py-2 !px-5 !text-sm">
            + Beispielfall generieren
          </Link>
        </div>

        {/* Kontingent */}
        <div className="mb-6 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 rounded-brand border border-brand-border bg-white px-5 py-3 text-sm">
          <span className="text-brand-muted">
            <strong className="font-bold text-navy">{institute?.example_quota ?? 0}</strong> Beispielfälle möglich
          </span>
          <span className="text-brand-border">·</span>
          <span className="text-brand-muted">
            <strong className="font-bold text-navy">{institute?.student_quota ?? 0}</strong> Studierenden-Plätze
          </span>
        </div>

        {/* Leerer Zustand (Phase 1: noch keine Beispiele) */}
        <div className="card mx-auto max-w-md py-14 text-center">
          <h2 className="mb-2 text-lg font-semibold text-navy">Noch keine Beispielfälle</h2>
          <p className="mx-auto mb-6 max-w-xs text-sm leading-relaxed text-brand-muted">
            Erzeugen Sie Ihren ersten prototypischen Fall – EchoB generiert Szenen, Profile und
            Einschätzung, die Sie danach frei bearbeiten und ablegen.
          </p>
          <Link to="/institute/examples/new" className="btn-primary !py-2 !px-5 !text-sm">
            Ersten Beispielfall generieren
          </Link>
        </div>
      </div>
    </InstituteShell>
  )
}
