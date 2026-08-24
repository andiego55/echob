/**
 * Ehrliches Mitteilen — eine Runde, in der niemand antwortet.
 *
 * **Warum es diese Seite gibt.** Jede andere Station im Paarraum lässt Echo dazwischen-
 * treten: moderieren, umformulieren, zusammenfassen. Das ist richtig, solange es zu heiß
 * ist, um direkt zu reden — aber es ist eine Krücke, und wer sie nie ablegt, lernt nie
 * wieder ohne sie zu gehen. Hier hält Echo nur den Rahmen und rührt den Inhalt nicht an.
 *
 * **Die eine Regel, und wie die Oberfläche sie durchsetzt.** Wer zuhört, antwortet nicht.
 * In einem Kreis muss das eine Moderatorin durchsetzen. Hier ist schlicht **kein
 * Eingabefeld da**, solange du zuhörst — das ist die einzige Stelle, an der Software das
 * besser kann als ein Mensch. Es ist keine Bitte und keine Ermahnung, es ist einfach nicht
 * da. Serverseitig hängt dieselbe Regel noch einmal (`darf_mitteilen`); ein fehlendes Feld
 * ist eine Einladung, keine Zusicherung.
 *
 * **Was hier bewusst fehlt.** Kein Weiterführen-Block, keine Zusammenfassung, keine
 * Abmachung, keine Bitte. Überall sonst habe ich Ausgänge eingebaut, damit nichts blind
 * endet — hier wäre ein Ausgang der Fehler. Die Runde endet mit „Es steht."
 */
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import CoupleShell from '@/components/couple/CoupleShell'
import MarkdownMessage from '@/components/app/MarkdownMessage'
import Fehlermeldung from '@/components/Fehlermeldung'
import Verlaufseintrag from '@/components/couple/Verlaufseintrag'
import { useBestaetigen } from '@/components/Bestaetigung'
import { coupleHonestApi } from '@/api/coupleHonest'
import type { HonestShare, HonestView } from '@/api/coupleHonest'

export default function CoupleHonestPage() {
  const { coupleId = '' } = useParams<{ coupleId: string }>()
  const qc = useQueryClient()
  const bestaetigen = useBestaetigen()
  const schluessel = ['couple-honest', coupleId]

  const { data, isLoading } = useQuery({
    queryKey: schluessel,
    queryFn: () => coupleHonestApi.get(coupleId),
    enabled: !!coupleId,
    retry: false,
    // Die andere Person schreibt, während du auf der Seite bist. Ohne Nachfragen
    // säßest du vor einem Bild von vorhin.
    refetchInterval: 15000,
  })

  /** Der Hinweis vom Stichwort-Boden – nur für die schreibende Person, nur nach dem Senden. */
  const [hinweis, setHinweis] = useState<string | null>(null)
  const uebernehmen = (d: HonestView) => {
    qc.setQueryData(schluessel, d)
    setHinweis(d.notice ?? null)
  }

  const beginnen = useMutation({
    mutationFn: () => coupleHonestApi.begin(coupleId), onSuccess: uebernehmen })
  const ankommen = useMutation({
    mutationFn: (t: string) => coupleHonestApi.arrive(coupleId, t), onSuccess: uebernehmen })
  const mitteilen = useMutation({
    mutationFn: (v: { text: string; impuls: string | null }) =>
      coupleHonestApi.share(coupleId, v.text, v.impuls), onSuccess: uebernehmen })
  const gehoert = useMutation({
    mutationFn: (id: string) => coupleHonestApi.markHeard(coupleId, id), onSuccess: uebernehmen })
  const abschliessen = useMutation({
    mutationFn: () => coupleHonestApi.close(coupleId), onSuccess: uebernehmen })

  const runde = data?.round
  const laeuft = runde?.status === 'open'
  const ankommensphase = runde?.status === 'arriving'

  return (
    <CoupleShell subtitle="Ihr sprecht miteinander. Echo hält nur den Rahmen.">
      <div className="mx-auto max-w-[780px] px-6 py-6">

        {isLoading ? (
          <p className="text-sm text-brand-muted">Wird geladen …</p>
        ) : !runde ? (
          <Einladung
            onStart={() => beginnen.mutate()}
            busy={beginnen.isPending}
            verlauf={data?.history ?? []}
            coupleId={coupleId}
            fehler={beginnen.error}
          />
        ) : (
          <>
            <Regeln />

            {ankommensphase && (
              <Ankommen
                data={data!}
                onSenden={t => ankommen.mutate(t)}
                busy={ankommen.isPending}
                fehler={ankommen.error}
              />
            )}

            {laeuft && (
              <>
                <Kreis
                  data={data!}
                  onGehoert={id => gehoert.mutate(id)}
                  busy={gehoert.isPending}
                />

                {data!.my_turn ? (
                  <Mitteilen
                    impulse={data!.impulses}
                    onSenden={(text, impuls) => mitteilen.mutate({ text, impuls })}
                    busy={mitteilen.isPending}
                    fehler={mitteilen.error}
                  />
                ) : (
                  <Warten grund={data!.blocked_reason} name={data!.partner_name} />
                )}

                <div className="mt-6 border-t border-brand-border pt-4">
                  <button
                    onClick={async () => {
                      if (await bestaetigen({
                        titel: 'Runde beenden?',
                        text: 'Es bleibt stehen, wie es ist – es wird nichts zusammengefasst '
                            + 'und nichts daraus abgeleitet. Nachlesen könnt ihr sie später.',
                        knopf: 'Es steht',
                      })) abschliessen.mutate()
                    }}
                    disabled={abschliessen.isPending}
                    className="btn-quiet !py-2 !px-5 !text-sm disabled:opacity-50"
                  >
                    Runde beenden
                  </button>
                  <Fehlermeldung error={abschliessen.error} className="mt-3" />
                </div>
              </>
            )}
          </>
        )}

        {hinweis && <Sicherheitshinweis text={hinweis} onSchliessen={() => setHinweis(null)} />}

        {runde && (data?.history.length ?? 0) > 0 && (
          <FrueherRunden verlauf={data!.history} coupleId={coupleId} />
        )}
      </div>
    </CoupleShell>
  )
}

/* ── Einstieg ──────────────────────────────────────────────────────────── */

function Einladung({
  onStart, busy, verlauf, coupleId, fehler,
}: {
  onStart: () => void; busy: boolean
  verlauf: { id: string; closed_at: string | null; share_count: number }[]
  coupleId: string
  fehler: unknown
}) {
  return (
    <>
      <div className="card card-static text-center">
        <svg viewBox="0 0 96 64" className="mx-auto h-14 text-accent" fill="none" aria-hidden>
          <circle cx="18" cy="32" r="5" fill="currentColor" />
          <g stroke="currentColor" strokeLinecap="round">
            <path d="M28.6 21.4 A 16 16 0 0 1 28.6 42.6" strokeWidth="3" />
            <path d="M37.2 12.9 A 28 28 0 0 1 37.2 51.1" strokeWidth="2.5" opacity=".5" />
          </g>
          <circle cx="78" cy="32" r="5" fill="currentColor" />
          <g stroke="currentColor" strokeLinecap="round">
            <path d="M67.4 21.4 A 16 16 0 0 0 67.4 42.6" strokeWidth="3" />
            <path d="M58.8 12.9 A 28 28 0 0 0 58.8 51.1" strokeWidth="2.5" opacity=".5" />
          </g>
        </svg>
        <h2 className="card-title-lg mt-4">Ehrliches Mitteilen</h2>
        <p className="mx-auto mt-2 max-w-[54ch] text-sm leading-relaxed text-brand-muted">
          Eine Runde, in der ihr einander sagt, wie es euch geht – und in der niemand
          antwortet. Kein Klären, kein Aushandeln, keine Bitte. Was gesagt ist, darf
          stehenbleiben.
        </p>
        <p className="mx-auto mt-3 max-w-[54ch] text-sm leading-relaxed text-brand-text">
          Überall sonst hilft Echo beim Formulieren. <strong>Hier nicht.</strong> Das ist
          der Sinn: irgendwann sollt ihr das wieder ohne Übersetzer können.
        </p>
        <button onClick={onStart} disabled={busy}
                className="btn-primary mt-6 disabled:opacity-50">
          {busy ? 'Einen Moment …' : 'Runde beginnen'}
        </button>
        <Fehlermeldung error={fehler} className="mt-3" />
      </div>

      {verlauf.length > 0 && <FrueherRunden verlauf={verlauf} coupleId={coupleId} />}
    </>
  )
}

/* ── Die Regeln, dauerhaft sichtbar ────────────────────────────────────── */

function Regeln() {
  return (
    <div className="rounded-brand border border-brand-border bg-brand-bg/60 px-4 py-3">
      <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-brand-muted">
        So läuft eine Runde
      </p>
      <ul className="mt-2 space-y-1 text-xs leading-relaxed text-brand-text">
        <li>Einer teilt mit, die andere liest – <strong>ohne zu antworten</strong>.</li>
        <li>Sprich von dir: was du wahrnimmst, fühlst, denkst. Nicht über die andere.</li>
        <li>Nichts muss geklärt werden. Es darf stehenbleiben.</li>
      </ul>
      <p className="mt-2.5 border-t border-brand-border pt-2 text-[0.68rem] text-brand-muted">
        Was du hier schreibst, geht an <strong>keine KI</strong> – es bleibt zwischen euch.
        Bei akuter Not: Telefonseelsorge 0800 111 0 111, rund um die Uhr und kostenlos.
      </p>
    </div>
  )
}

/* ── Ankommen ──────────────────────────────────────────────────────────── */

function Ankommen({
  data, onSenden, busy, fehler,
}: { data: HonestView; onSenden: (t: string) => void; busy: boolean; fehler: unknown }) {
  const [text, setText] = useState(data.arrival_own?.body ?? '')

  return (
    <div className="card mt-4">
      <h2 className="card-title">Ankommen</h2>
      <p className="mt-1 text-xs leading-relaxed text-brand-muted">
        Ein Satz, bevor es losgeht: Wie geht es dir gerade? Ihr seht es gleichzeitig –
        erst wenn ihr beide da seid.
      </p>

      {data.arrival_own ? (
        <div className="mt-3 rounded-brand border border-brand-border bg-white px-3.5 py-3">
          <p className="text-[0.65rem] text-brand-muted">Du</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-brand-text">
            {data.arrival_own.body}
          </p>
        </div>
      ) : (
        <>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={2}
            maxLength={300}
            placeholder="Zum Beispiel: Ich bin müde und ein bisschen nervös."
            className="input mt-3 w-full resize-y"
          />
          <button
            onClick={() => text.trim() && onSenden(text.trim())}
            disabled={!text.trim() || busy}
            className="btn-primary !py-2 !px-5 !text-sm mt-2 disabled:opacity-50"
          >
            {busy ? 'Einen Moment …' : 'Ankommen'}
          </button>
        </>
      )}

      <p className="mt-3 text-xs text-brand-muted">
        {data.arrival_other_done
          ? `${data.partner_name ?? 'Die andere Person'} ist da.`
          : `${data.partner_name ?? 'Die andere Person'} ist noch nicht da.`}
      </p>
      <Fehlermeldung error={fehler} className="mt-3" />
    </div>
  )
}

/* ── Der Kreis ─────────────────────────────────────────────────────────── */

function Kreis({
  data, onGehoert, busy,
}: { data: HonestView; onGehoert: (id: string) => void; busy: boolean }) {
  const ende = useRef<HTMLDivElement>(null)
  useEffect(() => { ende.current?.scrollIntoView({ behavior: 'smooth' }) }, [data.shares.length])

  return (
    <div className="mt-4 space-y-3">
      {data.arrival_other && (
        <p className="text-xs text-brand-muted">
          <span className="font-medium text-navy">{data.arrival_other.name}</span> kam an
          mit: „{data.arrival_other.body}"
        </p>
      )}

      {data.shares.map(s => (
        <Beitrag key={s.id} share={s} onGehoert={onGehoert} busy={busy} />
      ))}
      <div ref={ende} />
    </div>
  )
}

function Beitrag({
  share, onGehoert, busy,
}: { share: HonestShare; onGehoert: (id: string) => void; busy: boolean }) {
  return (
    <div className={`rounded-brand border px-4 py-3.5 ${
      share.is_own ? 'border-brand-border bg-brand-bg/50' : 'border-accent/30 bg-white'
    }`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-navy">
          {share.is_own ? 'Du' : share.name}
        </p>
        {share.impulse_label && (
          <p className="text-[0.68rem] text-brand-muted">{share.impulse_label}</p>
        )}
      </div>

      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-brand-text">
        {share.body}
      </p>

      {/* Kein Antwortfeld. Nur die Bestätigung, dass es angekommen ist – mehr ist an
          dieser Stelle nicht vorgesehen, und genau das ist die Übung. */}
      {!share.is_own && !share.heard && (
        <button
          onClick={() => onGehoert(share.id)}
          disabled={busy}
          className="btn-quiet !py-1.5 !px-4 !text-xs mt-3 disabled:opacity-50"
        >
          Ich habe es gehört
        </button>
      )}
      {!share.is_own && share.heard && (
        <p className="mt-2 text-[0.68rem] text-brand-muted">Gehört.</p>
      )}
      {share.is_own && share.heard && (
        <p className="mt-2 text-[0.68rem] text-brand-muted">Angekommen.</p>
      )}
    </div>
  )
}

/* ── Mitteilen ─────────────────────────────────────────────────────────── */

function Mitteilen({
  impulse, onSenden, busy, fehler,
}: {
  impulse: Record<string, string>
  onSenden: (text: string, impuls: string | null) => void
  busy: boolean
  fehler: unknown
}) {
  const [text, setText] = useState('')
  const [gewaehlt, setGewaehlt] = useState<string | null>(null)

  return (
    <div className="card mt-5">
      <h2 className="card-title">Du bist dran</h2>
      <p className="mt-1 text-xs leading-relaxed text-brand-muted">
        Sprich von dir. Es muss nicht gut formuliert sein und es muss zu nichts führen.
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {Object.entries(impulse).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setGewaehlt(g => (g === k ? null : k))}
            className={`rounded-full border px-2.5 py-1.5 text-[0.7rem] transition sm:px-3 sm:text-xs ${
              gewaehlt === k
                ? 'border-accent bg-accent/10 font-medium text-accent'
                : 'border-brand-border text-brand-muted hover:border-accent/40'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[0.68rem] text-brand-muted">
        Ein Impuls ist ein Angebot, kein Pflichtfeld – frei schreiben ist genauso richtig.
      </p>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={5}
        maxLength={1500}
        placeholder={gewaehlt ? impulse[gewaehlt] : 'Was möchtest du mitteilen?'}
        className="input mt-3 w-full resize-y"
      />
      <button
        onClick={() => { if (text.trim()) { onSenden(text.trim(), gewaehlt); setText(''); setGewaehlt(null) } }}
        disabled={!text.trim() || busy}
        className="btn-primary !py-2 !px-5 !text-sm mt-2 disabled:opacity-50"
      >
        {busy ? 'Einen Moment …' : 'Mitteilen'}
      </button>
      <Fehlermeldung error={fehler} className="mt-3" />
    </div>
  )
}

/* ── Warten ────────────────────────────────────────────────────────────── */

function Warten({ grund, name }: { grund: string | null; name: string | null }) {
  // Ein fehlendes Eingabefeld ohne Begründung liest sich als Fehler. Also steht hier,
  // warum es fehlt – und dass das Absicht ist.
  const text = grund === 'gehoert'
    ? 'Lies erst in Ruhe, was oben steht. Wenn du es gehört hast, bist du dran.'
    : `Jetzt ist ${name ?? 'die andere Person'} dran. Du bekommst hier keine Antwortmöglichkeit `
      + '– das ist der Sinn der Übung.'

  return (
    <div className="mt-5 rounded-brand border border-dashed border-brand-border px-4 py-4 text-center">
      <p className="text-sm text-brand-muted">{text}</p>
    </div>
  )
}

/* ── Sicherheitshinweis ────────────────────────────────────────────────── */

function Sicherheitshinweis({ text, onSchliessen }: { text: string; onSchliessen: () => void }) {
  return (
    <div className="mt-4 rounded-2xl border border-red-300 bg-red-50/70 px-4 py-3.5">
      <p className="mb-2 flex items-center gap-2 text-[0.8rem] font-bold text-red-700">
        <span aria-hidden="true">🆘</span> Sicherheit zuerst – Hilfe ist erreichbar
      </p>
      <div className="text-sm text-brand-text"><MarkdownMessage content={text} /></div>
      <p className="mt-2 text-[0.68rem] text-brand-muted">
        Das sieht nur du. Deine Mitteilung ist trotzdem abgeschickt.
      </p>
      <button onClick={onSchliessen}
              className="mt-2 text-xs text-brand-muted hover:text-navy">
        Verstanden
      </button>
    </div>
  )
}

/* ── Frühere Runden ────────────────────────────────────────────────────── */

function FrueherRunden({
  verlauf, coupleId,
}: {
  verlauf: { id: string; closed_at: string | null; share_count: number }[]
  coupleId: string
}) {
  return (
    <div className="card card-quiet mt-6">
      <h2 className="card-title-sm">Frühere Runden</h2>
      <p className="mt-1 text-xs text-brand-muted">
        Zum Nachlesen. Es steht nichts darin, was jemand ausgewertet hätte.
      </p>
      <div className="mt-3 space-y-2.5">
        {verlauf.map((r, i) => (
          <Verlaufseintrag
            key={r.id}
            aktuell={i === 0}
            titel={`${r.closed_at ? new Date(r.closed_at).toLocaleDateString('de-DE') : '–'} · ${r.share_count} Beiträge`}
          >
            <RundeNachlesen coupleId={coupleId} roundId={r.id} />
          </Verlaufseintrag>
        ))}
      </div>
    </div>
  )
}

function RundeNachlesen({ coupleId, roundId }: { coupleId: string; roundId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['couple-honest-round', roundId],
    queryFn: () => coupleHonestApi.readRound(coupleId, roundId),
    retry: false,
  })
  if (isLoading) return <p className="text-xs text-brand-muted">Wird geladen …</p>
  if (!data) return null
  return (
    <div className="space-y-2.5">
      {data.shares.map(s => (
        <div key={s.id}>
          <p className="text-[0.68rem] font-medium text-brand-muted">
            {s.is_own ? 'Du' : s.name}{s.impulse_label ? ` · ${s.impulse_label}` : ''}
          </p>
          <p className="mt-0.5 whitespace-pre-wrap text-sm text-brand-text">{s.body}</p>
        </div>
      ))}
    </div>
  )
}
