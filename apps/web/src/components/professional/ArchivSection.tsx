/**
 * Archiv beendeter Fälle — in den Einstellungen, nicht im Arbeitsbereich.
 *
 * **Warum hier und nicht in der Fallliste.** Ein beendeter Fall ist keine Arbeit mehr. Er
 * gehört nicht neben die laufenden, wo er jeden Tag mitgezählt würde. Er gehört dorthin,
 * wo man ihn sucht, wenn man ihn braucht — und man braucht ihn selten: bei einer
 * Anfrage, einer Prüfung, einer Beschwerde.
 *
 * **Was hier steht.** Ausschließlich das, was die Fachperson selbst geschrieben hat. Die
 * Inhalte der Klient:in sind mit dem Widerruf verschwunden, und was EchoB daraus erzeugt
 * hatte — Berichte, Arbeitsmappe, KI-Gespräche — ist gelöscht, nicht ausgeblendet.
 *
 * **Warum es das überhaupt gibt.** Sitzungsnotizen sind Behandlungsdokumentation. § 630f
 * BGB verpflichtet zur Aufbewahrung über zehn Jahre, und diese Pflicht kann eine
 * Klient:in nicht widerrufen. Vorher sperrte EchoB die Fachperson aus ihren eigenen
 * Aufzeichnungen aus — nachdem es sie eingeladen hatte, sie hier zu führen.
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { archivApi, type ArchivFall } from '@/api/archiv'
import Fehlermeldung from '@/components/Fehlermeldung'

const datum = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

export default function ArchivSection() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['pro-archiv'], queryFn: archivApi.liste,
  })
  const [offen, setOffen] = useState<string | null>(null)

  return (
    <div className="mt-8 card">
      <h2 className="text-lg font-semibold text-navy">Beendete Fälle</h2>
      <p className="mt-1 max-w-prose text-sm text-brand-muted">
        Wenn eine Klient:in die Freigabe widerruft, endet dein Zugriff auf ihre Inhalte,
        und was EchoB daraus erstellt hat, wird gelöscht. Deine eigenen Sitzungsnotizen
        bleiben dir — sie sind deine Behandlungsdokumentation, und die musst du nach
        § 630f BGB zehn Jahre aufbewahren.
      </p>
      <p className="mt-2 max-w-prose text-xs text-brand-muted">
        Verlass dich dabei nicht allein auf EchoB: Löscht die Klient:in ihr Konto ganz,
        wird der Fall mit allem darin entfernt. Für deine Akte gehört, was du brauchst, in
        dein eigenes Praxissystem.
      </p>

      {isLoading && <div className="mt-4 h-16 animate-pulse rounded-brand bg-brand-bg" />}
      <Fehlermeldung error={error} className="mt-4" />

      {!isLoading && !error && data.length === 0 && (
        <p className="mt-4 text-sm text-brand-muted">
          Keine beendeten Fälle mit eigenen Aufzeichnungen.
        </p>
      )}

      {data.length > 0 && (
        <ul className="mt-4 space-y-2">
          {data.map(f => (
            <li key={f.case_id}>
              <FallZeile
                fall={f}
                offen={offen === f.case_id}
                umschalten={() => setOffen(offen === f.case_id ? null : f.case_id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function FallZeile({ fall, offen, umschalten }: {
  fall: ArchivFall; offen: boolean; umschalten: () => void
}) {
  const teile = [
    fall.sitzungsnotizen && `${fall.sitzungsnotizen} Sitzungsnotiz${fall.sitzungsnotizen === 1 ? '' : 'en'}`,
    fall.vereinbarungen && `${fall.vereinbarungen} Vereinbarung${fall.vereinbarungen === 1 ? '' : 'en'}`,
    fall.termine && `${fall.termine} Termin${fall.termine === 1 ? '' : 'e'}`,
  ].filter(Boolean)

  return (
    <div className="rounded-brand border border-brand-border">
      <button
        onClick={umschalten}
        aria-expanded={offen}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-brand-bg/50"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-navy">
            {fall.client_display_name || 'Ohne Namen'}
          </span>
          <span className="block text-xs text-brand-muted">
            beendet am {datum(fall.beendet_am)} · {teile.join(' · ')}
          </span>
        </span>
        <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 text-brand-muted transition-transform ${offen ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {offen && <FallInhalt caseId={fall.case_id} />}
    </div>
  )
}

function FallInhalt({ caseId }: { caseId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['pro-archiv', caseId], queryFn: () => archivApi.detail(caseId),
  })

  if (isLoading) return <div className="m-4 h-24 animate-pulse rounded-brand bg-brand-bg" />
  if (error) return <div className="p-4"><Fehlermeldung error={error} /></div>
  if (!data) return null

  return (
    <div className="space-y-5 border-t border-brand-border px-4 py-4">
      {data.ueberblick && (
        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-brand-muted">
            Fallüberblick
          </h3>
          <dl className="space-y-2">
            {Object.entries(data.ueberblick).map(([feld, text]) => (
              <div key={feld}>
                <dt className="text-xs font-medium text-brand-text">{UEBERBLICK_LABELS[feld] ?? feld}</dt>
                <dd className="whitespace-pre-wrap text-sm leading-relaxed text-brand-muted">{text}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {data.sitzungsnotizen.length > 0 && (
        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-brand-muted">
            Sitzungsnotizen
          </h3>
          <div className="space-y-3">
            {data.sitzungsnotizen.map(n => (
              <article key={n.id} className="rounded-brand-sm border border-brand-border px-3 py-2">
                <p className="text-xs text-brand-muted">
                  {datum(n.session_date)}{n.title ? ` · ${n.title}` : ''}
                </p>
                {(n.content.sections ?? []).map((s, i) => (
                  <div key={i} className="mt-1.5">
                    <p className="text-xs font-medium text-brand-text">{s.heading}</p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-muted">{s.text}</p>
                  </div>
                ))}
              </article>
            ))}
          </div>
        </section>
      )}

      {data.vereinbarungen.length > 0 && (
        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-brand-muted">
            Vereinbarungen
          </h3>
          <ul className="space-y-1">
            {data.vereinbarungen.map(v => (
              <li key={v.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-brand-text">{v.title || v.type}</span>
                <span className="shrink-0 text-xs text-brand-muted">{datum(v.created_at)}</span>
              </li>
            ))}
          </ul>
          {/* Warum hier keine Antworten stehen: Sie gehoerten der Klient:in. */}
          <p className="mt-1.5 text-[11px] text-brand-muted">
            Die Antworten der Klient:in wurden mit dem Widerruf gelöscht.
          </p>
        </section>
      )}

      {data.termine.length > 0 && (
        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-brand-muted">
            Termine
          </h3>
          <ul className="space-y-1">
            {data.termine.map(t => (
              <li key={t.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-brand-text">{t.title || 'Termin'}</span>
                <span className="shrink-0 text-xs text-brand-muted">{datum(t.start_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

const UEBERBLICK_LABELS: Record<string, string> = {
  first_impressions: 'Erster Eindruck',
  key_scenes: 'Schlüsselszenen',
  open_questions: 'Offene Fragen',
  conversation_prompts: 'Gesprächsangebote',
  next_steps: 'Nächste Schritte',
  free_text: 'Freitext',
}
