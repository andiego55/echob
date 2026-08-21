/**
 * /professional/paarraum/:coupleId — der Paarraum als Arbeitsplatz der Fachperson.
 *
 * **Warum ein Menü und kein Chat.** Bisher war die Paar-Arbeit ein Dialogfenster. Mit dem
 * freigegebenen Raum liegt aber Material vor, das man durchsieht und nicht erfragt:
 * Zusammenfassungen, Themen, Abmachungen, Verläufe. Der Echo-Dialog ist einer der
 * Einträge, nicht die ganze Seite.
 *
 * **Gesperrt statt versteckt.** Nicht freigegebene Bereiche stehen sichtbar da und sagen,
 * dass das Paar sie nicht freigegeben hat. Ein fehlender Menüpunkt sähe nach Fehler aus;
 * ein gesperrter sagt die Wahrheit — und macht nebenbei sichtbar, worüber man mit dem
 * Paar sprechen könnte.
 */
import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import ProfessionalShell from '@/components/professional/ProfessionalShell'
import MarkdownMessage from '@/components/app/MarkdownMessage'
import { professionalRoomApi } from '@/api/professionalCoupleRoom'
import { apiErrorMessage } from '@/api/errors'
import EchoThinking from '@/components/couple/EchoThinking'

/** Die Reihenfolge im Menü — vom Überblick zum Detail. */
const BEREICHE: { key: string; label: string }[] = [
  { key: 'summaries', label: 'Gespräche' },
  { key: 'topics', label: 'Themen & Mediation' },
  { key: 'agreements', label: 'Abmachungen' },
  { key: 'history', label: 'Verlauf' },
  { key: 'retrospectives', label: 'Rückblicke' },
  { key: 'tests', label: 'Testvergleiche' },
  { key: 'transcripts', label: 'Wortlaut' },
  { key: 'appreciation', label: 'Wertschätzung' },
]

export default function CoupleRoomPage() {
  const { coupleId = '' } = useParams<{ coupleId: string }>()
  const [bereich, setBereich] = useState('overview')

  const { data: ueberblick, isError, error } = useQuery({
    queryKey: ['prof-room', coupleId],
    queryFn: () => professionalRoomApi.overview(coupleId),
    enabled: !!coupleId,
    retry: false,
  })

  if (isError) {
    return (
      <ProfessionalShell>
        <div className="mx-auto max-w-[1100px] px-6 py-8">
          <div className="card">
            <h1 className="card-title">Paarraum nicht verfügbar</h1>
            <p className="mt-2 text-sm text-brand-muted">{apiErrorMessage(error)}</p>
            <Link to="/professional" className="btn-quiet mt-4 inline-block !py-2 !px-4 !text-sm">
              Zur Übersicht
            </Link>
          </div>
        </div>
      </ProfessionalShell>
    )
  }
  if (!ueberblick) return <ProfessionalShell><div className="px-6 py-8" /></ProfessionalShell>

  const namen = ueberblick.members.map(m => m.name).join(' & ')

  return (
    <ProfessionalShell>
      <div className="mx-auto max-w-[1100px] px-6 py-8">
        <Link to="/professional" className="text-xs text-brand-muted hover:text-navy">
          ← Übersicht
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-navy">Paarraum · {namen}</h1>
        <p className="mt-1 text-sm text-brand-muted">
          Gemeinsam freigegeben seit {new Date(ueberblick.since).toLocaleDateString('de-DE')}.
          Beide Personen haben zugestimmt; jede kann die Freigabe jederzeit allein beenden.
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
          {/* ── Menü ──────────────────────────────────────────────── */}
          <nav className="order-2 space-y-1 lg:order-1">
            <MenuKnopf label="Überblick" aktiv={bereich === 'overview'} frei
              onClick={() => setBereich('overview')} />
            {BEREICHE.map(b => (
              <MenuKnopf
                key={b.key}
                label={b.label}
                aktiv={bereich === b.key}
                frei={ueberblick.elements.includes(b.key)}
                onClick={() => setBereich(b.key)}
              />
            ))}
            <div className="pt-2">
              <MenuKnopf label="Echo-Dialog" aktiv={bereich === 'echo'} frei
                onClick={() => setBereich('echo')} />
            </div>
          </nav>

          {/* ── Inhalt ────────────────────────────────────────────── */}
          <div className="order-1 lg:order-2">
            {bereich === 'overview' ? (
              <Ueberblick data={ueberblick} />
            ) : bereich === 'echo' ? (
              <EchoDialog coupleId={coupleId} />
            ) : ueberblick.elements.includes(bereich) ? (
              <Bereich coupleId={coupleId} element={bereich}
                titel={BEREICHE.find(b => b.key === bereich)!.label} />
            ) : (
              <Gesperrt titel={BEREICHE.find(b => b.key === bereich)!.label} />
            )}
          </div>
        </div>
      </div>
    </ProfessionalShell>
  )
}

function MenuKnopf({
  label, aktiv, frei, onClick,
}: { label: string; aktiv: boolean; frei: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-2 rounded-brand px-3.5 py-2 text-left text-sm transition ${
        aktiv ? 'bg-accent/10 font-medium text-accent'
        : frei ? 'text-brand-text hover:bg-brand-bg'
        : 'text-brand-muted/70 hover:bg-brand-bg'
      }`}
    >
      <span>{label}</span>
      {!frei && <span className="shrink-0 text-[0.65rem]" aria-label="nicht freigegeben">🔒</span>}
    </button>
  )
}

function Gesperrt({ titel }: { titel: string }) {
  return (
    <div className="card card-static">
      <h2 className="card-title">{titel}</h2>
      <p className="mt-2 text-sm leading-relaxed text-brand-muted">
        Dieser Bereich ist nicht freigegeben. Das Paar entscheidet gemeinsam, was hier
        sichtbar ist – und kann den Umfang jederzeit ändern. Wenn du etwas davon
        brauchst, sprich es an: Beide müssen zustimmen.
      </p>
    </div>
  )
}

function Ueberblick({ data }: { data: { members: { name: string }[]; room_since: string; since: string; catalogue: Record<string, string> } }) {
  return (
    <div className="space-y-5">
      <div className="card card-static">
        <h2 className="card-title">Was freigegeben ist</h2>
        <p className="mt-1 text-xs text-brand-muted">
          Paarraum besteht seit {new Date(data.room_since).toLocaleDateString('de-DE')}.
        </p>
        <ul className="mt-3 space-y-1.5">
          {Object.entries(data.catalogue).map(([k, text]) => (
            <li key={k} className="flex items-start gap-2 text-sm text-brand-text">
              <span className="mt-0.5 shrink-0 text-accent" aria-hidden>✓</span>{text}
            </li>
          ))}
        </ul>
      </div>

      <div className="card card-static border-l-4 border-l-navy">
        <h2 className="card-title">Was du hier nie siehst</h2>
        <p className="mt-2 text-sm leading-relaxed text-brand-muted">
          Der private Dialog jeder Person mit Echo, die Notizen nach einem Streit und die
          vertraulichen Beiträge aus der Mediation. Diese Grenze ist technisch gesetzt und
          lässt sich auch mit Zustimmung nicht öffnen – die Menschen haben dort unter der
          Zusage geschrieben, dass es niemand liest.
        </p>
      </div>
    </div>
  )
}

/** Ein freigegebener Bereich. Die Form der Daten unterscheidet sich je Element. */
function Bereich({
  coupleId, element, titel,
}: { coupleId: string; element: string; titel: string }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['prof-room-element', coupleId, element],
    queryFn: () => professionalRoomApi.element<unknown>(coupleId, element),
    retry: false,
  })

  if (isLoading) return <div className="card card-static text-sm text-brand-muted">Lade …</div>
  if (isError) {
    return (
      <div className="card card-static">
        <h2 className="card-title">{titel}</h2>
        <p className="mt-2 text-sm text-red-600">{apiErrorMessage(error)}</p>
      </div>
    )
  }

  return (
    <div className="card card-static">
      <h2 className="card-title">{titel}</h2>
      <div className="mt-4">
        <Inhalt element={element} data={data} />
      </div>
    </div>
  )
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function Inhalt({ element, data }: { element: string; data: any }) {
  const leer = <p className="text-sm text-brand-muted">Hier ist noch nichts entstanden.</p>

  if (element === 'history') {
    const b = data?.barometer ?? []
    const m = data?.moods ?? []
    if (b.length === 0 && m.length === 0) return leer
    return (
      <div className="space-y-4">
        {b.length > 0 && (
          <div>
            <p className="section-label">Barometer · Durchschnitt beider je Woche</p>
            <div className="mt-2 space-y-1">
              {b.map((w: any) => (
                <div key={w.week} className="flex items-baseline gap-3 text-sm">
                  <span className="w-24 shrink-0 tabular-nums text-brand-muted">
                    {new Date(w.week).toLocaleDateString('de-DE')}
                  </span>
                  <span className="font-semibold tabular-nums text-navy">{w.average}</span>
                  <span className="text-xs text-brand-muted">({w.readings} Werte)</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-brand-muted">
              Einzelwerte je Person werden bewusst nicht übergeben – auch die beiden sehen
              den Tagesverlauf der jeweils anderen nicht.
            </p>
          </div>
        )}
        {m.length > 0 && (
          <div>
            <p className="section-label">Stimmungen in den Check-ins</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {m.map((x: any, i: number) => (
                <span key={i} className="rounded-full bg-brand-bg px-3 py-1 text-xs text-brand-muted">
                  {new Date(x.week).toLocaleDateString('de-DE')} · {x.mood} ({x.count})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (element === 'appreciation') {
    if (!data?.total) return leer
    return (
      <div>
        <p className="text-2xl font-bold tabular-nums text-navy">{data.total}</p>
        <p className="text-sm text-brand-muted">
          Wertschätzungen insgesamt. Die Sätze selbst werden nicht übergeben.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(data.per_month ?? []).map((x: any) => (
            <span key={x.month} className="rounded-full bg-brand-bg px-3 py-1 text-xs text-brand-muted">
              {new Date(x.month).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })} · {x.count}
            </span>
          ))}
        </div>
      </div>
    )
  }

  const liste: any[] = Array.isArray(data) ? data : []
  if (liste.length === 0) return leer

  if (element === 'topics') {
    return (
      <div className="space-y-5">
        {liste.map(t => (
          <div key={t.id} className="rounded-brand border border-brand-border px-4 py-3.5">
            <p className="text-sm font-semibold text-navy">{t.title}</p>
            {t.perspectives?.length > 0 && (
              <div className="mt-2 space-y-2">
                {t.perspectives.map((p: any, i: number) => (
                  <p key={i} className="whitespace-pre-wrap text-sm text-brand-text">
                    <span className="text-xs font-semibold text-accent">Offene Sicht: </span>
                    {p.open_text}
                  </p>
                ))}
              </div>
            )}
            {t.mediations?.map((m: any, i: number) => (
              <div key={i} className="mt-3 rounded-brand bg-brand-bg px-3.5 py-2.5">
                <p className="text-xs font-semibold text-accent">Echos Vorschlag</p>
                <div className="mt-1 text-sm"><MarkdownMessage content={m.body} /></div>
              </div>
            ))}
            {t.bridges?.length > 0 && (
              <ul className="mt-3 space-y-1">
                {t.bridges.map((b: any, i: number) => (
                  <li key={i} className="text-sm text-brand-text">
                    <span className="text-xs text-brand-muted">{b.status} · </span>
                    {b.title ? `${b.title}: ` : ''}{b.body}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (element === 'transcripts') {
    return (
      <div className="space-y-5">
        {liste.map(s => (
          <details key={s.id} className="rounded-brand border border-brand-border px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-navy">
              {s.title} · {new Date(s.created_at).toLocaleDateString('de-DE')}
            </summary>
            <div className="mt-3 space-y-2">
              {(s.messages ?? []).map((m: any, i: number) => (
                <p key={i} className="whitespace-pre-wrap text-sm text-brand-text">
                  <span className={`text-xs font-semibold ${
                    m.role === 'echo' ? 'text-accent' : 'text-navy'
                  }`}>
                    {m.role === 'echo' ? 'Echo: ' : 'Person: '}
                  </span>
                  {m.content}
                </p>
              ))}
            </div>
          </details>
        ))}
      </div>
    )
  }

  if (element === 'agreements') {
    return (
      <div className="space-y-2">
        {liste.map(a => (
          <div key={a.id} className="rounded-brand border border-brand-border px-3.5 py-3">
            <p className="text-sm text-brand-text">{a.body}</p>
            <p className="mt-1 text-xs text-brand-muted">
              {a.status}
              {a.reviewed_at && ` · nachgehalten am ${new Date(a.reviewed_at).toLocaleDateString('de-DE')}`}
              {a.review_note && ` · „${a.review_note}"`}
            </p>
          </div>
        ))}
      </div>
    )
  }

  // Zusammenfassungen, Rückblicke, Testvergleiche: alle „Titel + Text".
  return (
    <div className="space-y-3">
      {liste.map((x, i) => (
        <details key={x.id ?? i} open={i === 0}
          className="rounded-brand border border-brand-border px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold text-navy">
            {x.title || x.slug ||
              (x.period_start
                ? `${new Date(x.period_start).toLocaleDateString('de-DE')} – ${new Date(x.period_end).toLocaleDateString('de-DE')}`
                : new Date(x.created_at).toLocaleDateString('de-DE'))}
          </summary>
          <div className="mt-2 text-sm text-brand-text">
            <MarkdownMessage content={x.summary_text ?? x.body ?? ''} />
          </div>
        </details>
      ))}
    </div>
  )
}


/**
 * Echo über das freigegebene Material.
 *
 * Der Verlauf lebt hier im Browser und nirgends sonst. Ein gespeicherter Dialog würde
 * altern und – schwerer wiegend – einen Widerruf überleben: Das Paar beendet die
 * Freigabe, und der Wortlaut läge weiter in der Praxis. Was die Fachperson behalten will,
 * gehört in ihre eigenen Notizen; das ist dann eine Handlung, keine Nebenwirkung.
 */
function EchoDialog({ coupleId }: { coupleId: string }) {
  const [verlauf, setVerlauf] = useState<{ role: string; content: string }[]>([])
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  const fragen = useMutation({
    mutationFn: (frage: string) =>
      professionalRoomApi.echo(coupleId, frage, verlauf),
    onMutate: (frage: string) => {
      setVerlauf(v => [...v, { role: 'user', content: frage }])
      setText('')
      return { frage }
    },
    onSuccess: antwort => {
      setVerlauf(v => [...v, { role: 'assistant', content: antwort }])
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    },
    onError: (_e, _v, ctx) => {
      setVerlauf(v => v.slice(0, -1))
      if (ctx?.frage) setText(ctx.frage)
    },
  })

  return (
    <div className="card card-static">
      <h2 className="card-title">Echo-Dialog</h2>
      <p className="mt-1 text-xs text-brand-muted">
        Echo kennt hier nur das freigegebene Material – nichts Einseitiges. Dieser Dialog
        wird nicht gespeichert; er endet mit dem Schließen der Seite.
      </p>

      {verlauf.length > 0 && (
        <div className="mt-4 space-y-3 overflow-y-auto pr-1" style={{ maxHeight: '52vh' }}>
          {verlauf.map((m, i) => (
            <div key={i} className={m.role === 'assistant'
              ? 'rounded-brand border border-accent/25 px-3.5 py-3'
              : 'rounded-brand bg-brand-bg px-3.5 py-2.5'}>
              <p className={`text-xs font-semibold ${
                m.role === 'assistant' ? 'text-accent' : 'text-navy'
              }`}>
                {m.role === 'assistant' ? 'Echo' : 'Sie'}
              </p>
              <div className="mt-1 text-sm text-brand-text">
                {m.role === 'assistant'
                  ? <MarkdownMessage content={m.content} />
                  : <p className="whitespace-pre-wrap">{m.content}</p>}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      )}

      <form
        onSubmit={e => { e.preventDefault(); if (text.trim()) fragen.mutate(text.trim()) }}
        className="mt-4"
      >
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={3}
          placeholder="Was fällt an diesem Material auf? Woran könnte man ansetzen?"
          className="input w-full resize-y !text-sm"
        />
        <button
          type="submit"
          disabled={!text.trim() || fragen.isPending}
          className="btn-primary mt-2 !py-2 !px-5 !text-sm disabled:opacity-50"
        >
          {fragen.isPending
            ? <EchoThinking text="Echo liest das Material …" size={34} />
            : 'Fragen'}
        </button>
        {fragen.isError && (
          <p className="mt-2 text-sm text-red-600">{apiErrorMessage(fragen.error)}</p>
        )}
      </form>
    </div>
  )
}
