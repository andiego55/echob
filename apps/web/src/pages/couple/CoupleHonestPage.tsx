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
 * **Warum hier so viel erklärt wird.** Eine Regel, deren Grund man nicht kennt, liest sich
 * als Gängelung — „warum darf ich nicht antworten?" ist die naheliegendste Reaktion, und
 * wer sie sich stellt, hört auf. Deshalb steht neben jeder Regel ihr Grund und neben jeder
 * Frage eine Schreibhilfe. Die Erklärung ist nicht Beiwerk, sie ist die halbe Methode.
 *
 * **Was hier bewusst fehlt.** Kein Weiterführen-Block, keine Zusammenfassung, keine
 * Abmachung, keine Bitte. Überall sonst habe ich Ausgänge eingebaut, damit nichts blind
 * endet — hier wäre ein Ausgang der Fehler. Die Runde endet mit „Es steht." Was danach
 * kommt, steht im Abschluss: sich das Geschriebene beim nächsten Mal laut vorlesen. Der
 * eigentliche Schritt passiert nicht in der App.
 */
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import CoupleShell from '@/components/couple/CoupleShell'
import MarkdownMessage from '@/components/app/MarkdownMessage'
import Fehlermeldung from '@/components/Fehlermeldung'
import Verlaufseintrag from '@/components/couple/Verlaufseintrag'
import Vorlesen from '@/components/couple/Vorlesen'
import { useBestaetigen } from '@/components/Bestaetigung'
import { coupleHonestApi } from '@/api/coupleHonest'
import type { HonestShare, HonestView } from '@/api/coupleHonest'

/** Beim ersten Mal steht die Erklärung offen, danach zusammengeklappt. */
const GESEHEN = 'echob.mitteilen.erklaert'

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

  /** Was gerade abgeschlossen wurde – für den Abschluss festgehalten, denn danach ist
   *  die Runde aus der laufenden Sicht verschwunden. */
  const [abschluss, setAbschluss] = useState<
    { beitraege: number; nummer: number; id: string } | null>(null)

  /** Welche abgeschlossene Runde gerade vorgelesen wird. Der Modus liegt über
   *  allem: keine Navigation, kein Menü, kein Echo – nur der Satz auf dem Tisch. */
  const [vorlesen, setVorlesen] = useState<string | null>(null)

  const beginnen = useMutation({
    mutationFn: () => coupleHonestApi.begin(coupleId), onSuccess: uebernehmen })
  const ankommen = useMutation({
    mutationFn: (t: string) => coupleHonestApi.arrive(coupleId, t), onSuccess: uebernehmen })
  const mitteilen = useMutation({
    mutationFn: (v: { text: string; impuls: string | null }) =>
      coupleHonestApi.share(coupleId, v.text, v.impuls), onSuccess: uebernehmen })
  const gehoert = useMutation({
    mutationFn: (v: { id: string; art: string }) =>
      coupleHonestApi.markHeard(coupleId, v.id, v.art), onSuccess: uebernehmen })
  const abschliessen = useMutation({
    mutationFn: () => coupleHonestApi.close(coupleId), onSuccess: uebernehmen })

  const runde = data?.round
  const laeuft = runde?.status === 'open'
  const ankommensphase = runde?.status === 'arriving'

  const rundeBeenden = async () => {
    if (!data?.round) return
    const ok = await bestaetigen({
      titel: 'Runde beenden?',
      text: 'Es bleibt stehen, wie es ist – es wird nichts zusammengefasst und nichts '
          + 'daraus abgeleitet. Nachlesen könnt ihr sie später jederzeit.',
      knopf: 'Es steht',
    })
    if (!ok) return
    setAbschluss({
      beitraege: data.shares.length,
      nummer: data.round_number,
      id: data.round.id,
    })
    abschliessen.mutate()
  }

  return (
    <CoupleShell subtitle="Ihr sprecht miteinander. Echo hält nur den Rahmen.">
      <div className="mx-auto max-w-[780px] px-6 py-6">

        {isLoading ? (
          <p className="text-sm text-brand-muted">Wird geladen …</p>
        ) : !runde && abschluss ? (
          <Abschluss
            {...abschluss}
            coupleId={coupleId}
            onVorlesen={() => setVorlesen(abschluss.id)}
            onNeu={() => { setAbschluss(null); beginnen.mutate() }}
            busy={beginnen.isPending}
          />
        ) : !runde ? (
          <Einladung
            onStart={() => beginnen.mutate()}
            busy={beginnen.isPending}
            nummer={data?.round_number ?? 1}
            verlauf={data?.history ?? []}
            coupleId={coupleId}
            onVorlesen={setVorlesen}
            fehler={beginnen.error}
          />
        ) : (
          <>
            <Rahmen nummer={data!.round_number} />

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
                  onGehoert={(id, art) => gehoert.mutate({ id, art })}
                  busy={gehoert.isPending}
                />

                {data!.my_turn ? (
                  <Mitteilen
                    impulse={data!.impulses}
                    erster={data!.shares.length === 0}
                    onSenden={(text, impuls) => mitteilen.mutate({ text, impuls })}
                    busy={mitteilen.isPending}
                    fehler={mitteilen.error}
                  />
                ) : (
                  <Warten grund={data!.blocked_reason} name={data!.partner_name} />
                )}

                <div className="mt-6 border-t border-brand-border pt-4">
                  <button
                    onClick={rundeBeenden}
                    disabled={abschliessen.isPending}
                    className="btn-quiet !py-2 !px-5 !text-sm disabled:opacity-50"
                  >
                    Runde beenden
                  </button>
                  <span className="ml-3 text-xs text-brand-muted">
                    Wann ihr wollt. Es muss zu nichts gekommen sein.
                  </span>
                  <Fehlermeldung error={abschliessen.error} className="mt-3" />
                </div>
              </>
            )}
          </>
        )}

        {hinweis && <Sicherheitshinweis text={hinweis} onSchliessen={() => setHinweis(null)} />}

        {runde && (data?.history.length ?? 0) > 0 && (
          <FrueherRunden verlauf={data!.history} coupleId={coupleId}
                         onVorlesen={setVorlesen} />
        )}

        {vorlesen && (
          <VorlesenLader coupleId={coupleId} roundId={vorlesen}
                         onEnde={() => setVorlesen(null)} />
        )}
      </div>
    </CoupleShell>
  )
}

/* ── Einstieg ──────────────────────────────────────────────────────────── */

function Einladung({
  onStart, busy, nummer, verlauf, coupleId, onVorlesen, fehler,
}: {
  onStart: () => void; busy: boolean; nummer: number
  verlauf: { id: string; closed_at: string | null; share_count: number }[]
  coupleId: string
  onVorlesen: (id: string) => void
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

        <Ablauf />

        <button onClick={onStart} disabled={busy}
                className="btn-primary mt-6 disabled:opacity-50">
          {busy ? 'Einen Moment …' : nummer > 1 ? `${nummer}. Runde beginnen` : 'Runde beginnen'}
        </button>
        <p className="mt-2 text-xs text-brand-muted">
          Dauert so lange, wie ihr wollt. Ihr müsst nicht gleichzeitig da sein.
        </p>
        <Fehlermeldung error={fehler} className="mt-3" />
      </div>

      {verlauf.length > 0 && (
        <FrueherRunden verlauf={verlauf} coupleId={coupleId} onVorlesen={onVorlesen} />
      )}
    </>
  )
}

/** Was gleich passiert. Ohne das startet man in etwas hinein, dessen Regeln man erst
 *  merkt, wenn man an sie stößt – und eine Regel, gegen die man gerade gelaufen ist,
 *  liest sich als Fehler der Software. */
function Ablauf() {
  const schritte: [string, string][] = [
    ['Ankommen', 'Ein Satz, wie es euch gerade geht. Ihr seht beide gleichzeitig – so richtet '
      + 'sich keiner am anderen aus.'],
    ['Mitteilen', 'Einer sagt etwas von sich. Fragen zum Anfangen stehen bereit, ihr müsst '
      + 'sie nicht nehmen.'],
    ['Hören', 'Die andere liest und sagt, wie es angekommen ist. Antworten geht nicht – es '
      + 'gibt kein Feld dafür.'],
    ['Es steht', 'Ihr hört auf, wann ihr wollt. Kein Ergebnis, keine Abmachung, keine Aufgabe.'],
  ]
  return (
    <ol className="mx-auto mt-6 max-w-[52ch] space-y-2.5 text-left">
      {schritte.map(([titel, text], i) => (
        <li key={titel} className="flex gap-3">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[0.65rem] font-semibold text-accent">
            {i + 1}
          </span>
          <p className="text-xs leading-relaxed text-brand-muted">
            <span className="font-semibold text-navy">{titel}.</span> {text}
          </p>
        </li>
      ))}
    </ol>
  )
}

/* ── Der Rahmen: Regeln mit ihren Gründen ──────────────────────────────── */

function Rahmen({ nummer }: { nummer: number }) {
  // Beim ersten Mal offen. Wer die Methode kennt, klappt sie zu und sie bleibt zu.
  const [offen, setOffen] = useState(
    () => typeof window === 'undefined' || !window.localStorage.getItem(GESEHEN))

  const umschalten = () => {
    if (offen && typeof window !== 'undefined') window.localStorage.setItem(GESEHEN, '1')
    setOffen(o => !o)
  }

  return (
    <div className="rounded-brand border border-brand-border bg-brand-bg/60 px-4 py-3">
      <button
        onClick={umschalten}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={offen}
      >
        <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-brand-muted">
          Worum es geht{nummer > 1 ? ` · ${nummer}. Runde` : ''}
        </span>
        <span className="shrink-0 text-xs text-brand-muted">
          {offen ? 'Zuklappen' : 'Aufklappen'}
        </span>
      </button>

      {offen && (
        <div className="mt-3 space-y-3 border-t border-brand-border pt-3">
          {/* Jede Regel mit ihrem Grund. Eine Regel ohne Grund liest sich als Gängelung –
              und wer sich fragt „warum darf ich nicht antworten?", hört auf. */}
          <Regel titel="Wer zuhört, antwortet nicht.">
            Das klingt hart und ist doch das Geschenk. Wenn du weißt, dass gleich eine
            Antwort kommt, formulierst du schon beim Schreiben mit halbem Ohr auf die
            Verteidigung. Fällt die Antwort weg, kannst du zum ersten Mal seit Langem
            einfach sagen, wie es ist.
          </Regel>
          <Regel titel="Sprich von dir.">
            „Du hörst mir nie zu" ist ein Vorwurf – und Vorwürfe werden beantwortet, nicht
            gehört. „Ich fühle mich allein, wenn ich rede und nichts zurückkommt" ist
            dasselbe Erleben. Nur kommt es an.
          </Regel>
          <Regel titel="Nichts muss geklärt werden.">
            Der Druck, am Ende eine Lösung zu haben, ist der Grund, warum das Wahre oft
            ungesagt bleibt. Hier gibt es keine Lösung, keine Abmachung, keine Bitte.
          </Regel>
          <Regel titel="Und warum Echo hier schweigt.">
            Überall sonst hilft Echo beim Formulieren, Sortieren, Übersetzen. Hier nicht:
            Was ihr euch sagt, geht an keine KI. Der Sinn der Übung ist, dass ihr das
            irgendwann wieder ohne Übersetzer könnt – und das übt man nur, indem man es tut.
          </Regel>
        </div>
      )}

      {/* Bleibt sichtbar, auch zugeklappt: Weil Echo den Text nicht liest, läuft die
          Krisen-Erkennung hier nur auf dem Stichwort-Boden. Was der nicht erkennt, erkennt
          niemand – deshalb steht der Hinweis dauerhaft und nicht erst bei einem Treffer. */}
      <p className="mt-2.5 border-t border-brand-border pt-2 text-[0.68rem] leading-relaxed text-brand-muted">
        Was du hier schreibst, geht an <strong>keine KI</strong> – es bleibt zwischen euch.
        Bei akuter Not: Telefonseelsorge 0800 111 0 111, rund um die Uhr und kostenlos.
      </p>
    </div>
  )
}

function Regel({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-navy">{titel}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-brand-muted">{children}</p>
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
        Ein Satz, bevor es losgeht: Wie geht es dir gerade? Ihr seht beide Sätze
        gleichzeitig – erst wenn ihr beide da seid. So richtet keiner sein „mir geht es …"
        an dem der anderen aus.
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

      <p className="mt-3 text-xs leading-relaxed text-brand-muted">
        {data.arrival_other_done
          ? `${data.partner_name ?? 'Die andere Person'} ist da.`
          : `${data.partner_name ?? 'Die andere Person'} ist noch nicht da. Ihr müsst nicht `
            + 'gleichzeitig hier sein – es geht weiter, sobald beide angekommen sind.'}
      </p>
      <Fehlermeldung error={fehler} className="mt-3" />
    </div>
  )
}

/* ── Der Kreis ─────────────────────────────────────────────────────────── */

function Kreis({
  data, onGehoert, busy,
}: { data: HonestView; onGehoert: (id: string, art: string) => void; busy: boolean }) {
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
        <Beitrag key={s.id} share={s} quittungen={data.acknowledgements}
                 onGehoert={onGehoert} busy={busy} />
      ))}
      <div ref={ende} />
    </div>
  )
}

function Beitrag({
  share, quittungen, onGehoert, busy,
}: {
  share: HonestShare
  quittungen: Record<string, string>
  onGehoert: (id: string, art: string) => void
  busy: boolean
}) {
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

      {/* Kein Antwortfeld – nur die Quittung, und die ist eine GESCHLOSSENE Auswahl.
          Freitext würde daraus sofort wieder ein Gespräch machen. Alle drei sind Aussagen
          über das eigene Erleben, nie über die andere Person. */}
      {!share.is_own && !share.heard && (
        <div className="mt-3 border-t border-brand-border pt-3">
          <p className="text-[0.68rem] leading-relaxed text-brand-muted">
            Lies es in Ruhe. Wenn es angekommen ist, sag es – dann bist du dran.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(quittungen).map(([k, label]) => (
              <button
                key={k}
                onClick={() => onGehoert(share.id, k)}
                disabled={busy}
                className="rounded-full border border-brand-border px-3 py-1.5 text-[0.7rem] text-brand-text transition hover:border-accent/50 hover:text-accent disabled:opacity-50"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {share.heard && (
        <p className="mt-2.5 border-t border-brand-border pt-2 text-[0.68rem] text-brand-muted">
          {share.is_own
            ? share.heard_as_label ? `Angekommen: „${share.heard_as_label}"` : 'Angekommen.'
            : share.heard_as_label ?? 'Gehört.'}
        </p>
      )}
    </div>
  )
}

/* ── Mitteilen ─────────────────────────────────────────────────────────── */

function Mitteilen({
  impulse, erster, onSenden, busy, fehler,
}: {
  impulse: Record<string, { label: string; hint: string }>
  erster: boolean
  onSenden: (text: string, impuls: string | null) => void
  busy: boolean
  fehler: unknown
}) {
  const [text, setText] = useState('')
  const [gewaehlt, setGewaehlt] = useState<string | null>(null)
  const hilfe = gewaehlt ? impulse[gewaehlt] : null

  return (
    <div className="card mt-5">
      <h2 className="card-title">Du bist dran</h2>
      <p className="mt-1 text-xs leading-relaxed text-brand-muted">
        {erster
          ? 'Fang irgendwo an. Es muss nicht das Wichtigste sein und nicht gut formuliert – '
            + 'es muss nur von dir handeln.'
          : 'Sprich von dir. Es muss nicht auf das Vorherige eingehen und zu nichts führen.'}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {Object.entries(impulse).map(([k, i]) => (
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
            {i.label}
          </button>
        ))}
      </div>

      {/* Die Schreibhilfe ist der Unterschied zwischen einer Frageliste und einer Übung:
          Sie sagt, woran man die ehrliche Fassung erkennt. */}
      {hilfe ? (
        <p className="mt-2 rounded-brand border border-accent/25 bg-accent/5 px-3 py-2 text-[0.7rem] leading-relaxed text-brand-text">
          {hilfe.hint}
        </p>
      ) : (
        <p className="mt-1.5 text-[0.68rem] leading-relaxed text-brand-muted">
          Eine Frage ist ein Angebot, kein Pflichtfeld – frei schreiben ist genauso richtig.
        </p>
      )}

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={5}
        maxLength={1500}
        placeholder={hilfe ? hilfe.label : 'Was möchtest du mitteilen?'}
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
    ? 'Lies erst in Ruhe, was oben steht. Sobald du sagst, dass es angekommen ist, bist du dran.'
    : `Jetzt ist ${name ?? 'die andere Person'} dran. Hier gibt es bewusst kein Antwortfeld – `
      + 'wenn dir gerade etwas kommt, halt es fest, bis du wieder an der Reihe bist.'

  return (
    <div className="mt-5 rounded-brand border border-dashed border-brand-border px-4 py-4 text-center">
      <p className="mx-auto max-w-[48ch] text-sm leading-relaxed text-brand-muted">{text}</p>
    </div>
  )
}

/* ── Abschluss ─────────────────────────────────────────────────────────── */

/**
 * Was nach „Es steht" kommt — und warum überhaupt etwas kommt.
 *
 * Ein Ergebnis wäre hier der Fehler: Zusammenfassung, Abmachung oder Bitte würden genau
 * den Druck zurückholen, den die Methode wegnimmt. Aber gar nichts zu zeigen war auch
 * falsch — wer eben etwas Schweres ausgesprochen hat, landete wieder auf der Startkarte,
 * als wäre nichts gewesen.
 *
 * Also: benennen, was geschehen ist, ohne es zu bewerten — und auf den nächsten Schritt
 * zeigen, der nicht in der App liegt. Sich das Geschriebene laut vorzulesen ist das
 * eigentliche Ziel; die App war nur das Übungsgeländer.
 */
function Abschluss({
  beitraege, nummer, id, coupleId, onNeu, onVorlesen, busy,
}: {
  beitraege: number; nummer: number; id: string
  coupleId: string; onNeu: () => void; onVorlesen: () => void; busy: boolean
}) {
  const [nachlesen, setNachlesen] = useState(false)

  return (
    <div className="card card-static">
      <div className="text-center">
        <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-brand-muted">
          {nummer}. Runde
        </p>
        <h2 className="card-title-lg mt-1">Es steht.</h2>
        <p className="mx-auto mt-2 max-w-[52ch] text-sm leading-relaxed text-brand-muted">
          {beitraege === 0
            ? 'Ihr habt diesmal nichts gesagt. Auch das ist eine Runde.'
            : `Ihr habt euch ${beitraege === 1 ? 'eine Sache' : `${beitraege} Dinge`} gesagt, `
              + 'ohne eine davon zu verhandeln. Es muss jetzt nichts damit passieren.'}
        </p>
      </div>

      <div className="mt-5 rounded-brand border border-accent/25 bg-accent/5 px-4 py-3.5">
        <p className="text-xs font-semibold text-navy">
          Der nächste Schritt liegt nicht in der App.
        </p>
        <p className="mt-1 text-xs leading-relaxed text-brand-text">
          Wenn ihr euch das nächste Mal seht: Lest euch vor, was ihr geschrieben habt. Laut,
          nacheinander, ohne zu antworten. Genau so wie hier, nur ohne Bildschirm dazwischen.
          Darauf läuft die Übung hinaus – irgendwann sagt ihr es einander direkt, und dieser
          Raum wird überflüssig.
        </p>
        {beitraege > 0 && (
          <button onClick={onVorlesen}
                  className="mt-3 rounded-full bg-navy px-5 py-2 text-xs font-medium text-white transition hover:bg-navy/90">
            Jetzt vorlesen
          </button>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button onClick={onNeu} disabled={busy}
                className="btn-primary !py-2 !px-5 !text-sm disabled:opacity-50">
          {busy ? 'Einen Moment …' : 'Neue Runde beginnen'}
        </button>
        {beitraege > 0 && (
          <button onClick={() => setNachlesen(n => !n)}
                  className="text-xs text-brand-muted underline hover:text-navy">
            {nachlesen ? 'Zuklappen' : 'Runde nachlesen'}
          </button>
        )}
      </div>

      {nachlesen && (
        <div className="mt-4 border-t border-brand-border pt-4">
          <RundeNachlesen coupleId={coupleId} roundId={id} />
        </div>
      )}
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
        Das siehst nur du. Deine Mitteilung ist trotzdem abgeschickt.
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
  verlauf, coupleId, onVorlesen,
}: {
  verlauf: { id: string; closed_at: string | null; share_count: number }[]
  coupleId: string
  onVorlesen: (id: string) => void
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
            {r.share_count > 0 && (
              <button onClick={() => onVorlesen(r.id)}
                      className="mb-3 rounded-full border border-brand-border px-3.5 py-1.5 text-[0.7rem] text-brand-text transition hover:border-accent/50 hover:text-accent">
                Vorlesen
              </button>
            )}
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


/**
 * Lädt eine abgeschlossene Runde und übergibt sie dem Vorlese-Modus.
 *
 * Bewusst derselbe Abfrage-Schlüssel wie beim Nachlesen: Wer eine Runde aufgeklappt hat
 * und dann vorliest, holt sie nicht zweimal.
 */
function VorlesenLader({
  coupleId, roundId, onEnde,
}: { coupleId: string; roundId: string; onEnde: () => void }) {
  const { data } = useQuery({
    queryKey: ['couple-honest-round', roundId],
    queryFn: () => coupleHonestApi.readRound(coupleId, roundId),
    retry: false,
  })
  if (!data) return null
  return (
    <Vorlesen
      onEnde={onEnde}
      beitraege={data.shares.map(b => ({
        id: b.id,
        // Auf einem Gerät zwischen zwei Menschen wäre „Du" mehrdeutig – hier steht
        // immer der Name, auch am eigenen Beitrag.
        name: b.name,
        impulse_label: b.impulse_label,
        body: b.body,
      }))}
    />
  )
}
