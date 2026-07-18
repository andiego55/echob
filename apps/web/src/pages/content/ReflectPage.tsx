import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import { casesApi } from '@/api/cases'
import { CONTENT_MANIFEST } from '@/content/manifest.generated'
import { getSelfTest } from '@/selftests'
import { RELATIONSHIP_TYPE_LABELS } from '@/types'

/**
 * /reflektieren?topic=<slug> | ?source=<slug> | ?test=<slug> — Brücke von einer
 * Wissensseite / Szene / Selbsttest in den eigenen Fall. Hinter ProtectedRoute:
 * nicht angemeldet → Login (Rücksprung inkl. Query erhalten). Angemeldet: Fall wählen
 * → Themendialog `content_<slug>` (TopicDialogPage baut den passenden Seed-Trigger).
 */
const BY_SLUG = new Map(CONTENT_MANIFEST.map((m) => [m.slug, m]))

export default function ReflectPage() {
  const [params] = useSearchParams()
  const testSlug = params.get('test') ?? ''
  const test = testSlug ? getSelfTest(testSlug) : undefined
  const contentSlug = params.get('topic') ?? params.get('source') ?? ''
  const meta = !test ? BY_SLUG.get(contentSlug) : undefined

  const slug = test ? testSlug : contentSlug
  const kind: 'test' | 'scene' | 'content' | null = test ? 'test' : meta ? (meta.type === 'scene' ? 'scene' : 'content') : null
  const title = test?.title ?? meta?.title
  const openingQuestion = test?.echo.opening_question ?? meta?.echo.opening_question
  const backHref = test ? `/selbsttests/${slug}` : meta ? meta.url : '/wissen'
  const backLabel = kind === 'test' ? 'Zurück zum Test' : kind === 'scene' ? 'Zurück zur Szene' : 'Zurück zum Artikel'

  const { data, isLoading } = useQuery({ queryKey: ['cases'], queryFn: casesApi.list })
  const cases = (data?.cases ?? []).filter((c) => !c.archived_at)

  return (
    <AppShell>
      <div className="mx-auto max-w-[720px] px-6 py-10">
        <Link to={backHref} className="text-xs text-accent hover:underline">← {backLabel}</Link>
        <h1 className="mt-2 text-2xl font-bold text-navy">Auf deine eigene Situation beziehen</h1>
        {title && (
          <>
            <p className="mt-2 text-sm text-brand-muted">
              {kind === 'test' ? (
                <>
                  Du hast den Selbsttest <strong className="text-navy">„{title}"</strong> gemacht. Wähle einen Fall,
                  um dein Ergebnis mit Echo zu besprechen.
                </>
              ) : kind === 'scene' ? (
                <>
                  Du hast die Szene <strong className="text-navy">„{title}"</strong> gelesen. Wähle einen Fall,
                  um mit Echo darüber zu sprechen – über das, was sie in dir auslöst.
                </>
              ) : (
                <>
                  Du hast über <strong className="text-navy">{title}</strong> gelesen. Wähle einen Fall,
                  um genau das mit Echo auf deine Situation zu beziehen.
                </>
              )}
            </p>
            {openingQuestion && (
              <div className="mt-4 rounded-brand border border-accent/25 bg-accent/[0.04] px-4 py-3">
                <p className="text-sm leading-relaxed text-brand-text">{openingQuestion}</p>
              </div>
            )}
          </>
        )}

        <div className="mt-8">
          <p className="mb-3 text-sm font-semibold text-navy">Welchen Fall möchtest du betrachten?</p>
          {isLoading ? (
            <p className="text-sm text-brand-muted">Lädt …</p>
          ) : cases.length === 0 ? (
            <div className="rounded-brand border border-brand-border bg-brand-bg/40 px-5 py-6 text-center">
              <p className="mb-4 text-sm text-brand-muted">
                Du hast noch keinen Fall. Leg zuerst einen an – dann kannst du das darauf beziehen.
              </p>
              <Link to="/app" className="btn-primary inline-block !px-5 !py-2 !text-sm">
                Ersten Fall anlegen
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {cases.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/app/cases/${c.id}/topics/content_${slug}`}
                    className="flex items-center justify-between gap-3 rounded-brand border border-brand-border bg-white px-4 py-3 no-underline transition-colors hover:border-accent"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-navy">
                        {RELATIONSHIP_TYPE_LABELS[c.relationship_type] ?? 'Fall'}
                      </span>
                      {c.main_concern && (
                        <span className="block truncate text-xs text-brand-muted">{c.main_concern}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs font-medium text-accent">Mit Echo reflektieren →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="mt-6 text-[11px] leading-relaxed text-brand-muted/80">
          Echo arbeitet nur mit dem von dir gewählten Fall – privat und verschlüsselt. Es stellt keine Diagnose.
        </p>
      </div>
    </AppShell>
  )
}
