/**
 * „Wie fange ich an?" — die ersten Schritte auf dem Dashboard.
 *
 * **Warum das nicht oben steht.** Die Frage kommt beim zweiten oder dritten Besuch, nicht
 * beim ersten: Zuerst schaut man sich um, und erst wenn man nichts gefunden hat, sucht man
 * eine Erklärung. Oben stünde sie im Weg von allem, was man tun könnte.
 *
 * **Aufgeklappt beim ersten Mal, danach wie zuletzt.** Wer neu ist, soll die Antworten
 * sehen, ohne nach ihnen zu suchen. Wer sie gelesen hat, klappt sie zu — und dann bleiben
 * sie zu. Eine Hilfe, die sich jeden Morgen wieder öffnet, ist eine Belehrung.
 *
 * **Der Zustand liegt im Browser und nicht auf dem Server.** Es ist eine Bequemlichkeit,
 * keine Aussage über einen Menschen. Und sie darf nichts kosten: In einem privaten
 * Fenster oder mit blockierten Daten wirft der Zugriff, und dann ist die Antwort
 * schlicht „aufgeklappt".
 *
 * **Fragen, keine Aufgabenliste.** Kein Fortschrittsbalken, keine Häkchen, kein „2 von 5
 * erledigt". Was hier steht, sind Wege — und wer keinen davon geht, hat nichts versäumt.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const SPEICHER = 'echob:erste-schritte-zu'

interface Schritt {
  frage: string
  antwort: string
  ziel?: { to: string; text: string }
}

const SCHRITTE: Schritt[] = [
  {
    frage: 'Womit fange ich an?',
    antwort:
      'Mit einem Fall. Ein Fall ist eine Beziehung, über die du nachdenkst — die zu '
      + 'deinem Partner, deiner Mutter, einem Kollegen. Alles Weitere hängt daran, und '
      + 'du brauchst dafür nur zwei, drei Antworten.',
    ziel: { to: '/app/cases/new', text: 'Einen Fall anlegen' },
  },
  {
    frage: 'Was ist eine Szene?',
    antwort:
      'Eine einzelne Situation, so wie sie war: Was passiert ist, was gesagt wurde, wie '
      + 'es dir dabei ging. Keine Zusammenfassung von drei Jahren — ein Abend, ein '
      + 'Telefonat, ein Satz. Aus mehreren Szenen wird mit der Zeit ein Muster sichtbar, '
      + 'das man in einer einzelnen nicht sieht.',
  },
  {
    frage: 'Wofür ist das Fallprofil?',
    antwort:
      'Es beantwortet einmal, was Echo sonst in jedem Gespräch neu fragen müsste — seit '
      + 'wann es die Beziehung gibt, wie der Kontakt aussieht, was du dir erhoffst. Du '
      + 'musst es nicht am Stück ausfüllen; es wächst mit.',
  },
  {
    frage: 'Muss ich mit Echo sprechen?',
    antwort:
      'Nein. Du kannst nur Szenen festhalten und sie selbst lesen — das ist schon etwas. '
      + 'Echo ist ein Gegenüber, das Fragen stellt und Wiederholungen bemerkt. Es '
      + 'entscheidet nichts und diagnostiziert nichts.',
  },
  {
    frage: 'Wer sieht meine Sachen?',
    antwort:
      'Niemand außer dir — solange du nichts freigibst. Eine Freigabe an eine Fachperson '
      + 'wählst du einzeln aus und kannst sie jederzeit zurücknehmen.',
    ziel: { to: '/app/privacy', text: 'Was gespeichert wird' },
  },
  {
    frage: 'Ich weiß nicht, was ich schreiben soll.',
    antwort:
      'Dann fang woanders an: Unter „Beziehungsszenen" stehen erfundene Situationen. Was '
      + 'dir davon bekannt vorkommt, sagt oft mehr als ein leeres Feld — und daraus wird '
      + 'später eine eigene Szene.',
    ziel: { to: '/szenen', text: 'Beziehungsszenen ansehen' },
  },
]

export default function ErsteSchritte() {
  const [offen, setOffen] = useState(true)

  useEffect(() => {
    try {
      if (localStorage.getItem(SPEICHER) === 'ja') setOffen(false)
    } catch {
      // Privates Fenster, blockierte Daten: dann eben aufgeklappt.
    }
  }, [])

  const umschalten = () => {
    const neu = !offen
    setOffen(neu)
    try {
      localStorage.setItem(SPEICHER, neu ? 'nein' : 'ja')
    } catch {
      // Ohne Speicher bleibt es bei dieser Sitzung. Das ist in Ordnung.
    }
  }

  return (
    <section className="mt-10 rounded-brand border border-brand-border bg-white">
      <h2>
        <button
          type="button"
          onClick={umschalten}
          aria-expanded={offen}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        >
          <span>
            <span className="block text-[0.95rem] font-semibold text-navy">
              Wie fange ich an?
            </span>
            <span className="mt-0.5 block text-[0.8rem] text-brand-muted">
              Die ersten Schritte, kurz erklärt
            </span>
          </span>
          <svg
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            className={`h-4 w-4 shrink-0 text-brand-muted transition-transform ${
              offen ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </h2>

      {offen && (
        <div className="border-t border-brand-border px-5 py-4">
          <dl className="space-y-4">
            {SCHRITTE.map(s => (
              <div key={s.frage}>
                <dt className="text-[0.88rem] font-semibold text-navy">{s.frage}</dt>
                <dd className="mt-1 max-w-[68ch] text-[0.86rem] leading-relaxed text-brand-text">
                  {s.antwort}
                  {s.ziel && (
                    <>
                      {' '}
                      <Link
                        to={s.ziel.to}
                        className="font-semibold text-accent no-underline hover:underline"
                      >
                        {s.ziel.text} →
                      </Link>
                    </>
                  )}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-5 border-t border-brand-border/60 pt-3 text-[0.8rem] leading-relaxed text-brand-muted">
            Es gibt keine Reihenfolge, die man einhalten muss. Wenn dir gerade nur eine
            Situation im Kopf herumgeht, schreib die auf — der Rest kann warten.
          </p>
        </div>
      )}
    </section>
  )
}
