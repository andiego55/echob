/**
 * /app/kompass/saetze — Sätze über mich
 *
 * **Das Gedächtnis des Kompasses.** Der Puls sagt, wie es gerade ist. Der Satz sagt, was
 * sich als wahr herausgestellt hat. Erst zusammen ergeben sie einen Raum, der etwas über
 * jemanden weiß, statt nur Zahlen zu sammeln.
 *
 * **Vier Stapel, und die Reihenfolge ist eine Aussage.** Ganz oben, was Echo fragt — das
 * sind offene Fragen an die Person und keine Aussagen über sie. Darunter die eigenen
 * Entwürfe. Dann die bestätigten: das, was gilt. Unten und eingeklappt die überholten,
 * weil die Bewegung selbst etwas sagt. Wer nach einem Jahr sieht, dass „Wenn ich Nein
 * sage, bin ich egoistisch" überholt ist, sieht mehr als in jeder Kurve.
 *
 * **Vorschlag und Entwurf sehen verschieden aus, und das ist der Kern.** Ein Entwurf ist
 * etwas, das jemand über sich geschrieben hat; ein Vorschlag ist Echos Frage. Verschwimmt
 * das, steht irgendwann in „Das gilt" ein Satz, den ein Modell formuliert und niemand
 * geprüft hat.
 *
 * **Bestätigt heißt nicht wahr.** Deshalb steht neben jedem bestätigten Satz, wie alt die
 * Zustimmung ist, und deshalb gibt es „überholt" neben „löschen".
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import Fehlermeldung from '@/components/Fehlermeldung'
import { PageSkeleton } from '@/components/Skeleton'
import { useBestaetigen } from '@/components/Bestaetigung'
import SatzKarte from '@/components/app/kompass/SatzKarte'
import SatzSchreiben from '@/components/app/kompass/SatzSchreiben'
import VorschlagsKarte from '@/components/app/kompass/VorschlagsKarte'
import { kompassApi, type Satz, type SatzAenderung, type SatzNeu } from '@/api/kompass'

/** Muss zu MAX_OFFENE_VORSCHLAEGE im Dienst passen — dort wird es erzwungen. */
const MAX_OFFENE = 3

export default function KompassSaetzePage() {
  const qc = useQueryClient()
  const bestaetigen = useBestaetigen()
  const [schreibt, setSchreibt] = useState(false)
  const [ueberholteOffen, setUeberholteOffen] = useState(false)
  const [hinweis, setHinweis] = useState<string | null>(null)

  const { data: katalog, error: katalogFehler } = useQuery({
    queryKey: ['kompass-katalog'],
    queryFn: kompassApi.katalog,
    staleTime: Infinity,
  })
  const { data: saetze, isLoading, error: saetzeFehler } = useQuery({
    queryKey: ['kompass-saetze'],
    queryFn: kompassApi.saetze,
  })

  const frisch = () => {
    qc.invalidateQueries({ queryKey: ['kompass-saetze'] })
    qc.invalidateQueries({ queryKey: ['kompass'] })
  }

  const anlegen = useMutation({
    mutationFn: (satz: SatzNeu) => kompassApi.satzAnlegen(satz),
    onSuccess: () => { frisch(); setSchreibt(false) },
  })
  const aendern = useMutation({
    mutationFn: ({ id, ...rest }: SatzAenderung & { id: string }) =>
      kompassApi.satzAendern(id, rest),
    onSuccess: frisch,
  })
  const loeschen = useMutation({
    mutationFn: (id: string) => kompassApi.satzLoeschen(id),
    onSuccess: frisch,
  })
  const holen = useMutation({
    mutationFn: () => kompassApi.vorschlaegeHolen(),
    onSuccess: (lauf) => { frisch(); setHinweis(lauf.hinweis) },
  })
  const entscheiden = useMutation({
    mutationFn: ({ id, annehmen }: { id: string; annehmen: boolean }) =>
      kompassApi.vorschlagEntscheiden(id, annehmen),
    onSuccess: () => { frisch(); setHinweis(null) },
  })

  const stapel = useMemo(() => {
    const alle = saetze ?? []
    const entwuerfe = alle.filter(s => s.stand === 'entwurf')
    return {
      // Echos Fragen und die eigenen Notizen liegen im selben Stand, sind aber zwei
      // verschiedene Dinge: Das eine wartet auf eine Antwort, das andere auf einen Blick.
      vorschlaege: entwuerfe.filter(s => s.herkunft !== 'selbst'),
      entwurf: entwuerfe.filter(s => s.herkunft === 'selbst'),
      bestaetigt: alle.filter(s => s.stand === 'bestaetigt'),
      ueberholt: alle.filter(s => s.stand === 'ueberholt'),
    }
  }, [saetze])

  async function wegwerfen(s: Satz) {
    const ok = await bestaetigen({
      titel: 'Diesen Satz löschen?',
      text: 'Er verschwindet ganz. Wenn er nur nicht mehr stimmt, ist „Überholt" das '
        + 'Richtige — dann bleibt sichtbar, dass sich etwas bewegt hat.',
      knopf: 'Löschen',
      gefahr: true,
    })
    if (ok) loeschen.mutate(s.id)
  }

  if (katalogFehler || saetzeFehler) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[720px] px-6 py-8">
          <h1 className="page-title">Sätze über mich</h1>
          <Fehlermeldung error={katalogFehler ?? saetzeFehler} className="mt-3" />
        </div>
      </AppShell>
    )
  }

  if (isLoading || !katalog) {
    return <AppShell><PageSkeleton cards={2} label="Deine Sätze werden geladen" /></AppShell>
  }

  const nochNichts = (saetze ?? []).length === 0
  const zuVieleOffen = stapel.vorschlaege.length >= MAX_OFFENE

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
          <h1 className="page-title">Sätze über mich</h1>
          <p className="mt-1 max-w-[62ch] text-sm text-brand-muted">
            Was du über dich herausgefunden hast — in Sätzen, die du selbst bestätigt
            hast. Der Puls hält fest, wie es gerade ist. Hier steht, was bleibt.
          </p>
        </header>

        {/* ── Selbst schreiben ───────────────────────────────────────────── */}
        <section className="card card-hero card-static">
          {schreibt || nochNichts ? (
            <SatzSchreiben
              arten={katalog.satz_arten}
              maxZeichen={katalog.satz_max_zeichen}
              onSpeichern={satz => anlegen.mutateAsync(satz)}
              onAbbrechen={nochNichts ? undefined : () => setSchreibt(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setSchreibt(true)}
              className="flex w-full items-center justify-center gap-2 py-2 text-[0.92rem] font-semibold text-accent transition-colors hover:text-accent-hover"
            >
              <span aria-hidden="true">+</span> Einen Satz aufschreiben
            </button>
          )}
        </section>

        {/* ── Echo fragen ────────────────────────────────────────────────── */}
        {/* Der einzige Knopf im Kompass, hinter dem ein Modell steht — und er wird
            gedrückt, nie von selbst ausgelöst. Wer eine Woche nichts erfasst, findet
            hier keine Erinnerung, sondern denselben Raum wie beim letzten Mal. */}
        <section className="mt-3 rounded-brand border border-dashed border-brand-border bg-brand-bg/50 p-4">
          {holen.isPending ? (
            <p className="flex items-center justify-center gap-2 py-1 text-[0.88rem] text-brand-muted">
              <span className="flex gap-1" aria-hidden="true">
                <span className="echo-welle h-1.5 w-1.5 rounded-full bg-accent" />
                <span className="echo-welle h-1.5 w-1.5 rounded-full bg-accent" />
                <span className="echo-welle h-1.5 w-1.5 rounded-full bg-accent" />
              </span>
              Echo liest deine letzten Szenen und Momente …
            </p>
          ) : zuVieleOffen ? (
            <p className="text-center text-[0.86rem] text-brand-muted">
              Entscheide erst über die offenen Fragen — danach schaue ich wieder.
            </p>
          ) : (
            <div className="text-center">
              <button
                type="button"
                onClick={() => { setHinweis(null); holen.mutate() }}
                className="text-[0.92rem] font-semibold text-navy transition-colors hover:text-accent"
              >
                Echo schauen lassen, was sich wiederholt
              </button>
              <p className="mt-1 text-[0.78rem] leading-relaxed text-brand-muted">
                Liest deine letzten Szenen und Momente und schlägt höchstens drei Sätze
                vor. Nichts davon gilt, bevor du zustimmst.
              </p>
            </div>
          )}

          {hinweis && !holen.isPending && (
            <p className="beitrag-neu mt-3 text-center text-[0.86rem] italic text-brand-muted">
              {hinweis}
            </p>
          )}
          <Fehlermeldung error={holen.error} className="mt-2 text-center" />
        </section>

        {nochNichts && (
          <p className="mt-4 max-w-[62ch] text-[0.88rem] leading-relaxed text-brand-muted">
            Noch steht hier nichts. Das ist der normale Anfang — solche Sätze fallen
            einem selten auf Kommando ein. Oft kommen sie nach einer Szene oder an einem
            Tag, an dem etwas deutlich wurde.
          </p>
        )}

        {/* ── Echos Fragen ───────────────────────────────────────────────── */}
        {stapel.vorschlaege.length > 0 && (
          <Stapel
            titel="Echo fragt"
            hinweis="Vorschläge aus deinem Material. Erst deine Zustimmung macht daraus einen Satz über dich."
          >
            {stapel.vorschlaege.map(s => (
              <VorschlagsKarte
                key={s.id}
                satz={s}
                laeuft={entscheiden.isPending}
                onEntscheiden={annehmen => entscheiden.mutate({ id: s.id, annehmen })}
              />
            ))}
          </Stapel>
        )}

        {/* ── Eigene Entwürfe ────────────────────────────────────────────── */}
        {stapel.entwurf.length > 0 && (
          <Stapel
            titel="Noch nicht bestätigt"
            hinweis="Lies sie noch einmal. Stimmt der Satz heute — oder war das ein Tag?"
          >
            {stapel.entwurf.map(s => (
              <SatzKarte
                key={s.id} satz={s} laeuft={aendern.isPending}
                onAendern={a => aendern.mutate({ id: s.id, ...a })}
                onLoeschen={() => wegwerfen(s)}
              />
            ))}
          </Stapel>
        )}

        {/* ── Bestätigt ──────────────────────────────────────────────────── */}
        {stapel.bestaetigt.length > 0 && (
          <Stapel
            titel="Das gilt"
            hinweis="Deine Einschätzung von dem Tag, an dem du zugestimmt hast — kein Befund."
          >
            {stapel.bestaetigt.map(s => (
              <SatzKarte
                key={s.id} satz={s} laeuft={aendern.isPending}
                onAendern={a => aendern.mutate({ id: s.id, ...a })}
                onLoeschen={() => wegwerfen(s)}
              />
            ))}
          </Stapel>
        )}

        {/* ── Überholt ───────────────────────────────────────────────────── */}
        {stapel.ueberholt.length > 0 && (
          <section className="mt-8">
            <button
              type="button"
              onClick={() => setUeberholteOffen(o => !o)}
              aria-expanded={ueberholteOffen}
              className="flex items-center gap-1.5 text-[0.82rem] font-medium text-brand-muted transition-colors hover:text-navy"
            >
              <svg
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
                className={`h-3.5 w-3.5 transition-transform duration-200 motion-reduce:transition-none ${ueberholteOffen ? 'rotate-90' : ''}`}
                aria-hidden="true"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
              Was nicht mehr stimmt ({stapel.ueberholt.length})
            </button>

            {ueberholteOffen && (
              <div className="beitrag-neu mt-3 space-y-2">
                <p className="max-w-[62ch] text-[0.82rem] leading-relaxed text-brand-muted">
                  Diese Sätze bleiben stehen, weil die Bewegung selbst etwas sagt. Ein
                  Glaubenssatz, der sich überlebt hat, ist oft aufschlussreicher als ein
                  aktueller.
                </p>
                {stapel.ueberholt.map(s => (
                  <SatzKarte
                    key={s.id} satz={s} laeuft={aendern.isPending}
                    onAendern={a => aendern.mutate({ id: s.id, ...a })}
                    onLoeschen={() => wegwerfen(s)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        <Fehlermeldung
          error={anlegen.error ?? aendern.error ?? loeschen.error ?? entscheiden.error}
          className="mt-4"
        />
      </div>
    </AppShell>
  )
}

// ── Ein Stapel ───────────────────────────────────────────────────────────────

function Stapel({ titel, hinweis, children }: {
  titel: string
  hinweis: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-8">
      <h2 className="card-title-lg">{titel}</h2>
      <p className="mt-0.5 max-w-[62ch] text-[0.82rem] text-brand-muted">{hinweis}</p>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  )
}
