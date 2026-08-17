/**
 * Das Dashboard des Paarraums: was gerade dran ist.
 *
 * Die wichtigste Unterscheidung steht ganz oben — liegt der Ball bei dir oder bei der
 * anderen Person. Erst danach kommen Gespräche, Themen und Abmachungen. Sortiert wird
 * serverseitig, damit hier nicht geraten werden muss.
 */
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { coupleApi } from '@/api/couple'
import type { CoupleDashboardItem } from '@/api/couple'
import { apiErrorMessage } from '@/api/errors'

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

  const { attention, waiting_for_partner: waiting, sessions, topics, agreements, progress } = data
  const laufend = sessions.filter(s => s.status !== 'closed')
  const archiv = sessions.filter(s => s.status === 'closed' || s.has_summary)
  const offeneThemen = topics.filter(t => t.status !== 'resolved')

  return (
    <div className="space-y-5">
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
              ? 'Bei dir ist gerade nichts zu tun – der Ball liegt drüben.'
              : 'Ihr seid auf dem Laufenden. Ein guter Moment für ein neues Thema.'}
          </p>
        </div>
      )}

      {waiting.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-bold text-navy">
            Wartet auf {data.partner_name || 'deine Partnerperson'}
          </h2>
          <div className="mt-3 space-y-2">
            {waiting.map((item, i) => <ItemRow key={i} item={item} />)}
          </div>
        </div>
      )}

      {/* ── Dein persönlicher Begleiter ───────────────────────────── */}
      <Link
        to={`/app/paar/${coupleId}/echo`}
        className="card block border-l-4 border-l-navy/30 no-underline transition hover:shadow-brand"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-navy">Mit Echo sprechen</h2>
            <p className="mt-1 text-xs text-brand-muted">
              Nur für dich. Echo kennt hier deinen eigenen Zusammenhang und was in eurem
              Raum läuft – und hilft dir, das nächste Thema zu finden oder die richtigen
              Worte dafür.
            </p>
          </div>
          <span className="shrink-0 text-sm text-accent">Öffnen →</span>
        </div>
      </Link>

      {/* ── Zahlen auf einen Blick ────────────────────────────────── */}
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
      {(laufend.length > 0 || offeneThemen.length > 0) && (
        <div className="card">
          <h2 className="text-sm font-bold text-navy">Läuft gerade</h2>
          <div className="mt-3 space-y-2">
            {laufend.map(s => (
              <Link
                key={s.id}
                to={`/app/paar/sitzung/${s.id}`}
                className="flex items-center justify-between gap-3 rounded-brand border border-brand-border px-3.5 py-2.5 no-underline transition hover:border-accent/50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-navy">{s.title}</p>
                  <p className="mt-0.5 text-xs text-brand-muted">
                    Gespräch · {s.message_count} Beiträge
                    {s.from_topic && ' · aus einer Mediation'}
                    {s.scheduled_for && ` · ${new Date(s.scheduled_for).toLocaleString('de-DE')}`}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-accent">Öffnen →</span>
              </Link>
            ))}
            {offeneThemen.map(t => (
              <Link
                key={t.id}
                to={`/app/paar/thema/${t.id}`}
                className="flex items-center justify-between gap-3 rounded-brand border border-brand-border px-3.5 py-2.5 no-underline transition hover:border-accent/50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-navy">{t.title}</p>
                  <p className="mt-0.5 text-xs text-brand-muted">
                    Mediation
                    {t.open_bridges > 0 && ` · ${t.open_bridges} offene Vorschläge`}
                    {t.message_count > 0 && ` · ${t.message_count} Beiträge`}
                    {!t.has_mediation && ' · noch kein Vorschlag'}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-accent">Öffnen →</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Gespeicherte Diskussionen ─────────────────────────────── */}
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

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-brand border border-brand-border bg-white px-3.5 py-3">
      <p className="text-[0.62rem] font-bold uppercase tracking-wide text-brand-muted">{label}</p>
      <p className="mt-1 truncate text-lg font-bold text-navy">{value}</p>
      {hint && <p className="text-[0.65rem] text-brand-muted">{hint}</p>}
    </div>
  )
}
