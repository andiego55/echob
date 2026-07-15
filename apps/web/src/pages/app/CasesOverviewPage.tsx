/**
 * /app — Übersichtsseite (Einstieg nach Login)
 * Persönliche Begrüßung, Weitermachen-Karte, Fortschritt,
 * Fallliste, Tagesimpuls.
 */
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import { casesApi } from '@/api/cases'
import { profileApi } from '@/api/profile'
import { subscriptionApi } from '@/api/subscription'
import { PROFILE_MODULES } from '@/utils/profileModules'
import { RELATIONSHIP_TYPE_LABELS, RELATIONSHIP_STATUS_LABELS } from '@/types'
import type { Case } from '@/types'

const BLOG_TOPIC_LABELS: Record<string, string> = {
  blog_beziehungsmuster:     'Beziehungsmuster erkennen',
  blog_beobachtung_gefuehl:  'Beobachtung, Gefühl, Interpretation',
  blog_professionelle_hilfe: 'Wann professionelle Hilfe sinnvoll ist',
  blog_krisentelefone:       'Krisentelefone & Anlaufstellen',
}

const DAILY_PROMPTS = [
  'Gab es diese Woche einen Moment, der dich beschäftigt hat?',
  'Wann hast du dich zuletzt in der Beziehung wohl gefühlt – und woran lag das?',
  'Gab es kürzlich eine Situation, in der du dich übergangen gefühlt hast?',
  'Was hättest du in einer aktuellen Situation gern gesagt, aber nicht gesagt?',
  'Ist dir an dir selbst etwas aufgefallen, das sich wiederholt?',
  'Gab es einen Moment, in dem du an deiner Wahrnehmung gezweifelt hast?',
  'Was war diese Woche anders als sonst – im Guten oder im Schwierigen?',
]

function greeting(): string {
  const h = new Date().getHours()
  if (h < 11) return 'Guten Morgen'
  if (h < 18) return 'Guten Tag'
  return 'Guten Abend'
}

function relativeTime(iso: string | null): string {
  if (!iso) return '–'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'heute'
  if (days === 1) return 'gestern'
  if (days < 7) return `vor ${days} Tagen`
  const weeks = Math.floor(days / 7)
  if (weeks === 1) return 'vor 1 Woche'
  if (weeks < 5) return `vor ${weeks} Wochen`
  return `vor ${Math.floor(days / 30)} Monaten`
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

  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionApi.getStatus,
  })

  const cases = data?.cases ?? []
  const lastCase = cases[0] ?? null   // Backend sortiert nach letzter Aktivität

  const displayName = profile?.display_name?.trim()
  const completedCount = profile?.completed_modules?.length ?? 0
  const profilePercent = Math.round((completedCount / PROFILE_MODULES.length) * 100)
  const totalScenes = cases.reduce((sum, c) => sum + (c.scene_count ?? 0), 0)
  const chatCount = data?.chat_session_count ?? 0

  const dayPrompt = DAILY_PROMPTS[
    Math.floor(Date.now() / 86_400_000) % DAILY_PROMPTS.length
  ]

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
            <div className="mb-6 flex items-center justify-between gap-3 rounded-brand border border-amber-200 bg-amber-50 px-4 py-2.5">
              <span className="text-xs text-amber-700">
                <strong>Testzugang</strong> · noch {subscription.trial_days_left} {subscription.trial_days_left === 1 ? 'Tag' : 'Tage'} · 1 Fall · 5 Szenen
              </span>
              <Link to="/app/upgrade" className="text-xs font-semibold text-accent shrink-0 hover:underline">
                Jetzt abonnieren →
              </Link>
            </div>
          ) : (
            <div className="mb-6 flex items-center justify-between gap-3 rounded-brand border border-red-200 bg-red-50 px-4 py-2.5">
              <span className="text-xs text-red-700">
                <strong>Testzeitraum abgelaufen</strong> · du kannst keine neuen Fälle oder Szenen mehr anlegen
              </span>
              <Link to="/app/upgrade" className="text-xs font-semibold text-accent shrink-0 hover:underline">
                Abo wählen →
              </Link>
            </div>
          )
        )}

        {/* Begrüßung */}
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-navy">
              {blogLabel
                ? 'Fall auswählen'
                : `${greeting()}${displayName ? `, ${displayName}` : ''}`}
            </h1>
            <p className="mt-1 text-sm text-brand-muted">
              {blogLabel
                ? 'Welchen Fall möchtest du als Kontext für diesen Dialog nutzen?'
                : 'Schön, dass du da bist. Nimm dir die Zeit, die du brauchst.'}
            </p>
          </div>
          <Link to="/app/cases/new" className="btn-primary !py-2 !px-5 !text-sm shrink-0">
            + Fall anlegen
          </Link>
        </div>

        {isLoading && (
          <div className="text-brand-muted text-sm">Wird geladen …</div>
        )}

        {isError && (
          <div className="rounded-brand border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Daten konnten nicht geladen werden. Bitte Seite neu laden.
          </div>
        )}

        {data && cases.length === 0 && <EmptyState />}

        {data && cases.length > 0 && !blogLabel && (
          <>
            {/* Weitermachen-Karte */}
            {lastCase && (
              <div className="mb-6 rounded-brand border-2 border-accent bg-white px-5 py-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-accent mb-2">
                  Weitermachen, wo du warst
                </p>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <Link to={`/app/cases/${lastCase.id}`} className="no-underline">
                    <p className="text-base font-bold text-navy">
                      {RELATIONSHIP_TYPE_LABELS[lastCase.relationship_type] ?? lastCase.relationship_type}
                    </p>
                    <p className="text-xs text-brand-muted mt-0.5">
                      Zuletzt aktiv {relativeTime(lastCase.last_activity_at)} · {lastCase.scene_count} {lastCase.scene_count === 1 ? 'Szene' : 'Szenen'}
                    </p>
                  </Link>
                  <div className="flex gap-2 flex-wrap">
                    <Link
                      to={`/app/cases/${lastCase.id}/scenes/new`}
                      className="btn-primary !py-2 !px-4 !text-xs"
                    >
                      Szene festhalten
                    </Link>
                    <Link
                      to={`/app/cases/${lastCase.id}/echo`}
                      className="btn bg-white text-navy border-2 border-brand-border hover:border-navy/30 !py-2 !px-4 !text-xs"
                    >
                      Mit Echo sprechen
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Fortschritt */}
            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-brand border border-brand-border bg-white px-4 py-3">
                <p className="text-xs text-brand-muted">Szenen festgehalten</p>
                <p className="text-2xl font-extrabold text-navy mt-0.5">{totalScenes}</p>
              </div>
              <div className="rounded-brand border border-brand-border bg-white px-4 py-3">
                <p className="text-xs text-brand-muted">Echo-Gespräche</p>
                <p className="text-2xl font-extrabold text-navy mt-0.5">{chatCount}</p>
              </div>
              <Link to="/app/profile" className="rounded-brand border border-brand-border bg-white px-4 py-3 no-underline hover:border-accent/40 transition-colors">
                <p className="text-xs text-brand-muted">Beziehungsprofil</p>
                <p className="text-2xl font-extrabold text-navy mt-0.5">
                  {profilePercent} %
                  {profilePercent < 100 && (
                    <span className="ml-2 text-xs font-medium text-accent">vervollständigen →</span>
                  )}
                </p>
              </Link>
            </div>
          </>
        )}

        {/* Fallliste */}
        {data && cases.length > 0 && (
          <>
            {!blogLabel && (
              <p className="text-sm font-semibold text-navy mb-3">Deine Fälle</p>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cases.map((c) => (
                <CaseCard key={c.id} case_={c} blogTopic={blogTopic ?? undefined} />
              ))}
            </div>
          </>
        )}

        {/* Tagesimpuls */}
        {data && cases.length > 0 && !blogLabel && (
          <div className="mt-8 rounded-brand border border-[#c0d8ed] bg-[#eef5fb] px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#3b6a9a] mb-1">
                Impuls für heute
              </p>
              <p className="text-sm text-navy">{dayPrompt}</p>
            </div>
            <Link
              to={lastCase ? `/app/cases/${lastCase.id}/scenes/new` : '/app/cases/new'}
              className="text-xs font-semibold text-[#3b6a9a] hover:underline shrink-0 no-underline"
            >
              In 2 Minuten festhalten →
            </Link>
          </div>
        )}

        {/* Vertrauens-Zeile */}
        <p className="mt-10 text-center text-xs text-brand-muted/70">
          Dein Raum. Deine Daten. Du bestimmst das Tempo.
        </p>
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
      </div>
      <p className="text-sm font-medium text-navy mb-1">{statusLabel}</p>
      {c.main_concern && (
        <p className="text-xs text-brand-muted line-clamp-2">{c.main_concern}</p>
      )}
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-[11px] text-brand-muted/80">
          {c.scene_count} {c.scene_count === 1 ? 'Szene' : 'Szenen'} · {relativeTime(c.last_activity_at)}
        </span>
        <span className="text-xs text-accent font-medium shrink-0">
          {blogTopic ? 'Dialog starten →' : 'Öffnen →'}
        </span>
      </div>
    </Link>
  )
}

function EmptyState() {
  return (
    <div className="card text-center py-12 max-w-md mx-auto">
      <h2 className="text-lg font-semibold text-navy mb-2">Schön, dass du hier bist</h2>
      <p className="text-sm text-brand-muted mb-6">
        Leg deinen ersten Fall an, um eine Beziehungssituation strukturiert zu reflektieren –
        in deinem Tempo, in deinem Raum.
      </p>
      <Link to="/app/cases/new" className="btn-primary !py-2 !px-5 !text-sm">
        Ersten Fall anlegen
      </Link>
      <p className="mt-6 text-xs text-brand-muted/70">
        Deine Daten gehören dir. Du bestimmst, was du teilst.
      </p>
    </div>
  )
}
