/**
 * /app — Übersichtsseite (Einstieg nach Login)
 * Persönliche Begrüßung, Weitermachen-Karte, Fortschritt,
 * Fallliste, Tagesimpuls.
 */
import type { ReactNode } from 'react'
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
                      {lastCase.person_name?.trim()
                        || RELATIONSHIP_TYPE_LABELS[lastCase.relationship_type]
                        || lastCase.relationship_type}
                    </p>
                    <p className="text-xs text-brand-muted mt-0.5">
                      {lastCase.person_name?.trim() && (
                        <>{RELATIONSHIP_TYPE_LABELS[lastCase.relationship_type] ?? lastCase.relationship_type} · </>
                      )}
                      Zuletzt aktiv {relativeTime(lastCase.last_activity_at)} · {lastCase.scene_count} {lastCase.scene_count === 1 ? 'Szene' : 'Szenen'}
                    </p>
                  </Link>
                  <div className="flex gap-2 flex-wrap">
                    <Link
                      to={`/app/cases/${lastCase.id}/scenes/new`}
                      className="btn-primary !py-2 !px-4 !text-xs"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                        Szene festhalten
                      </span>
                    </Link>
                    <Link
                      to={`/app/cases/${lastCase.id}/echo`}
                      className="btn bg-white text-navy border-2 border-brand-border hover:border-navy/30 !py-2 !px-4 !text-xs"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
                        </svg>
                        Mit Echo sprechen
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Dein Überblick */}
            <div className="mb-6 rounded-brand border border-brand-border bg-white px-5 py-4">
              <p className="mb-4 text-[10px] font-bold uppercase tracking-wider text-brand-muted/70">
                Dein Überblick
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
                <StatTile
                  icon={<StatIcon><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2Z" /></StatIcon>}
                  value={cases.length}
                  label={cases.length === 1 ? 'Aktiver Fall' : 'Aktive Fälle'}
                />
                <StatTile
                  icon={<StatIcon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /><path d="M9 13h6M9 17h6" /></StatIcon>}
                  value={totalScenes}
                  label={totalScenes === 1 ? 'Erfasste Szene' : 'Erfasste Szenen'}
                />
                <StatTile
                  icon={<StatIcon><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" /></StatIcon>}
                  value={chatCount}
                  label={chatCount === 1 ? 'Echo-Gespräch' : 'Echo-Gespräche'}
                />
                {/* Beziehungsprofil – verlinkt, mit Fortschrittsbalken */}
                <Link to="/app/profile" className="group flex items-center gap-3 no-underline">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <StatIcon><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></StatIcon>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-bold text-navy leading-none">
                      {profilePercent}<span className="text-sm font-semibold"> %</span>
                    </p>
                    <p className="mt-1 text-xs text-brand-muted truncate group-hover:text-accent transition-colors">
                      Beziehungsprofil
                    </p>
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-brand-border/50">
                      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${profilePercent}%` }} />
                    </div>
                  </div>
                </Link>
              </div>
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
  const personName  = c.person_name?.trim()
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
      <p className="text-sm font-semibold text-navy mb-1">{personName || statusLabel}</p>
      {personName && (
        <p className="text-xs text-brand-muted mb-1">{statusLabel}</p>
      )}
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

function StatIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      className="h-[18px] w-[18px]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function StatTile({ icon, value, label }: { icon: ReactNode; value: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-lg font-bold text-navy leading-none">{value}</p>
        <p className="mt-1 text-xs text-brand-muted truncate">{label}</p>
      </div>
    </div>
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
