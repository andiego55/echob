/**
 * Der Baukasten — hier baut die Person die Kapitel ihrer Folge selbst.
 *
 * **Die Entscheidung, die alles andere bestimmt: eine Palette statt eines leeren Feldes.**
 *
 * „Schreib eine Anweisung für dieses Kapitel" ist für die meisten Menschen keine Einladung,
 * sondern eine Prüfung. Wer sie besteht, bekommt etwas Gutes; wer sie nicht besteht, bekommt
 * einen Absatz, der klingt wie eine Bedienungsanleitung — und glaubt dann, das Werkzeug sei
 * nichts für ihn.
 *
 * Also wählt man eine Art von Kapitel („Eine Szene ausbauen", „Was das mit mir gemacht hat"),
 * und der fachlich geformte Auftrag hängt schon daran. Der eigene Satz kommt DAZU, für die,
 * die ihn wollen — er ist nie die Bedingung dafür, dass etwas Brauchbares entsteht.
 *
 * **Sortiert wird mit Auf/Ab, nicht mit Ziehen.** Es gibt keine Drag-Bibliothek im Projekt,
 * und eine selbstgebaute funktioniert auf dem Telefon selten und mit der Tastatur nie. Zwei
 * Knöpfe sind langweiliger und für jeden bedienbar — auch für den, der den Bildschirm nicht
 * sieht.
 *
 * **Zugeklappt, bis man etwas ändert.** Acht aufgeklappte Kapitel mit je vier Feldern sind
 * eine Wand. Die Zeile zeigt, was sie ist; aufklappen tut man das eine, an dem man arbeitet.
 */
import { useState } from 'react'
import type { PodcastBaustein, PodcastKapitelLaenge } from '@/api/podcast'
import type { Scene } from '@/types'

/** Ein Kapitel im Bau — das, was am Ende als Bestellung hinausgeht. */
export interface EntwurfKapitel {
  /** Nur für React: Die Reihenfolge ist die der Liste, nicht diese Kennung. */
  lid: string
  baustein: string
  titel: string
  eigener_auftrag: string
  kapitel_laenge: string
  szene_id: string | null
}

let zaehler = 0
const naechsteId = () => `k${++zaehler}`

export function neuesKapitel(b: PodcastBaustein): EntwurfKapitel {
  return {
    lid: naechsteId(),
    baustein: b.key,
    titel: b.titel_vorschlag,
    eigener_auftrag: '',
    kapitel_laenge: 'normal',
    szene_id: null,
  }
}

export default function KapitelBaukasten({
  bausteine, laengen, szenen, maxKapitel, kapitel, setKapitel,
}: {
  bausteine: PodcastBaustein[]
  laengen: PodcastKapitelLaenge[]
  szenen: Scene[]
  maxKapitel: number
  kapitel: EntwurfKapitel[]
  setKapitel: (k: EntwurfKapitel[]) => void
}) {
  const [paletteOffen, setPaletteOffen] = useState(kapitel.length === 0)
  const [offenLid, setOffenLid] = useState<string | null>(null)

  const aendern = (lid: string, feld: Partial<EntwurfKapitel>) =>
    setKapitel(kapitel.map(k => (k.lid === lid ? { ...k, ...feld } : k)))

  const verschieben = (i: number, richtung: -1 | 1) => {
    const ziel = i + richtung
    if (ziel < 0 || ziel >= kapitel.length) return
    const neu = [...kapitel]
    ;[neu[i], neu[ziel]] = [neu[ziel], neu[i]]
    setKapitel(neu)
  }

  const hinzu = (b: PodcastBaustein) => {
    const k = neuesKapitel(b)
    setKapitel([...kapitel, k])
    setPaletteOffen(false)
    // Gleich aufgeklappt: Wer eine Szene ausbauen will, muss sie jetzt wählen — und ein
    // zugeklapptes Kapitel, dem etwas fehlt, sieht fertig aus.
    setOffenLid(k.lid)
  }

  const voll = kapitel.length >= maxKapitel

  return (
    <div className="rounded-brand-lg border border-brand-border bg-white p-5">
      <h3 className="text-[0.95rem] font-bold text-navy">Deine Kapitel</h3>
      <p className="mt-1 max-w-[62ch] text-[0.8rem] leading-relaxed text-brand-muted">
        Bau die Folge aus Kapiteln zusammen und bring sie in die Reihenfolge, in der du sie
        hören willst. Jede Art bringt ihren eigenen Auftrag mit — du kannst zu jedem noch
        einen Satz dazuschreiben.
      </p>

      {kapitel.length > 0 && (
        <ol className="mt-4 space-y-2">
          {kapitel.map((k, i) => {
            const b = bausteine.find(x => x.key === k.baustein)
            const offen = offenLid === k.lid
            const fehltSzene = b?.braucht_szene && !k.szene_id
            const fehltAuftrag = k.baustein === 'frei' && !k.eigener_auftrag.trim()
            const unfertig = fehltSzene || fehltAuftrag

            return (
              <li
                key={k.lid}
                className={`rounded-brand border transition-colors ${
                  unfertig ? 'border-amber-300 bg-amber-50/60'
                    : offen ? 'border-accent/40 bg-accent/[0.03]'
                      : 'border-brand-border bg-brand-bg'
                }`}
              >
                <div className="flex items-start gap-2 px-3 py-2.5">
                  {/* Sortieren. Der erste hat kein Hoch, der letzte kein Runter — ein
                      Knopf, der nichts tut, ist schlechter als keiner. */}
                  <span className="flex shrink-0 flex-col">
                    <button
                      type="button"
                      onClick={() => verschieben(i, -1)}
                      disabled={i === 0}
                      aria-label={`Kapitel ${i + 1} nach oben`}
                      className="px-1 text-brand-muted transition-colors hover:text-accent disabled:opacity-20"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none"
                        stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                        <path d="M6 14l6-6 6 6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => verschieben(i, 1)}
                      disabled={i === kapitel.length - 1}
                      aria-label={`Kapitel ${i + 1} nach unten`}
                      className="px-1 text-brand-muted transition-colors hover:text-accent disabled:opacity-20"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none"
                        stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                        <path d="M6 10l6 6 6-6" />
                      </svg>
                    </button>
                  </span>

                  <button
                    type="button"
                    onClick={() => setOffenLid(offen ? null : k.lid)}
                    aria-expanded={offen}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="flex items-baseline gap-2">
                      <span className="text-[0.72rem] tabular-nums text-brand-muted">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[0.88rem] font-semibold text-navy">
                        {k.titel || b?.titel_vorschlag || 'Ohne Überschrift'}
                      </span>
                    </span>
                    <span className="mt-0.5 block pl-6 text-[0.72rem] text-brand-muted">
                      {b?.label}
                      {' · '}
                      {laengen.find(l => l.key === k.kapitel_laenge)?.label}
                      {unfertig && (
                        <span className="text-amber-700">
                          {' · '}{fehltSzene ? 'Szene fehlt' : 'Auftrag fehlt'}
                        </span>
                      )}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setKapitel(kapitel.filter(x => x.lid !== k.lid))}
                    aria-label={`Kapitel ${i + 1} entfernen`}
                    className="shrink-0 px-1 text-brand-muted transition-colors hover:text-red-600"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none"
                      stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>

                {offen && (
                  <div className="space-y-3 border-t border-brand-border/70 px-3 py-3">
                    <label className="block">
                      <span className="label">Überschrift</span>
                      <input
                        value={k.titel}
                        onChange={e => aendern(k.lid, { titel: e.target.value })}
                        maxLength={120}
                        placeholder={b?.titel_vorschlag || 'Worum geht es?'}
                        className="input-brand mt-1 w-full"
                      />
                      <span className="mt-1 block text-[0.7rem] text-brand-muted">
                        Wird nicht mitgesprochen — sie steht im Abspieler und im Skript.
                      </span>
                    </label>

                    {b?.braucht_szene && (
                      <label className="block">
                        <span className="label">Welche Szene?</span>
                        <select
                          value={k.szene_id ?? ''}
                          onChange={e => aendern(k.lid, { szene_id: e.target.value || null })}
                          className="input-brand mt-1 w-full"
                        >
                          <option value="">Bitte wählen …</option>
                          {szenen.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.title}
                              {s.scene_date ? ` · ${s.scene_date}` : ''}
                            </option>
                          ))}
                        </select>
                        {szenen.length === 0 && (
                          <span className="mt-1 block text-[0.7rem] text-amber-700">
                            Du hast noch keine bestätigte Szene. Halt erst eine fest — dieses
                            Kapitel braucht eine.
                          </span>
                        )}
                      </label>
                    )}

                    <div>
                      <span className="label">Wie ausführlich?</span>
                      <div className="mt-1 grid grid-cols-3 gap-1">
                        {laengen.map(l => (
                          <button
                            key={l.key}
                            type="button"
                            onClick={() => aendern(k.lid, { kapitel_laenge: l.key })}
                            aria-pressed={k.kapitel_laenge === l.key}
                            className={`rounded-brand-sm border px-2 py-1.5 text-[0.74rem] transition-colors ${
                              k.kapitel_laenge === l.key
                                ? 'border-accent bg-accent text-white'
                                : 'border-brand-border bg-white text-brand-muted hover:border-accent/50'
                            }`}
                          >
                            {l.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <label className="block">
                      <span className="label">
                        Dein Satz dazu {k.baustein !== 'frei' && '(kannst du weglassen)'}
                      </span>
                      <textarea
                        value={k.eigener_auftrag}
                        onChange={e => aendern(k.lid, { eigener_auftrag: e.target.value })}
                        maxLength={400}
                        rows={2}
                        placeholder={
                          k.baustein === 'frei'
                            ? 'Worum soll es in diesem Kapitel gehen?'
                            : 'Zum Beispiel: Leg besonderen Wert auf mein eigenes Erleben.'
                        }
                        className="input-brand mt-1 w-full resize-y"
                      />
                    </label>
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      )}

      {/* ── Die Palette ──────────────────────────────────────────────────── */}
      {voll ? (
        <p className="mt-4 text-[0.78rem] leading-relaxed text-brand-muted">
          {maxKapitel} Kapitel sind genug. Mehr ergeben auf einer Folge eine Aufzählung statt
          einer Erzählung — nimm eines weg, wenn du etwas anderes willst.
        </p>
      ) : paletteOffen ? (
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="label">Was soll das Kapitel tun?</span>
            {kapitel.length > 0 && (
              <button type="button" onClick={() => setPaletteOffen(false)}
                className="text-[0.72rem] text-brand-muted hover:text-navy">
                Abbrechen
              </button>
            )}
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {bausteine.map(b => (
              <button
                key={b.key}
                type="button"
                onClick={() => hinzu(b)}
                className="group rounded-brand border border-brand-border bg-white px-3.5 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-brand-sm motion-reduce:hover:translate-y-0"
              >
                <span className="block text-[0.86rem] font-semibold leading-snug text-navy transition-colors group-hover:text-accent">
                  {b.label}
                </span>
                <span className="mt-0.5 block text-[0.74rem] leading-snug text-brand-muted">
                  {b.hinweis}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPaletteOffen(true)}
          className="mt-4 inline-flex items-center gap-1.5 rounded-brand border border-dashed border-brand-border px-4 py-2 text-[0.82rem] font-medium text-brand-muted transition-colors hover:border-accent hover:text-accent"
        >
          <span aria-hidden="true" className="text-[1rem] leading-none">+</span>
          Kapitel hinzufügen
        </button>
      )}
    </div>
  )
}
