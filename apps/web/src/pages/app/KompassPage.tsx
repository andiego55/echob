/**
 * /app/kompass — Mein Kompass
 *
 * **Der erste Bereich der App, der keinen Fall braucht.** Alles andere im Nutzerbereich
 * hängt an einer Beziehung: eine Szene gehört zu jemandem, ein Bericht auch. Hier geht es
 * um die Person selbst — und deshalb steht dieser Raum neben den Fällen und nicht in
 * einem drin.
 *
 * **Drei Ebenen, in dieser Reihenfolge.**
 *
 *   1. *Der Puls.* Ganz oben, ohne Umweg, in fünf Sekunden erledigt. Wer die Seite öffnet,
 *      soll etwas TUN können, bevor er etwas liest.
 *   2. *Die drei Eingänge.* Wo ich stehe, mein Verlauf, mein Notfallplan. Drei, nicht acht
 *      — ein Werkzeugkasten, in dem man suchen muss, wird nicht benutzt.
 *   3. *Der Verlauf, leise.* Unten, ohne Aufforderung. Er ist das Ergebnis der oberen
 *      Ebene und darf sich Zeit lassen, bis er etwas zu sagen hat.
 *
 * **Was diese Seite nicht tut: bewerten.** Keine Serien, kein „drei Tage in Folge", kein
 * Lob. Wer festhält, dass es ihm schlecht geht, darf dafür keine Belohnung bekommen —
 * sonst hält er beim nächsten Mal das Falsche fest.
 */
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import Fehlermeldung from '@/components/Fehlermeldung'
import { PageSkeleton } from '@/components/Skeleton'
import PulsErfassen from '@/components/app/kompass/PulsErfassen'
import VerlaufsKurve from '@/components/app/kompass/VerlaufsKurve'
import { kompassApi, type PulsNeu } from '@/api/kompass'
import { casesApi } from '@/api/cases'
import { profileApi } from '@/api/profile'
import { PROFILE_MODULES } from '@/utils/profileModules'
import { bewegung, rhythmusSatz, ton, zeitWort } from '@/lib/kompass'

export default function KompassPage() {
  const qc = useQueryClient()

  const { data: katalog, error: katalogFehler } = useQuery({
    queryKey: ['kompass-katalog'],
    queryFn: kompassApi.katalog,
    // Ein Vokabular ändert sich nicht während einer Sitzung.
    staleTime: Infinity,
  })
  const { data: stand, isLoading, error: standFehler } = useQuery({
    queryKey: ['kompass'],
    queryFn: kompassApi.uebersicht,
  })
  const { data: faelle } = useQuery({
    queryKey: ['cases'],
    queryFn: casesApi.list,
    staleTime: 60_000,
  })
  const { data: profil } = useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.get,
    staleTime: 60_000,
  })

  const anlegen = useMutation({
    mutationFn: (puls: PulsNeu) => kompassApi.pulsAnlegen(puls),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kompass'] }),
  })

  const verlauf = useMemo(() => stand?.verlauf ?? [], [stand])
  const richtung = useMemo(() => bewegung(verlauf), [verlauf])

  const offeneFaelle = (faelle?.cases ?? []).filter(f => !f.archived_at)
  const fertigeModule = profil?.completed_modules?.length ?? 0

  // Der Fehler VOR dem Ladezustand. Ohne diesen Zweig bliebe die Seite bei einem
  // gescheiterten Katalog-Abruf für immer im Skelett stehen — `isLoading` gehört der
  // anderen Abfrage, und `katalog` bleibt einfach leer. Ein Wartezustand, der nie endet,
  // ist die unehrlichste Art, einen Fehler zu zeigen.
  if (katalogFehler || standFehler) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[760px] px-6 py-8">
          <h1 className="page-title">Mein Kompass</h1>
          <Fehlermeldung error={katalogFehler ?? standFehler} className="mt-3" />
        </div>
      </AppShell>
    )
  }

  if (isLoading || !katalog) {
    return <AppShell><PageSkeleton cards={3} label="Dein Kompass wird geladen" /></AppShell>
  }

  const letzter = stand?.letzter_puls ?? null

  return (
    <AppShell>
      <div className="mx-auto max-w-[760px] px-6 py-8">
        <header className="mb-6">
          <h1 className="page-title">Mein Kompass</h1>
          <p className="mt-1 max-w-[62ch] text-sm text-brand-muted">
            Dein eigener Raum — unabhängig von einem Fall. Hier geht es nicht um jemanden,
            mit dem es schwierig ist, sondern um dich.
          </p>
        </header>

        {/* ── Ebene 1: der Puls ─────────────────────────────────────────────── */}
        <section className="card card-hero card-static">
          {letzter && (
            <p className="mb-4 flex items-center justify-center gap-2 text-[0.78rem] text-brand-muted">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: ton(letzter.zustand).hex }}
                aria-hidden="true"
              />
              Zuletzt {zeitWort(letzter.created_at)} — {letzter.zustand_label}
            </p>
          )}

          <PulsErfassen
            katalog={katalog}
            faelle={offeneFaelle}
            onSpeichern={puls => anlegen.mutateAsync(puls)}
          />
        </section>

        {/* ── Ebene 2: die drei Eingänge ────────────────────────────────────── */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Eingang
            to="/app/profile"
            titel="Wo ich stehe"
            text="Eine Selbstbeschreibung über mehrere Bereiche."
            stand={
              fertigeModule === 0
                ? 'Noch nicht begonnen'
                : `${fertigeModule} von ${PROFILE_MODULES.length} Bereichen`
            }
            fertig={fertigeModule > 0}
          />
          <Eingang
            to="/app/kompass/verlauf"
            titel="Mein Verlauf"
            text="Jeder Moment, den du festgehalten hast."
            stand={rhythmusSatz(stand?.rhythmus ?? 0, stand?.verlauf_tage ?? 28)}
            fertig={(stand?.rhythmus ?? 0) > 0}
          />
          <Eingang
            to="/app/kompass/krisenplan"
            titel="Mein Notfallplan"
            text="Was hilft, wenn es kippt — vorher aufgeschrieben."
            stand={stand?.krisenplan_vorhanden ? 'Angelegt' : 'Noch leer'}
            fertig={!!stand?.krisenplan_vorhanden}
          />
        </div>

        <Fehlermeldung error={anlegen.error} className="mt-4" />

        {/* ── Ebene 3: der Verlauf, leise ───────────────────────────────────── */}
        <section className="card card-static mt-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="card-title-lg">Die letzten Wochen</h2>
            {verlauf.length > 0 && (
              <Link
                to="/app/kompass/verlauf"
                className="text-[0.8rem] font-medium text-accent no-underline hover:underline"
              >
                Alles ansehen
              </Link>
            )}
          </div>

          {verlauf.length >= 2 ? (
            <>
              <div className="mt-4">
                <VerlaufsKurve pulse={verlauf} tage={stand?.verlauf_tage ?? 28} hoehe={140} />
              </div>
              <p className="mt-3 text-[0.86rem] text-brand-muted">
                {rhythmusSatz(stand?.rhythmus ?? 0, stand?.verlauf_tage ?? 28)}
                {richtung && <> {richtung.satz}</>}
              </p>
            </>
          ) : (
            // Eine Kurve aus einem Punkt ist keine Kurve, und ein leeres Diagramm sieht
            // aus wie ein Fehler. Also steht hier ein Satz, bis es etwas zu zeigen gibt.
            <p className="mt-2 text-[0.88rem] leading-relaxed text-brand-muted">
              {verlauf.length === 0
                ? 'Sobald du ein paar Momente festgehalten hast, entsteht hier eine Linie. Ein Antippen genügt jeweils.'
                : 'Ein Moment ist noch keine Linie. Ab dem zweiten zeigt sich hier eine Bewegung.'}
            </p>
          )}
        </section>
      </div>
    </AppShell>
  )
}

// ── Einer der drei Eingänge ──────────────────────────────────────────────────
// Bewusst ohne Symbol: Drei Karten mit drei Piktogrammen sehen aus wie eine Startseite
// aus dem Baukasten. Die Überschrift trägt hier genug.
function Eingang({ to, titel, text, stand, fertig }: {
  to: string
  titel: string
  text: string
  stand: string
  fertig: boolean
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col rounded-brand border border-brand-border bg-brand-card p-4 no-underline shadow-brand-sm transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-brand motion-reduce:hover:translate-y-0"
    >
      <span className="card-title-lg transition-colors group-hover:text-accent">{titel}</span>
      <span className="mt-1 flex-1 text-[0.82rem] leading-snug text-brand-muted">{text}</span>
      <span
        className={`mt-3 text-[0.74rem] font-semibold ${fertig ? 'text-accent' : 'text-brand-muted'}`}
      >
        {stand}
      </span>
    </Link>
  )
}
