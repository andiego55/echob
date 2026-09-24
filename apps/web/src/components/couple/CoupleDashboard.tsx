/**
 * Das Dashboard des Paarraums: was gerade dran ist.
 *
 * Die wichtigste Unterscheidung steht ganz oben — liegt der Ball bei dir oder bei der
 * anderen Person. Sortiert wird serverseitig, damit hier nicht geraten werden muss.
 *
 * Leerzustände erklären, was der Bereich kann, statt „nichts vorhanden" zu melden. Wer
 * zum ersten Mal hier ist, soll wissen, was ihn erwartet.
 *
 * **Eine Frage, nicht vier.** Diese Seite ist mit jedem Feature gewachsen und zeigte
 * zuletzt vierzehn Blöcke. Ein früherer Versuch hat sie in drei Abschnitte geteilt und
 * einen Aufklapper darunter gelegt; sie ist trotzdem wieder vollgelaufen — weil die
 * Ursache eine andere war.
 *
 * **Die Ursache: zwei Landkarten und zwei Statusysteme.** Es gab `Einstiege` (sechs Wege,
 * etwas zu sagen) UND vier „Weitermachen"-Kacheln, die auf dieselben Ziele zeigten. Und es
 * gab die Abschnitte für den Zustand UND einen Aufklapper mit Zahlen, laufenden
 * Gesprächen, eigenen Zusammenfassungen und dem Archiv — von denen jedes einzelne hinter
 * einem Reiter längst ein Zuhause hat.
 *
 * **Jetzt beantwortet die Seite genau eine Frage: was ist gerade dran.** Wer hier ist, wo
 * es hingeht (eine Landkarte), wie es steht, was offen ist — auf beiden Seiten —, und was
 * heute fällig ist. Alles Wiederkehrende liegt unter *Rhythmus*, alles Laufende unter
 * *Gespräche*, alle Zahlen unter *Fortschritt*, die eigenen Zusammenfassungen bei *Echo*.
 *
 * **Warum „wartet auf dich" und „wartet auf sie" jetzt zusammenstehen.** Es ist dieselbe
 * Frage aus zwei Richtungen, und getrennt durch den halben Bildschirm liest man nur die
 * erste. Zusammen sieht man in einem Blick, ob der Ball bei einem liegt — und das ist die
 * Auskunft, um die es geht.
 */
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Avatar from '@/components/Avatar'
import { coupleApi } from '@/api/couple'
import type { CoupleDashboardItem } from '@/api/couple'
import { apiErrorMessage } from '@/api/errors'
import BarometerCard from './BarometerCard'
import CoupleNotices from './CoupleNotices'
import SinceLastVisit from './SinceLastVisit'
import { DashboardSkeleton } from '@/components/Skeleton'
import DueAgreementsCard from './DueAgreementsCard'
import Einstiege from './Einstiege'
import HonestTeaser from './HonestTeaser'

export default function CoupleDashboard({ coupleId }: { coupleId: string }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['couple-dashboard', coupleId],
    queryFn: () => coupleApi.dashboard(coupleId),
    enabled: !!coupleId,
    retry: false,
    refetchInterval: 20000,
  })

  if (isLoading) return <DashboardSkeleton />
  if (isError || !data) {
    return (
      <div className="card border-l-4 border-l-red-400">
        <p className="text-sm text-brand-muted">{apiErrorMessage(error)}</p>
      </div>
    )
  }

  // Nur noch, was auf DIESER Seite steht. Sitzungen, Themen, Zahlen und die eigenen
  // Zusammenfassungen kommen weiter in der Antwort des Servers — sie werden hier aber
  // nicht mehr gezeigt, sondern auf ihren Reitern.
  const { attention, waiting_for_partner: waiting, progress } = data
  const partner = data.partner_name || 'deine Partnerperson'

  return (
    <div className="space-y-5">
      <CoupleNotices />

      <SinceLastVisit coupleId={coupleId} />

      {/* ── Wer hier ist ──────────────────────────────────────────── */}
      <div className="card card-hero card-static">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex -space-x-3">
            <Avatar value={data.own_avatar} size="lg" className="ring-2 ring-white" />
            <Avatar value={data.partner_avatar} size="lg" className="ring-2 ring-white" />
          </div>
          <div className="min-w-0">
            <p className="card-title-lg">
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

      <Einstiege coupleId={coupleId} />

      <BarometerCard
        coupleId={coupleId}
        ownAvatar={data.own_avatar}
        partnerAvatar={data.partner_avatar}
      />

      {/* ── Offen, auf beiden Seiten ──────────────────────────────────
          Eine Karte statt zweier, die durch den halben Bildschirm getrennt waren. Es ist
          dieselbe Frage aus zwei Richtungen; getrennt liest man nur die erste. */}
      {attention.length === 0 && waiting.length === 0 ? (
        <div className="card">
          <h2 className="card-title">Nichts offen</h2>
          <p className="mt-1.5 text-sm text-brand-muted">
            Ihr seid auf dem Laufenden. Ein guter Moment für ein neues Thema.
          </p>
        </div>
      ) : (
        <div className={`card ${attention.length > 0 ? 'border-l-4 border-l-accent' : ''}`}>
          {attention.length > 0 ? (
            <>
              <h2 className="card-title">
                Das wartet auf dich
                <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[0.65rem] text-white">
                  {attention.length}
                </span>
              </h2>
              <div className="mt-3 space-y-2">
                {attention.map((item, i) => <ItemRow key={i} item={item} highlight />)}
              </div>
            </>
          ) : (
            <p className="text-sm text-brand-muted">
              Bei dir ist gerade nichts zu tun – der Ball liegt bei {partner}.
            </p>
          )}

          {waiting.length > 0 && (
            <div className={attention.length > 0
              ? 'mt-4 border-t border-brand-border/60 pt-3' : 'mt-3'}>
              <p className="section-label">Wartet auf {partner}</p>
              <div className="mt-2 space-y-2">
                {waiting.map((item, i) => <ItemRow key={i} item={item} />)}
              </div>
            </div>
          )}
        </div>
      )}

      <DueAgreementsCard coupleId={coupleId} />

      {/* „Gerade gestritten" stand hier ein zweites Mal. Der Knopf sitzt im Kopf der
          Seite und ist damit immer sichtbar — eine Karte weiter unten, die dasselbe sagt,
          ist kein zweiter Weg, sondern eine zweite Gelegenheit, ihn zu übersehen. */}

      {/* Die Übung, auf die alles andere hinausläuft — und das Einzige aus dem Rhythmus,
          das hier bleibt: Sie meldet sich nur, wenn sie etwas zu sagen hat. */}
      <HonestTeaser teaser={data.honest_teaser} />

      {/* Der Rhythmus als EINE Zeile. Vorher standen hier vier Karten (Wochen-Check,
          Impulse, Wertschätzung, ehrlich mitteilen) — jede für sich gut, zusammen der
          Grund, warum die Seite nicht endete. Sie haben jetzt einen eigenen Reiter. */}
      <Link
        to={`/app/paar/${coupleId}/rhythmus`}
        className="flex items-center justify-between gap-3 rounded-brand-lg border border-brand-border bg-white px-4 py-3 no-underline shadow-brand-sm transition hover:border-accent/50"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-navy">Euer Rhythmus</p>
          <p className="mt-0.5 text-[0.72rem] leading-snug text-brand-muted">
            Wochen-Check, Wertschätzung und kleine Übungen — fünf Minuten, die über Wochen
            tragen.
          </p>
        </div>
        <span className="shrink-0 text-xs text-accent">Ansehen →</span>
      </Link>

      {/* ── Was hier NICHT mehr steht, und warum ──────────────────────
          Hier lag ein Aufklapper „Mehr aus eurem Raum" mit Zahlen, laufenden Gespraechen,
          den eigenen Echo-Zusammenfassungen und dem Archiv. Zugeklappt kostete er wenig —
          aber er war der Ort, an dem die Seite immer weiter wuchs, weil jedes neue Stueck
          dort noch hineinpasste.

          Jedes dieser Dinge hat einen Reiter, und zwar seit es sie gibt:
            Zahlen und Stufe          → Wir · Fortschritt
            Laufende Gespraeche und
            das Archiv                → Reden · Gespraeche
            offene Mediationen        → Klaeren · Mediation
            eigene Zusammenfassungen  → Reden · Echo

          Sie hier ein zweites Mal zu zeigen half niemandem: Wer sie sucht, geht auf den
          Reiter; wer sie nicht sucht, scrollt daran vorbei. */}
      <p className="pt-1 text-center text-[0.74rem] text-brand-muted">
        Zahlen und Stufe stehen unter{" "}
        <Link to={`/app/paar/${coupleId}/fortschritt`}
          className="font-medium text-accent no-underline hover:underline">Fortschritt</Link>
        {", "}laufende und vergangene Gespräche unter{" "}
        <Link to={`/app/paar/${coupleId}/gespraeche`}
          className="font-medium text-accent no-underline hover:underline">Gespräche</Link>
        {"."}
      </p>
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


