/**
 * /app — Fallübersicht
 * Listet alle Fälle des Nutzers. Einstiegsseite nach Login.
 */
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import { casesApi } from '@/api/cases'
import { profileApi } from '@/api/profile'
import { subscriptionApi } from '@/api/subscription'
import { RELATIONSHIP_TYPE_LABELS, RELATIONSHIP_STATUS_LABELS } from '@/types'
import type { Case } from '@/types'

const BLOG_TOPIC_LABELS: Record<string, string> = {
  blog_beziehungsmuster:     'Beziehungsmuster erkennen',
  blog_beobachtung_gefuehl:  'Beobachtung, Gefühl, Interpretation',
  blog_professionelle_hilfe: 'Wann professionelle Hilfe sinnvoll ist',
  blog_krisentelefone:       'Krisentelefone & Anlaufstellen',
}

export default function CasesOverviewPage() {
  const [searchParams] = useSearchParams()
  const blogTopic = searchParams.get('blog')
  const blogLabel = blogTopic ? (BLOG_TOPIC_LABELS[blogTopic] ?? null) : null

  const { data, isLoading, isError } = useQuery({
    queryKey: ['cases'],
    queryFn: casesApi.list,
  })

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.get,
  })
  const hasProfile = (profile?.completed_modules?.length ?? 0) > 0

  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionApi.getStatus,
  })

  return (
    <AppShell>
      <div className="mx-auto max-w-[1100px] px-6 py-10">
        {/* Blog-Topic-Banner */}
        {blogLabel && (
          <div className="mb-6 rounded-brand border border-accent/30 bg-accent/5 px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-wider text-accent mb-1">Aus dem Blog</p>
            <p className="text-sm font-semibold text-navy mb-1">„{blogLabel}"</p>
            <p className="text-xs text-brand-muted">
              Wähle einen Fall aus, um einen geführten Dialog mit Echo zu diesem Thema zu starten.
              Echo nutzt den Kontext deiner dokumentierten Situationen.
            </p>
          </div>
        )}

        {/* Trial-Banner */}
        {subscription?.plan === 'trial' && (
          subscription.is_trial_active ? (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-brand border border-amber-200 bg-amber-50 px-4 py-3">
              <div>
                <span className="text-xs font-bold text-amber-700">Testzugang aktiv</span>
                <span className="ml-2 text-xs text-amber-600">
                  Noch {subscription.trial_days_left} {subscription.trial_days_left === 1 ? 'Tag' : 'Tage'} · 1 Fall · 5 Szenen · Kurzbericht & Coaching-Vorbereitung
                </span>
              </div>
              <Link to="/app/upgrade" className="text-xs font-semibold text-accent shrink-0 hover:underline">
                Jetzt abonnieren →
              </Link>
            </div>
          ) : (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-brand border border-red-200 bg-red-50 px-4 py-3">
              <div>
                <span className="text-xs font-bold text-red-700">Testzeitraum abgelaufen</span>
                <span className="ml-2 text-xs text-red-600">Du kannst keine neuen Fälle oder Szenen mehr anlegen.</span>
              </div>
              <Link to="/app/upgrade" className="text-xs font-semibold text-accent shrink-0 hover:underline">
                Abo wählen →
              </Link>
            </div>
          )
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-navy">
              {blogLabel ? 'Fall auswählen' : 'Meine Fälle'}
            </h1>
            <p className="mt-1 text-sm text-brand-muted">
              {blogLabel
                ? 'Welchen Fall möchtest du als Kontext für diesen Dialog nutzen?'
                : 'Jeder Fall steht für eine Beziehungssituation, die du besser verstehen möchtest.'}
            </p>
          </div>
          <Link to="/app/cases/new" className="btn-primary !py-2 !px-5 !text-sm">
            + Fall anlegen
          </Link>
        </div>

        {/* Profil-Hinweis */}
        {hasProfile ? (
          <Link
            to="/app/profile"
            className="mb-6 flex items-center gap-3 rounded-brand border border-brand-border bg-white px-4 py-3 text-sm text-brand-muted hover:border-accent/40 transition-colors no-underline"
          >
            <span className="text-accent font-medium">✓ Beziehungsprofil vorhanden</span>
            <span className="text-brand-muted/60">→ Profil ansehen</span>
          </Link>
        ) : (
          <Link
            to="/app/profile"
            className="mb-6 flex items-center gap-3 rounded-brand border border-dashed border-brand-border bg-white px-4 py-3 text-sm text-brand-muted hover:border-accent/40 transition-colors no-underline"
          >
            <span className="text-navy font-medium">Beziehungsprofil noch nicht ausgefüllt</span>
            <span className="text-accent font-medium ml-auto flex-shrink-0">→ Profil anlegen</span>
          </Link>
        )}

        {/* Inhalt */}
        {isLoading && (
          <div className="text-brand-muted text-sm">Fälle werden geladen …</div>
        )}

        {isError && (
          <div className="rounded-brand border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Fälle konnten nicht geladen werden. Bitte Seite neu laden.
          </div>
        )}

        {data && data.cases.length === 0 && (
          <EmptyState />
        )}

        {data && data.cases.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.cases.map((c) => (
              <CaseCard key={c.id} case_={c} blogTopic={blogTopic ?? undefined} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

function CaseCard({ case_: c, blogTopic }: { case_: Case; blogTopic?: string }) {
  const typeLabel   = RELATIONSHIP_TYPE_LABELS[c.relationship_type]   ?? c.relationship_type
  const statusLabel = RELATIONSHIP_STATUS_LABELS[c.relationship_status] ?? c.relationship_status
  const to = blogTopic
    ? `/app/cases/${c.id}/topics/${blogTopic}`
    : `/app/cases/${c.id}`

  return (
    <Link
      to={to}
      className="card block no-underline hover:border-accent/40 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="label">{typeLabel}</span>
        <span className="text-xs text-brand-muted">{formatDate(c.created_at)}</span>
      </div>
      <p className="text-sm font-medium text-navy mb-1">{statusLabel}</p>
      {c.main_concern && (
        <p className="text-xs text-brand-muted line-clamp-2">{c.main_concern}</p>
      )}
      <div className="mt-4 text-xs text-accent font-medium">
        {blogTopic ? 'Dialog starten →' : 'Fall öffnen →'}
      </div>
    </Link>
  )
}

function EmptyState() {
  return (
    <div className="card text-center py-12 max-w-md mx-auto">
      <div className="text-4xl mb-4">📂</div>
      <h2 className="text-lg font-semibold text-navy mb-2">Noch keine Fälle</h2>
      <p className="text-sm text-brand-muted mb-6">
        Leg deinen ersten Fall an, um eine Beziehungssituation strukturiert zu reflektieren.
      </p>
      <Link to="/app/cases/new" className="btn-primary !py-2 !px-5 !text-sm">
        Ersten Fall anlegen
      </Link>
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
