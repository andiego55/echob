/**
 * Freigaben – wer aus eurem Paarraum was sieht.
 *
 * Hier verlässt zum ersten Mal Material den Raum. Deshalb ist diese Seite anders gebaut
 * als der Rest des Moduls: Sie erklärt nicht nur, was möglich ist, sondern zeigt
 * **sichtbar aufgezählt, was niemals hinausgeht**. Vertrauen entsteht daraus, dass man
 * die Grenze sieht – nicht daraus, dass man sie versprochen bekommt.
 *
 * Die eine Regel, die die ganze Maske trägt: **Freigeben braucht beide, Widerrufen
 * genügt einer.** Ein Vorschlag ruht sichtbar, bis die andere Person zustimmt; der
 * Beenden-Knopf fragt niemanden.
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { coupleSharesApi } from '@/api/coupleShares'
import type { CoupleShare, CoupleShareView } from '@/api/coupleShares'
import { apiErrorMessage } from '@/api/errors'

/** Klartext für das, was nie hinausgeht – der Server liefert nur die Schlüssel. */
const NIE_TEXT: Record<string, string> = {
  private_echo: 'Dein privater Dialog mit Echo',
  deescalation: 'Was du nach einem Streit für dich aufgeschrieben hast',
  confidential_perspective: 'Deine vertrauliche Sicht in der Mediation',
  context_drafts: 'Entwürfe, die du nie freigegeben hast',
}

export default function SharesCard({ coupleId }: { coupleId: string }) {
  const { data } = useQuery({
    queryKey: ['couple-shares', coupleId],
    queryFn: () => coupleSharesApi.list(coupleId),
    enabled: !!coupleId,
    retry: false,
  })

  if (!data) return null

  const offen = data.shares.filter(s => s.status === 'pending')
  const aktiv = data.shares.filter(s => s.status === 'active')
  const beendet = data.shares.filter(s => s.status === 'revoked')

  return (
    <div className="space-y-5">
      {offen.map(s => <ShareRow key={s.id} share={s} view={data} coupleId={coupleId} />)}
      {aktiv.map(s => <ShareRow key={s.id} share={s} view={data} coupleId={coupleId} />)}

      <NeuerVorschlag view={data} coupleId={coupleId} />

      <Grenze never={data.never} />

      {beendet.length > 0 && (
        <details className="card card-quiet">
          <summary className="cursor-pointer card-title-sm">
            Beendete Freigaben ({beendet.length})
          </summary>
          <div className="mt-3 space-y-2">
            {beendet.map(s => (
              <p key={s.id} className="text-xs text-brand-muted">
                Beendet am {new Date(s.revoked_at!).toLocaleDateString('de-DE')} ·
                {' '}{s.elements.length} {s.elements.length === 1 ? 'Element' : 'Elemente'}
              </p>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

/** Die Grenze, die nie fällt – bewusst prominent und nicht im Kleingedruckten. */
function Grenze({ never }: { never: string[] }) {
  return (
    <div className="card card-static border-l-4 border-l-navy">
      <h2 className="card-title">Was niemals hinausgeht</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-brand-muted">
        Freigeben könnt ihr nur das, was ihr beide im Raum ohnehin seht. Alles Einseitige
        bleibt, wo es ist – auch wenn ihr es wolltet. Sonst wäre die Zustimmung der anderen
        Person eine Zustimmung ins Ungewisse.
      </p>
      <ul className="mt-3 space-y-1.5">
        {never.map(k => (
          <li key={k} className="flex items-start gap-2 text-sm text-brand-text">
            <span className="mt-0.5 shrink-0 text-brand-muted" aria-hidden>✕</span>
            {NIE_TEXT[k] ?? k}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-brand-muted">
        Möchtest du davon etwas mit deiner Fachperson teilen, geht das über deinen eigenen
        Fall – nicht über den gemeinsamen Raum.
      </p>
    </div>
  )
}

function ShareRow({
  share, view, coupleId,
}: { share: CoupleShare; view: CoupleShareView; coupleId: string }) {
  const qc = useQueryClient()
  const { user } = useAuth()
  const [aendern, setAendern] = useState(false)
  const [auswahl, setAuswahl] = useState<string[]>(share.elements)

  const frisch = () => qc.invalidateQueries({ queryKey: ['couple-shares', coupleId] })

  const zustimmen = useMutation({
    mutationFn: () => coupleSharesApi.consent(share.id),
    onSuccess: frisch,
  })
  const beenden = useMutation({
    mutationFn: () => coupleSharesApi.revoke(share.id),
    onSuccess: frisch,
  })
  const speichern = useMutation({
    mutationFn: () => coupleSharesApi.setElements(share.id, auswahl),
    onSuccess: () => { frisch(); setAendern(false) },
  })

  const person = view.professionals.find(
    p => p.professional_user_id === share.professional_user_id)
  const name = person?.display_name ?? 'Fachperson'
  const ichHabeZugestimmt = !!user?.id && share.consented_by.includes(user.id)
  const aktiv = share.status === 'active'
  const erweitert = auswahl.some(e => !share.elements.includes(e))

  return (
    <div className={`card ${aktiv ? 'card-static' : 'card-static border-l-4 border-l-accent'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="card-title-lg">{name}</h2>
          {person?.title && <p className="text-xs text-brand-muted">{person.title}</p>}
          <p className="mt-1 text-xs text-brand-muted">
            {aktiv
              ? `Freigegeben seit ${new Date(share.updated_at).toLocaleDateString('de-DE')}`
              : share.origin === 'professional'
                ? 'Die Fachperson bittet um Zugang'
                : 'Vorschlag – wartet auf Zustimmung'}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold ${
          aktiv ? 'bg-green-50 text-green-700' : 'bg-accent/10 text-accent'
        }`}>
          {aktiv ? 'Aktiv' : 'Ruht'}
        </span>
      </div>

      {share.message && (
        <p className="mt-3 rounded-brand bg-brand-bg px-3.5 py-2.5 text-sm italic text-brand-text">
          „{share.message}"
        </p>
      )}

      {/* ── Zustimmungen ──────────────────────────────────────────── */}
      <p className="mt-3 text-xs text-brand-muted">
        {aktiv
          ? `Zugestimmt haben ${share.consent_names.filter(Boolean).join(' und ')}.`
          : share.consented_by.length === 0
            ? 'Noch hat niemand zugestimmt. Es braucht beide.'
            : `${share.consent_names.filter(Boolean).join(' und ')} hat zugestimmt – es fehlt noch eine.`}
      </p>

      {/* ── Umfang ────────────────────────────────────────────────── */}
      <div className="mt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="section-label">Freigegeben</p>
          {!aendern && (
            <button
              onClick={() => { setAuswahl(share.elements); setAendern(true) }}
              className="text-xs text-accent hover:underline"
            >
              Umfang ändern
            </button>
          )}
        </div>

        {aendern ? (
          <>
            <div className="mt-2 space-y-1.5">
              {Object.entries(view.catalogue).map(([key, text]) => (
                <label key={key} className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={auswahl.includes(key)}
                    onChange={e => setAuswahl(a =>
                      e.target.checked ? [...a, key] : a.filter(x => x !== key))}
                    className="mt-0.5 h-4 w-4 cursor-pointer"
                    style={{ accentColor: '#e07b54' }}
                  />
                  <span className="text-sm text-brand-text">{text}</span>
                </label>
              ))}
            </div>
            {erweitert && (
              <p className="mt-2.5 rounded-brand bg-accent/[0.06] px-3.5 py-2.5 text-xs leading-relaxed text-brand-text">
                Du erweiterst den Umfang. Die Freigabe ruht dann, bis die andere Person
                erneut zustimmt – sie hat einer Liste zugestimmt, nicht einer Kategorie,
                die wächst.
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                onClick={() => speichern.mutate()}
                disabled={auswahl.length === 0 || speichern.isPending}
                className="btn-primary !py-1.5 !px-4 !text-xs disabled:opacity-50"
              >
                {speichern.isPending ? 'Speichere …' : 'Umfang speichern'}
              </button>
              <button onClick={() => setAendern(false)} className="text-xs text-brand-muted hover:text-navy">
                Abbrechen
              </button>
            </div>
            {speichern.isError && (
              <p className="mt-2 text-xs text-red-600">{apiErrorMessage(speichern.error)}</p>
            )}
          </>
        ) : (
          <ul className="mt-2 space-y-1">
            {share.elements.map(e => (
              <li key={e} className="flex items-start gap-2 text-sm text-brand-text">
                <span className="mt-0.5 shrink-0 text-accent" aria-hidden>✓</span>
                {view.catalogue[e] ?? e}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Handeln ───────────────────────────────────────────────── */}
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-brand-border pt-3">
        {!aktiv && !ichHabeZugestimmt && (
          <button
            onClick={() => zustimmen.mutate()}
            disabled={zustimmen.isPending}
            className="btn-primary !py-2 !px-5 !text-sm disabled:opacity-50"
          >
            {zustimmen.isPending ? 'Stimme zu …' : 'Zustimmen'}
          </button>
        )}
        <button
          onClick={() => beenden.mutate()}
          disabled={beenden.isPending}
          className="text-xs text-brand-muted hover:text-navy disabled:opacity-50"
        >
          {beenden.isPending ? 'Beende …' : aktiv ? 'Freigabe beenden' : 'Vorschlag verwerfen'}
        </button>
        <span className="text-xs text-brand-muted">
          Beenden kannst du allein – dafür braucht es die andere Person nicht.
        </span>
      </div>
      {(zustimmen.isError || beenden.isError) && (
        <p className="mt-2 text-sm text-red-600">
          {apiErrorMessage(zustimmen.error ?? beenden.error)}
        </p>
      )}
    </div>
  )
}

function NeuerVorschlag({
  view, coupleId,
}: { view: CoupleShareView; coupleId: string }) {
  const qc = useQueryClient()
  const [offen, setOffen] = useState(false)
  const [profi, setProfi] = useState('')
  const [auswahl, setAuswahl] = useState<string[]>(view.defaults)
  const [nachricht, setNachricht] = useState('')

  const vorschlagen = useMutation({
    mutationFn: () => coupleSharesApi.propose(coupleId, {
      professional_user_id: profi,
      elements: auswahl,
      message: nachricht.trim() || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['couple-shares', coupleId] })
      setOffen(false); setProfi(''); setNachricht(''); setAuswahl(view.defaults)
    },
  })

  if (view.professionals.length === 0) {
    return (
      <div className="card card-static">
        <h2 className="card-title">Noch keine Fachperson</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-brand-muted">
          Freigeben könnt ihr euren Raum an eine Fachperson, mit der du bereits einen
          eigenen Fall teilst. Sobald es die gibt, steht sie hier zur Auswahl.
        </p>
      </div>
    )
  }

  if (!offen) {
    return (
      <button
        onClick={() => setOffen(true)}
        className="card card-static block w-full text-left transition hover:border-accent/50"
      >
        <p className="card-title">Freigabe vorschlagen</p>
        <p className="mt-1 text-sm text-brand-muted">
          Du wählst Fachperson und Umfang. Aktiv wird sie erst, wenn auch die andere
          Person zustimmt.
        </p>
      </button>
    )
  }

  return (
    <div className="card card-static border-l-4 border-l-accent">
      <h2 className="card-title">Freigabe vorschlagen</h2>

      <div className="mt-4">
        <label className="section-label">An wen</label>
        <select
          value={profi}
          onChange={e => setProfi(e.target.value)}
          className="input mt-1.5 !text-sm"
        >
          <option value="">Bitte wählen …</option>
          {view.professionals.map(p => (
            <option key={p.professional_user_id} value={p.professional_user_id}>
              {p.display_name}{p.title ? ` · ${p.title}` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <label className="section-label">Was sie sehen darf</label>
        <div className="mt-1.5 space-y-1.5">
          {Object.entries(view.catalogue).map(([key, text]) => (
            <label key={key} className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={auswahl.includes(key)}
                onChange={e => setAuswahl(a =>
                  e.target.checked ? [...a, key] : a.filter(x => x !== key))}
                className="mt-0.5 h-4 w-4 cursor-pointer"
                style={{ accentColor: '#e07b54' }}
              />
              <span className="text-sm text-brand-text">{text}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <label className="section-label">Ein Satz dazu (optional)</label>
        <input
          value={nachricht}
          onChange={e => setNachricht(e.target.value)}
          maxLength={500}
          placeholder="Worum es euch geht"
          className="input mt-1.5 !text-sm"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={() => vorschlagen.mutate()}
          disabled={!profi || auswahl.length === 0 || vorschlagen.isPending}
          className="btn-primary !py-2 !px-5 !text-sm disabled:opacity-50"
        >
          {vorschlagen.isPending ? 'Schlage vor …' : 'Vorschlagen'}
        </button>
        <button onClick={() => setOffen(false)} className="text-xs text-brand-muted hover:text-navy">
          Abbrechen
        </button>
      </div>
      <p className="mt-2 text-xs text-brand-muted">
        Dein Vorschlag ist zugleich deine Zustimmung. Bis die andere Person zustimmt,
        geht nichts hinaus.
      </p>
      {vorschlagen.isError && (
        <p className="mt-2 text-sm text-red-600">{apiErrorMessage(vorschlagen.error)}</p>
      )}
    </div>
  )
}
