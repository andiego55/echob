/**
 * Platzhalter für Fall-Werkzeuge der/des Studierenden (Hypothesen, Berichte, Notizen),
 * bis sie in den nächsten Scheiben gebaut sind. Zeigt die zweite Menüleiste.
 */
import { useParams } from 'react-router-dom'
import StudentShell from '@/components/student/StudentShell'
import StudentCaseNav from '@/components/student/StudentCaseNav'

export default function StudentCaseToolPlaceholder({ title }: { title: string }) {
  const { id } = useParams<{ id: string }>()
  return (
    <StudentShell>
      <StudentCaseNav copyId={id!} />
      <div className="mx-auto max-w-[900px] px-6 py-20 text-center">
        <h1 className="text-lg font-bold text-navy">{title}</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-brand-muted">
          Dieser Bereich wird gerade gebaut – vergleichbar zum Fachpersonenportal bzw. zur Nutzer-Ansicht.
        </p>
      </div>
    </StudentShell>
  )
}
