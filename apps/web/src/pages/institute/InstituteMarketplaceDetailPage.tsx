/**
 * /institute/marketplace/:id — Vorschau eines Marktplatz-Angebots (Inhaltsverzeichnis,
 * ohne die eigentlichen Inhalte). Erwerb/Übernahme folgt (P-F2).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import InstituteShell from '@/components/institute/InstituteShell'
import { instituteApi } from '@/api/institute'
import { euro } from './InstituteMarketplacePage'

const KIND_LABEL: Record<string, string> = { lesson: 'Lektion', case: 'Fallbeispiel', assignment: 'Aufgabe', quiz: 'Wissenscheck' }

export default function InstituteMarketplaceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['institute-marketplace', id],
    queryFn: () => instituteApi.marketplaceDetail(id!),
    enabled: !!id,
  })

  const acquire = useMutation({
    mutationFn: () => instituteApi.marketplaceAcquire(id!),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['institute-modules'] })
      navigate(`/institute/modules/${res.module_id}`)
    },
  })

  return (
    <InstituteShell>
      <div className="mx-auto max-w-[760px] px-6 py-10">
        <Link to="/institute/marketplace" className="text-sm text-brand-muted no-underline hover:text-navy">← Zurück zum Marktplatz</Link>

        {isLoading || !data ? (
          <p className="mt-6 text-sm text-brand-muted">Lädt …</p>
        ) : (
          <>
            <div className="mt-4 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-navy">{data.title}</h1>
                <p className="mt-1 text-sm text-brand-muted">Angeboten von {data.provider}</p>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${data.price_cents === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-accent/10 text-accent'}`}>{euro(data.price_cents)}</span>
            </div>
            {data.teaser && <p className="mt-4 text-[0.97rem] leading-relaxed text-brand-text">{data.teaser}</p>}
            {data.description && <p className="mt-3 text-sm leading-relaxed text-brand-muted">{data.description}</p>}

            <h2 className="mt-8 text-sm font-bold text-navy">Inhalt · {data.steps.length} Schritte</h2>
            <ol className="mt-3 space-y-2">
              {data.steps.map((s, i) => (
                <li key={i} className="flex items-center gap-3 rounded-brand border border-brand-border bg-white px-4 py-2.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-bg text-[11px] font-semibold text-brand-muted">{i + 1}</span>
                  <span className="text-sm font-medium text-navy">{s.title}</span>
                  <span className="ml-auto shrink-0 rounded-full bg-brand-bg px-2 py-0.5 text-[10px] text-brand-muted">{KIND_LABEL[s.kind] ?? s.kind}</span>
                </li>
              ))}
            </ol>

            <div className="mt-8 rounded-brand-lg border border-accent/25 bg-accent/[0.05] px-6 py-6">
              <h3 className="text-sm font-bold text-navy">
                {data.is_own ? 'Das ist dein eigenes Angebot' : data.acquired_module_id ? 'Bereits übernommen' : 'Modul übernehmen'}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-brand-muted">
                {data.is_own
                  ? 'So sehen andere Institute dein Modul im Marktplatz.'
                  : data.acquired_module_id
                    ? 'Du hast dieses Modul bereits in dein Institut übernommen.'
                    : data.price_cents === 0
                      ? 'Übernimm das Modul als Entwurf in dein Institut – inklusive eigener Kopien der enthaltenen Fälle und Aufgaben. Danach kannst du es anpassen und deinen Studierenden freigeben.'
                      : 'Kostenpflichtige Module lassen sich in Kürze direkt kaufen. Kostenlose Module kannst du schon jetzt übernehmen.'}
              </p>
              {!data.is_own && (
                data.acquired_module_id ? (
                  <Link to={`/institute/modules/${data.acquired_module_id}`} className="mt-3 inline-block text-sm font-medium text-accent hover:underline">Zu deinem Modul →</Link>
                ) : data.price_cents === 0 ? (
                  <button onClick={() => acquire.mutate()} disabled={acquire.isPending} className="btn-primary mt-4 !py-2 !px-5 !text-sm disabled:opacity-50">
                    {acquire.isPending ? 'Wird übernommen …' : 'Kostenlos übernehmen'}
                  </button>
                ) : (
                  <button disabled className="btn-primary mt-4 !py-2 !px-5 !text-sm opacity-50" title="In Vorbereitung">
                    Kaufen · {euro(data.price_cents)} (bald)
                  </button>
                )
              )}
              {acquire.isError && <p className="mt-2 text-sm text-red-600">Übernahme fehlgeschlagen. Bitte erneut versuchen.</p>}
            </div>
          </>
        )}
      </div>
    </InstituteShell>
  )
}
