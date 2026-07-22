/**
 * /institute/cohort — Kohorten-Statusboard: Was braucht die Aufmerksamkeit der Dozent:in?
 * Rein aggregierende Übersicht (GET /institute/cohort) über Aufgaben, Einreichungen, Module.
 */
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import InstituteShell from '@/components/institute/InstituteShell'
import { instituteApi, type CohortStudent } from '@/api/institute'

export default function InstituteCohortPage() {
  const { data, isLoading } = useQuery({ queryKey: ['institute-cohort'], queryFn: instituteApi.cohort })

  return (
    <InstituteShell>
      <div className="mx-auto max-w-[1100px] px-6 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-navy">Kohorte</h1>
          <p className="mt-1 text-sm text-brand-muted">
            Der Status deiner Studierenden auf einen Blick – was braucht gerade deine Aufmerksamkeit?
          </p>
        </header>

        {isLoading || !data ? (
          <p className="text-sm text-brand-muted">Lädt …</p>
        ) : data.students.length === 0 ? (
          <div className="card py-10 text-center">
            <p className="text-sm text-brand-muted">
              Noch keine Studierenden. <Link to="/institute/students" className="text-accent hover:underline">Lade welche ein →</Link>
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Tile label="Studierende" value={data.totals.students} />
              <Tile label="Einreichungen offen" value={data.totals.submissions_pending} to="/institute/submissions" accent />
              <Tile label="Aufgaben eingereicht" value={data.totals.assignments_pending} to="/institute/assignments" accent />
              <Tile label="Überfällig" value={data.totals.assignments_overdue} danger />
              <Tile label="Module aktiv" value={data.totals.modules_active} />
              <Tile label="Module fertig" value={data.totals.modules_completed} />
            </div>

            <div className="card mt-6 overflow-x-auto !p-0">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-brand-border text-left text-[11px] uppercase tracking-wide text-brand-muted">
                    <Th>Studierende:r</Th>
                    <Th center>Aufgaben offen</Th>
                    <Th center>Eingereicht</Th>
                    <Th center>Überfällig</Th>
                    <Th center>Fall-Einreich.</Th>
                    <Th center>Fälle</Th>
                    <Th center>Module</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.students.map((s) => <Row key={s.id} s={s} />)}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-brand-muted/70">
              „Eingereicht“ und „Fall-Einreich.“ warten auf deine Bewertung. Überfällige Aufgaben sind rot markiert.
            </p>
          </>
        )}
      </div>
    </InstituteShell>
  )
}

function Row({ s }: { s: CohortStudent }) {
  const needsReview = s.assignments_pending + s.submissions_pending > 0
  const overdue = s.assignments_overdue > 0
  return (
    <tr className="border-b border-brand-border/60 last:border-0 hover:bg-brand-bg/40">
      <td className="px-4 py-2.5">
        <span className="font-medium text-navy">{s.display_name}</span>
        {(needsReview || overdue) && (
          <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${overdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
            {overdue ? 'überfällig' : 'zu bewerten'}
          </span>
        )}
      </td>
      <Td center>{s.assignments_open}</Td>
      <Td center><span className={s.assignments_pending > 0 ? 'font-bold text-amber-700' : 'text-brand-muted'}>{s.assignments_pending}</span></Td>
      <Td center><span className={s.assignments_overdue > 0 ? 'font-bold text-red-600' : 'text-brand-muted'}>{s.assignments_overdue}</span></Td>
      <Td center><span className={s.submissions_pending > 0 ? 'font-bold text-amber-700' : 'text-brand-muted'}>{s.submissions_pending}</span></Td>
      <Td center>{s.cases}</Td>
      <Td center><span className="text-brand-muted">{s.modules_completed}/{s.modules_active + s.modules_completed}</span></Td>
    </tr>
  )
}

function Tile({ label, value, to, accent, danger }: { label: string; value: number; to?: string; accent?: boolean; danger?: boolean }) {
  const border = danger && value > 0 ? 'border-red-200' : accent && value > 0 ? 'border-amber-200' : ''
  const inner = (
    <div className={`card !p-4 ${border} ${to ? 'transition-colors hover:border-accent/50' : ''}`}>
      <p className={`text-2xl font-bold tabular-nums ${danger && value > 0 ? 'text-red-600' : 'text-navy'}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-brand-muted">{label}</p>
    </div>
  )
  return to ? <Link to={to} className="block no-underline">{inner}</Link> : inner
}

function Th({ children, center }: { children: ReactNode; center?: boolean }) {
  return <th className={`px-4 py-2 font-semibold ${center ? 'text-center' : ''}`}>{children}</th>
}
function Td({ children, center }: { children: ReactNode; center?: boolean }) {
  return <td className={`px-4 py-2.5 tabular-nums ${center ? 'text-center' : ''}`}>{children}</td>
}
