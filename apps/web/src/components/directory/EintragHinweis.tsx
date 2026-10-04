/**
 * Der Hinweis für die Fachperson, über die dieser Eintrag ist.
 *
 * **Warum es diesen Baustein gibt.** Das Verzeichnis enthält Einträge der Stufe `researched`:
 * Angaben aus öffentlich zugänglichen Quellen über Menschen, die dem nicht zugestimmt haben.
 * Das ist zulässig (Art. 6 Abs. 1 lit. f DSGVO) und bei Branchenverzeichnissen üblich — aber
 * nur mit zwei Dingen, die dazugehören: einer Information (Art. 14) und einem einfachen Weg
 * zum Widerspruch (Art. 21).
 *
 * Die veröffentlichte Datenschutzerklärung stützt sich für die Information auf Art. 14
 * Abs. 5 lit. b (unverhältnismäßiger Aufwand einer Einzelbenachrichtigung) — diese Begründung
 * trägt nur, wenn die Information stattdessen **öffentlich und an der Sache** steht. Genau
 * das ist dieser Baustein. Ohne ihn wäre der Abschnitt in der Erklärung ein Versprechen ohne
 * Deckung, und die Rechtsgrundlage stünde auf einem Bein.
 *
 * **Warum er auch bei zugestimmten Einträgen erscheint, nur anders.** Wer sein Profil selbst
 * pflegt, braucht keinen Widerspruch, sondern den Weg zur Änderung. Das ist dieselbe Frage
 * („das bin ich, und ich will etwas ändern") mit einer anderen Antwort — zwei Bausteine daraus
 * zu machen hieße, dass einer von beiden irgendwann vergessen wird.
 *
 * **Zurückhaltend gestaltet, mit Absicht.** Das ist kein Angebot an die suchende Person; sie
 * soll davon nicht abgelenkt werden. Es muss nur für die eine Person auffindbar sein, die sich
 * selbst auf dieser Seite wiederfindet.
 */

/** Betreff und Text so vorbereitet, dass die Mail ohne Nachfrage bearbeitbar ist. */
function mailto(name: string, slug: string, eigen: boolean): string {
  const betreff = eigen
    ? `Verzeichnis-Eintrag ändern: ${name}`
    : `Verzeichnis-Eintrag übernehmen oder entfernen: ${name}`
  const text = [
    `Es geht um den Eintrag "${name}" (${slug}) im EchoB-Verzeichnis.`,
    '',
    'Bitte eines von beidem:',
    '[ ] Ich möchte den Eintrag übernehmen und selbst pflegen.',
    '[ ] Ich möchte, dass der Eintrag vollständig entfernt wird.',
    '',
    'Änderungswünsche:',
    '',
  ].join('\n')
  return `mailto:kontakt@echo-b.de?subject=${encodeURIComponent(betreff)}&body=${encodeURIComponent(text)}`
}

export default function EintragHinweis({ name, slug, eigen }: {
  name: string
  slug: string
  /** True, wenn der Eintrag von der Fachperson selbst gepflegt wird (Stufe ≠ `researched`). */
  eigen: boolean
}) {
  return (
    <div className="mt-10 border-t border-brand-border pt-5">
      <p className="text-[0.78rem] leading-relaxed text-brand-muted">
        {eigen ? (
          <>
            <strong className="font-semibold text-navy">Das ist dein Eintrag?</strong>{' '}
            Du kannst ihn jederzeit selbst bearbeiten, wenn du angemeldet bist.
          </>
        ) : (
          <>
            <strong className="font-semibold text-navy">Das ist dein Eintrag?</strong>{' '}
            Die Angaben stammen aus öffentlich zugänglichen Quellen – eine Zustimmung liegt
            dafür nicht vor. Du kannst den Eintrag übernehmen und selbst pflegen, ihn
            korrigieren lassen oder{' '}
            <strong className="font-semibold text-navy">vollständig entfernen lassen</strong>:
            ohne Begründung, ohne Nachteil und ohne dass wir dich nach einem Grund fragen.
          </>
        )}{' '}
        <a href={mailto(name, slug, eigen)} className="text-accent hover:underline">
          {eigen ? 'Änderung melden' : 'Eintrag übernehmen oder entfernen'}
        </a>
        {' · '}
        <a href="/datenschutz" className="text-accent hover:underline">Datenschutz</a>
      </p>
    </div>
  )
}
