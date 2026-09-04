/**
 * /app/cases/:caseId/artifacts — das Archiv der Erkenntnisse
 *
 * **Was hier steht und was nicht.** Eine Szene ist ein Ereignis — sie war, sie kann nicht
 * falsch werden. Ein Artefakt ist eine Deutung, und Deutungen altern. Deshalb hat diese
 * Seite etwas, das die Szenenliste nicht hat: „gilt nicht mehr".
 *
 * **Warum das Verworfene stehen bleibt.** Wer ein Artefakt als überholt markiert, löscht
 * nicht, sondern erzeugt Signal: Hier hat sich etwas bewegt. Für eine Fachperson ist ein
 * überholtes Artefakt oft aufschlussreicher als ein aktuelles, und für den Nutzer der
 * seltene Moment, in dem Fortschritt sichtbar wird statt behauptet. In Gespräche fließen
 * überholte Notizen nicht mehr ein — Echo erfährt nur ihre Zahl.
 */
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import Fehlermeldung from '@/components/Fehlermeldung'
import { ListSkeleton } from '@/components/Skeleton'
import { useBestaetigen } from '@/components/Bestaetigung'
import { caseArtifactsApi, type CaseArtifact } from '@/api/caseArtifacts'
import { MAX_TEXT, MAX_TITEL } from '@/components/app/ArtefaktErzeugen'

export default function ArtifactsPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const qc = useQueryClient()
  const bestaetigen = useBestaetigen()
  const [zeigeUeberholte, setZeigeUeberholte] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['case-artifacts', caseId],
    queryFn: () => caseArtifactsApi.list(caseId!),
    enabled: !!caseId,
  })

  const aendern = useMutation({
    mutationFn: ({ id, ...rest }: { id: string; title?: string; body?: string; status?: 'aktiv' | 'ueberholt' }) =>
      caseArtifactsApi.update(caseId!, id, rest),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['case-artifacts', caseId] }),
  })
  const loeschen = useMutation({
    mutationFn: (id: string) => caseArtifactsApi.delete(caseId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['case-artifacts', caseId] }),
  })

  const alle = data?.artifacts ?? []
  const aktive = alle.filter(a => a.status === 'aktiv')
  const ueberholte = alle.filter(a => a.status === 'ueberholt')

  return (
    <AppShell>
      <CaseNav caseId={caseId!} />

      <div className="mx-auto max-w-[860px] px-6 py-8">
        <div className="mb-6">
          <h1 className="page-title">Erkenntnisse</h1>
          <p className="mt-1 max-w-[62ch] text-sm text-brand-muted">
            Kurze Notizen, die am Ende eines Gesprächs entstanden sind. Sie fließen in
            kommende Gespräche ein — und dürfen irgendwann nicht mehr stimmen.
          </p>
        </div>

        {isLoading && <ListSkeleton rows={2} label="Erkenntnisse werden geladen" />}

        {!isLoading && alle.length === 0 && <Leerzustand />}

        {aktive.length > 0 && (
          <div className="space-y-3">
            {aktive.map(a => (
              <ArtefaktZeile
                key={a.id} artefakt={a}
                onSpeichern={(title, body) => aendern.mutate({ id: a.id, title, body })}
                onUeberholen={async () => {
                  const ja = await bestaetigen({
                    titel: 'Gilt nicht mehr?',
                    text: 'Die Notiz wandert ins Archiv und fließt nicht mehr in Gespräche ein. '
                      + 'Sie bleibt lesbar — dass du sie verworfen hast, ist selbst eine Information.',
                    knopf: 'Als überholt markieren',
                  })
                  if (ja) aendern.mutate({ id: a.id, status: 'ueberholt' })
                }}
                laeuft={aendern.isPending}
              />
            ))}
          </div>
        )}

        {aktive.length > 0 && data && (
          <p className="mt-4 text-xs text-brand-muted">
            {data.active_count} von {data.max_artifacts} Plätzen belegt.
            {data.remaining_slots === 0 && ' Markiere eine als überholt, um Platz zu schaffen.'}
          </p>
        )}

        {/* ── Überholtes ─────────────────────────────────────────── */}
        {ueberholte.length > 0 && (
          <div className="mt-10 border-t border-brand-border pt-6">
            <button
              onClick={() => setZeigeUeberholte(o => !o)}
              aria-expanded={zeigeUeberholte}
              className="text-sm font-medium text-navy transition-colors hover:text-accent"
            >
              {zeigeUeberholte ? '▾' : '▸'} Was nicht mehr gilt ({ueberholte.length})
            </button>
            <p className="mt-1 max-w-[62ch] text-xs text-brand-muted">
              Frühere Einschätzungen, die du verworfen hast. Sie fließen nicht mehr in
              Gespräche ein — aber sie zeigen, was sich bewegt hat.
            </p>

            {zeigeUeberholte && (
              <div className="mt-4 space-y-3">
                {ueberholte.map(a => (
                  <div key={a.id} className="card border-dashed opacity-75">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-navy line-through decoration-brand-muted/40">
                          {a.title}
                        </p>
                        <p className="mt-1 text-xs text-brand-muted">
                          {datum(a.created_at)} festgehalten
                          {a.superseded_at && <> · {datum(a.superseded_at)} verworfen</>}
                        </p>
                        <p className="mt-2 max-w-[62ch] text-sm text-brand-text">{a.body}</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          onClick={() => aendern.mutate({ id: a.id, status: 'aktiv' })}
                          className="btn-quiet !py-1.5 !px-3 !text-xs"
                          title="Doch wieder gültig — die Notiz fließt dann erneut in Gespräche ein."
                        >
                          Gilt doch wieder
                        </button>
                        <button
                          onClick={async () => {
                            const ja = await bestaetigen({
                              titel: 'Endgültig löschen?',
                              text: 'Die Notiz verschwindet ganz. Damit geht auch die Spur verloren, '
                                + 'dass du sie einmal festgehalten und später verworfen hast.',
                              knopf: 'Löschen', gefahr: true,
                            })
                            if (ja) loeschen.mutate(a.id)
                          }}
                          className="text-xs text-brand-muted transition-colors hover:text-red-600"
                        >
                          Löschen
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <Fehlermeldung error={aendern.error ?? loeschen.error} />
      </div>
    </AppShell>
  )
}

// ── Eine aktive Erkenntnis ────────────────────────────────────────────────────

function ArtefaktZeile({ artefakt: a, onSpeichern, onUeberholen, laeuft }: {
  artefakt: CaseArtifact
  onSpeichern: (title: string, body: string) => void
  onUeberholen: () => void
  laeuft: boolean
}) {
  const [bearbeiten, setBearbeiten] = useState(false)
  const [titel, setTitel] = useState(a.title)
  const [text, setText] = useState(a.body)

  if (bearbeiten) {
    return (
      <div className="card border-accent/30">
        <label className="label" htmlFor={`t-${a.id}`}>Überschrift</label>
        <input
          id={`t-${a.id}`} value={titel} onChange={e => setTitel(e.target.value)}
          maxLength={MAX_TITEL} className="input mt-1.5 w-full"
        />
        <label className="label mt-4 block" htmlFor={`b-${a.id}`}>Die Notiz</label>
        <textarea
          id={`b-${a.id}`} value={text} onChange={e => setText(e.target.value)}
          rows={4} maxLength={MAX_TEXT} className="input mt-1.5 w-full resize-y"
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => { onSpeichern(titel.trim(), text.trim()); setBearbeiten(false) }}
            disabled={!titel.trim() || !text.trim() || laeuft}
            className="btn-primary !py-1.5 !px-4 !text-xs disabled:opacity-50"
          >
            Speichern
          </button>
          <button
            onClick={() => { setTitel(a.title); setText(a.body); setBearbeiten(false) }}
            className="btn-quiet !py-1.5 !px-3.5 !text-xs"
          >
            Abbrechen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-navy">{a.title}</p>
          <p className="mt-1 text-xs text-brand-muted">{datum(a.created_at)}</p>
          <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-brand-text">{a.body}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button onClick={() => setBearbeiten(true)} className="btn-quiet !py-1.5 !px-3 !text-xs">
            Bearbeiten
          </button>
          <button
            onClick={onUeberholen}
            className="btn-quiet !py-1.5 !px-3 !text-xs"
            title="Die Notiz stimmt so nicht mehr — sie wandert ins Archiv, statt gelöscht zu werden."
          >
            Gilt nicht mehr
          </button>
        </div>
      </div>
    </div>
  )
}

function Leerzustand() {
  return (
    <div className="mx-auto max-w-md rounded-brand border border-dashed border-brand-border px-6 py-12 text-center">
      <svg viewBox="0 0 48 48" className="mx-auto h-12 text-accent" fill="none" aria-hidden>
        <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="2" opacity=".35" />
        <circle cx="24" cy="24" r="7" stroke="currentColor" strokeWidth="2" opacity=".6" />
        <circle cx="24" cy="24" r="2.5" fill="currentColor" />
      </svg>
      <h2 className="card-title-lg mt-4">Noch nichts festgehalten</h2>
      <p className="mt-2 text-sm leading-relaxed text-brand-muted">
        Am Ende eines Gesprächs mit Echo steht der Knopf <strong className="text-navy">„Erkenntnis
        festhalten"</strong>. Echo destilliert dann, was bleiben sollte — du schreibst es um,
        bis es klingt wie du, und legst es hier ab.
      </p>
    </div>
  )
}

function datum(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}
