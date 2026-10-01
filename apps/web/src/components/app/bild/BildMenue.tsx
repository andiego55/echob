/**
 * Das Menü der Bildwerkstatt — alles, was jemand über sein Bild entscheiden kann.
 *
 * **Warum das ein eigener Baustein ist.** Die Seite war auf 845 Zeilen gewachsen und mischte
 * zwei Wege, zehn Regler und die Galerie. Nach dem dritten Umbau in einer Woche war das
 * Hinzufügen eines Reglers riskanter als die Änderung, die er bringt.
 *
 * **Das Menü ist in Abschnitte geteilt, und die Reihenfolge ist eine Aussage.** Oben steht,
 * woraus das Bild entsteht und was es zeigt — die Entscheidungen. Darunter, wie gemalt wird.
 * Dann „Deine Ideen": was die Person selbst hineingibt. Wer nur die ersten zwei Abschnitte
 * anfasst, bekommt ein gutes Bild; alles Weitere ist Angebot und keine Hausaufgabe.
 *
 * **Alles aufgeklappt wäre eine Wand.** Deshalb klappen die hinteren Abschnitte zu, und an
 * jedem steht, was darin gerade eingestellt ist — damit man nicht aufklappen muss, um zu
 * wissen, ob man dort etwas verändert hat.
 */
import { useState } from 'react'
import type { BildKatalog, Bildwahl, SzeneZurWahl, Wahlmoeglichkeit } from '@/api/bilder'

/** Ein Knopf in einer Reihe gleichberechtigter Möglichkeiten. */
function Pille({ eintrag, aktiv, onClick }: {
  eintrag: Wahlmoeglichkeit
  aktiv: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktiv}
      title={eintrag.hinweis}
      className={`rounded-full border px-3.5 py-1.5 text-[0.78rem] transition-colors ${
        aktiv
          ? 'border-accent bg-accent/[0.06] font-semibold text-accent'
          : 'border-brand-border bg-white text-brand-muted hover:border-accent/50'
      }`}
    >
      {eintrag.label}
    </button>
  )
}

/** Eine Karte mit Etikett und Erklärung — für Wahlen, die etwas bedeuten. */
function Karte({ eintrag, aktiv, onClick }: {
  eintrag: Wahlmoeglichkeit
  aktiv: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktiv}
      className={`rounded-brand border p-3 text-left transition-colors ${
        aktiv ? 'border-accent bg-accent/[0.06]'
          : 'border-brand-border bg-white hover:border-accent/50'
      }`}
    >
      <span className={`block text-[0.84rem] font-semibold ${
        aktiv ? 'text-accent' : 'text-navy'
      }`}>{eintrag.label}</span>
      {eintrag.hinweis && (
        <span className="mt-0.5 block text-[0.72rem] leading-snug text-brand-muted">
          {eintrag.hinweis}
        </span>
      )}
    </button>
  )
}

/** Ein Abschnitt, der zuklappt — mit dem, was darin steht, am Rand. */
function Faltung({ titel, stand, offen, onToggle, children }: {
  titel: string
  stand: string
  offen: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-brand-lg border border-brand-border bg-white">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={offen}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[0.88rem] font-semibold text-navy">{titel}</span>
          {/* **Der Stand steht am Abschnitt, auch wenn er zu ist.** Sonst muss man jeden
              aufklappen, um zu wissen, ob man dort etwas verändert hat. */}
          <span className="mt-0.5 block truncate text-[0.74rem] text-brand-muted">
            {stand}
          </span>
        </span>
        <svg
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-brand-muted transition-transform ${
            offen ? 'rotate-180' : ''
          }`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {offen && <div className="border-t border-brand-border px-4 py-4">{children}</div>}
    </div>
  )
}

const QUELLEN: Wahlmoeglichkeit[] = [
  {
    key: 'fall',
    label: 'Aus deinem Fall',
    hinweis: 'Ein Sprachmodell liest deinen Fall und entwirft das Bild: Ort, Licht und '
      + 'Gegenstände kommen aus dem, was du erzählt hast. Dafür gehen deine Texte hinaus — '
      + 'an denselben Anbieter, der sie für Echo, deine Berichte und den Podcast schon '
      + 'bekommt.',
  },
  {
    key: 'baukasten',
    label: 'Aus dem Baukasten',
    hinweis: 'Nur Zahlen gehen hinaus, die Bildsprache steht fest. Dafür sehen die Bilder '
      + 'sich untereinander ähnlicher.',
  },
]

export default function BildMenue({ wahl, aendern, katalog, szenen }: {
  wahl: Bildwahl
  aendern: (teil: Partial<Bildwahl>) => void
  katalog: BildKatalog | undefined
  szenen: SzeneZurWahl[] | undefined
}) {
  const [offen, setOffen] = useState<string | null>('ideen')
  const klappen = (name: string) => setOffen(o => (o === name ? null : name))

  const etikett = (liste: Wahlmoeglichkeit[] | undefined, key: string) =>
    liste?.find(e => e.key === key)?.label ?? key

  /** Was in den Gewichten gerade nicht auf „normal" steht — für den Rand des Abschnitts. */
  const gewichteStand = () => {
    const anders = (katalog?.elemente ?? [])
      .filter(e => (wahl.gewichte[e.key] ?? 'normal') !== 'normal')
      .map(e => `${e.label}: ${etikett(katalog?.gewichte, wahl.gewichte[e.key] ?? 'normal')}`)
    return anders.length ? anders.join(' · ') : 'Alles gleich gewichtet'
  }

  const ideenStand = () => {
    const teile: string[] = []
    if (wahl.szenen.length) teile.push(`${wahl.szenen.length} Szenen gewählt`)
    if (wahl.stimmungen.length) {
      teile.push(wahl.stimmungen.map(s => etikett(katalog?.stimmungen, s)).join(', '))
    }
    if (wahl.wunsch.trim()) teile.push('ein Wunsch')
    return teile.length ? teile.join(' · ') : 'Szenen, Stimmung, ein eigener Wunsch'
  }

  const stimmungUmschalten = (key: string) => {
    const drin = wahl.stimmungen.includes(key)
    if (drin) {
      aendern({ stimmungen: wahl.stimmungen.filter(s => s !== key) })
      return
    }
    // Die Obergrenze wird hier durchgesetzt und nicht erst auf dem Server: Ein Knopf, der
    // nichts tut, ist schlimmer als einer, der fehlt.
    if (wahl.stimmungen.length >= (katalog?.max_stimmungen ?? 3)) return
    aendern({ stimmungen: [...wahl.stimmungen, key] })
  }

  const szeneUmschalten = (id: string) => {
    const drin = wahl.szenen.includes(id)
    aendern({
      szenen: drin ? wahl.szenen.filter(s => s !== id) : [...wahl.szenen, id].slice(0, 8),
    })
  }

  return (
    <div className="space-y-4">
      {/* ── Woraus und worin: die Entscheidungen ──────────────────────────── */}
      <div className="rounded-brand-lg border border-brand-border bg-white p-5">
        <span className="label">Woraus?</span>
        <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
          {QUELLEN.map(q => (
            <Karte key={q.key} eintrag={q} aktiv={wahl.quelle === q.key}
              onClick={() => aendern({ quelle: q.key })} />
          ))}
        </div>

        {/* **Die Bildwelt zuerst: Sie ist die Entscheidung, das Übrige ist Ausführung.**
            Und sie gehört der Person — ein Modell, das sich das Gleichnis selbst aussucht,
            würde deuten. */}
        <div className="mt-5">
          <span className="label">Worin?</span>
          <p className="mb-2 mt-0.5 text-[0.74rem] leading-snug text-brand-muted">
            Dieselbe Lage, ein anderes Gleichnis — und du siehst etwas anderes.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(katalog?.bildwelten ?? []).map(b => (
              <Karte key={b.key} eintrag={b} aktiv={wahl.bildwelt === b.key}
                onClick={() => aendern({ bildwelt: b.key })} />
            ))}
          </div>
        </div>

        <div className="mt-5">
          <span className="label">Wie konkret?</span>
          <p className="mb-2 mt-0.5 text-[0.74rem] leading-snug text-brand-muted">
            Der Regler, der am meisten entscheidet: ein Stuhl, der ein Stuhl ist — oder ein
            Feld aus Licht.
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {(katalog?.abstraktion ?? []).map(a => (
              <Karte key={a.key} eintrag={a} aktiv={wahl.abstraktion === a.key}
                onClick={() => aendern({ abstraktion: a.key })} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Deine Ideen ───────────────────────────────────────────────────── */}
      <Faltung
        titel="Deine Ideen"
        stand={ideenStand()}
        offen={offen === 'ideen'}
        onToggle={() => klappen('ideen')}
      >
        {wahl.quelle === 'baukasten' ? (
          <p className="text-[0.8rem] leading-relaxed text-brand-muted">
            Im Baukasten gibt es nichts zu lesen — Szenen, Stimmung und Wunsch wirken nur
            auf dem Weg <strong className="font-semibold">Aus deinem Fall</strong>.
          </p>
        ) : (
          <div className="space-y-5">
            {/* **Szenen auswählen ist das Konkreteste, was dieses Werkzeug anbietet.**
                Wer einen bestimmten Abend im Bild sehen will, soll ihn auswählen können —
                und nicht hoffen, dass die Auswahl ihn erwischt. */}
            <div>
              <span className="label">Welche Momente?</span>
              <p className="mb-2 mt-0.5 max-w-[62ch] text-[0.74rem] leading-relaxed text-brand-muted">
                Ohne Auswahl nimmt das Bild eine Streuung über deinen ganzen Fall — jedes Mal
                eine andere. Wähl aus, wenn ein bestimmter Moment darin vorkommen soll.
                Höchstens acht.
              </p>
              {szenen?.length ? (
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-brand border border-brand-border p-2">
                  {szenen.map(sz => {
                    const drin = wahl.szenen.includes(sz.id)
                    return (
                      <button
                        key={sz.id}
                        type="button"
                        onClick={() => szeneUmschalten(sz.id)}
                        aria-pressed={drin}
                        className={`flex w-full items-center gap-2 rounded-brand-sm px-2 py-1.5 text-left transition-colors ${
                          drin ? 'bg-accent/[0.08]' : 'hover:bg-brand-bg'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border text-[0.6rem] font-bold ${
                            drin ? 'border-accent bg-accent text-white'
                              : 'border-brand-border bg-white'
                          }`}
                        >
                          {drin ? '✓' : ''}
                        </span>
                        <span className={`min-w-0 flex-1 truncate text-[0.78rem] ${
                          drin ? 'font-medium text-navy' : 'text-brand-text'
                        }`}>
                          {sz.titel}
                        </span>
                        <span className="shrink-0 text-[0.68rem] text-brand-muted">
                          {new Date(sz.datum).toLocaleDateString('de-DE',
                            { day: '2-digit', month: '2-digit', year: '2-digit' })}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="text-[0.76rem] text-brand-muted">
                  Noch keine bestätigte Szene in diesem Fall.
                </p>
              )}
            </div>

            {/* **Die Stimmung ist nicht das Gefühlsbild.** Das eine ist eine Angabe über
                den Zustand, das andere ein Wunsch an das Bild — beides darf gleichzeitig
                wahr sein. */}
            <div>
              <span className="label">
                Welche Stimmung? <span className="font-normal text-brand-muted">
                  (bis zu {katalog?.max_stimmungen ?? 3})
                </span>
              </span>
              <p className="mb-2 mt-0.5 max-w-[62ch] text-[0.74rem] leading-relaxed text-brand-muted">
                Nicht wie es dir geht — wie das Bild sein soll. Du darfst dir ein weites Bild
                wünschen an einem engen Tag.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(katalog?.stimmungen ?? []).map(st => {
                  const drin = wahl.stimmungen.includes(st.key)
                  const voll = !drin
                    && wahl.stimmungen.length >= (katalog?.max_stimmungen ?? 3)
                  return (
                    <button
                      key={st.key}
                      type="button"
                      onClick={() => stimmungUmschalten(st.key)}
                      aria-pressed={drin}
                      disabled={voll}
                      className={`rounded-full border px-3 py-1.5 text-[0.76rem] transition-colors ${
                        drin
                          ? 'border-accent bg-accent/[0.06] font-semibold text-accent'
                          : voll
                            ? 'cursor-not-allowed border-brand-border/60 bg-white text-brand-muted/50'
                            : 'border-brand-border bg-white text-brand-muted hover:border-accent/50'
                      }`}
                    >
                      {st.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <label className="block">
              <span className="label">Dein Wunsch</span>
              <p className="mb-1.5 mt-0.5 max-w-[62ch] text-[0.74rem] leading-relaxed text-brand-muted">
                In eigenen Worten. „Bitte etwas Helles am Rand" ändert mehr, als man denkt.
                Ein Mensch kann nicht darin vorkommen, auch wenn du danach fragst.
              </p>
              <textarea
                value={wahl.wunsch}
                onChange={e => aendern({ wunsch: e.target.value })}
                maxLength={400}
                rows={2}
                placeholder="z. B. Es soll Winter sein, und irgendwo eine offene Tür."
                className="input-brand w-full resize-y !text-[0.84rem]"
              />
              <span className="mt-0.5 block text-right text-[0.68rem] text-brand-muted">
                {wahl.wunsch.length}/400
              </span>
            </label>
          </div>
        )}
      </Faltung>

      {/* ── Was wie schwer wiegt ──────────────────────────────────────────── */}
      <Faltung
        titel="Was wiegt wie schwer?"
        stand={gewichteStand()}
        offen={offen === 'gewichte'}
        onToggle={() => klappen('gewichte')}
      >
        <p className="mb-3 max-w-[62ch] text-[0.76rem] leading-relaxed text-brand-muted">
          Hier standen Häkchen — an oder aus. Das war zu grob: „Meine Momente sollen
          vorkommen, aber worum es wirklich geht, sind die Muster" ist mit zwei Häkchen nicht
          sagbar. <strong className="font-semibold">Aus</strong> heißt: wird nicht einmal
          geladen.
        </p>
        <div className="space-y-3">
          {(katalog?.elemente ?? []).map(e => (
            <div key={e.key}>
              <span className="block text-[0.82rem] font-medium text-navy">{e.label}</span>
              <span className="block text-[0.72rem] leading-snug text-brand-muted">
                {e.hinweis}
              </span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(katalog?.gewichte ?? []).map(g => (
                  <Pille
                    key={g.key}
                    eintrag={g}
                    aktiv={(wahl.gewichte[e.key] ?? 'normal') === g.key}
                    onClick={() => aendern({
                      gewichte: { ...wahl.gewichte, [e.key]: g.key },
                    })}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Faltung>

      {/* ── Wer vorkommt ──────────────────────────────────────────────────── */}
      <Faltung
        titel="Kommst du vor?"
        stand={etikett(katalog?.figur, wahl.figur)}
        offen={offen === 'figur'}
        onToggle={() => klappen('figur')}
      >
        {/* **Drei Möglichkeiten, und genau EIN Gesicht.**
            Das Gesicht gehört der Person selbst — und sein Aussehen ist frei erfunden, weil
            die App kein Bild von ihr hat. Dass es erfunden ist, steht an der Wahl und nicht
            im Kleingedruckten: Wer es nicht liest, hält die Gestalt für ein Abbild. */}
        <div className="grid gap-2 sm:grid-cols-3">
          {(katalog?.figur ?? []).map(f => (
            <Karte key={f.key} eintrag={f} aktiv={wahl.figur === f.key}
              onClick={() => aendern({ figur: f.key })} />
          ))}
        </div>

        {wahl.figur !== 'keine' && (
          <>
            <div className="mt-4">
              <span className="label">Was tust du?</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(katalog?.haltungen ?? []).map(h => (
                  <Pille key={h.key} eintrag={h} aktiv={wahl.haltung === h.key}
                    onClick={() => aendern({ haltung: h.key })} />
                ))}
              </div>
              {wahl.haltung === 'fall' && (
                <p className="mt-1.5 text-[0.72rem] leading-snug text-brand-muted">
                  Eine Haltung ist eine Aussage. Dass dein Fall sie beantwortet, hast du
                  gerade selbst entschieden — in der Legende steht es dann auch so.
                </p>
              )}
            </div>

            <div className="mt-4">
              <span className="label">Ist jemand bei dir?</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(katalog?.begleitungen ?? []).map(b => (
                  <Pille key={b.key} eintrag={b} aktiv={wahl.begleitung === b.key}
                    onClick={() => aendern({ begleitung: b.key })} />
                ))}
              </div>
              {wahl.begleitung === 'freitext' && (
                <label className="mt-2 block">
                  <input
                    value={wahl.begleitung_text}
                    onChange={e => aendern({ begleitung_text: e.target.value })}
                    maxLength={200}
                    placeholder="z. B. meine zwei Kinder und der Hund"
                    className="input-brand w-full !text-[0.84rem]"
                    aria-label="Wer bei dir sein soll"
                  />
                </label>
              )}
              {wahl.begleitung !== 'keine' && (
                <p className="mt-1.5 text-[0.72rem] leading-snug text-brand-muted">
                  Wer bei dir steht, hat kein Gesicht — genau eines ist im Bild, und das ist
                  deins.
                </p>
              )}
            </div>

            {wahl.figur === 'ich_sichtbar' ? (
              <p className="mt-4 rounded-brand border border-accent/30 bg-accent/[0.05] p-3 text-[0.74rem] leading-relaxed text-brand-text">
                <strong className="font-semibold">Dein Aussehen wird frei erfunden.</strong>{' '}
                Aus deiner Selbstauskunft kommen nur Altersspanne und Geschlecht — Haare,
                Gesicht, Statur und Kleidung denkt sich das Bildmodell aus. Die Gestalt ist
                eine Figur und kein Abbild von dir, und sie wird dir vermutlich nicht ähneln.
                <span className="mt-1.5 block text-brand-muted">
                  Die Person, um die es in diesem Fall geht, kommt nie mit Gesicht und nie nah
                  vor — höchstens fern, schemenhaft oder von hinten. Andere Menschen dürfen
                  auftauchen, aber genauso.
                </span>
              </p>
            ) : (
              <p className="mt-4 text-[0.72rem] leading-snug text-brand-muted">
                Aus deiner Selbstauskunft kommen nur Altersspanne und Geschlecht. Deine
                Gestalt ist von hinten und ohne Gesicht. Die Person, um die es in diesem Fall
                geht, kommt nie mit Gesicht und nie nah vor; andere Menschen dürfen
                auftauchen, aber nur fern und undeutlich.
              </p>
            )}
          </>
        )}
      </Faltung>

      {/* ── Wie gemalt ────────────────────────────────────────────────────── */}
      <Faltung
        titel="Wie gemalt?"
        stand={`${etikett(katalog?.handschriften, wahl.handschrift)} · `
          + `${etikett(katalog?.paletten, wahl.palette)} · `
          + `Sinnbilder ${etikett(katalog?.symbolik, wahl.symbolik)}`}
        offen={offen === 'malen'}
        onToggle={() => klappen('malen')}
      >
        <div className="space-y-4">
          <div>
            <span className="label">Handschrift</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {(katalog?.handschriften ?? []).map(h => (
                <Pille key={h.key} eintrag={h} aktiv={wahl.handschrift === h.key}
                  onClick={() => aendern({ handschrift: h.key })} />
              ))}
            </div>
          </div>
          <div>
            <span className="label">Farbe</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {(katalog?.paletten ?? []).map(pa => (
                <Pille key={pa.key} eintrag={pa} aktiv={wahl.palette === pa.key}
                  onClick={() => aendern({ palette: pa.key })} />
              ))}
            </div>
          </div>
          <div>
            <span className="label">Sinnbilder</span>
            <p className="mb-1.5 mt-0.5 text-[0.72rem] leading-snug text-brand-muted">
              Schwellen, Tiere, Zeichen aus der Traumdeutung — wie deutlich sie werden.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(katalog?.symbolik ?? []).map(sy => (
                <Pille key={sy.key} eintrag={sy} aktiv={wahl.symbolik === sy.key}
                  onClick={() => aendern({ symbolik: sy.key })} />
              ))}
            </div>
          </div>
        </div>
      </Faltung>
    </div>
  )
}
