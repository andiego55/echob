/**
 * /app/kompass/vorhaben — Was ich mir vornehme
 *
 * **Die dritte Grundform.** Der Puls sagt, wie es gerade ist. Der Satz sagt, was sich als
 * wahr herausgestellt hat. Das Vorhaben sagt, was werden soll.
 *
 * **Warum die Schritte optional sind.** Wer sich etwas vornimmt, weiß oft noch nicht, wie.
 * Ein Formular, das drei Schritte verlangt, verhindert das Vorhaben — nachtragen ist
 * leichter, als sie vorher zu erfinden.
 *
 * **Warum nach dem Rhythmus gefragt wird.** Ein Vorhaben ohne Rückschau ist ein Vorsatz:
 * Man nimmt es sich vor, und niemand kommt je darauf zurück. Der Abstand ist deshalb
 * eine eigene Frage — und „ohne festen Rhythmus" eine gültige Antwort, keine fehlende.
 *
 * **Erreichtes bleibt stehen.** Eine Liste, die nur das Offene zeigt, liest sich nach
 * einem halben Jahr wie eine Mahnung. Man vergisst sonst, was schon ging.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import Fehlermeldung from '@/components/Fehlermeldung'
import { PageSkeleton } from '@/components/Skeleton'
import { useBestaetigen } from '@/components/Bestaetigung'
import VorhabenKarte from '@/components/app/kompass/VorhabenKarte'
import {
  kompassApi,
  type Schritt,
  type Vorhaben,
  type VorhabenAenderung,
} from '@/api/kompass'

export default function KompassVorhabenPage() {
  const qc = useQueryClient()
  const bestaetigen = useBestaetigen()
  const [schreibt, setSchreibt] = useState(false)

  const { data: katalog, error: katalogFehler } = useQuery({
    queryKey: ['kompass-katalog'],
    queryFn: kompassApi.katalog,
    staleTime: Infinity,
  })
  const { data: vorhaben, isLoading, error: listeFehler } = useQuery({
    queryKey: ['kompass-vorhaben'],
    queryFn: kompassApi.vorhaben,
  })

  const frisch = () => {
    qc.invalidateQueries({ queryKey: ['kompass-vorhaben'] })
    qc.invalidateQueries({ queryKey: ['kompass'] })
  }

  const anlegen = useMutation({
    mutationFn: kompassApi.vorhabenAnlegen,
    onSuccess: () => { frisch(); setSchreibt(false) },
  })
  const aendern = useMutation({
    mutationFn: ({ id, ...rest }: VorhabenAenderung & { id: string }) =>
      kompassApi.vorhabenAendern(id, rest),
    onSuccess: frisch,
  })
  const loeschen = useMutation({
    mutationFn: kompassApi.vorhabenLoeschen,
    onSuccess: frisch,
  })

  const stapel = useMemo(() => {
    const alle = vorhaben ?? []
    return {
      laufend: alle.filter(v => v.stand === 'laufend'),
      ruht: alle.filter(v => v.stand === 'ruht'),
      erreicht: alle.filter(v => v.stand === 'erreicht'),
    }
  }, [vorhaben])

  async function wegwerfen(v: Vorhaben) {
    const ok = await bestaetigen({
      titel: 'Dieses Vorhaben löschen?',
      text: 'Es verschwindet ganz, samt seiner Schritte. Wenn es nur gerade nicht dran '
        + 'ist, lass es ruhen — dann bleibt es da, ohne zu drängen.',
      knopf: 'Löschen',
      gefahr: true,
    })
    if (ok) loeschen.mutate(v.id)
  }

  if (katalogFehler || listeFehler) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[720px] px-6 py-8">
          <h1 className="page-title">Was ich mir vornehme</h1>
          <Fehlermeldung error={katalogFehler ?? listeFehler} className="mt-3" />
        </div>
      </AppShell>
    )
  }

  if (isLoading || !katalog) {
    return (
      <AppShell>
        <PageSkeleton cards={2} label="Deine Vorhaben werden geladen" />
      </AppShell>
    )
  }

  const nochNichts = (vorhaben ?? []).length === 0

  return (
    <AppShell>
      <div className="mx-auto max-w-[720px] px-6 py-8">
        <Link
          to="/app/kompass"
          className="text-[0.8rem] text-brand-muted no-underline transition-colors hover:text-navy"
        >
          ← Mein Kompass
        </Link>

        <header className="mb-6 mt-3">
          <h1 className="page-title">Was ich mir vornehme</h1>
          <p className="mt-1 max-w-[62ch] text-sm text-brand-muted">
            Ein Vorhaben ist kein Vorsatz: Es hat Schritte, die du abhaken kannst, und
            einen Abstand, in dem du darauf zurückschaust.
          </p>
        </header>

        <section className="card card-hero card-static">
          {schreibt || nochNichts ? (
            <VorhabenSchreiben
              katalog={katalog}
              onSpeichern={v => anlegen.mutateAsync(v)}
              onAbbrechen={nochNichts ? undefined : () => setSchreibt(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setSchreibt(true)}
              className="flex w-full items-center justify-center gap-2 py-2 text-[0.92rem] font-semibold text-accent transition-colors hover:text-accent-hover"
            >
              <span aria-hidden="true">+</span> Etwas vornehmen
            </button>
          )}
        </section>

        <p className="mt-4 max-w-[62ch] text-[0.86rem] leading-relaxed text-brand-muted">
          Geht es um ein Gespräch?{' '}
          <Link
            to="/app/kompass/uebungen?u=gespraech"
            className="font-semibold text-accent no-underline hover:underline"
          >
            Eine Übung
          </Link>{' '}
          macht daraus ein Vorhaben mit Schritten.
        </p>

        {nochNichts && (
          <p className="mt-4 max-w-[62ch] text-[0.88rem] leading-relaxed text-brand-muted">
            Noch nichts. Gute Vorhaben entstehen selten am Schreibtisch — eher nach einer
            Szene, in der dir klar wurde, was du beim nächsten Mal anders machen willst.
          </p>
        )}

        {stapel.laufend.length > 0 && (
          <Stapel titel="Läuft">
            {stapel.laufend.map(v => (
              <VorhabenKarte
                key={v.id} vorhaben={v} laeuft={aendern.isPending}
                onAendern={a => aendern.mutate({ id: v.id, ...a })}
                onLoeschen={() => wegwerfen(v)}
              />
            ))}
          </Stapel>
        )}

        {stapel.ruht.length > 0 && (
          <Stapel titel="Ruht" hinweis="Gerade nicht dran. Kein Scheitern, eine Lage.">
            {stapel.ruht.map(v => (
              <VorhabenKarte
                key={v.id} vorhaben={v} laeuft={aendern.isPending}
                onAendern={a => aendern.mutate({ id: v.id, ...a })}
                onLoeschen={() => wegwerfen(v)}
              />
            ))}
          </Stapel>
        )}

        {stapel.erreicht.length > 0 && (
          <Stapel
            titel="Erreicht"
            hinweis="Bleibt stehen — man vergisst sonst, was schon ging."
          >
            {stapel.erreicht.map(v => (
              <VorhabenKarte
                key={v.id} vorhaben={v} laeuft={aendern.isPending}
                onAendern={a => aendern.mutate({ id: v.id, ...a })}
                onLoeschen={() => wegwerfen(v)}
              />
            ))}
          </Stapel>
        )}

        <Fehlermeldung
          error={anlegen.error ?? aendern.error ?? loeschen.error}
          className="mt-4"
        />
      </div>
    </AppShell>
  )
}

// ── Ein Stapel ───────────────────────────────────────────────────────────────

function Stapel({ titel, hinweis, children }: {
  titel: string
  hinweis?: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-8">
      <h2 className="card-title-lg">{titel}</h2>
      {hinweis && (
        <p className="mt-0.5 max-w-[62ch] text-[0.82rem] text-brand-muted">{hinweis}</p>
      )}
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  )
}

// ── Etwas vornehmen ──────────────────────────────────────────────────────────

function VorhabenSchreiben({ katalog, onSpeichern, onAbbrechen }: {
  katalog: NonNullable<Awaited<ReturnType<typeof kompassApi.katalog>>>
  onSpeichern: (v: {
    titel: string; warum: string | null; schritte: Schritt[]; rhythmus_tage: number
  }) => Promise<unknown>
  onAbbrechen?: () => void
}) {
  const [titel, setTitel] = useState('')
  const [warum, setWarum] = useState('')
  const [schritte, setSchritte] = useState<string[]>([])
  const [rhythmus, setRhythmus] = useState(0)
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState<unknown>(null)

  async function speichern() {
    if (!titel.trim() || laeuft) return
    setLaeuft(true)
    setFehler(null)
    try {
      await onSpeichern({
        titel: titel.trim(),
        warum: warum.trim() || null,
        schritte: schritte.map(t => t.trim()).filter(Boolean).map(text => ({ text })),
        rhythmus_tage: rhythmus,
      })
      setTitel(''); setWarum(''); setSchritte([]); setRhythmus(0)
    } catch (e) {
      setFehler(e)
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <div>
      <label htmlFor="vorhaben-titel" className="text-[0.86rem] font-semibold text-navy">
        Was nimmst du dir vor?
      </label>
      <input
        id="vorhaben-titel"
        type="text"
        value={titel}
        onChange={e => setTitel(e.target.value.slice(0, katalog.vorhaben_max_titel))}
        placeholder="Im Streit nicht mehr sofort einlenken."
        className="input mt-2"
      />

      {/* Erst mit dem Titel: Vorher sind es vier leere Felder über einer ungestellten
          Frage, und das sieht aus wie eine Aufgabe. */}
      {titel.trim() && (
        <div className="beitrag-neu mt-4 space-y-4">
          <div>
            <label htmlFor="vorhaben-warum" className="section-label">
              Warum ist dir das wichtig?
            </label>
            <textarea
              id="vorhaben-warum"
              value={warum}
              onChange={e => setWarum(e.target.value.slice(0, 1000))}
              rows={2}
              placeholder="Muss nichts Großes sein. Hilft an den Tagen, an denen es mühsam wird."
              className="input mt-2 resize-y"
            />
          </div>

          <div>
            <p className="section-label">Erste Schritte</p>
            <p className="mt-0.5 text-[0.76rem] text-brand-muted">
              Freiwillig. Der erste soll leicht sein — du kannst sie jederzeit ergänzen.
            </p>
            <div className="mt-2 space-y-2">
              {schritte.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={s}
                    onChange={e => setSchritte(alt => alt.map(
                      (x, j) => j === i ? e.target.value.slice(0, katalog.schritt_max_zeichen) : x))}
                    aria-label={`Schritt ${i + 1}`}
                    className="input"
                  />
                  <button
                    type="button"
                    onClick={() => setSchritte(alt => alt.filter((_, j) => j !== i))}
                    aria-label={`Schritt ${i + 1} entfernen`}
                    className="shrink-0 rounded-brand-sm p-2 text-brand-muted transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4"
                      aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            {schritte.length < katalog.max_schritte && (
              <button
                type="button"
                onClick={() => setSchritte(alt => [...alt, ''])}
                className="mt-2 text-[0.82rem] font-medium text-accent transition-colors hover:text-accent-hover"
              >
                + Schritt
              </button>
            )}
          </div>

          <div>
            <label htmlFor="vorhaben-rhythmus" className="section-label">
              Wann schaust du darauf zurück?
            </label>
            <select
              id="vorhaben-rhythmus"
              value={rhythmus}
              onChange={e => setRhythmus(Number(e.target.value))}
              className="input mt-2"
            >
              {katalog.rueckschau_rhythmen.map(r => (
                <option key={r.tage} value={r.tage}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {onAbbrechen && (
              <button type="button" onClick={onAbbrechen} className="btn-quiet !px-4 !py-2 !text-sm">
                Abbrechen
              </button>
            )}
            <button
              type="button"
              onClick={speichern}
              disabled={laeuft || !titel.trim()}
              className="btn-primary !px-5 !py-2 !text-sm disabled:opacity-50"
            >
              {laeuft ? 'Wird angelegt …' : 'Vornehmen'}
            </button>
          </div>

          <Fehlermeldung error={fehler} />
        </div>
      )}
    </div>
  )
}
