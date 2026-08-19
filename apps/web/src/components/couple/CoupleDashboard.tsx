/**
 * Das Dashboard des Paarraums: was gerade dran ist.
 *
 * Die wichtigste Unterscheidung steht ganz oben — liegt der Ball bei dir oder bei der
 * anderen Person. Sortiert wird serverseitig, damit hier nicht geraten werden muss.
 *
 * Leerzustände erklären, was der Bereich kann, statt „nichts vorhanden" zu melden. Wer
 * zum ersten Mal hier ist, soll wissen, was ihn erwartet.
 */
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Avatar from '@/components/Avatar'
import { coupleApi } from '@/api/couple'
import type { CoupleDashboardItem } from '@/api/couple'
import { apiErrorMessage } from '@/api/errors'
import CoupleNotices from './CoupleNotices'
import DueAgreementsCard from './DueAgreementsCard'
import WeeklyCheckinCard from './WeeklyCheckinCard'

export default function CoupleDashboard({ coupleId }: { coupleId: string }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['couple-dashboard', coupleId],
    queryFn: () => coupleApi.dashboard(coupleId),
    enabled: !!coupleId,
    retry: false,
    refetchInterval: 20000,
  })

  if (isLoading) return <div className="card text-sm text-brand-muted">Lade …</div>
  if (isError || !data) {
    return (
      <div className="card border-l-4 border-l-red-400">
        <p className="text-sm text-brand-muted">{apiErrorMessage(error)}</p>
      </div>
    )
  }

  const {
    attention, waiting_for_partner: waiting, sessions, topics, agreements, progress,
    echo_summaries: summaries,
  } = data
  const laufend = sessions.filter(s => s.status !== 'closed')
  const archiv = sessions.filter(s => s.status === 'closed' || s.has_summary)
  const offeneThemen = topics.filter(t => t.status !== 'resolved')
  const partner = data.partner_name || 'deine Partnerperson'

  return (
    <div className="space-y-5">
      <CoupleNotices />

      {/* ── Wer hier ist ──────────────────────────────────────────── */}
      <div className="card bg-gradient-to-br from-accent/[0.07] to-transparent">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex -space-x-3">
            <Avatar value={data.own_avatar} size="lg" className="ring-2 ring-white" />
            <Avatar value={data.partner_avatar} size="lg" className="ring-2 ring-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[1.05rem] font-bold text-navy">
              {data.own_name} &amp; {data.partner_name || 'Partnerperson'}
            </p>
            <p className="mt-0.5 text-xs text-brand-muted">
              {progress.streak_weeks > 0
                ? `${progress.streak_weeks} ${progress.streak_weeks === 1 ? 'Woche' : 'Wochen'} in Folge dran – Stufe „${progress.level.name}".`
                : `Stufe „${progress.level.name}" · ${progress.total_points} Punkte gemeinsam.`}
            </p>
          </div>
        </div>
      </div>

      {/* ── Ball bei dir ──────────────────────────────────────────── */}
      {attention.length > 0 ? (
        <div className="card border-l-4 border-l-accent">
          <h2 className="text-sm font-bold text-navy">
            Das wartet auf dich
            <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[0.65rem] text-white">
              {attention.length}
            </span>
          </h2>
          <div className="mt-3 space-y-2">
            {attention.map((item, i) => <ItemRow key={i} item={item} highlight />)}
          </div>
        </div>
      ) : (
        <div className="card">
          <h2 className="text-sm font-bold text-navy">Nichts offen</h2>
          <p className="mt-1.5 text-sm text-brand-muted">
            {waiting.length > 0
              ? `Bei dir ist gerade nichts zu tun – der Ball liegt bei ${partner}.`
              : 'Ihr seid auf dem Laufenden. Ein guter Moment für ein neues Thema.'}
          </p>
        </div>
      )}

      {/* ── Rhythmus: was sich wiederholt ─────────────────────────── */}
      <DueAgreementsCard coupleId={coupleId} />

      <WeeklyCheckinCard
        coupleId={coupleId}
        ownAvatar={data.own_avatar}
        partnerAvatar={data.partner_avatar}
      />

      {waiting.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-bold text-navy">Wartet auf {partner}</h2>
          <div className="mt-3 space-y-2">
            {waiting.map((item, i) => <ItemRow key={i} item={item} />)}
          </div>
        </div>
      )}

      {/* ── Womit weitermachen ────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-3">
        <QuickAction
          to={`/app/paar/${coupleId}/echo`}
          title="Mit Echo sprechen"
          text="Nur für dich – findet das nächste Thema und die richtigen Worte."
        />
        <QuickAction
          to={`/app/paar/${coupleId}/gespraeche`}
          title="Gespräch beginnen"
          text="Ein Thema, ein Ziel, moderiert von Echo."
        />
        <QuickAction
          to={`/app/paar/${coupleId}/mediation`}
          title="Thema klären"
          text="Für alles, bei dem ihr feststeckt."
        />
      </div>

      {/* ── Zahlen ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Stufe" value={progress.level.name} />
        <Tile label="Punkte" value={String(progress.total_points)} hint="gemeinsam" />
        <Tile
          label="Serie"
          value={progress.streak_weeks > 0 ? `${progress.streak_weeks} Wo.` : '–'}
          hint={progress.streak_weeks > 0 ? 'in Folge' : 'noch keine'}
        />
        <Tile
          label="Abmachungen"
          value={String(agreements.active + agreements.kept)}
          hint={agreements.kept > 0 ? `${agreements.kept} gehalten` : 'gelten'}
        />
      </div>

      {/* ── Läuft gerade ──────────────────────────────────────────── */}
      {laufend.length > 0 || offeneThemen.length > 0 ? (
        <div className="card">
          <h2 className="text-sm font-bold text-navy">Läuft gerade</h2>
          <div className="mt-3 space-y-2">
            {laufend.map(s => (
              <RowLink key={s.id} to={`/app/paar/sitzung/${s.id}`} title={s.title}
                detail={
                  `Gespräch · ${s.message_count} Beiträge`
                  + (s.from_topic ? ' · aus einer Mediation' : '')
                  + (s.scheduled_for ? ` · ${new Date(s.scheduled_for).toLocaleString('de-DE')}` : '')
                } />
            ))}
            {offeneThemen.map(t => (
              <RowLink key={t.id} to={`/app/paar/thema/${t.id}`} title={t.title}
                detail={
                  'Mediation'
                  + (t.open_bridges > 0 ? ` · ${t.open_bridges} offene Vorschläge` : '')
                  + (t.message_count > 0 ? ` · ${t.message_count} Beiträge` : '')
                  + (!t.has_mediation ? ' · noch kein Vorschlag' : '')
                } />
            ))}
          </div>
        </div>
      ) : (
        <div className="card">
          <h2 className="text-sm font-bold text-navy">Noch nichts begonnen</h2>
          <p className="mt-1.5 text-sm text-brand-muted">
            Ein <strong className="text-navy">Gespräch</strong> ist gut für ein Thema, das ihr
            besprechen wollt. Eine <strong className="text-navy">Mediation</strong> ist für
            das, bei dem ihr schon festhängt – dort schreibt ihr erst getrennt, bevor Echo
            Vorschläge macht.
          </p>
        </div>
      )}

      {/* ── Was du für dich festgehalten hast ─────────────────────── */}
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-navy">Was du für dich festgehalten hast</h2>
            <p className="mt-1 text-xs text-brand-muted">
              Zusammenfassungen deiner Gespräche mit Echo. {partner} sieht sie nicht.
            </p>
          </div>
          <Link to={`/app/paar/${coupleId}/echo`} className="shrink-0 text-xs text-accent hover:underline">
            Zum Begleiter →
          </Link>
        </div>

        {summaries.length === 0 ? (
          <p className="mt-3 text-sm text-brand-muted">
            Noch keine. Sprich mit Echo über das, was dich beschäftigt, und lass das Gespräch
            danach zusammenfassen – so wie du es aus deinen Themendialogen kennst.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {summaries.map(s => (
              <details key={s.id} className="rounded-brand border border-brand-border px-3.5 py-2.5">
                <summary className="cursor-pointer text-sm font-semibold text-navy">
                  {s.title || 'Gespräch'}
                  <span className="ml-2 text-[0.65rem] font-normal text-brand-muted">
                    {new Date(s.created_at).toLocaleDateString('de-DE')}
                  </span>
                </summary>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-brand-muted">
                  {s.summary_text}
                </p>
              </details>
            ))}
          </div>
        )}
      </div>

      {/* ── Gespeicherte Gespräche ────────────────────────────────── */}
      {archiv.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-bold text-navy">Was ihr besprochen habt</h2>
          <p className="mt-1 text-xs text-brand-muted">
            Zum Nachlesen, wenn die Erinnerung auseinandergeht.
          </p>
          <div className="mt-3 space-y-2">
            {archiv.slice(0, 8).map(s => (
              <Link
                key={s.id}
                to={`/app/paar/sitzung/${s.id}`}
                className="flex items-center justify-between gap-3 rounded-brand px-3.5 py-2 no-underline transition hover:bg-brand-bg"
              >
                <p className="min-w-0 truncate text-sm text-brand-text">{s.title}</p>
                <span className="shrink-0 text-[0.65rem] text-brand-muted">
                  {s.has_summary ? 'mit Zusammenfassung' : 'ohne Zusammenfassung'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RowLink({ to, title, detail }: { to: string; title: string; detail: string }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-3 rounded-brand border border-brand-border px-3.5 py-2.5 no-underline transition hover:border-accent/50"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-navy">{title}</p>
        <p className="mt-0.5 text-xs text-brand-muted">{detail}</p>
      </div>
      <span className="shrink-0 text-xs text-accent">Öffnen →</span>
    </Link>
  )
}

function ItemRow({ item, highlight = false }: { item: CoupleDashboardItem; highlight?: boolean }) {
  const inner = (
    <>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-navy">{item.title}</p>
        <p className="mt-0.5 text-xs text-brand-muted">{item.detail}</p>
      </div>
      {item.target && <span className="shrink-0 text-xs text-accent">Öffnen →</span>}
    </>
  )
  const cls = `flex items-center justify-between gap-3 rounded-brand border px-3.5 py-2.5 no-underline transition ${
    highlight ? 'border-accent/40 bg-accent/[0.04] hover:border-accent' : 'border-brand-border'
  }`
  return item.target
    ? <Link to={item.target} className={cls}>{inner}</Link>
    : <div className={cls}>{inner}</div>
}

function QuickAction({ to, title, text }: { to: string; title: string; text: string }) {
  return (
    <Link
      to={to}
      className="group rounded-brand-lg border border-brand-border bg-white p-4 no-underline shadow-brand-sm transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-brand"
    >
      <p className="text-sm font-bold text-navy">{title}</p>
      <p className="mt-1 text-[0.72rem] leading-snug text-brand-muted">{text}</p>
      <span className="mt-2 inline-flex items-center gap-1 text-[0.72rem] font-semibold text-accent">
        Öffnen<span className="transition-transform group-hover:translate-x-0.5">→</span>
      </span>
    </Link>
  )
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-brand border border-brand-border bg-white px-3.5 py-3">
      <p className="text-[0.62rem] font-bold uppercase tracking-wide text-brand-muted">{label}</p>
      <p className="mt-1 truncate text-lg font-bold text-navy">{value}</p>
      {hint && <p className="text-[0.65rem] text-brand-muted">{hint}</p>}
    </div>
  )
}
