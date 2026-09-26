/**
 * Was die Klient:in aus ihrem eigenen Bereich freigegeben hat.
 *
 * **Warum das eine eigene Datei ist.** Der Kompass gehört der nutzenden Person. Hier wird
 * er von außen gelesen, und das ist etwas anderes als ihn zu führen: keine Knöpfe, keine
 * Vorschläge, kein „bearbeiten". Die Seite der Fachperson hat schon genug Blöcke; dieser
 * soll für sich stehen und sich ändern lassen, ohne dass jemand eine 1800-Zeilen-Datei
 * aufmacht.
 *
 * **Die Reihenfolge ist eine Aussage.** Der Notfallplan kommt zuerst und über die volle
 * Breite — er ist das Einzige hier, das im Ernstfall gebraucht wird, und nichts davon darf
 * man suchen müssen. Danach folgt, was sie über sich sagt, woran sie arbeitet, und ganz
 * zuletzt die Kurve.
 *
 * **Was hier NICHT ankommen kann.** Der Verlauf trägt nur Zahlen — die Notizen aus den
 * einzelnen Momenten sind die Kladde und werden nie freigegeben. Entschieden wird das im
 * `sharing_service` an der Abfrage, nicht in dieser Datei; der Typ `PulsPunkt` kennt die
 * Felder gar nicht erst. Der Satz darunter im Bild sagt es trotzdem: Eine Kurve ohne
 * diesen Hinweis liest sich, als fehlten die Notizen bloß gerade.
 */
import VerlaufsKurve from '@/components/app/kompass/VerlaufsKurve'
import { IconKompass } from '@/components/professional/ProfIcons'
import type { SharedCaseBundle } from '@/types'
import SkizzenBaender, { baenderAus } from '@/components/app/kompass/SkizzenBaender'

/** Wie viele Tage die Kurve zeigt. Ein Jahr — der Server gibt nicht mehr her. */
const KURVE_TAGE = 365

const datum = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('de-DE') : null

/**
 * Der Rahmen eines Blocks.
 *
 * Bewusst nicht das `Section` der Fallseite: Das ist dort lokal, und eine Komponente, die
 * aus einer Seite importiert, dreht die Abhängigkeit um. Es sind acht Zeilen Markup.
 */
function Karte({ titel, hinweis, children }: {
  titel: string
  hinweis?: string
  children: React.ReactNode
}) {
  return (
    <div className="card">
      <h2 className="flex items-center gap-2.5 text-[0.95rem] font-bold text-navy">
        <span className="h-4 w-1 shrink-0 rounded-full bg-accent" aria-hidden="true" />
        {titel}
      </h2>
      {hinweis && <p className="mt-1.5 text-xs leading-relaxed text-brand-muted">{hinweis}</p>}
      <div className="mt-4">{children}</div>
    </div>
  )
}

// ── Der Notfallplan ─────────────────────────────────────────────────────────

/**
 * **Der wichtigste Block, und der einzige mit eigener Farbe.**
 *
 * Ein Notfallplan zwischen Skalen und Berichten wäre ein Block unter vielen. Er ist aber
 * das, was man im schlechtesten Moment braucht und dann nicht suchen kann — deshalb steht
 * er oben, über die volle Breite und in einem Ton, den man beim Überfliegen findet.
 *
 * **Und deshalb steht der Hinweis darüber und nicht darunter.** Was hier steht, hat die
 * Person für den schwersten Moment geschrieben, den sie kennt. Wer ihn als
 * Verbesserungsvorschlag liest, hat ihn falsch gelesen.
 */
export function KrisenplanKarte({ plan }: { plan: SharedCaseBundle['krisenplan'] }) {
  if (!plan) {
    return (
      <div className="mb-4 rounded-brand border border-brand-border bg-white px-5 py-4">
        <h2 className="text-[0.95rem] font-bold text-navy">Notfallplan</h2>
        <p className="mt-1.5 text-xs text-brand-muted">
          Freigegeben — aber noch keiner geschrieben.
        </p>
      </div>
    )
  }
  const geaendert = datum(plan.updated_at)
  return (
    <section className="mb-4 overflow-hidden rounded-brand border border-amber-300/70 border-l-4 border-l-amber-500 bg-amber-50/40">
      <div className="px-5 py-4">
        <h2 className="flex items-center gap-2 text-[0.95rem] font-bold text-navy">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-amber-500/15 text-amber-700">
            <IconKompass />
          </span>
          Ihr eigener Notfallplan
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-brand-muted">
          Von ihr selbst geschrieben, für den Fall, dass es kippt. Im Ernstfall ist das,
          was hier steht, das, woran sie sich hält — es ist kein Entwurf, der noch
          verbessert werden will.
        </p>

        <div className="mt-4 space-y-3.5">
          {plan.abschnitte.map(a => (
            <div key={a.key}>
              <h3 className="text-[0.8rem] font-semibold text-navy">{a.label}</h3>
              {a.geordnet ? (
                // Die Nummern sind hier die Aussage, nicht die Sortierung einer Liste:
                // „der Reihe nach", und das Erste soll das Leichteste sein.
                <ol className="mt-1.5 space-y-1">
                  {a.zeilen.map((z, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-brand-text">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-amber-500/15 text-[11px] font-bold tabular-nums text-amber-700">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{z}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <ul className="mt-1.5 space-y-1">
                  {a.zeilen.map((z, i) => (
                    <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-brand-text">
                      <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500/60" aria-hidden="true" />
                      {z}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {geaendert && (
          <p className="mt-4 border-t border-amber-300/50 pt-2.5 text-[11px] text-brand-muted">
            Zuletzt von ihr geändert am {geaendert}.
          </p>
        )}
      </div>
    </section>
  )
}

// ── Sätze, Vorhaben, Verlauf ────────────────────────────────────────────────

/** Was sie über sich sagt — Stück für Stück ausgewählt, kein Gesamtbild. */
export function SaetzeKarte({ saetze }: { saetze: SharedCaseBundle['saetze'] }) {
  if (!saetze?.length) return null
  return (
    <Karte
      titel={`Was sie über sich sagt (${saetze.length})`}
      hinweis="Selbst bestätigt und einzeln freigegeben — also eine Auswahl und kein Gesamtbild. Was fehlt, ist kein Hinweis."
    >
      <ul className="space-y-2.5">
        {saetze.map(s => (
          <li key={s.id} className="rounded-brand border border-brand-border bg-white px-3.5 py-2.5">
            <p className="text-sm leading-relaxed text-brand-text">{s.text}</p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-brand-muted">
              {s.art_label && (
                <span className="rounded-full bg-accent/5 px-2 py-0.5 text-accent">{s.art_label}</span>
              )}
              {/* Das Datum gehört sichtbar dazu: eine Selbsteinschätzung von einem Tag,
                  keine Eigenschaft eines Menschen. */}
              {datum(s.bestaetigt_at) && <span>bestätigt am {datum(s.bestaetigt_at)}</span>}
            </p>
          </li>
        ))}
      </ul>
    </Karte>
  )
}

/** Woran sie arbeitet. Der Stand steht dabei — „Ruht" ist kein Scheitern. */
export function VorhabenKarte({ vorhaben }: { vorhaben: SharedCaseBundle['vorhaben'] }) {
  if (!vorhaben?.length) return null
  return (
    <Karte
      titel={`Woran sie arbeitet (${vorhaben.length})`}
      hinweis={'Von ihr selbst formuliert. „Ruht“ heißt hier: gerade nicht dran — kein Scheitern, eine Lage.'}
    >
      <ul className="space-y-2">
        {vorhaben.map(v => {
          const gesamt = v.schritte?.length ?? 0
          return (
            <li key={v.id} className="flex items-start gap-3 rounded-brand border border-brand-border bg-white px-3.5 py-2.5">
              <span className="min-w-0 flex-1 text-sm leading-relaxed text-brand-text">{v.titel}</span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${
                  v.stand === 'laufend' ? 'bg-accent/5 text-accent'
                    : v.stand === 'erreicht' ? 'bg-green-500/10 text-green-700'
                      : 'bg-brand-border/50 text-brand-muted'
                }`}>
                  {v.stand_label ?? v.stand}
                </span>
                {gesamt > 0 && (
                  <span className="text-[11px] tabular-nums text-brand-muted">
                    {v.schritte_erledigt} von {gesamt} Schritten
                  </span>
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </Karte>
  )
}

/**
 * Die Kurve — und nur die Kurve.
 *
 * **Der Hinweis unter dem Bild ist kein Kleingedrucktes.** Eine Kurve ohne ihn liest sich
 * wie ein Auszug, bei dem die Notizen gerade nicht geladen sind. Dass es sie gibt und dass
 * sie bewusst nicht mitgehen, ist die Auskunft: Was die Person in dem Moment geschrieben
 * hat, gehört ihr, und ein Gespräch darüber führt sie, wenn sie will.
 */
export function VerlaufKarte({ verlauf }: { verlauf: SharedCaseBundle['verlauf'] }) {
  if (!verlauf?.length) return null
  // Eine Kurve aus einem Punkt ist keine Kurve — dann ist die Zahl ehrlicher.
  const wenig = verlauf.length < 2
  return (
    <Karte
      titel="Ihr Verlauf"
      hinweis={'Wie es ihr über die Zeit ging. Der Kompass gehört ihr und nicht diesem '
        + 'Fall — die Kurve umfasst alle Momente, die sie festgehalten hat, auch die zu '
        + 'anderem.'}
    >
      {wenig ? (
        <p className="text-sm text-brand-muted">
          Bisher ein einzelner festgehaltener Moment. Für eine Kurve braucht es zwei.
        </p>
      ) : (
        <VerlaufsKurve pulse={verlauf} tage={KURVE_TAGE} hoehe={140} />
      )}
      <p className="mt-3 border-t border-brand-border pt-2.5 text-[11px] leading-relaxed text-brand-muted">
        Nur die Kurve. Was sie zu den einzelnen Momenten notiert hat und was ihr geholfen
        hat, ist nicht freigegeben — das lässt sich auch nicht einzeln freigeben.
      </p>
    </Karte>
  )
}

/**
 * Was sie sich wünscht — ihre eigene Skizze, nicht über diesen Fall geschrieben.
 *
 * **Warum das für eine Fachperson wertvoll ist.** Sie bekommt von ihrer Klient:in vor
 * allem zu hören, was nicht geht. Was die Person WILL, kommt selten vor — und wenn, dann
 * als Verneinung („nicht mehr so wie bisher"). Hier steht es zum ersten Mal positiv, von
 * ihr selbst geordnet, und es ist in zwanzig Sekunden gelesen.
 *
 * **Und deshalb steht der Satz darüber, dass sie sie unabhängig von diesem Fall
 * geschrieben hat.** Wer die Skizze als Forderung an das Gegenüber liest, hat sie falsch
 * gelesen: Sie ist über eine ART von Beziehung geschrieben, nicht über diese eine.
 *
 * Die Reihenfolge und die Balkenlängen sind die Aussage — dieselbe Darstellung wie in
 * ihrem eigenen Bereich, damit beide dasselbe Bild vor Augen haben, wenn sie darauf zu
 * sprechen kommen.
 */
export function TraumbeziehungKarte({ ideal }: { ideal: SharedCaseBundle['traumbeziehung'] }) {
  if (!ideal) return null
  const baender = baenderAus(ideal.aspekte, ideal.reihung)

  return (
    <Karte
      titel={`Was sie sich wünscht${ideal.art_label ? ` (${ideal.art_label})` : ''}`}
      hinweis={'Ihre eigene Skizze aus dem Kompass — geschrieben über diese ART von '
        + 'Beziehung, nicht über diesen Fall. Keine Forderung an das Gegenüber, sondern '
        + 'ein Maßstab, den sie für sich aufgestellt hat.'}
    >
      {/* Ohne Bewegung: Hier ändert sich nichts, und eine Animation beim Aufbau wäre
          Zierrat auf einer Seite, die gelesen und nicht bedient wird. */}
      <SkizzenBaender baender={baender} bewegt={false} />

      {ideal.eigenes && (
        <blockquote className="mt-4 border-l-2 border-accent/40 pl-3 text-[0.86rem] leading-relaxed text-brand-text">
          {ideal.eigenes}
        </blockquote>
      )}

      <p className="mt-3 border-t border-brand-border pt-2.5 text-[11px] leading-relaxed text-brand-muted">
        Kräftig: was sie ausdrücklich in eine Reihenfolge gebracht hat. Die Länge ist das
        Gewicht.
        {ideal.geprueft_at
          ? ` Zuletzt bestätigt am ${datum(ideal.geprueft_at)}.`
          : ` Zuletzt geändert am ${datum(ideal.updated_at)}.`}
      </p>
    </Karte>
  )
}
