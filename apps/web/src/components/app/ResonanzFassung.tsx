/**
 * „Deine Fassung" — der Weg von einer wiedererkannten Szene zur eigenen.
 *
 * **Warum es diese Stufe gibt.** Vorher wurde aus einer Reaktion plus drei Sätzen mit zwei
 * Klicks eine Fall-Szene. Zu wenig für das, was eine Szene hier ist: die präzise
 * Beschreibung eines Ereignisses, die in die Musterberechnung geht, in Berichte, und
 * womöglich einer Fachperson vorgelegt wird.
 *
 * Schlimmer als die Ungenauigkeit ist ihre **Richtung**. Wer eine erfundene Geschichte
 * liest und direkt danach die eigene aufschreibt, übernimmt ihre Einzelheiten — den Ort,
 * die Nebenfiguren, den Anlass. Die Erinnerung formt sich nach dem Text, den man gerade
 * gelesen hat. Eine geliehene Szene ist schlechter als keine, weil sie sich hinterher
 * nicht mehr von einer erlebten unterscheiden lässt.
 *
 * **Die Trennung ist deshalb keine Reibung, die man klein hält — sie ist der Inhalt.**
 * Drei Dinge tun sie:
 *
 * 1. *Dieselben Fragen wie sonst.* Die geführten Fragen stehen wortgleich in der normalen
 *    Szenenerfassung. Eine so entstandene Szene soll von einer direkt geschriebenen nicht
 *    zu unterscheiden sein — sonst gäbe es zwei Sorten Szenen, und die schlechtere käme
 *    aus dem bequemeren Weg.
 * 2. *Eine Frage, die es nur hier gibt.* „Was ist bei dir anders als in der Geschichte?"
 *    lässt sich nur aus der eigenen Erinnerung beantworten. Sie macht aus der Vorlage eine
 *    Kontrastfolie. Sie steht am Ende, nicht am Anfang: Wer zuerst gefragt wird, was
 *    anders ist, denkt beim Schreiben die ganze Zeit an die Geschichte.
 * 3. *Der erste Gedanke wird vorgelegt, nicht übernommen.* Was direkt nach dem Lesen
 *    notiert wurde, entstand unter dem stärksten Eindruck der Geschichte. Es steht hier
 *    als etwas zu Prüfendes.
 *
 * **Echo schreibt hier nichts.** Es liest beides nebeneinander und fragt nach — vor allem
 * dort, wo etwas aus der Geschichte hereingerutscht ist. Das ist die eine Sache, die an
 * dieser Stelle nur ein Modell kann: Der Mensch selbst bemerkt es kaum, und ein Mensch,
 * der ihm zuhört, kennt die Geschichte nicht.
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  resonanzApi,
  type Nachfrage,
  type ResonanzEintrag,
  type ResonanzFrage,
} from '@/api/resonanz'

const ART_LABEL: Record<string, string> = {
  geliehen: 'Kommt das aus der Geschichte?',
  unschaerfe: 'Noch unscharf',
  deutung: 'Deutung statt Ereignis',
  eigene_bewegung: 'Was hast du getan?',
}

function EchoFrage({ nachfrage }: { nachfrage: Nachfrage }) {
  const label = nachfrage.art ? ART_LABEL[nachfrage.art] : undefined
  return (
    <div className="mt-2 rounded-brand border-l-2 border-accent bg-accent/[0.05] py-2 pl-3.5 pr-3">
      {label && (
        <p className="text-[0.66rem] font-bold uppercase tracking-wide text-accent/80">
          {label}
        </p>
      )}
      <p className="mt-0.5 text-[0.86rem] leading-relaxed text-brand-text">{nachfrage.frage}</p>
    </div>
  )
}

function Feld({
  frage, wert, nachfrage, onChange, onBlur, zeilen,
}: {
  frage: ResonanzFrage
  wert: string
  nachfrage?: Nachfrage
  onChange: (v: string) => void
  onBlur: () => void
  zeilen: number
}) {
  return (
    <div>
      <label htmlFor={`f-${frage.key}`} className="text-[0.9rem] font-medium text-navy">
        {frage.label}
      </label>
      {frage.hinweis && (
        <p className="mt-0.5 text-[0.78rem] leading-snug text-brand-muted">{frage.hinweis}</p>
      )}
      <textarea
        id={`f-${frage.key}`}
        value={wert}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        rows={zeilen}
        maxLength={4000}
        className={[
          'mt-1.5 w-full rounded-brand border bg-white px-3.5 py-2.5 text-[0.92rem] leading-relaxed text-brand-text focus:outline-none',
          nachfrage ? 'border-accent/60' : 'border-brand-border focus:border-accent',
        ].join(' ')}
      />
      {nachfrage && <EchoFrage nachfrage={nachfrage} />}
    </div>
  )
}

export default function ResonanzFassung({
  eintrag, fragen, onSchliessen, onUebernommen,
}: {
  eintrag: ResonanzEintrag
  fragen: ResonanzFrage[]
  onSchliessen: () => void
  onUebernommen: (szeneNr: number) => void
}) {
  const qc = useQueryClient()
  const [werte, setWerte] = useState<Record<string, string>>(() => ({ ...eintrag.ausarbeitung }))
  const [nachfragen, setNachfragen] = useState<Nachfrage[]>([])
  // Aufgeklappt starten, wenn dort schon etwas steht oder Echo dorthin gefragt hat -
  // sonst waere die eigene Antwort hinter einem zugeklappten Knopf verschwunden.
  const [mehr, setMehr] = useState(
    () => Object.keys(eintrag.ausarbeitung).some(
      k => !['what', 'anders', 'titel', 'wann', 'ort'].includes(k)),
  )
  const [echoHinweis, setEchoHinweis] = useState<string | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const gesichert = useRef<Record<string, string>>({ ...eintrag.ausarbeitung })

  // Der Server sagt, was noch fehlt — nicht diese Datei. Stünde die Regel zweimal, liefen
  // beide auseinander: Der Knopf wäre aktiv und der Endpunkt antwortete 422.
  const [fehltNoch, setFehltNoch] = useState<string[]>(eintrag.fehlt_noch)

  const speichern = useMutation({
    mutationFn: (daten: Record<string, string>) =>
      resonanzApi.fassungSpeichern(eintrag.scene_slug, daten),
    onSuccess: (frisch) => {
      gesichert.current = { ...frisch.ausarbeitung }
      setFehltNoch(frisch.fehlt_noch)
      setFehler(null)
      qc.invalidateQueries({ queryKey: ['resonanz-ueberblick'] })
    },
    onError: () => setFehler('Konnte nicht gespeichert werden. Versuch es gleich noch einmal.'),
  })

  const fragenLassen = useMutation({
    mutationFn: () => resonanzApi.nachfragen(eintrag.scene_slug),
    onSuccess: (a) => {
      setNachfragen(a.fragen)
      setEchoHinweis(a.hinweis ?? null)
      setFehler(null)
      // Eine Rueckfrage zu einem eingeklappten Feld waere unsichtbar - Echo haette
      // gefragt und niemand saehe es.
      if (a.fragen.some(f => !['what', 'anders', 'titel', 'wann', 'ort'].includes(f.feld))) {
        setMehr(true)
      }
    },
    onError: () => setFehler('Echo antwortet gerade nicht. Deine Fassung ist gespeichert.'),
  })

  const uebernehmen = useMutation({
    mutationFn: () => resonanzApi.zuSzeneMachen(eintrag.scene_slug),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['resonanz-ueberblick'] })
      onUebernommen(d.scene_no)
    },
    onError: (e: unknown) => {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setFehler(detail ?? 'Das hat gerade nicht geklappt.')
    },
  })

  // Beim Verlassen eines Feldes sichern. Ein Formular, das nur auf Knopfdruck speichert,
  // verliert genau dann etwas, wenn jemand mitten im Aufschreiben eines belastenden
  // Ereignisses weggeht — und das passiert hier häufiger als anderswo.
  function feldFertig() {
    const geaendert = Object.keys({ ...werte, ...gesichert.current })
      .some(k => (werte[k] ?? '') !== (gesichert.current[k] ?? ''))
    if (geaendert && !speichern.isPending) speichern.mutate(werte)
  }

  // Vor dem Nachfragen erst sichern: Echo liest, was auf dem Server steht.
  async function nachfragenLassen() {
    feldFertig()
    await new Promise(r => setTimeout(r, 150))
    fragenLassen.mutate()
  }

  useEffect(() => {
    const zu = (e: KeyboardEvent) => { if (e.key === 'Escape') onSchliessen() }
    document.addEventListener('keydown', zu)
    return () => document.removeEventListener('keydown', zu)
  }, [onSchliessen])

  const frageZuFeld = (key: string) => nachfragen.find(n => n.feld === key)
  const bereit = fehltNoch.length === 0

  // Abgeleitet, nicht fest verdrahtet: Welche Fragen es gibt und welche Pflicht sind, sagt
  // der Server. Eine feste Liste hier waere die zweite Stelle, an der dieselbe Ordnung
  // steht - und die, die beim naechsten Wortlaut-Wechsel vergessen wird.
  const ereignis = fragen.find(f => f.key === 'what')
  const vergleich = fragen.find(f => f.key === 'anders')
  const weitere = fragen.filter(f => f.key !== 'what' && f.key !== 'anders')
  const weitereBeantwortet = weitere.filter(f => (werte[f.key] ?? '').trim()).length

  return (
    <div className="mt-4 rounded-brand-lg border border-accent/30 bg-white p-6 shadow-brand">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[1.15rem] font-bold text-navy">Deine Fassung</h3>
          <p className="mt-1 max-w-[58ch] text-[0.88rem] leading-relaxed text-brand-muted">
            Was hier steht, soll deins sein. Die Geschichte war erfunden — sie hat dich nur
            an etwas erinnert. Schreib das Ereignis auf, an das du dabei gedacht hast.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { feldFertig(); onSchliessen() }}
          className="shrink-0 text-[0.84rem] text-brand-muted hover:text-navy hover:underline"
        >
          Schließen
        </button>
      </div>

      {/* Die Vorlage — sichtbar, aber als das benannt, was sie ist. */}
      <div className="mt-4 rounded-brand bg-navy/[0.04] px-4 py-3">
        <p className="text-[0.68rem] font-bold uppercase tracking-wide text-brand-muted">
          Die erfundene Geschichte
        </p>
        <p className="mt-1 text-[0.92rem] font-semibold text-navy">
          {eintrag.title}
          {eintrag.perspective && (
            <span className="ml-2 font-normal text-brand-muted">· {eintrag.perspective}</span>
          )}
        </p>
        <Link
          to={`/szenen/${eintrag.scene_slug}`}
          target="_blank"
          className="mt-1 inline-block text-[0.8rem] font-medium text-accent hover:underline"
        >
          Noch einmal lesen (neuer Reiter) →
        </Link>
      </div>

      {/* Der erste Gedanke: vorgelegt, nicht übernommen. */}
      {eintrag.note && (
        <div className="mt-3 rounded-brand border border-brand-border px-4 py-3">
          <p className="text-[0.68rem] font-bold uppercase tracking-wide text-brand-muted">
            Dein erster Gedanke
          </p>
          <blockquote className="mt-1 text-[0.9rem] leading-relaxed text-brand-text">
            {eintrag.note}
          </blockquote>
          <p className="mt-2 text-[0.78rem] leading-relaxed text-brand-muted/90">
            Das hast du direkt nach dem Lesen notiert — im stärksten Eindruck der Geschichte.
            Wie viel davon ist deine Erinnerung, und wie viel die Geschichte?
          </p>
        </div>
      )}

      {/* Kopf: Überschrift, wann, wo */}
      <div className="mt-6 grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        {([
          ['titel', 'Überschrift', 'In deinen Worten'],
          ['wann', 'Wann war das?', 'z. B. letzten Freitag'],
          ['ort', 'Wo?', 'z. B. in der Küche'],
        ] as const).map(([key, label, platzhalter]) => (
          <div key={key}>
            <label htmlFor={`f-${key}`} className="text-[0.84rem] font-medium text-navy">
              {label}
            </label>
            <input
              id={`f-${key}`}
              value={werte[key] ?? ''}
              onChange={e => setWerte(w => ({ ...w, [key]: e.target.value }))}
              onBlur={feldFertig}
              placeholder={platzhalter}
              maxLength={key === 'titel' ? 120 : 200}
              className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-[0.9rem] text-brand-text placeholder:text-brand-muted/60 focus:border-accent focus:outline-none"
            />
            {key === 'titel' && frageZuFeld('titel') && (
              <EchoFrage nachfrage={frageZuFeld('titel')!} />
            )}
          </div>
        ))}
      </div>

      {/* Drei Gruppen statt neun gleich schwerer Felder.
          Die erste Fassung setzte alle Fragen untereinander, jede gleich gross, die
          Pflichtfelder mit einem Sternchen. Beim Ansehen war das eine Wand: Fuenf
          freiwillige Fragen sahen aus wie Pflicht, und die wichtigste - der Vergleich mit
          der Geschichte - ging in der Reihe unter. Wer belastendes Material aufschreibt,
          bricht bei so einer Wand ab.

          Jetzt tragen zwei Fragen die Sache, fuenf sind ein zugeklapptes Angebot, und der
          Vergleich steht in einem eigenen Rahmen. Dieselbe Staffelung wie auf der
          Leseseite: eine Geste, dann freiwillig mehr. */}

      {ereignis && (
        <div className="mt-6">
          <Feld
            frage={ereignis}
            wert={werte[ereignis.key] ?? ''}
            nachfrage={frageZuFeld(ereignis.key)}
            onChange={v => setWerte(w => ({ ...w, [ereignis.key]: v }))}
            onBlur={feldFertig}
            zeilen={5}
          />
        </div>
      )}

      {weitere.length > 0 && (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setMehr(m => !m)}
            className="text-[0.86rem] font-medium text-accent hover:underline"
          >
            {mehr
              ? 'Weitere Fragen einklappen'
              : `${weitere.length} weitere Fragen, wenn du magst${
                  weitereBeantwortet > 0 ? ` (${weitereBeantwortet} beantwortet)` : ''}`}
          </button>
          {mehr && (
            <div className="mt-4 space-y-4 border-l-2 border-brand-border pl-4">
              {weitere.map(f => (
                <Feld
                  key={f.key}
                  frage={f}
                  wert={werte[f.key] ?? ''}
                  nachfrage={frageZuFeld(f.key)}
                  onChange={v => setWerte(w => ({ ...w, [f.key]: v }))}
                  onBlur={feldFertig}
                  zeilen={3}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Der Vergleich bekommt einen eigenen Rahmen. Er ist die einzige Frage, die es nur
          hier gibt, und die einzige, die sich ohne die eigene Erinnerung nicht beantworten
          laesst - sie darf nicht aussehen wie die sechste von sechs. */}
      {vergleich && (
        <div className="mt-6 rounded-brand border border-accent/30 bg-accent/[0.04] p-5">
          <Feld
            frage={vergleich}
            wert={werte[vergleich.key] ?? ''}
            nachfrage={frageZuFeld(vergleich.key)}
            onChange={v => setWerte(w => ({ ...w, [vergleich.key]: v }))}
            onBlur={feldFertig}
            zeilen={4}
          />
        </div>
      )}

      {echoHinweis && (
        <p className="mt-4 rounded-brand bg-navy/[0.03] px-4 py-3 text-[0.86rem] leading-relaxed text-brand-muted">
          {echoHinweis}
        </p>
      )}
      {fehler && <p className="mt-4 text-[0.86rem] text-red-600">{fehler}</p>}

      {/* Fuß */}
      <div className="mt-6 border-t border-brand-border pt-5">
        {fehltNoch.length > 0 && (
          <p className="mb-3 text-[0.84rem] leading-relaxed text-brand-muted">
            Für eine Szene fehlt noch: <span className="text-navy">{fehltNoch.join(' · ')}</span>
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <button
            type="button"
            onClick={() => uebernehmen.mutate()}
            disabled={!bereit || uebernehmen.isPending}
            className="btn-primary !px-6 !py-2.5 !text-[0.88rem] disabled:opacity-40"
          >
            {uebernehmen.isPending ? 'Wird übernommen …' : 'Als eigene Szene übernehmen'}
          </button>
          <button
            type="button"
            onClick={nachfragenLassen}
            disabled={fragenLassen.isPending}
            className="text-[0.86rem] font-semibold text-accent hover:underline disabled:opacity-50"
          >
            {fragenLassen.isPending ? 'Echo liest …' : 'Echo nachfragen lassen'}
          </button>
          <span className="text-[0.8rem] text-brand-muted/80">
            {speichern.isPending ? 'Wird gesichert …' : 'Wird beim Weiterklicken gesichert.'}
          </span>
        </div>
        <p className="mt-3 text-[0.76rem] leading-relaxed text-brand-muted/80">
          Echo schreibt hier nichts für dich — es liest deine Fassung neben der Geschichte
          und fragt nach, wo etwas aus ihr hereingerutscht sein könnte.
        </p>
      </div>
    </div>
  )
}
