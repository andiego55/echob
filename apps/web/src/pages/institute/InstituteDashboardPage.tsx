/**
 * /institute/dashboard — Cockpit des Ausbildungsinstituts.
 * Kontingent-Überblick + Fallbibliothek (Karten) mit Filter/Suche + Einstieg in die Generierung.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import InstituteShell from '@/components/institute/InstituteShell'
import { useInstitute } from '@/components/auth/InstituteRoute'
import { instituteApi, DIFFICULTY_LABELS } from '@/api/institute'
import type { ExampleSummary } from '@/types'

const DIFF_STYLE: Record<number, string> = {
  1: 'bg-emerald-100 text-emerald-800',
  2: 'bg-amber-100 text-amber-800',
  3: 'bg-orange-100 text-orange-800',
}

export default function InstituteDashboardPage() {
  const { data: institute } = useInstitute()
  const { data: examples } = useQuery({ queryKey: ['institute-examples'], queryFn: instituteApi.listExamples })

  const list = examples ?? []
  const used = list.length
  const quota = institute?.example_quota ?? 0

  const [search, setSearch] = useState('')
  const [diff, setDiff] = useState<'all' | '1' | '2' | '3'>('all')
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set())

  const allTags = useMemo(() => {
    const s = new Set<string>()
    for (const e of list) for (const t of e.tags ?? []) s.add(t)
    return [...s].sort((a, b) => a.localeCompare(b))
  }, [list])

  const toggleTag = (t: string) =>
    setActiveTags((prev) => {
      const n = new Set(prev)
      if (n.has(t)) n.delete(t)
      else n.add(t)
      return n
    })

  const filtered = useMemo(() => list.filter((e) => {
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false
    if (diff !== 'all' && e.difficulty !== Number(diff)) return false
    if (activeTags.size > 0 && !(e.tags ?? []).some((t) => activeTags.has(t))) return false
    return true
  }), [list, search, diff, activeTags])

  const hasFilters = search !== '' || diff !== 'all' || activeTags.size > 0

  return (
    <InstituteShell>
      <div className="mx-auto max-w-[1100px] px-6 py-10">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy">{institute?.name ?? 'Ausbildungsinstitut'}</h1>
            <p className="mt-1 text-sm text-brand-muted">
              Generieren Sie Beispielfälle, ordnen Sie sie ein und geben Sie sie an Ihre Studierenden frei.
            </p>
          </div>
          <Link
            to="/institute/examples/new"
            className={`btn-primary shrink-0 !py-2 !px-5 !text-sm ${used >= quota ? 'pointer-events-none opacity-40' : ''}`}
            title={used >= quota ? 'Kontingent erreicht' : undefined}
          >
            + Beispielfall generieren
          </Link>
        </div>

        {/* Kontingent */}
        <div className="mb-6 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 rounded-brand border border-brand-border bg-white px-5 py-3 text-sm">
          <span className="text-brand-muted"><strong className="font-bold text-navy">{used}</strong> / {quota} Beispielfälle</span>
          <span className="text-brand-border">·</span>
          <span className="text-brand-muted"><strong className="font-bold text-navy">{institute?.student_quota ?? 0}</strong> Studierenden-Plätze</span>
        </div>

        {list.length === 0 ? (
          <div className="card mx-auto max-w-md py-14 text-center">
            <h2 className="mb-2 text-lg font-semibold text-navy">Noch keine Beispielfälle</h2>
            <p className="mx-auto mb-6 max-w-xs text-sm leading-relaxed text-brand-muted">
              Erzeugen Sie Ihren ersten prototypischen Fall – EchoB generiert Szenen und Onboarding,
              die Sie danach prüfen und ablegen.
            </p>
            <Link to="/institute/examples/new" className="btn-primary !py-2 !px-5 !text-sm">Ersten Beispielfall generieren</Link>
          </div>
        ) : (
          <>
            {/* Filterleiste */}
            <div className="mb-5 rounded-brand border border-brand-border bg-white p-4">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Fall suchen …"
                  className="min-w-[180px] flex-1 rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
                />
                <select
                  value={diff} onChange={(e) => setDiff(e.target.value as typeof diff)}
                  className="rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                >
                  <option value="all">Alle Schwierigkeiten</option>
                  <option value="1">Leicht</option>
                  <option value="2">Mittel</option>
                  <option value="3">Schwer</option>
                </select>
                {hasFilters && (
                  <button onClick={() => { setSearch(''); setDiff('all'); setActiveTags(new Set()) }} className="text-xs font-medium text-accent hover:underline">
                    Zurücksetzen ({filtered.length})
                  </button>
                )}
              </div>
              {allTags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {allTags.map((t) => {
                    const on = activeTags.has(t)
                    return (
                      <button key={t} onClick={() => toggleTag(t)}
                        className={`rounded-full border px-2.5 py-0.5 text-[0.75rem] transition-colors ${on ? 'border-accent bg-accent text-white' : 'border-brand-border text-brand-muted hover:border-accent/50'}`}>
                        {t}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-brand-muted">Kein Fall passt zu den Filtern.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((ex) => <ExampleCard key={ex.id} example={ex} />)}
              </div>
            )}
          </>
        )}
      </div>
    </InstituteShell>
  )
}

function ExampleCard({ example: ex }: { example: ExampleSummary }) {
  const published = ex.status === 'published'
  return (
    <Link to={`/institute/examples/${ex.id}`} className="card block no-underline transition-all hover:border-accent/40 hover:shadow-md">
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${published ? 'bg-green-100 text-green-700' : 'bg-brand-border/40 text-brand-muted'}`}>
          {published ? 'Veröffentlicht' : 'Entwurf'}
        </span>
        {ex.difficulty > 0 && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${DIFF_STYLE[ex.difficulty] ?? ''}`}>{DIFFICULTY_LABELS[ex.difficulty]}</span>
        )}
        {ex.has_partner && <span className="ml-auto rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">Paar</span>}
      </div>
      <p className="text-sm font-semibold leading-snug text-navy">{ex.title}</p>
      {ex.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {ex.tags.slice(0, 4).map((t) => <span key={t} className="rounded bg-brand-bg px-1.5 py-0.5 text-[10px] text-brand-muted">{t}</span>)}
        </div>
      )}
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-[11px] text-brand-muted/80">{ex.scene_count} Szenen</span>
        <span className="shrink-0 text-xs font-medium text-accent">Öffnen →</span>
      </div>
    </Link>
  )
}
