/**
 * /admin/plaetze — zusätzliche Fall-Plätze vergeben.
 *
 * **Wofür.** Am Anfang wird man Fachpersonen etwas schenken müssen: mehr Fälle, als ihr
 * Tarif hergibt. Der einzige Weg dahin war bisher, den Tarif hochzustufen — dann zahlen
 * sie mehr, oder die Rechnung stimmt nicht.
 *
 * **Warum der Verbrauch danebensteht.** Er beantwortet die Frage, die zum Schenken führt.
 * Eine Praxis, die ihren einen Platz seit drei Monaten nicht ausschöpft, braucht keinen
 * zweiten — sie braucht vielleicht einen Anruf.
 *
 * **Warum Tarif und Geschenk getrennt dastehen.** Eine bloße 9 wäre eine Zahl, die
 * niemand erklären könnte. Getrennt sieht man, was gekauft und was gegeben wurde — und
 * nach einem Tarifwechsel sieht man, dass sich das eine geändert hat und das andere nicht.
 *
 * **Und warum der Grund ein Pflichtfeld ist.** Ein Geschenk, das in einem halben Jahr
 * niemand mehr erklären kann, wird nie zurückgenommen, weil sich niemand traut.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiErrorMessage } from '@/api/errors'
import { adminApi, type PlaetzeRow } from './api'

export default function PlaetzePage() {
  const [suche, setSuche] = useState('')
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['admin-plaetze', suche],
    queryFn: () => adminApi.plaetze(suche.trim() || undefined),
  })

  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="bg-navy px-6 py-5">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="text-[1.15rem] font-bold text-white">Plätze</h1>
            <p className="mt-0.5 text-[0.8rem] text-white/60">
              Zusätzliche Fälle obendrauf auf den Tarif — der Preis bleibt.
            </p>
          </div>
          <div className="flex gap-4">
            <Link to="/admin/nutzer" className="text-[0.82rem] text-white/60 no-underline hover:text-white">
              Konten ↗
            </Link>
            <Link to="/admin/verzeichnis" className="text-[0.82rem] text-white/60 no-underline hover:text-white">
              Verzeichnis ↗
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1100px] px-6 py-8">
        <input
          type="search"
          value={suche}
          onChange={e => setSuche(e.target.value)}
          placeholder="Nach Name suchen …"
          className="input max-w-sm"
        />

        {error && (
          <p className="mt-4 rounded-brand border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {apiErrorMessage(error)}
          </p>
        )}

        {isLoading ? (
          <p className="mt-6 text-sm text-brand-muted">Wird geladen …</p>
        ) : data.length === 0 ? (
          <p className="mt-6 text-sm text-brand-muted">
            {suche ? 'Keine Organisation mit diesem Namen.' : 'Noch keine Organisationen.'}
          </p>
        ) : (
          <div className="mt-6 space-y-3">
            {data.map(org => <Zeile key={org.id} org={org} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function Zeile({ org }: { org: PlaetzeRow }) {
  const qc = useQueryClient()
  const [offen, setOffen] = useState(false)
  const [zusatz, setZusatz] = useState(String(org.zusatz_faelle))
  const [grund, setGrund] = useState(org.zusatz_grund ?? '')

  const speichern = useMutation({
    mutationFn: () => adminApi.plaetzeSetzen(org.id, Number(zusatz), grund),
    onSuccess: () => {
      setOffen(false)
      qc.invalidateQueries({ queryKey: ['admin-plaetze'] })
    },
  })

  const zahl = Number(zusatz)
  const gueltig = Number.isInteger(zahl) && zahl >= 0 && zahl <= 500
    && grund.trim().length >= 5

  return (
    <div className="rounded-brand border border-brand-border bg-white px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.95rem] font-semibold text-navy">
            {org.name || 'Ohne Namen'}
          </p>
          <p className="mt-0.5 text-[0.78rem] text-brand-muted">
            Tarif {org.plan ?? '—'}
            {org.subscription_status && org.subscription_status !== 'active'
              && ` · Abo ${org.subscription_status}`}
          </p>
        </div>

        {/* Tarif und Geschenk getrennt: Eine blosse Summe waere eine Zahl, die niemand
            erklaeren koennte - und nach einem Tarifwechsel merkte niemand, welcher Teil
            sich geaendert hat. */}
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-[0.82rem]">
          <span className="text-brand-muted">
            aus dem Tarif <strong className="text-navy">{org.included_tarif}</strong>
          </span>
          <span className={org.zusatz_faelle > 0 ? 'text-accent' : 'text-brand-muted'}>
            zusätzlich <strong>{org.zusatz_faelle}</strong>
          </span>
          <span className="text-brand-muted">
            verbraucht <strong className="text-navy">{org.verbraucht}</strong> von{' '}
            <strong className="text-navy">{org.included}</strong>
          </span>
        </div>
      </div>

      {org.zusatz_faelle > 0 && org.zusatz_grund && !offen && (
        <p className="mt-2 text-[0.76rem] leading-relaxed text-brand-muted">
          {org.zusatz_grund}
          {org.zusatz_gesetzt_am
            && ` · ${new Date(org.zusatz_gesetzt_am).toLocaleDateString('de-DE')}`}
        </p>
      )}

      {offen ? (
        <div className="mt-3 border-t border-brand-border pt-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-[0.76rem] font-medium text-brand-text">
                Zusätzliche Plätze
              </span>
              <input
                type="number" min={0} max={500}
                value={zusatz}
                onChange={e => setZusatz(e.target.value)}
                className="input w-28"
              />
            </label>
            <label className="block min-w-[16rem] flex-1">
              <span className="mb-1 block text-[0.76rem] font-medium text-brand-text">
                Grund (Pflicht)
              </span>
              <input
                type="text"
                value={grund}
                onChange={e => setGrund(e.target.value)}
                maxLength={500}
                placeholder="z. B. Pilotphase, Gegenleistung für Feedback"
                className="input"
              />
            </label>
          </div>

          <p className="mt-2 text-[0.74rem] leading-relaxed text-brand-muted">
            Kommt obendrauf auf den Tarif ({org.included_tarif}) und überlebt jeden
            Tarifwechsel. Der Preis ändert sich nicht.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!gueltig || speichern.isPending}
              onClick={() => speichern.mutate()}
              className="btn-primary !px-4 !py-1.5 !text-sm disabled:opacity-40"
            >
              {speichern.isPending ? 'Wird gespeichert …' : 'Speichern'}
            </button>
            <button
              type="button"
              onClick={() => {
                setOffen(false)
                setZusatz(String(org.zusatz_faelle))
                setGrund(org.zusatz_grund ?? '')
              }}
              className="text-[0.82rem] text-brand-muted hover:text-navy"
            >
              Abbrechen
            </button>
            {speichern.error && (
              <span className="text-[0.78rem] text-red-700">
                {apiErrorMessage(speichern.error)}
              </span>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOffen(true)}
          className="mt-2 text-[0.8rem] text-accent hover:underline"
        >
          {org.zusatz_faelle > 0 ? 'Plätze ändern' : 'Plätze vergeben'}
        </button>
      )}
    </div>
  )
}
