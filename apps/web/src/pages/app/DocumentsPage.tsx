/**
 * /app/cases/:caseId/documents — Dokumente zum Fallkontext
 *
 * **Was hier hingehört und was nicht.** Eine Szene ist ein Ereignis, das jemand erzählt.
 * Ein Dokument ist ein Beleg, den jemand mitbringt: der Brief, der Chatverlauf, die
 * Mitschrift. Beides gehört zum Fall, aber es sind zwei verschiedene Dinge — deshalb ein
 * eigener Ort und nicht ein weiteres Feld an der Szene.
 *
 * **Es wird keine Datei hochgeladen.** Eine .txt oder .md wird im Browser ausgelesen; was
 * die App verlässt, ist Text. Kein Dateispeicher, kein Format, dem man trauen müsste.
 *
 * **Warum die Schwärzung Werkzeug ist und nicht Hinweis.** „Bitte Klarnamen entfernen"
 * steht schnell in einem Kasten und wird ebenso schnell überlesen. Hier werden die
 * Fundstellen gezeigt und auf einen Klick ersetzt — und für das, was keine erkennbare Form
 * hat (Namen), sagt die Person selbst, wonach zu suchen ist.
 */
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import Fehlermeldung from '@/components/Fehlermeldung'
import { ListSkeleton } from '@/components/Skeleton'
import { useBestaetigen } from '@/components/Bestaetigung'
import {
  caseDocumentsApi, KIND_LABELS,
  type CaseDocument, type DocumentKind,
} from '@/api/caseDocuments'
import {
  ersetzeNamen, findePersonenbezug, schwaerzePersonenbezug, FUND_LABELS,
} from '@/lib/klarnamen'

/** Was der Datei-Wähler annimmt. Alles andere wird mit Begründung abgelehnt. */
const ERLAUBTE_ENDUNGEN = ['.txt', '.md', '.markdown', '.text']

export default function DocumentsPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const qc = useQueryClient()
  const bestaetigen = useBestaetigen()
  const [formOffen, setFormOffen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['case-documents', caseId],
    queryFn: () => caseDocumentsApi.list(caseId!),
    enabled: !!caseId,
  })

  const loeschen = useMutation({
    mutationFn: (id: string) => caseDocumentsApi.delete(caseId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['case-documents', caseId] }),
  })
  const umschalten = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      caseDocumentsApi.update(caseId!, id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['case-documents', caseId] }),
  })

  const dokumente = data?.documents ?? []
  const platzFrei = (data?.remaining_slots ?? 0) > 0

  return (
    <AppShell>
      <CaseNav caseId={caseId!} />

      <div className="mx-auto max-w-[860px] px-6 py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="page-title">Dokumente</h1>
            <p className="mt-1 max-w-[62ch] text-sm text-brand-muted">
              Texte, die zur Beziehung gehören, aber keine Szene sind: ein Brief, ein
              Chatverlauf, eine Mitschrift. Echo liest sie als <strong className="text-navy">Belege</strong> mit –
              als Ausschnitt, nicht als ganze Wahrheit.
            </p>
          </div>
          {!formOffen && platzFrei && (
            <button onClick={() => setFormOffen(true)} className="btn-primary !py-2 !px-4 !text-sm">
              + Dokument hinzufügen
            </button>
          )}
        </div>

        {formOffen && (
          <NeuesDokument
            caseId={caseId!}
            maxZeichen={data?.max_chars_per_document ?? 6000}
            onFertig={() => setFormOffen(false)}
          />
        )}

        {!platzFrei && !isLoading && (
          <p className="mb-6 rounded-brand border border-brand-border bg-brand-bg px-4 py-3 text-xs text-brand-muted">
            Für diesen Fall sind {data?.max_documents} Dokumente hinterlegt – das ist die Grenze.
            Lösche eines, das du nicht mehr brauchst, um Platz zu schaffen.
          </p>
        )}

        {isLoading && <ListSkeleton rows={2} label="Dokumente werden geladen" />}

        {!isLoading && dokumente.length === 0 && !formOffen && (
          <Leerzustand onStart={() => setFormOffen(true)} />
        )}

        {dokumente.length > 0 && (
          <div className="space-y-3">
            {dokumente.map(d => (
              <DokumentZeile
                key={d.id}
                dokument={d}
                onUmschalten={() => umschalten.mutate({ id: d.id, active: !d.active })}
                onLoeschen={async () => {
                  const ja = await bestaetigen({
                    titel: 'Dokument löschen?',
                    text: `„${d.title}" wird endgültig gelöscht und fließt nicht mehr in Gespräche ein.`,
                    knopf: 'Löschen', gefahr: true,
                  })
                  if (ja) loeschen.mutate(d.id)
                }}
              />
            ))}
          </div>
        )}

        <Fehlermeldung error={loeschen.error ?? umschalten.error} />
      </div>
    </AppShell>
  )
}

// ── Ein Dokument in der Liste ─────────────────────────────────────────────────

function DokumentZeile({ dokument: d, onUmschalten, onLoeschen }: {
  dokument: CaseDocument
  onUmschalten: () => void
  onLoeschen: () => void
}) {
  const [offen, setOffen] = useState(false)

  return (
    <div className={`card ${d.active ? '' : 'opacity-60'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-navy">{d.title}</span>
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[0.65rem] font-medium text-accent">
              {KIND_LABELS[d.kind]}
            </span>
            {!d.active && (
              <span className="rounded-full bg-brand-bg px-2 py-0.5 text-[0.65rem] text-brand-muted">
                fließt nicht ein
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-brand-muted">
            {d.document_date
              ? new Date(d.document_date).toLocaleDateString('de-DE', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })
              : 'ohne Datum'}
            {' · '}{d.char_count.toLocaleString('de-DE')} Zeichen
            {d.source_name && <> · {d.source_name}</>}
          </p>
          {d.description && (
            <p className="mt-2 max-w-[62ch] text-xs italic text-brand-muted">{d.description}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button onClick={() => setOffen(o => !o)} className="btn-quiet !py-1.5 !px-3 !text-xs">
            {offen ? 'Zuklappen' : 'Text ansehen'}
          </button>
          <button
            onClick={onUmschalten}
            className="btn-quiet !py-1.5 !px-3 !text-xs"
            title={d.active
              ? 'Nicht mehr in Gespräche einfließen lassen – das Dokument bleibt gespeichert.'
              : 'Wieder in Gespräche einfließen lassen.'}
          >
            {d.active ? 'Pausieren' : 'Einbeziehen'}
          </button>
          <button
            onClick={onLoeschen}
            className="text-xs text-brand-muted transition-colors hover:text-red-600"
          >
            Löschen
          </button>
        </div>
      </div>

      {offen && (
        <pre className="mt-4 max-h-[24rem] overflow-y-auto whitespace-pre-wrap rounded-brand bg-brand-bg px-4 py-3 font-sans text-xs leading-relaxed text-brand-text">
          {d.content}
        </pre>
      )}
    </div>
  )
}

// ── Das Formular ──────────────────────────────────────────────────────────────

function NeuesDokument({ caseId, maxZeichen, onFertig }: {
  caseId: string
  maxZeichen: number
  onFertig: () => void
}) {
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [titel, setTitel] = useState('')
  const [art, setArt] = useState<DocumentKind>('sonstiges')
  const [datum, setDatum] = useState('')
  const [einordnung, setEinordnung] = useState('')
  const [quelle, setQuelle] = useState<string | null>(null)
  const [namen, setNamen] = useState('')
  const [dateiFehler, setDateiFehler] = useState<string | null>(null)

  const funde = useMemo(() => findePersonenbezug(text), [text])
  const zuLang = text.length > maxZeichen
  const bereit = titel.trim().length > 0 && text.trim().length > 0 && !zuLang

  const anlegen = useMutation({
    mutationFn: () => caseDocumentsApi.create(caseId, {
      title: titel.trim(),
      kind: art,
      document_date: datum || null,
      description: einordnung.trim() || null,
      content: text,
      source_name: quelle,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case-documents', caseId] })
      onFertig()
    },
  })

  const dateiLesen = async (datei: File) => {
    setDateiFehler(null)
    const name = datei.name.toLowerCase()
    if (!ERLAUBTE_ENDUNGEN.some(e => name.endsWith(e))) {
      setDateiFehler(
        'Nur reine Textdateien (.txt oder .md). Ein PDF oder Word-Dokument bringt '
        + 'Formatierung und oft versteckte Daten mit – öffne es und füge den Text hier ein.',
      )
      return
    }
    const inhalt = await datei.text()
    if (!inhalt.trim()) {
      setDateiFehler('Die Datei enthält keinen Text.')
      return
    }
    // Weit mehr als die Grenze wird gar nicht erst geladen — eine versehentlich gewählte
    // Logdatei mit Megabytes brächte den Editor zum Stehen. Es wird aber MEHR geladen als
    // erlaubt, damit der Zähler die Überlänge zeigt, statt sie stillschweigend abzu-
    // schneiden: Wer nicht sieht, dass gekürzt wurde, legt einen halben Brief ab.
    const obergrenze = maxZeichen * 2
    setText(inhalt.slice(0, obergrenze))
    setQuelle(datei.name)
    if (!titel.trim()) setTitel(datei.name.replace(/\.[^.]+$/, ''))
    if (inhalt.length > obergrenze) {
      setDateiFehler(
        `Die Datei hat ${inhalt.length.toLocaleString('de-DE')} Zeichen – geladen wurden `
        + `die ersten ${obergrenze.toLocaleString('de-DE')}. Such dir die Stellen heraus, `
        + 'um die es dir geht.',
      )
    }
  }

  return (
    <div className="card mb-6 border-accent/30">
      <h2 className="card-title-lg">Neues Dokument</h2>

      {/* ── Der Hinweis, der etwas kann ──────────────────────────────── */}
      <div className="mt-4 rounded-brand border border-amber-300 bg-amber-50/60 px-4 py-3">
        <p className="text-xs font-semibold text-amber-800">Vorher: Namen und Kontaktdaten heraus</p>
        <p className="mt-1 text-xs leading-relaxed text-brand-text">
          Was hier hineingeht, wird verschlüsselt gespeichert und an das Sprachmodell
          geschickt, das Echo antworten lässt. Je weniger echte Namen, Adressen und Nummern
          darin stehen, desto besser – für dich und für die Personen, die im Text vorkommen.
          Ersetze Namen durch <em>„meine Schwester", „M."</em> oder ein Pseudonym; am Inhalt
          ändert das nichts.
        </p>
      </div>

      {/* ── Text: Datei oder eingefügt ───────────────────────────────── */}
      <div className="mt-5">
        <label className="label" htmlFor="dok-text">Der Text</label>
        <div className="mt-1.5 flex flex-wrap items-center gap-3">
          <label className="btn-quiet !py-1.5 !px-3.5 !text-xs cursor-pointer">
            Textdatei wählen
            <input
              type="file"
              accept=".txt,.md,.markdown,.text,text/plain,text/markdown"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) void dateiLesen(f) }}
            />
          </label>
          <span className="text-xs text-brand-muted">oder unten einfügen</span>
          {quelle && (
            <span className="text-xs text-brand-muted">
              aus <strong className="text-navy">{quelle}</strong>
              <button
                onClick={() => { setQuelle(null) }}
                className="ml-1.5 text-brand-muted/70 underline hover:text-navy"
              >
                lösen
              </button>
            </span>
          )}
        </div>
        {dateiFehler && (
          <p className="mt-2 rounded-brand border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {dateiFehler}
          </p>
        )}

        <textarea
          id="dok-text"
          value={text}
          onChange={e => setText(e.target.value)}
          rows={10}
          placeholder="Brief, Chatverlauf, Mitschrift … hier einfügen."
          className="input mt-2 w-full resize-y font-mono text-xs leading-relaxed"
        />
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
          <span className={`text-xs tabular-nums ${zuLang ? 'font-semibold text-red-600' : 'text-brand-muted'}`}>
            {text.length.toLocaleString('de-DE')} / {maxZeichen.toLocaleString('de-DE')} Zeichen
            {zuLang && ' — zu lang'}
          </span>
          <span className="text-xs text-brand-muted/70">
            Etwa zwei A4-Seiten in Schriftgröße 12.
          </span>
        </div>
        {zuLang && (
          <p className="mt-2 rounded-brand border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            Kürze den Text auf die Stellen, um die es geht. Ein ganzer Chatverlauf über
            Monate hilft Echo weniger als die zwei Tage, an denen etwas gekippt ist.
          </p>
        )}
      </div>

      {/* ── Schwärzen ────────────────────────────────────────────────── */}
      {text.trim().length > 0 && (
        <Schwaerzen
          funde={funde}
          namen={namen}
          onNamen={setNamen}
          onSchwaerzen={() => setText(t => schwaerzePersonenbezug(t))}
          onNamenErsetzen={() => { setText(t => ersetzeNamen(t, namen)); setNamen('') }}
        />
      )}

      {/* ── Einordnung ───────────────────────────────────────────────── */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="dok-titel">Titel</label>
          <input
            id="dok-titel" value={titel} onChange={e => setTitel(e.target.value)}
            maxLength={200} placeholder="Brief nach dem Streit im März"
            className="input mt-1.5 w-full"
          />
        </div>
        <div>
          <label className="label" htmlFor="dok-art">Was ist das?</label>
          <select
            id="dok-art" value={art} onChange={e => setArt(e.target.value as DocumentKind)}
            className="input mt-1.5 w-full"
          >
            {(Object.keys(KIND_LABELS) as DocumentKind[]).map(k => (
              <option key={k} value={k}>{KIND_LABELS[k]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="dok-datum">Wann entstanden?</label>
          <input
            id="dok-datum" type="date" value={datum} onChange={e => setDatum(e.target.value)}
            className="input mt-1.5 w-full"
          />
          <p className="mt-1 text-[0.7rem] text-brand-muted">
            Darf leer bleiben, wenn du es nicht mehr weißt.
          </p>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="dok-einordnung">
            Worum geht es – und worauf soll Echo achten?
          </label>
          <textarea
            id="dok-einordnung" value={einordnung} onChange={e => setEinordnung(e.target.value)}
            rows={3} maxLength={2000}
            placeholder="Der Brief kam zwei Tage nach dem Streit. Mich irritiert, dass darin steht, ich hätte angefangen."
            className="input mt-1.5 w-full resize-y"
          />
          <p className="mt-1 text-[0.7rem] text-brand-muted">
            Das ist der wertvollste Teil: Ein Text ohne Einordnung ist für Echo nur Text.
          </p>
        </div>
      </div>

      <Fehlermeldung error={anlegen.error} />

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-brand-border pt-4">
        <button
          onClick={() => anlegen.mutate()}
          disabled={!bereit || anlegen.isPending}
          className="btn-primary !py-2 !px-5 !text-sm disabled:opacity-50"
        >
          {anlegen.isPending ? 'Wird gespeichert …' : 'Dokument hinterlegen'}
        </button>
        <button onClick={onFertig} className="btn-quiet !py-2 !px-4 !text-sm">
          Abbrechen
        </button>
        {!bereit && !zuLang && (
          <span className="text-xs text-brand-muted">Titel und Text werden gebraucht.</span>
        )}
      </div>
    </div>
  )
}

// ── Fundstellen und Schwärzung ────────────────────────────────────────────────

function Schwaerzen({ funde, namen, onNamen, onSchwaerzen, onNamenErsetzen }: {
  funde: ReturnType<typeof findePersonenbezug>
  namen: string
  onNamen: (v: string) => void
  onSchwaerzen: () => void
  onNamenErsetzen: () => void
}) {
  return (
    <div className="mt-4 rounded-brand border border-brand-border bg-brand-bg/60 px-4 py-3.5">
      <p className="text-xs font-semibold text-navy">Personenbezug entfernen</p>

      {funde.length > 0 ? (
        <>
          <p className="mt-1.5 text-xs text-brand-text">
            Im Text stehen Angaben mit erkennbarer Form:
          </p>
          <ul className="mt-2 space-y-1">
            {funde.map(f => (
              <li key={`${f.art}-${f.text}`} className="text-xs text-brand-muted">
                <span className="font-medium text-navy">{FUND_LABELS[f.art]}</span>
                {' — '}
                <code className="rounded bg-white px-1 py-0.5">{f.text}</code>
                {f.anzahl > 1 && <> ({f.anzahl}×)</>}
              </li>
            ))}
          </ul>
          <button
            type="button" onClick={onSchwaerzen}
            className="btn-quiet mt-2.5 !py-1.5 !px-3.5 !text-xs"
          >
            Alle ersetzen
          </button>
        </>
      ) : (
        <p className="mt-1.5 text-xs text-brand-muted">
          Keine E-Mail-Adresse, Telefonnummer oder IBAN gefunden.
        </p>
      )}

      <div className="mt-3.5 border-t border-brand-border pt-3">
        <label className="text-xs text-brand-text" htmlFor="dok-namen">
          <strong className="text-navy">Namen kann nur du kennen.</strong> Schreib hier die
          echten Namen aus dem Text – sie werden durch <code>[Name]</code> ersetzt.
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            id="dok-namen" value={namen} onChange={e => onNamen(e.target.value)}
            placeholder="Anna, Bernd Meier, Papa"
            className="input min-w-[14rem] flex-1 !py-1.5 !text-xs"
          />
          <button
            type="button" onClick={onNamenErsetzen}
            disabled={namen.trim().length < 2}
            className="btn-quiet !py-1.5 !px-3.5 !text-xs disabled:opacity-50"
          >
            Ersetzen
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Leerzustand ───────────────────────────────────────────────────────────────

function Leerzustand({ onStart }: { onStart: () => void }) {
  return (
    <div className="mx-auto max-w-md rounded-brand border border-dashed border-brand-border px-6 py-12 text-center">
      <svg viewBox="0 0 48 48" className="mx-auto h-12 text-accent" fill="none" aria-hidden>
        <rect x="12" y="6" width="24" height="32" rx="3" stroke="currentColor" strokeWidth="2" />
        <path d="M18 16h12M18 22h12M18 28h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".55" />
      </svg>
      <h2 className="card-title-lg mt-4">Noch nichts hinterlegt</h2>
      <p className="mt-2 text-sm leading-relaxed text-brand-muted">
        Manches lässt sich schwer nacherzählen: der Wortlaut einer Nachricht, der Ton eines
        Briefes, die Reihenfolge in einem Streit über Chat. Leg den Text bei – Echo bezieht
        ihn in seine Antworten ein.
      </p>
      <button onClick={onStart} className="btn-primary mt-6 !py-2 !px-5 !text-sm">
        Erstes Dokument hinzufügen
      </button>
    </div>
  )
}
