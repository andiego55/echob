/**
 * /student/modules — eingeschriebene Lernmodule mit Fortschritt.
 */
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import StudentShell from '@/components/student/StudentShell'
import { studentApi } from '@/api/student'
import type { StudentModuleRow } from '@/types'

export default function StudentModulesPage() {
  const navigate = useNavigate()
  const { data: items = [], isLoading } = useQuery({ queryKey: ['student-modules'], queryFn: () => studentApi.modules() })
  const active = items.filter(m => m.status === 'active')
  const done = items.filter(m => m.status === 'completed')

  return (
    <StudentShell>
      <div className="mx-auto max-w-[820px] px-6 py-8 space-y-6">
        <header>
          <h1 className="text-xl font-bold text-navy">Lernmodule</h1>
          <p className="mt-1 text-sm text-brand-muted">Von deinem Ausbildungsinstitut bereitgestellt. Arbeite dich Schritt für Schritt durch.</p>
        </header>

        {isLoading ? (
          <p className="text-sm text-brand-muted">Lädt …</p>
        ) : items.length === 0 ? (
          <div className="card text-sm text-brand-muted">Aktuell bist du in kein Lernmodul eingeschrieben.</div>
        ) : (
          <>
            {active.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-sm font-semibold text-navy">In Arbeit</h2>
                {active.map(m => <ModuleCard key={m.id} m={m} onOpen={() => navigate(`/student/modules/${m.id}`)} />)}
              </section>
            )}
            {done.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-sm font-semibold text-navy">Abgeschlossen</h2>
                {done.map(m => <ModuleCard key={m.id} m={m} onOpen={() => navigate(`/student/modules/${m.id}`)} />)}
              </section>
            )}
          </>
        )}
      </div>
    </StudentShell>
  )
}

function ModuleCard({ m, onOpen }: { m: StudentModuleRow; onOpen: () => void }) {
  const pct = m.step_count > 0 ? Math.round((m.completed_count / m.step_count) * 100) : 0
  return (
    <button onClick={onOpen} className="card w-full text-left hover:border-accent/40 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-navy">{m.title}</p>
        <span className="shrink-0 text-xs text-brand-muted tabular-nums">
          {m.completed_count}/{m.step_count} {m.status === 'completed' && <span className="font-semibold text-green-600">✓</span>}
        </span>
      </div>
      {m.description && <p className="mt-1 text-xs text-brand-muted line-clamp-2">{m.description}</p>}
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-border/60">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
    </button>
  )
}
