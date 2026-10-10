/**
 * Belege in Echos Antworten auflösen, zeigen und öffnen.
 *
 * **Warum ein Kontext und keine Eigenschaft.** Der Verweis entsteht tief im Markdown-Baum,
 * in der `a`-Komponente. Die Bausteine-Tabelle von `MarkdownMessage` steht bewusst modulweit
 * (sonst baut react-markdown seinen Baum bei jedem Zeichen neu, siehe dort) und kann
 * deshalb nichts über den Fall wissen. Ein Kontext ist der einzige Weg, der beides erhält.
 *
 * **Warum die Vorschau wichtiger ist als der Link.** Ein Klick führt aus dem Gespräch
 * heraus — mitten in einem Gedankengang ist das teuer. Wer beim Lesen von „Szene 12" nur
 * kurz wissen will, welche Szene das war, soll mit dem Zeiger darüberfahren und
 * weiterlesen können. Der Klick bleibt für den Fall, dass man wirklich hinwill.
 *
 * **Was ein unbekannter Verweis tut: nichts.** Nennt Echo eine Nummer, die es nicht gibt —
 * ein Zahlendreher, eine gelöschte Szene —, bleibt schlichter Text stehen. Ein toter Link
 * wäre schlimmer als kein Link: Man klickt und landet auf einer Fehlerseite, und das
 * nächste Mal glaubt man auch den funktionierenden nicht mehr.
 */
import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { scenesApi } from '@/api/scenes'
import { caseDocumentsApi, KIND_LABELS } from '@/api/caseDocuments'
import { caseArtifactsApi } from '@/api/caseArtifacts'
import { topicSummariesApi } from '@/api/topicSummaries'
import { hypothesesApi } from '@/api/hypotheses'
import { gefuehlsbildApi } from '@/api/gefuehlsbild'
import { testResultsApi } from '@/api/testResults'
import { namePasst, type Beleg } from '@/lib/belege'

interface Ziel {
  href: string
  /** Der Titel — er macht aus einer Nummer eine Auskunft. */
  titel: string
  /** Datum, Art, Belastung — eine Zeile Einordnung. */
  zeile: string
  /** Ein Auszug, damit man ohne Klick weiß, worum es ging. */
  text: string | null
  marken: string[]
  /**
   * Ein Hinweis, der nicht überlesen werden darf — etwa eine als sicherheitsrelevant
   * markierte Szene.
   *
   * Bewusst nicht als weitere Marke: Marken sind Muster-Etiketten und stehen
   * gleichberechtigt nebeneinander. Wer ein Gespräch vorbereitet, muss diesen einen
   * Hinweis sehen, bevor er die anderen liest.
   */
  warnung?: string | null
}

export type Aufloeser = (beleg: Beleg) => Ziel | null

const BelegKontext = createContext<Aufloeser | null>(null)

/**
 * Der Kontext ohne die Frage, WOHER die Einträge kommen.
 *
 * Der Nutzerbereich löst aus den eigenen Fall-Abfragen auf und verlinkt nach `/app/…`;
 * der Fachpersonenbereich löst aus dem freigegebenen Material auf und verlinkt nach
 * `/professional/…`. Gemeinsam ist alles andere — deshalb steht hier nur die Weitergabe.
 */
export function BelegeKontextProvider(
  { aufloesen, children }: { aufloesen: Aufloeser; children: ReactNode },
) {
  return <BelegKontext.Provider value={aufloesen}>{children}</BelegKontext.Provider>
}

export type { Ziel }

/** Höchstens so viel Text in der Vorschau — sie soll ergänzen, nicht ersetzen. */
const VORSCHAU_ZEICHEN = 320

function datum(iso: string | null): string {
  if (!iso) return 'ohne Datum'
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

function kuerzen(text: string | null | undefined): string | null {
  const t = (text ?? '').trim()
  if (!t) return null
  return t.length > VORSCHAU_ZEICHEN ? `${t.slice(0, VORSCHAU_ZEICHEN).trimEnd()} …` : t
}

/**
 * Der Hinweis, der nicht überlesen werden darf.
 *
 * Szenen tragen eine Sicherheitsmarkierung. Wer ein Gespräch vorbereitet und nur den
 * Verweis „Szene 12" liest, sähe sie sonst nicht — und genau diese Szene ist die, bei der
 * es darauf ankommt.
 */
function sicherheitsWarnung(stufe: string | null | undefined): string | null {
  if (!stufe || stufe === 'none') return null
  return stufe === 'acute'
    ? 'Als akut sicherheitsrelevant markiert'
    : 'Als sicherheitsrelevant markiert'
}

/**
 * Stellt die Auflösung für einen Fall bereit.
 *
 * Die Abfragen teilen sich die Zwischenspeicher-Schlüssel mit den übrigen Seiten
 * (`scenes`, `case-documents`, `case-artifacts`, `topic-summaries`, `hypotheses`,
 * `gefuehlsbild-ueberblick`, `test-results`) — wer von der Fallübersicht kommt, löst hier keine neue
 * Anfrage aus.
 *
 * Beim Gefühlsbild bewusst `ueberblick` und nicht `stand`: `stand` legt einen Entwurf an.
 * Ein Gespräch zu öffnen darf keinen anlegen.
 */
export function BelegeProvider({ caseId, children }: { caseId: string; children: ReactNode }) {
  const { data: szenen } = useQuery({
    queryKey: ['scenes', caseId],
    queryFn: () => scenesApi.list(caseId),
    enabled: !!caseId, retry: false, staleTime: 60_000,
  })
  const { data: dokumente } = useQuery({
    queryKey: ['case-documents', caseId],
    queryFn: () => caseDocumentsApi.list(caseId),
    enabled: !!caseId, retry: false, staleTime: 60_000,
  })
  const { data: erkenntnisse } = useQuery({
    queryKey: ['case-artifacts', caseId],
    queryFn: () => caseArtifactsApi.list(caseId),
    enabled: !!caseId, retry: false, staleTime: 60_000,
  })
  const { data: themen } = useQuery({
    queryKey: ['topic-summaries', caseId],
    queryFn: () => topicSummariesApi.list(caseId),
    enabled: !!caseId, retry: false, staleTime: 60_000,
  })
  const { data: hypothesen } = useQuery({
    queryKey: ['hypotheses', caseId],
    queryFn: () => hypothesesApi.list(caseId),
    enabled: !!caseId, retry: false, staleTime: 60_000,
  })
  // Am Konto, nicht am Fall - deshalb ohne caseId im Schluessel, wie auf der Uebersicht.
  const { data: tests } = useQuery({
    queryKey: ['test-results'],
    queryFn: () => testResultsApi.list(),
    retry: false, staleTime: 60_000,
  })
  const { data: gefuehlsbild } = useQuery({
    queryKey: ['gefuehlsbild-ueberblick', caseId],
    queryFn: () => gefuehlsbildApi.ueberblick(caseId),
    enabled: !!caseId, retry: false, staleTime: 60_000,
  })

  const aufloesen = useMemo<Aufloeser>(() => {
    const s = new Map<number, Ziel>()
    for (const z of szenen?.scenes ?? []) {
      if (!z.scene_no) continue
      const belastung = z.distress_score ? ` · Belastung ${z.distress_score}/5` : ''
      s.set(z.scene_no, {
        href: `/app/cases/${caseId}/scenes/${z.id}`,
        titel: z.title,
        zeile: `${datum(z.scene_date)}${belastung}`,
        text: kuerzen(z.description),
        marken: z.pattern_tags ?? [],
        warnung: sicherheitsWarnung(z.safety_level),
      })
    }

    const d = new Map<number, Ziel>()
    for (const z of dokumente?.documents ?? []) {
      if (!z.doc_no) continue
      d.set(z.doc_no, {
        href: `/app/cases/${caseId}/documents`,
        titel: z.title,
        zeile: `${KIND_LABELS[z.kind]} · ${datum(z.document_date)}`,
        text: kuerzen(z.description ?? z.content),
        marken: [],
      })
    }

    const e = new Map<number, Ziel>()
    for (const z of erkenntnisse?.artifacts ?? []) {
      if (!z.artifact_no) continue
      e.set(z.artifact_no, {
        href: `/app/cases/${caseId}/artifacts`,
        titel: z.title,
        zeile: `festgehalten am ${datum(z.created_at)}`,
        text: kuerzen(z.body),
        marken: z.status === 'ueberholt' ? ['gilt nicht mehr'] : [],
      })
    }

    const themenZiele = (themen ?? [])
      .filter(t => t.summary_text?.trim())
      .map(t => ({
        name: t.topic_label,
        ziel: {
          href: `/app/cases/${caseId}/topics/${t.topic}`,
          titel: `Themendialog „${t.topic_label}“`,
          zeile: 'deine bestätigte Zusammenfassung',
          text: kuerzen(t.summary_text),
          marken: [],
        } satisfies Ziel,
      }))

    const hypothesenZiele = (hypothesen ?? [])
      .filter(h => h.summary_text?.trim())
      .map(h => ({
        name: h.label,
        ziel: {
          href: `/app/cases/${caseId}/hypotheses/${h.hypothesis_type}`,
          titel: `Hypothese „${h.label}“`,
          zeile: `zuletzt bearbeitet am ${datum(h.updated_at)}`,
          text: kuerzen(h.summary_text),
          marken: ['tastend, keine Diagnose'],
        } satisfies Ziel,
      }))

    const testZiele = (tests ?? []).map(t => {
      const r = t.result
      const kern = r.mode === 'typology' && r.primary
        ? `am stärksten: ${r.primary.name}`
        : r.overall ? `Gesamt ${Math.round(r.overall.score)}/100${r.overall.band ? ` · ${r.overall.band.label}` : ''}` : ''
      return {
        name: t.title,
        ziel: {
          // Springt auf der Fall-Uebersicht zur Karte und klappt genau dieses Ergebnis auf.
          href: `/app/cases/${caseId}#selbsttest-${t.slug}`,
          titel: `Selbsttest „${t.title}“`,
          zeile: `ausgefüllt am ${datum(r.answeredAt ?? t.updated_at)}${kern ? ` · ${kern}` : ''}`,
          text: kuerzen(r.dimensions.map(d => `${d.name}: ${Math.round(d.score)}${r.mode === 'typology' ? ' %' : '/100'}`).join(' · ')),
          marken: ['Selbsteinschätzung, kein Befund'],
          warnung: r.flags.length > 0 ? 'Enthält Angaben, die ernst zu nehmen sind' : null,
        } satisfies Ziel,
      }
    })

    // Nur ein BESTÄTIGTES Bild ist ein Beleg. Ein Entwurf ist noch nicht ihre Aussage.
    const bild = gefuehlsbild?.aktuell
    const bildZiel: Ziel | null = bild?.bericht?.trim()
      ? {
          href: `/app/cases/${caseId}/gefuehlsbild`,
          titel: 'Dein Gefühlsbild',
          zeile: `festgehalten am ${datum(bild.bestaetigt_at)}${bild.ecke ? ` · ${bild.ecke}` : ''}`,
          text: kuerzen(bild.bericht),
          marken: bild.woerter_labels.slice(0, 4).map(w => w.label),
        }
      : null

    return (beleg) => {
      switch (beleg.art) {
        case 'szene': return s.get(beleg.nr) ?? null
        case 'dokument': return d.get(beleg.nr) ?? null
        case 'erkenntnis': return e.get(beleg.nr) ?? null
        case 'themendialog':
          return themenZiele.find(t => namePasst(beleg.name, t.name))?.ziel ?? null
        case 'hypothese':
          return hypothesenZiele.find(h => namePasst(beleg.name, h.name))?.ziel ?? null
        case 'selbsttest':
          return testZiele.find(t => namePasst(beleg.name, t.name))?.ziel ?? null
        case 'gefuehlsbild': return bildZiel
      }
    }
  }, [caseId, szenen, dokumente, erkenntnisse, themen, hypothesen, tests, gefuehlsbild])

  return <BelegeKontextProvider aufloesen={aufloesen}>{children}</BelegeKontextProvider>
}

/** Hilfsmittel für eigene Auflöser — damit Datum und Kürzung überall gleich aussehen. */
export const belegHelfer = { datum, kuerzen, sicherheitsWarnung }

/**
 * Ein Verweis im Fließtext.
 *
 * Zeiger darüber (oder Tastaturfokus) zeigt den Eintrag; ein Klick öffnet sie ganz. Auf
 * Geräten ohne Zeiger gibt es keinen Schwebezustand — dort bleibt der Klick, und das ist
 * der richtige Rückfall.
 */
export function BelegVerweis({ beleg, children }: { beleg: Beleg; children: ReactNode }) {
  const aufloesen = useContext(BelegKontext)
  const ziel = aufloesen?.(beleg) ?? null
  const [offen, setOffen] = useState(false)
  const [ort, setOrt] = useState<{ x: number; y: number; oben: boolean } | null>(null)
  const ref = useRef<HTMLAnchorElement>(null)

  if (!ziel) return <>{children}</>

  /**
   * Feste Position aus der Bildschirmlage berechnet — nicht absolut im Fluss.
   *
   * Der Verlauf scrollt in einem eigenen Kasten mit `overflow-y-auto`. Eine absolut
   * positionierte Karte würde an dessen Kante abgeschnitten, und zwar genau dann, wenn der
   * Beleg am oberen oder unteren Rand steht.
   */
  const zeigen = () => {
    const kante = ref.current?.getBoundingClientRect()
    if (!kante) return
    const obenPlatz = kante.top > 260
    setOrt({
      x: Math.min(Math.max(kante.left, 12), window.innerWidth - 340),
      y: obenPlatz ? kante.top - 8 : kante.bottom + 8,
      oben: obenPlatz,
    })
    setOffen(true)
  }

  return (
    <>
      <Link
        ref={ref}
        to={ziel.href}
        onMouseEnter={zeigen}
        onMouseLeave={() => setOffen(false)}
        onFocus={zeigen}
        onBlur={() => setOffen(false)}
        className="rounded-[5px] border-b border-dotted border-accent/60 bg-accent/[0.07] px-1 py-px font-medium text-accent no-underline transition-colors hover:bg-accent/[0.14] hover:text-accent-hover"
      >
        {children}
        <span className="sr-only"> — {ziel.titel}</span>
      </Link>

      {offen && ort && createPortal(
        <div
          role="tooltip"
          className="pointer-events-none fixed z-[60] w-[min(20rem,calc(100vw-1.5rem))] rounded-brand border border-brand-border bg-white p-3.5 shadow-brand-lg"
          style={{ left: ort.x, top: ort.y, transform: ort.oben ? 'translateY(-100%)' : undefined }}
        >
          <p className="text-xs font-semibold text-navy">{ziel.titel}</p>
          <p className="mt-0.5 text-[0.7rem] text-brand-muted">{ziel.zeile}</p>
          {ziel.text && (
            <p className="mt-2 text-[0.75rem] leading-relaxed text-brand-text">{ziel.text}</p>
          )}
          {ziel.warnung && (
            <p className="mt-2 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-[0.7rem] font-medium text-amber-800">
              {ziel.warnung}
            </p>
          )}
          {ziel.marken.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {ziel.marken.map(m => (
                <span key={m} className="rounded-full bg-accent/10 px-2 py-0.5 text-[0.62rem] font-medium text-accent">
                  {m}
                </span>
              ))}
            </div>
          )}
          <p className="mt-2.5 border-t border-brand-border pt-2 text-[0.65rem] text-brand-muted/70">
            Klicken öffnet den Eintrag.
          </p>
        </div>,
        document.body,
      )}
    </>
  )
}
