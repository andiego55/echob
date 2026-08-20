/**
 * Was passiert ist, während du weg warst – und der Moment, wenn ein Meilenstein fällt.
 *
 * **Das Problem.** Punkte änderten sich stumm. Man kam zurück, die Zahl war höher, und
 * niemand erfuhr wovon. Ein erreichter Meilenstein wurde still zum Häkchen in einer Liste.
 * Das ist Buchhaltung, keine Rückmeldung.
 *
 * **Warum nicht als kurzes Aufblitzen.** Ein Effekt im Moment der Handlung hilft nur der
 * Person, die gerade klickt — und der Paarbereich lebt vom Wechsel. Interessant ist, was
 * die *andere* Person getan hat, während man selbst weg war. Deshalb wird der letzte Stand
 * lokal gemerkt und beim nächsten Besuch die Differenz gezeigt.
 *
 * **Kein Konfetti.** Das Modul ist kooperativ gebaut und das Thema ernst. Der Meilenstein
 * bekommt Ruhe und Wärme statt Effekt: das Wellenbild des Barometers bei voller Nähe.
 */
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { coupleApi } from '@/api/couple'
import type { CoupleProgress } from '@/api/couple'
import EchoBarometer from './EchoBarometer'

interface Gemerkt { total: number; milestones: string[]; at: string }

const schluessel = (coupleId: string) => `echob:paar-gesehen:${coupleId}`

function laden(coupleId: string): Gemerkt | null {
  try {
    const roh = localStorage.getItem(schluessel(coupleId))
    return roh ? (JSON.parse(roh) as Gemerkt) : null
  } catch {
    return null   // privater Modus o. Ä. – dann eben ohne Gedächtnis
  }
}

function merken(coupleId: string, p: CoupleProgress) {
  try {
    localStorage.setItem(schluessel(coupleId), JSON.stringify({
      total: p.total_points,
      milestones: p.milestones.filter(m => m.reached).map(m => m.key),
      at: new Date().toISOString(),
    } satisfies Gemerkt))
  } catch { /* nicht schlimm */ }
}

export default function SinceLastVisit({ coupleId }: { coupleId: string }) {
  const [weg, setWeg] = useState(false)
  // Einmal beim Mount lesen: Würde sich der Stand mitverändern, verschwände die Meldung
  // in dem Moment, in dem man sie liest.
  const [gemerkt] = useState(() => laden(coupleId))

  const { data: progress } = useQuery({
    queryKey: ['couple-progress', coupleId],
    queryFn: () => coupleApi.progress(coupleId),
    enabled: !!coupleId,
    retry: false,
  })

  // Erster Besuch: still merken, nichts zeigen. Es gibt ja keinen Vergleich.
  // Als Effekt, nicht im Render — Schreiben waehrend des Renderns laeuft im
  // Strict-Modus doppelt und ist auch sonst ein Fehler, der nur meistens gutgeht.
  useEffect(() => {
    if (progress && !gemerkt) merken(coupleId, progress)
  }, [progress, gemerkt, coupleId])

  if (!progress || weg || !gemerkt) return null

  const erreicht = progress.milestones.filter(m => m.reached)
  const neueMeilensteine = erreicht.filter(m => !gemerkt.milestones.includes(m.key))
  const zuwachs = progress.total_points - gemerkt.total
  if (zuwachs <= 0 && neueMeilensteine.length === 0) return null

  const seit = new Date(gemerkt.at).getTime()
  const seither = progress.recent.filter(e => new Date(e.created_at).getTime() > seit)

  const schliessen = () => { merken(coupleId, progress); setWeg(true) }

  return (
    <div className="card card-static border-accent/30 bg-gradient-to-br from-accent/[0.07] to-transparent">
      {/* ── Meilenstein ──────────────────────────────────────────── */}
      {neueMeilensteine.length > 0 && (
        <div className="flex flex-wrap items-center gap-4">
          <div className="shrink-0 text-accent">
            <EchoBarometer value={10} size={104} />
          </div>
          <div className="min-w-0">
            <p className="section-label">
              {neueMeilensteine.length === 1 ? 'Meilenstein erreicht' : 'Meilensteine erreicht'}
            </p>
            {neueMeilensteine.map(m => (
              <div key={m.key} className="mt-1">
                <p className="card-title-lg">{m.title}</p>
                <p className="mt-0.5 text-sm text-brand-muted">{m.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Zuwachs seit dem letzten Besuch ──────────────────────── */}
      {zuwachs > 0 && (
        <div className={neueMeilensteine.length > 0 ? 'mt-4 border-t border-accent/20 pt-3' : ''}>
          <p className="text-sm font-semibold text-navy">
            <span className="tabular-nums text-accent">+{zuwachs}</span>{' '}
            {zuwachs === 1 ? 'Punkt' : 'Punkte'} seit deinem letzten Besuch
          </p>
          {seither.length > 0 && (
            <ul className="mt-2 space-y-1">
              {seither.slice(0, 6).map((e, i) => (
                <li key={i} className="flex items-baseline gap-2 text-sm text-brand-muted">
                  <span className="text-accent/70" aria-hidden>·</span>
                  <span className="min-w-0 flex-1">{e.label}</span>
                  <span className="shrink-0 text-[0.68rem] tabular-nums">{e.name}</span>
                </li>
              ))}
              {seither.length > 6 && (
                <li className="text-xs text-brand-muted/80">
                  … und {seither.length - 6} weitere
                </li>
              )}
            </ul>
          )}
        </div>
      )}

      <button
        onClick={schliessen}
        className="mt-4 text-xs text-brand-muted hover:text-navy"
      >
        Alles gesehen
      </button>
    </div>
  )
}
