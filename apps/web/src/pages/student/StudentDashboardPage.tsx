/**
 * /student/dashboard — Übersicht der/des Studierenden.
 * Zeigt zugewiesene Fall-Arbeitskopien (P2b füllt sie; Fallansicht folgt in P2c).
 */
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import StudentShell from '@/components/student/StudentShell'
import { useStudent } from '@/components/auth/StudentRoute'
import { studentApi } from '@/api/student'
import type { StudentCase } from '@/types'

export default function StudentDashboardPage() {
  const { data: student } = useStudent()
  const { data: cases } = useQuery({ queryKey: ['student-cases'], queryFn: studentApi.cases })

  const list = cases ?? []

  return (
    <StudentShell>
      <div className="mx-auto max-w-[1100px] px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-navy">
            {student?.display_name ? `Hallo, ${student.display_name}` : 'Deine Ausbildung'}
          </h1>
          <p className="mt-1 text-sm text-brand-muted">
            Hier findest du die Fallbeispiele, die dein Institut dir freigegeben hat.
          </p>
        </div>

        {list.length === 0 ? (
          <div className="card mx-auto max-w-md py-14 text-center">
            <h2 className="mb-2 text-lg font-semibold text-navy">Noch keine Fälle zugewiesen</h2>
            <p className="mx-auto max-w-xs text-sm leading-relaxed text-brand-muted">
              Sobald dein Institut dir ein Fallbeispiel freigibt, erscheint es hier als deine eigene
              Arbeitskopie.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map(c => <StudentCaseCard key={c.id} case_={c} />)}
          </div>
        )}
      </div>
    </StudentShell>
  )
}

function StudentCaseCard({ case_: c }: { case_: StudentCase }) {
  return (
    <Link
      to={`/student/cases/${c.id}`}
      className="card block no-underline transition-all hover:border-accent/40 hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className="label">Fallbeispiel</span>
        {c.has_partner && (
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">Paar</span>
        )}
      </div>
      <p className="text-sm font-semibold text-navy leading-snug">{c.title}</p>
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-[11px] text-brand-muted/80">{c.scene_count} Szenen</span>
        <span className="text-xs font-medium text-accent shrink-0">Öffnen →</span>
      </div>
    </Link>
  )
}
