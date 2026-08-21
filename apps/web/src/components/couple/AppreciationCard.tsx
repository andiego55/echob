/**
 * Wertschätzung – zwanzig Sekunden, die zwischendurch am meisten tragen.
 *
 * Sie lag bisher nur in Schritt 2 der Sitzungsvorbereitung, also kam man nur an sie heran,
 * wenn ohnehin ein Gespräch anstand. Hier ist sie ein eigener kleiner Anlass.
 *
 * Bewusst ohne die Blindheitsregel des Check-ins: Der Satz geht sofort hinüber, auch wenn
 * nichts zurückkommt. Eine Gegenleistung zu verlangen wäre genau der Buchhaltungsblick,
 * den das Modul sonst zu vermeiden versucht.
 *
 * **Warum eine Wand und keine Liste.** Der ganze Paarbereich ist Software: Karten, Listen,
 * Zeilen. Das ist richtig für Abmachungen und Termine, aber falsch für einen Satz, den
 * jemand für einen anderen Menschen hingelegt hat. Deshalb hier Zettel — leicht gedreht,
 * warm, unterschiedlich groß. Der einzige Ort im Modul, der bewusst handgemacht aussieht.
 */
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { coupleAppreciationApi } from '@/api/coupleRhythm'
import type { CoupleAppreciation } from '@/api/coupleRhythm'
import Fehlermeldung from '@/components/Fehlermeldung'

/** Immer derselbe Dreh für denselben Zettel — sonst springt die Wand bei jedem Neuzeichnen. */
function drehung(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return ((Math.abs(h) % 9) - 4) * 0.4      // −1,6° … +1,6°
}

export default function AppreciationCard({ coupleId }: { coupleId: string }) {
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [anstoss, setAnstoss] = useState(0)
  const [alle, setAlle] = useState(false)

  const { data } = useQuery({
    queryKey: ['couple-appreciations', coupleId],
    queryFn: () => coupleAppreciationApi.wall(coupleId),
    enabled: !!coupleId,
    retry: false,
  })

  const seen = useMutation({
    mutationFn: () => coupleAppreciationApi.markSeen(coupleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['couple-appreciations', coupleId] }),
  })

  const leave = useMutation({
    mutationFn: () => coupleAppreciationApi.leave(coupleId, text.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['couple-appreciations', coupleId] })
      qc.invalidateQueries({ queryKey: ['couple-dashboard', coupleId] })
      setText('')
    },
  })

  // Gesehen heißt hier wirklich gesehen: Die Karte war offen, die Sätze standen da.
  const ungelesen = data?.unseen ?? 0
  useEffect(() => {
    if (ungelesen > 0 && !seen.isPending) seen.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ungelesen])

  if (!data) return null

  const erhalten = alle ? data.received : data.received.slice(0, 3)
  const wer = data.partner_name || 'deine Partnerperson'

  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-navy">Wertschätzung</h2>
          <p className="mt-1 text-xs text-brand-muted">
            Ein Satz, der sonst ungesagt bleibt. Geht sofort an {wer}.
          </p>
        </div>
        {ungelesen > 0 && (
          <span className="shrink-0 rounded-full bg-accent px-2.5 py-0.5 text-[0.65rem] font-semibold text-white">
            {ungelesen} neu
          </span>
        )}
      </div>

      {/* ── Dalassen ──────────────────────────────────────────────── */}
      <div className="mt-4">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={2}
          maxLength={data.max_chars}
          placeholder={data.prompts[anstoss % data.prompts.length]}
          className="input w-full resize-y !text-sm"
        />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            onClick={() => leave.mutate()}
            disabled={!text.trim() || leave.isPending}
            className="btn-primary !py-2 !px-5 !text-sm disabled:opacity-50"
          >
            {leave.isPending ? 'Lege ab …' : 'Dalassen'}
          </button>
          <button
            onClick={() => setAnstoss(i => i + 1)}
            className="text-xs text-accent hover:underline"
          >
            Anderer Anstoß
          </button>
        </div>
        <Fehlermeldung error={leave.error} />
      </div>

      {/* ── Was für dich da ist ───────────────────────────────────── */}
      {data.received.length > 0 && (
        <div className="mt-5 border-t border-brand-border pt-4">
          <p className="text-xs font-semibold text-navy">Für dich</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {erhalten.map(a => <Zettel key={a.id} eintrag={a} />)}
          </div>
          {data.received.length > 3 && (
            <button
              onClick={() => setAlle(a => !a)}
              className="mt-2 text-xs text-accent hover:underline"
            >
              {alle ? 'Weniger zeigen' : `Alle ${data.received.length} zeigen`}
            </button>
          )}
        </div>
      )}

      {data.received.length === 0 && data.given.length === 0 && (
        <p className="mt-4 rounded-brand border border-dashed border-brand-border px-4 py-3.5 text-sm leading-relaxed text-brand-muted">
          Noch nichts dagelassen. Am ehesten fällt einem etwas ein, wenn man an eine
          konkrete Situation denkt – nicht an die Person im Allgemeinen.
        </p>
      )}

      {data.given.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-brand-muted hover:text-navy">
            Was du dagelassen hast ({data.given.length})
          </summary>
          <div className="mt-3 flex flex-wrap gap-3">
            {data.given.map(a => <Zettel key={a.id} eintrag={a} gedimmt />)}
          </div>
        </details>
      )}
    </div>
  )
}

function Zettel({ eintrag, gedimmt = false }: { eintrag: CoupleAppreciation; gedimmt?: boolean }) {
  // Kurze Sätze bekommen einen kleinen Zettel, lange einen breiten — wie an einer echten Wand.
  const breit = eintrag.body.length > 90

  return (
    <div
      style={{ transform: `rotate(${drehung(eintrag.id)}deg)` }}
      className={`rounded-brand-sm px-4 py-3 shadow-brand-sm transition-transform duration-200 hover:!rotate-0 ${
        breit ? 'w-full sm:w-[22rem]' : 'w-full sm:w-[15rem]'
      } ${
        gedimmt
          ? 'border border-brand-border bg-white'
          : 'border border-[#f0d9c9] bg-gradient-to-br from-[#fdf2ea] to-[#fbe8db]'
      }`}
    >
      <p className={`whitespace-pre-wrap text-sm leading-relaxed ${
        gedimmt ? 'text-brand-muted' : 'text-navy'
      }`}>
        {eintrag.body}
      </p>
      <p className="mt-2 text-[0.65rem] text-brand-muted">
        {eintrag.is_own ? 'von dir' : `von ${eintrag.from_name}`}
        {' · '}
        {new Date(eintrag.created_at).toLocaleDateString('de-DE', {
          day: '2-digit', month: 'long',
        })}
      </p>
    </div>
  )
}
