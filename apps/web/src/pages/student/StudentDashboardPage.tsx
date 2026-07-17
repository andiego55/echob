/**
 * /student/dashboard — Start/Überblick: offene Aufgaben, laufende Module und Fälle an einem Ort.
 */
import { type ReactNode, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import StudentShell from '@/components/student/StudentShell'
import { useStudent } from '@/components/auth/StudentRoute'
import { studentApi } from '@/api/student'
import type { StudentCase, StudentAssignment, StudentModuleRow, AssignmentKind } from '@/types'

const KIND_LABEL: Record<AssignmentKind, string> = { task: 'Aufgabe', reflection: 'Reflexion', resource: 'Ressource' }
const KIND_CLS: Record<AssignmentKind, string> = {
  task: 'bg-accent/10 text-accent', reflection: 'bg-violet-100 text-violet-700', resource: 'bg-slate-100 text-slate-600',
}

export default function StudentDashboardPage() {
  const { data: student } = useStudent()
  const { data: cases = [] } = useQuery({ queryKey: ['student-cases'], queryFn: () => studentApi.cases() })
  const { data: assignments = [] } = useQuery({ queryKey: ['student-assignments'], queryFn: () => studentApi.assignments() })
  const { data: modules = [] } = useQuery({ queryKey: ['student-modules'], queryFn: () => studentApi.modules() })

  const openAssignments = assignments.filter(a => a.status === 'assigned' || a.status === 'in_progress')
  const activeModules = modules.filter(m => m.status === 'active')

  return (
    <StudentShell>
      <div className="mx-auto max-w-[1100px] px-6 py-10 space-y-8">
        <header>
          <h1 className="text-2xl font-bold text-navy">
            {student?.display_name ? `Hallo, ${student.display_name}` : 'Deine Ausbildung'}
          </h1>
          <p className="mt-1 text-sm text-brand-muted">Dein Überblick – Fälle, Aufgaben und Lernmodule an einem Ort.</p>
        </header>

        <OnboardingHint />

        {openAssignments.length > 0 && (
          <Section title="Braucht Aufmerksamkeit" moreTo="/student/assignments" moreLabel="Alle Aufgaben">
            <div className="space-y-2">
              {openAssignments.slice(0, 5).map(a => <OpenAssignmentRow key={a.id} a={a} />)}
            </div>
          </Section>
        )}

        {activeModules.length > 0 && (
          <Section title="Laufende Lernmodule" moreTo="/student/modules" moreLabel="Alle Module">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeModules.slice(0, 3).map(m => <ModuleMini key={m.id} m={m} />)}
            </div>
          </Section>
        )}

        <Section title="Meine Fälle">
          {cases.length === 0 ? (
            <div className="card py-10 text-center text-sm text-brand-muted">
              Sobald dein Institut dir ein Fallbeispiel freigibt, erscheint es hier als deine eigene Arbeitskopie.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cases.map(c => <StudentCaseCard key={c.id} case_={c} />)}
            </div>
          )}
        </Section>
      </div>
    </StudentShell>
  )
}

function Section({ title, moreTo, moreLabel, children }: { title: string; moreTo?: string; moreLabel?: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-navy">{title}</h2>
        {moreTo && <Link to={moreTo} className="text-xs font-medium text-accent hover:underline">{moreLabel} →</Link>}
      </div>
      {children}
    </section>
  )
}

function OpenAssignmentRow({ a }: { a: StudentAssignment }) {
  return (
    <Link to="/student/assignments" className="card flex items-center justify-between gap-3 no-underline transition-colors hover:border-accent/40">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${KIND_CLS[a.kind]}`}>{KIND_LABEL[a.kind]}</span>
        <span className="truncate text-sm font-semibold text-navy">{a.title}</span>
      </div>
      <span className="shrink-0 text-xs font-medium text-accent">{a.status === 'in_progress' ? 'Weiter' : 'Öffnen'} →</span>
    </Link>
  )
}

function ModuleMini({ m }: { m: StudentModuleRow }) {
  const pct = m.step_count > 0 ? Math.round((m.completed_count / m.step_count) * 100) : 0
  return (
    <Link to={`/student/modules/${m.id}`} className="card block no-underline transition-colors hover:border-accent/40">
      <p className="text-sm font-semibold text-navy line-clamp-2">{m.title}</p>
      <div className="mt-2 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-border/60">
          <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
        <span className="shrink-0 text-[11px] text-brand-muted tabular-nums">{m.completed_count}/{m.step_count}</span>
      </div>
    </Link>
  )
}

function StudentCaseCard({ case_: c }: { case_: StudentCase }) {
  return (
    <Link to={`/student/cases/${c.id}`} className="card block no-underline transition-all hover:border-accent/40 hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className="label">Fallbeispiel</span>
        {c.has_partner && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">Paar</span>}
      </div>
      <p className="text-sm font-semibold leading-snug text-navy">{c.title}</p>
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-[11px] text-brand-muted/80">{c.scene_count} Szenen</span>
        <span className="shrink-0 text-xs font-medium text-accent">Öffnen →</span>
      </div>
    </Link>
  )
}

function OnboardingHint() {
  const [dismissed, setDismissed] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem('echob_student_intro') === 'off',
  )
  if (dismissed) return null
  const close = () => {
    setDismissed(true)
    try { localStorage.setItem('echob_student_intro', 'off') } catch { /* ignore */ }
  }
  return (
    <div className="rounded-brand border border-accent/30 bg-accent/5 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-navy">Willkommen in deiner Ausbildung</p>
          <p className="mt-0.5 text-xs leading-relaxed text-brand-muted">
            In einem <strong className="text-navy">Fall</strong> arbeitest du mit dem vollen Werkzeugkasten – Echo, Rollenspiel,
            Hypothesen, Muster, Verlauf, Berichte, Notizen. <strong className="text-navy">Aufgaben</strong> und
            <strong className="text-navy"> Lernmodule</strong> gibt dir dein Institut vor. Alles Übungsmaterial ist fiktiv.
          </p>
        </div>
        <button onClick={close} className="shrink-0 text-xs text-brand-muted hover:text-navy">Ausblenden</button>
      </div>
    </div>
  )
}
