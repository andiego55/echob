/**
 * „Szene erstellen" – aus einem Gespräch mit Echo wird ein Eintrag im eigenen Fall.
 *
 * **Warum das der wichtigste Ausgang ist.** Nach einem Streit hat man erzählt, sortiert,
 * vielleicht etwas verstanden – und morgen ist es weg. Eine Szene hält es fest, und zwar
 * dort, wo es hingehört: im eigenen Fall, wo es später in Muster, Berichte und Gespräche
 * mit einer Fachperson einfließen kann.
 *
 * **Zwei Schritte, nie einer.** Echo baut einen Entwurf, du prüfst und änderst ihn, erst
 * dann wird gespeichert. Aus dem Paarraum fließt nichts von selbst in einen Fall – das ist
 * dieselbe Regel wie beim Kontext-Composer.
 *
 * Technisch: Der Paarbereich liefert nur den Entwurf und fasst keine Fall-Tabelle an.
 * Gespeichert wird über den regulären Fall-Endpunkt, der die Eigentümerschaft prüft.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { coupleCompanionApi } from '@/api/coupleCompanion'
import type { CoupleSceneDraft, CoupleThreadKind } from '@/api/coupleCompanion'
import { scenesApi } from '@/api/scenes'
import { apiErrorMessage } from '@/api/errors'

const BELASTUNG = [
  { wert: 1, label: 'kaum' },
  { wert: 2, label: 'etwas' },
  { wert: 3, label: 'deutlich' },
  { wert: 4, label: 'stark' },
  { wert: 5, label: 'sehr stark' },
]

export default function SceneFromChat({
  coupleId, caseId, kind = 'deescalation', genugGesagt,
}: {
  coupleId: string
  caseId: string | null
  kind?: CoupleThreadKind
  genugGesagt: boolean
}) {
  const [entwurf, setEntwurf] = useState<CoupleSceneDraft | null>(null)
  const [gespeichert, setGespeichert] = useState<string | null>(null)

  const bauen = useMutation({
    mutationFn: () => coupleCompanionApi.sceneDraft(coupleId, kind),
    onSuccess: setEntwurf,
  })

  const speichern = useMutation({
    mutationFn: () => {
      if (!caseId || !entwurf) throw new Error('Kein Fall ausgewählt.')
      return scenesApi.create(caseId, {
        title: entwurf.title.trim() || 'Nach einem Streit',
        description: entwurf.description || undefined,
        user_reaction: entwurf.user_reaction || undefined,
        scene_date: entwurf.scene_date || undefined,
        distress_score: entwurf.distress_score ?? undefined,
        pattern_tags: entwurf.pattern_tags,
        input_mode: 'chat',
      })
    },
    onSuccess: s => { setGespeichert(s.id); setEntwurf(null) },
  })

  // ── Nach dem Speichern ────────────────────────────────────────────
  if (gespeichert) {
    return (
      <div className="rounded-brand border border-green-200 bg-green-50/40 px-4 py-3.5">
        <p className="text-sm font-semibold text-navy">In deinem Fall festgehalten</p>
        <p className="mt-1 text-xs leading-relaxed text-brand-muted">
          Die Szene liegt jetzt bei deinen anderen – deine Partnerperson sieht sie nicht.
          Von dort fließt sie in Muster und Berichte ein.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {caseId && (
            <Link
              to={`/app/cases/${caseId}/scenes/${gespeichert}`}
              className="btn-outline !py-1.5 !px-3.5 !text-xs no-underline"
            >
              Szene ansehen
            </Link>
          )}
          <button
            onClick={() => setGespeichert(null)}
            className="text-xs text-brand-muted hover:text-navy"
          >
            Schließen
          </button>
        </div>
      </div>
    )
  }

  // ── Entwurf prüfen ────────────────────────────────────────────────
  if (entwurf) {
    const setzen = (feld: keyof CoupleSceneDraft, wert: unknown) =>
      setEntwurf({ ...entwurf, [feld]: wert } as CoupleSceneDraft)

    return (
      <div className="rounded-brand border border-accent/40 bg-accent/[0.03] px-4 py-3.5">
        <p className="text-sm font-semibold text-navy">Echos Entwurf</p>
        <p className="mt-1 text-xs text-brand-muted">
          Ändere, was nicht stimmt. Gespeichert wird erst, wenn du es bestätigst.
        </p>

        <div className="mt-3 space-y-3">
          <div>
            <label className="text-xs font-medium text-navy">Titel</label>
            <input
              value={entwurf.title}
              onChange={e => setzen('title', e.target.value)}
              maxLength={200}
              className="input mt-1 !text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-navy">Was ist passiert?</label>
            <textarea
              value={entwurf.description}
              onChange={e => setzen('description', e.target.value)}
              rows={4}
              className="input mt-1 w-full resize-y !text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-navy">Wie hast du reagiert?</label>
            <textarea
              value={entwurf.user_reaction ?? ''}
              onChange={e => setzen('user_reaction', e.target.value)}
              rows={2}
              className="input mt-1 w-full resize-y !text-sm"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-navy">Wann war das?</label>
              <input
                type="date"
                value={entwurf.scene_date ?? ''}
                onChange={e => setzen('scene_date', e.target.value || null)}
                className="input mt-1 !text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-navy">Wie belastend?</label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {BELASTUNG.map(b => (
                  <button
                    key={b.wert}
                    onClick={() => setzen('distress_score',
                      entwurf.distress_score === b.wert ? null : b.wert)}
                    className={`rounded-full border px-2.5 py-1 text-[0.7rem] transition ${
                      entwurf.distress_score === b.wert
                        ? 'border-accent bg-accent/10 font-medium text-accent'
                        : 'border-brand-border text-brand-muted hover:border-accent/40'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {entwurf.pattern_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {entwurf.pattern_tags.map(t => (
                <span key={t} className="rounded-full bg-brand-bg px-2.5 py-0.5 text-[0.65rem] text-brand-muted">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => speichern.mutate()}
            disabled={!entwurf.title.trim() || speichern.isPending}
            className="btn-primary !py-2 !px-5 !text-sm disabled:opacity-50"
          >
            {speichern.isPending ? 'Speichere …' : 'Szene speichern'}
          </button>
          <button onClick={() => setEntwurf(null)} className="text-xs text-brand-muted hover:text-navy">
            Verwerfen
          </button>
        </div>
        {speichern.isError && (
          <p className="mt-2 text-xs text-red-600">{apiErrorMessage(speichern.error)}</p>
        )}
      </div>
    )
  }

  // ── Anstoß ────────────────────────────────────────────────────────
  return (
    <div>
      <button
        onClick={() => bauen.mutate()}
        disabled={!genugGesagt || !caseId || bauen.isPending}
        className="rounded-brand border border-brand-border px-3.5 py-3 text-left transition hover:border-accent/50 disabled:opacity-50 w-full"
      >
        <p className="text-sm font-semibold text-navy">
          {bauen.isPending ? 'Echo formt eine Szene …' : 'Szene erstellen'}
        </p>
        <p className="mt-0.5 text-[0.72rem] leading-snug text-brand-muted">
          {caseId
            ? 'Echo macht daraus einen Eintrag für deinen Fall – du prüfst ihn vorher.'
            : 'Dafür brauchst du einen eigenen Fall in EchoB.'}
        </p>
      </button>
      {bauen.isError && (
        <p className="mt-2 text-xs text-red-600">{apiErrorMessage(bauen.error)}</p>
      )}
    </div>
  )
}
