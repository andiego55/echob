import { Link } from 'react-router-dom'
import PageLayout from '@/components/layout/PageLayout'

export default function NotFoundPage() {
  return (
    <PageLayout>
      <section className="flex flex-1 flex-col items-center justify-center px-6 pt-[calc(60px+10rem)] pb-40 text-center">
        <span className="label">404</span>
        <h1 className="mt-2 text-3xl font-bold text-navy">Seite nicht gefunden</h1>
        <p className="mt-3 text-brand-muted">Diese Seite existiert nicht oder wurde verschoben.</p>
        <Link to="/" className="btn-primary mt-8">
          Zurück zur Startseite
        </Link>
      </section>
    </PageLayout>
  )
}
