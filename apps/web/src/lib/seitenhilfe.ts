/**
 * Was auf dieser Seite geht — das Fragezeichen in der Kopfleiste.
 *
 * **Das Problem.** EchoB hat über fünfzig Seiten hinter der Anmeldung, und jede davon hat
 * einen guten Grund. Von außen sieht man den nicht. Wer auf „Skalen" klickt, findet
 * Zahlenreihen; dass sie aus den eigenen Szenen entstehen und über Monate eine Richtung
 * zeigen, steht nirgends. Die Folge ist nicht, dass jemand etwas falsch macht — die Folge
 * ist, dass er es gar nicht erst benutzt.
 *
 * **Warum ein Verzeichnis und nicht ein Text je Seite.** Drei Gründe. Erstens sieht man hier
 * auf einen Blick, wo etwas fehlt — ein Wächter prüft das sogar. Zweitens liest sich der Ton
 * gleichmäßig, wenn alle Texte nebeneinander stehen. Drittens kostet eine neue Seite keine
 * Handgriffe in der Seite selbst: Eintrag hinzufügen, fertig. Wer die Erklärung in die Seite
 * schreibt, vergisst sie bei der nächsten.
 *
 * **Die Form ist überall gleich, und das ist Absicht.** Zweck in einem Satz, dann was man
 * hier tun kann, dann höchstens ein Tipp. Wer drei Seiten gelesen hat, weiß, wo was steht,
 * und überfliegt den Rest. Ein Feld, das nichts Eigenes zu sagen hat, bleibt leer —
 * ausgedachte Tipps sind schlechter als keine.
 *
 * **Nicht enthalten:** der Fachpersonen- und der Ausbildungsbereich. Beide haben ihre eigene
 * Sprache und ihr eigenes Publikum; dort gehören eigene Texte hin, nicht dieselben. Bis die
 * geschrieben sind, erscheint dort kein Fragezeichen — ein Symbol, das ein leeres Fenster
 * öffnet, ist schlimmer als keines.
 */
import { matchPath } from 'react-router-dom'

export interface SeitenHilfe {
  /** Überschrift im Fenster. Benennt die Seite, nicht die Funktion. */
  titel: string
  /** Wofür die Seite da ist — ein Satz, kein Absatz. */
  zweck: string
  /** Was man hier tun kann. Zwei bis vier Zeilen, Verben voran. */
  schritte?: string[]
  /** Das eine, was man sonst übersieht. Lieber weglassen als erfinden. */
  tipp?: string
}

/**
 * Routenmuster → Hilfe. Die Muster sind dieselben Zeichenketten wie in `App.tsx`;
 * ein Wächter hält beide Seiten zusammen.
 */
export const SEITENHILFE: Record<string, SeitenHilfe> = {
  // ── Fälle ────────────────────────────────────────────────────────────────
  '/app': {
    titel: 'Deine Fälle',
    zweck: 'Jede Beziehung, die du hier ansiehst, ist ein eigener Fall — mit eigenen Szenen, eigenen Mustern, eigener Freigabe.',
    schritte: [
      'Einen Fall öffnen, um weiterzuarbeiten',
      'Einen neuen Fall anlegen — auch für eine vergangene Beziehung',
      'Fälle archivieren, die dich nicht mehr beschäftigen',
    ],
    tipp: 'Mehrere Fälle lohnen sich, wenn sich Muster wiederholen: Nebeneinander sieht man, was an der Person lag und was an dir.',
  },
  '/app/cases/new': {
    titel: 'Neuen Fall anlegen',
    zweck: 'Ein paar Angaben zum Einstieg — mehr braucht es nicht, alles andere entsteht unterwegs.',
    schritte: ['Benennen, um wen es geht', 'Art und Stand der Beziehung angeben'],
    tipp: 'Du musst hier nichts Endgültiges eintragen. Alles lässt sich später ändern.',
  },
  '/app/cases/:caseId': {
    titel: 'Fall-Überblick',
    zweck: 'Die Startseite dieses Falls: was zuletzt passiert ist und was als Nächstes dran wäre.',
    schritte: [
      'Sehen, was sich seit dem letzten Besuch getan hat',
      'Von hier in Szenen, Skalen, Berichte und Echo abzweigen',
    ],
  },
  '/app/cases/:caseId/onboarding': {
    titel: 'Erste Fragen',
    zweck: 'Ein paar Fragen zum Anfang, damit Echo weiß, worum es überhaupt geht.',
    schritte: ['Antworten, so weit du magst', 'Später jederzeit ergänzen'],
    tipp: 'Du kannst Fragen überspringen. Unvollständig ist besser als abgebrochen.',
  },
  '/app/cases/:caseId/einstieg': {
    titel: 'Einstieg über fremde Szenen',
    zweck: 'Fünf erfundene Szenen zum Wiedererkennen — für den Fall, dass die eigene erste Szene zu schwer ist.',
    schritte: ['Ankreuzen, was dir bekannt vorkommt', 'Danach steht etwas in deinem Fall'],
    tipp: 'Das ist keine Umfrage. Was du hier wiedererkennst, ist der Anfang deines Materials — und Echo hat damit einen Anknüpfungspunkt.',
  },

  // ── Szenen ───────────────────────────────────────────────────────────────
  '/app/cases/:caseId/scenes': {
    titel: 'Deine Szenen',
    zweck: 'Einzelne Situationen, festgehalten — das Rohmaterial, aus dem hier alles andere entsteht.',
    schritte: [
      'Eine Szene anlegen, wenn etwas passiert ist',
      'Ältere Szenen wiederlesen und ergänzen',
      'Nach Schlagwörtern filtern',
    ],
    tipp: 'Lieber kurz und bald als ausführlich und irgendwann. Drei Sätze am selben Abend sind mehr wert als eine Seite nach zwei Wochen.',
  },
  '/app/cases/:caseId/scenes/new': {
    titel: 'Szene festhalten',
    zweck: 'Eine einzelne Situation aufschreiben: was war, was du gedacht und gefühlt hast.',
    schritte: ['Beschreiben, was geschehen ist', 'Deine eigene Reaktion festhalten', 'Datum setzen, wenn du es noch weißt'],
    tipp: 'Schreib, was gesagt wurde, so wörtlich du kannst. Der genaue Satz ist später mehr wert als deine Zusammenfassung davon.',
  },
  '/app/cases/:caseId/scenes/:sceneId': {
    titel: 'Diese Szene',
    zweck: 'Eine einzelne Situation im Detail — mit dem, was die App daraus gelesen hat.',
    schritte: ['Text ergänzen oder ändern', 'Erkannte Muster ansehen', 'Mit Echo darüber sprechen'],
  },
  '/app/cases/:caseId/scenes/echo': {
    titel: 'Szene im Gespräch erfassen',
    zweck: 'Für die Fälle, in denen das leere Feld nicht geht: Erzähl es, und daraus wird eine Szene.',
    schritte: ['Frei erzählen', 'Am Ende den Entwurf prüfen und speichern'],
    tipp: 'Echo kennt in diesem Dialog deinen Fall nicht. Es hört nur zu und ordnet — damit du nicht schon beim Erzählen gedeutet wirst.',
  },

  // ── Auswertung ───────────────────────────────────────────────────────────
  '/app/cases/:caseId/scales': {
    titel: 'Muster und Skalen',
    zweck: 'Was sich über deine Szenen hinweg wiederholt — und wie es sich über die Zeit verändert.',
    schritte: ['Wiederkehrende Muster ansehen', 'Verlauf der Skalen über Monate verfolgen'],
    tipp: 'Einzelne Werte sagen wenig. Die Richtung über mehrere Monate sagt viel — deshalb lohnt sich Regelmäßigkeit mehr als Gründlichkeit.',
  },
  '/app/cases/:caseId/resonanz': {
    titel: 'Was du wiedererkannt hast',
    zweck: 'Die fremden Szenen, die dir vertraut vorkamen — zusammen ergeben sie oft eine Richtung.',
    schritte: ['Ansehen, was sich häuft', 'Von hier zur eigenen Szene weitergehen'],
    tipp: 'Hier stehen bewusst keine Punktwerte. Die Szenen sind Literatur, kein geeichtes Messinstrument.',
  },
  '/app/cases/:caseId/gefuehlsbild': {
    titel: 'Gefühlsbild',
    zweck: 'Wie es dir gerade geht — auch dann, wenn die Worte dafür nicht da sind.',
    schritte: ['Über Szenen, ein Wortfeld oder freie Wörter hineingehen', 'Den Text lesen, den Echo daraus schreibt'],
    tipp: 'Drei Zugänge, weil das Nichtsagenkönnen verschiedene Gründe hat. Nimm den, der dir am wenigsten Widerstand macht.',
  },
  '/app/cases/:caseId/review': {
    titel: 'Verlauf und Rückblick',
    zweck: 'Wie sich die Lage über Wochen entwickelt hat — als Kurve und als geschriebener Rückblick.',
    schritte: ['Entwicklung der Werte ansehen', 'Einen Rückblick erzeugen lassen', 'Frühere Rückblicke wiederlesen'],
    tipp: 'Ein Rückblick über einen zu kurzen Zeitraum sagt wenig. Vier bis sechs Wochen sind ein guter Abstand.',
  },
  '/app/cases/:caseId/selbsttest/:slug': {
    titel: 'Selbsttest',
    zweck: 'Eine strukturierte Selbsteinschätzung — über dein eigenes Erleben, nicht über die andere Person.',
    schritte: ['Fragen beantworten', 'Auswertung lesen', 'Ergebnis im Fall behalten'],
    tipp: 'Das Ergebnis ist keine Diagnose und kein Urteil über jemanden. Es ordnet, was du berichtest.',
  },

  // ── Deuten ───────────────────────────────────────────────────────────────
  '/app/cases/:caseId/hypotheses': {
    titel: 'Hypothesen',
    zweck: 'Geführte Gespräche zu möglichen Erklärungen — tastend formuliert, nie als Feststellung.',
    schritte: ['Einen Dialog beginnen', 'Gespeicherte Arbeitshypothesen wiederlesen'],
    tipp: 'Eine Hypothese ist eine Vermutung zum Prüfen. Sie darf sich als falsch herausstellen — dafür ist sie da.',
  },
  '/app/cases/:caseId/hypotheses/:hypothesisId': {
    titel: 'Hypothesen-Dialog',
    zweck: 'Ein geführtes Gespräch entlang einer möglichen Erklärung.',
    schritte: ['Fragen beantworten', 'Am Ende entscheiden, ob du das Ergebnis behältst'],
  },
  '/app/cases/:caseId/topics/:topicId': {
    titel: 'Themendialog',
    zweck: 'Ein Gespräch zu einem einzelnen Thema, das sich durch deine Szenen zieht.',
    schritte: ['Das Thema durchsprechen', 'Die Zusammenfassung behalten'],
  },
  '/app/cases/:caseId/artifacts': {
    titel: 'Erkenntnisse',
    zweck: 'Was du unterwegs verstanden hast — festgehalten und, wenn es nicht mehr stimmt, als überholt markiert.',
    schritte: ['Erkenntnisse nachlesen', 'Überholtes als „gilt nicht mehr" kennzeichnen'],
    tipp: 'Überholtes wird nicht gelöscht. Dass sich deine Sicht geändert hat, ist selbst eine Information — oft die wichtigste.',
  },
  '/app/cases/:caseId/documents': {
    titel: 'Dokumente',
    zweck: 'Belege zum Fall: der Brief, der Chatverlauf, die Mitschrift — anders als eine Szene, die du erzählst.',
    schritte: ['Text einfügen oder eine Textdatei auslesen lassen', 'Dokumente dem Fall zuordnen'],
    tipp: 'Es wird keine Datei hochgeladen. Der Text wird im Browser ausgelesen; nur er verlässt dein Gerät.',
  },

  // ── Echo ─────────────────────────────────────────────────────────────────
  '/app/cases/:caseId/echo': {
    titel: 'Echo',
    zweck: 'Das Gespräch zu diesem Fall — Echo kennt dein Material und antwortet darauf, nicht allgemein.',
    schritte: ['Fragen stellen oder frei erzählen', 'Mehrere Gespräche nebeneinander führen', 'Ein Gespräch zusammenfassen lassen'],
    tipp: 'Über das Zahnrad lässt sich einstellen, wie Echo mit dir spricht — zugewandt, klärend oder deutlich. Es antwortet nicht für alle gleich.',
  },

  // ── Berichte und Profile ─────────────────────────────────────────────────
  '/app/cases/:caseId/reports': {
    titel: 'Berichte',
    zweck: 'Zusammenfassungen deines Falls — für dich, für ein Gespräch oder für eine Fachperson.',
    schritte: ['Einen Bericht erstellen', 'Frühere Berichte wiederlesen'],
    tipp: 'Ein Bericht ist ein guter Vorbereiter für ein Erstgespräch: Du musst dann nicht bei null anfangen zu erzählen.',
  },
  '/app/cases/:caseId/reports/new': {
    titel: 'Bericht erstellen',
    zweck: 'Aus deinem Material wird ein zusammenhängender Text.',
    schritte: ['Art des Berichts wählen', 'Erzeugen lassen und vor dem Speichern prüfen'],
  },
  '/app/cases/:caseId/reports/:reportId': {
    titel: 'Dieser Bericht',
    zweck: 'Ein erstellter Bericht zum Lesen, Ändern und Weitergeben.',
    schritte: ['Text anpassen', 'Für eine Fachperson freigeben', 'Ausdrucken'],
  },
  '/app/cases/:caseId/person-profile': {
    titel: 'Profil der anderen Person',
    zweck: 'Eine strukturierte Einschätzung dessen, was du an der anderen Person erlebst.',
    schritte: ['Module nacheinander ausfüllen', 'Zusammenfassung lesen'],
    tipp: 'Das ist deine Sicht, keine Diagnose — und es bleibt deine Sicht, auch wenn am Ende Zahlen stehen.',
  },
  '/app/cases/:caseId/person-profile/echo': {
    titel: 'Gespräch zum Profil',
    zweck: 'Über deine Einschätzung der anderen Person sprechen.',
    schritte: ['Einzelne Punkte durchgehen', 'Unsicheres offen lassen'],
  },

  // ── Weitergeben ──────────────────────────────────────────────────────────
  '/app/cases/:caseId/share': {
    titel: 'Freigaben',
    zweck: 'Wer von deinem Fall was sehen darf — und nichts darüber hinaus.',
    schritte: ['Eine Fachperson einladen oder verbinden', 'Einzelne Inhalte gezielt freigeben', 'Eine Freigabe jederzeit widerrufen'],
    tipp: 'Freigabe ist nicht alles-oder-nichts. Du wählst einzeln aus, und du kannst jederzeit zurücknehmen — sofort und ohne Begründung.',
  },
  '/app/cases/:caseId/export': {
    titel: 'Ausdruck',
    zweck: 'Eine druckbare Zusammenfassung deines Falls zum Mitnehmen.',
    schritte: ['Zusammenfassung erzeugen', 'Ausdrucken oder als PDF sichern'],
    tipp: 'Nützlich vor einem Erstgespräch: etwas auf Papier zu haben nimmt den Druck, alles erzählen zu müssen.',
  },
  '/app/inbox': {
    titel: 'Von deiner Fachperson',
    zweck: 'Was dir zugewiesen wurde und welche Termine anstehen.',
    schritte: ['Zuweisungen öffnen und bearbeiten', 'Erledigtes abhaken'],
  },

  // ── Mein Kompass ─────────────────────────────────────────────────────────
  '/app/kompass': {
    titel: 'Dein Kompass',
    zweck: 'Dein eigener Raum — ohne Fall. Hier geht es um dich, nicht um jemanden, mit dem es schwierig ist.',
    schritte: ['Einen Moment festhalten', 'Den Verlauf ansehen', 'Den Notfallplan schreiben'],
    tipp: 'Ein Antippen genügt. Alles Weitere ist freiwillig — ein Verlauf aus kurzen Einträgen ist mehr wert als drei ausführliche.',
  },
  '/app/kompass/verlauf': {
    titel: 'Deine Spur',
    zweck: 'Alles, was du festgehalten hast, auf einer Achse — Momente, Sätze, Vorhaben, Porträts.',
    schritte: ['Zeitraum umschalten', 'Szenen einblenden', 'Einen Punkt antippen', 'Einen Moment wegnehmen'],
    tipp: 'Die Lücken sind auch eine Auskunft: Wochen ohne Eintrag sind oft die dichten.',
  },
  '/app/kompass/saetze': {
    titel: 'Sätze über dich',
    zweck: 'Was du über dich herausgefunden hast — in Sätzen, die du selbst bestätigt hast.',
    schritte: ['Art wählen und Satz schreiben', 'Echo schauen lassen, was sich wiederholt', 'Entwurf bestätigen', '„Stimmt das noch?" beantworten'],
    tipp: 'Bestätigt heißt nicht wahr, sondern: Das war deine Einschätzung an dem Tag. Deshalb steht das Alter daneben — und deshalb fragt der Raum nach einem halben Jahr noch einmal nach.',
  },
  '/app/kompass/uebungen': {
    titel: 'Geführte Übungen',
    zweck: 'Ein paar Fragen, und am Ende steht etwas da — ein Satz über dich oder ein Vorhaben.',
    schritte: ['Eine Übung wählen', 'Fragen beantworten oder überspringen', 'Das Ergebnis prüfen und bestätigen'],
    tipp: 'Zwei beantwortete Fragen genügen. Was Echo daraus macht, ist ein Entwurf — es gilt erst, wenn du zustimmst.',
  },
  '/app/kompass/gefuehlsbild': {
    titel: 'Dein Gefühlsbild',
    zweck: 'Wie es dir überhaupt geht — unabhängig von einem Fall.',
    schritte: ['Über Szenen, ein Wortfeld oder freie Wörter hineingehen', 'Den Text lesen, den Echo daraus schreibt', 'Bestätigen'],
    tipp: 'Dasselbe Werkzeug gibt es auch im Fall. Dieses Bild gehört zu dir und geht mit keiner Freigabe mit.',
  },
  '/app/kompass/portrait': {
    titel: 'Dein Selbstporträt',
    zweck: 'Ein zusammenhängender Text darüber, wie du dich gerade siehst — aus allem, was du festgehalten hast.',
    schritte: ['Echo schreiben lassen', 'Ändern, was nicht stimmt', 'Bestätigen — danach bleibt es stehen'],
    tipp: 'Es kommt nicht auf Knopfdruck, sondern wenn genug dazugekommen ist. Das vom März neben dem vom September zu lesen, ist der eigentliche Zweck.',
  },
  '/app/kompass/vorhaben': {
    titel: 'Was du dir vornimmst',
    zweck: 'Ein Vorhaben ist kein Vorsatz: Es hat Schritte und einen Abstand, in dem du zurückschaust.',
    schritte: ['Etwas vornehmen', 'Schritte abhaken', 'Zurückschauen, wenn der Abstand um ist'],
    tipp: 'Es gibt kein „aufgegeben". Was gerade nicht dran ist, ruht — und bleibt da, ohne zu drängen.',
  },
  '/app/kompass/brief': {
    titel: 'Ein Brief an dich selbst',
    zweck: 'Ein paar Zeilen an dich in ein paar Monaten — für einen Tag, an dem es schwerer ist.',
    schritte: ['Schreiben, solange es dir gut genug geht', 'Abstand wählen', 'Zukleben — und vergessen'],
    tipp: 'Du kannst ihn jederzeit wegnehmen, aber nicht vorher lesen. Genau das macht ihn aus.',
  },
  '/app/kompass/krisenplan': {
    titel: 'Dein Notfallplan',
    zweck: 'Was hilft, wenn es kippt — aufgeschrieben, solange es dir gut genug dafür geht.',
    schritte: ['Warnzeichen benennen', 'Schritte der Reihe nach notieren', 'Menschen mit Nummer eintragen'],
    tipp: 'Was in guten Momenten geholfen hat, steht hier als Vorschlag bereit. Deshalb fragt der Puls danach.',
  },

  // ── Konto ────────────────────────────────────────────────────────────────
  '/app/profile': {
    titel: 'Wo du stehst',
    zweck: 'Eine Selbstbeschreibung über mehrere Bereiche — über dich, unabhängig von einem einzelnen Fall.',
    schritte: ['Bereiche nacheinander ausfüllen', 'Zusammenfassung lesen'],
    tipp: 'Diese Seite gehört zu deinem Kompass, nicht zu einem Fall. Wenn sich Muster über Beziehungen hinweg wiederholen, zeigt es sich hier.',
  },
  '/app/profile/echo': {
    titel: 'Gespräch darüber, wo du stehst',
    zweck: 'Über deine Selbstbeschreibung sprechen.',
    schritte: ['Einzelne Bereiche vertiefen'],
  },
  '/app/settings': {
    titel: 'Einstellungen',
    zweck: 'Konto, Darstellung und wie Echo mit dir spricht.',
    schritte: ['Echo-Modus wählen', 'Benachrichtigungen einstellen', 'Konto verwalten'],
  },
  '/app/privacy': {
    titel: 'Datenschutz',
    zweck: 'Was gespeichert ist, was du herunterladen und was du löschen kannst.',
    schritte: ['Deine Daten exportieren', 'Einwilligungen ansehen', 'Konto löschen'],
    tipp: 'Löschen heißt hier wirklich löschen, nicht ausblenden.',
  },
  '/app/upgrade': {
    titel: 'Tarif',
    zweck: 'Was in deinem Tarif enthalten ist und was ein Wechsel ändert.',
    schritte: ['Tarife vergleichen', 'Wechseln oder kündigen'],
  },
  '/app/help': {
    titel: 'Hilfe und Begleitung',
    zweck: 'Wo es menschliche Unterstützung gibt — Coaching, Fachpersonen und Hilfe in Krisen.',
    schritte: ['Begleitung anfragen', 'Eine Fachperson suchen', 'Krisennummern nachschlagen'],
    tipp: 'EchoB ersetzt keine Therapie. Wenn es gerade zu viel ist, steht hier, wen du sofort erreichst.',
  },

  // ── Paarraum ─────────────────────────────────────────────────────────────
  '/app/paar': {
    titel: 'Für Paare',
    zweck: 'Ein gemeinsamer Raum mit deiner Partnerperson — getrennt von deinem eigenen Fall.',
    schritte: ['Eine Einladung erstellen', 'Einer Einladung folgen', 'Einen bestehenden Raum öffnen'],
    tipp: 'Die Kopplung gibt der anderen Person keinen Zugriff auf deinen Fall. Sie öffnet nur den gemeinsamen Raum.',
  },
  '/app/paar/beitreten/:code': {
    titel: 'Einladung annehmen',
    zweck: 'Du bist eingeladen, einen gemeinsamen Raum zu betreten.',
    schritte: ['Annehmen oder ablehnen'],
    tipp: 'Dein eigener Fall bleibt deiner. Er wird durch die Annahme nicht sichtbar.',
  },
  '/app/paar/:coupleId': {
    titel: 'Euer Raum',
    zweck: 'Die Übersicht: wo ihr gerade steht und was auf dich wartet.',
    schritte: ['Oben nach Anliegen einsteigen', 'Barometer stellen', 'Offene Züge erledigen'],
    tipp: 'Der Kasten „Was ist gerade?" ganz oben führt dich auf den richtigen Reiter — es gibt sechs Arten, etwas zu sagen, und sie tun Verschiedenes.',
  },
  '/app/paar/:coupleId/echo': {
    titel: 'Dein Echo im Raum',
    zweck: 'Ein Gespräch nur für dich — die andere Person sieht es nie.',
    schritte: ['Frei erzählen', 'Ein Gespräch zusammenfassen lassen', 'Daraus eine Szene für deinen Fall machen'],
    tipp: 'Das ist das Ohr für die Zeit dazwischen: Hier darf stehen, was du im gemeinsamen Raum noch nicht sagen willst.',
  },
  '/app/paar/:coupleId/mitteilen': {
    titel: 'Ehrlich mitteilen',
    zweck: 'Eine Runde, in der niemand antwortet — nacheinander, ohne Gegenrede.',
    schritte: ['Runde eröffnen', 'Sagen, was zu sagen ist', 'Zuhören, wenn die andere dran ist'],
    tipp: 'Hier läuft keine KI mit. Was ihr euch sagt, bleibt zwischen euch — und weil keine Antwort kommt, formuliert man anders.',
  },
  '/app/paar/:coupleId/fragen': {
    titel: 'Fragen',
    zweck: 'Eine Frage an die andere Person, eine Antwort — kein Hin und Her.',
    schritte: ['Eine Frage dalassen', 'Offene Fragen beantworten', 'Eine Frage zurückziehen'],
    tipp: 'Die Beschränkung auf eine Antwort ist Absicht. Unmoderiertes Hin und Her spitzt zu, statt zu klären.',
  },
  '/app/paar/:coupleId/gespraeche': {
    titel: 'Gespräche',
    zweck: 'Moderierte Sitzungen, bei denen ihr beide gleichzeitig da seid.',
    schritte: ['Ein Gespräch vorschlagen', 'Sich vorbereiten', 'Echo zur Moderation rufen', 'Danach zusammenfassen lassen'],
    tipp: 'Echo moderiert auf Zuruf, nicht nach jedem Satz. Ihr redet miteinander, nicht mit der App.',
  },
  '/app/paar/:coupleId/streit': {
    titel: 'Nach einem Streit',
    zweck: 'Drei Schritte, wenn es gerade eskaliert ist: ankommen, sortieren, entscheiden.',
    schritte: ['Erst ankommen — ohne Formular', 'Sortieren, was passiert ist', 'Einen Ausgang wählen'],
    tipp: 'Der erste Schritt kommt ohne KI aus. Manchmal reicht er schon.',
  },
  '/app/paar/:coupleId/mediation': {
    titel: 'Mediation',
    zweck: 'Für Festgefahrenes: Jede Seite schildert ihre Sicht, Echo erarbeitet einen Vorschlag.',
    schritte: ['Ein Thema anlegen', 'Offene Sicht schreiben — und auf Wunsch eine vertrauliche', 'Vorschlag lesen und Brücken annehmen'],
    tipp: 'Die vertrauliche Sicht sieht nur Echo, nie die andere Person — wie das Einzelgespräch in einer echten Mediation.',
  },
  '/app/paar/:coupleId/abmachungen': {
    titel: 'Abmachungen',
    zweck: 'Was ihr vereinbart habt — und was daraus geworden ist.',
    schritte: ['Eine Abmachung vorschlagen', 'Einer Abmachung zustimmen', 'Später nachhalten, ob sie gehalten hat'],
    tipp: 'Das Nachhalten ist der eigentliche Teil. Eine Abmachung ohne Nachfrage ist ein Vorsatz.',
  },
  '/app/paar/:coupleId/szenen': {
    titel: 'Beziehungsszenen',
    zweck: 'Fremde Szenen als gemeinsames Material — beide antworten getrennt, danach vergleicht ihr.',
    schritte: ['Szenen ins Regal legen', 'Eine Runde vorschlagen', 'Getrennt antworten, dann gemeinsam ansehen'],
    tipp: 'Ihr seht die Antwort der anderen erst, wenn beide fertig sind. Sonst antwortet man auf sie statt auf die Szene.',
  },
  '/app/paar/:coupleId/tests': {
    titel: 'Tests',
    zweck: 'Denselben Test getrennt ausfüllen und die Ergebnisse nebeneinanderlegen.',
    schritte: ['Einen Test auswählen', 'Getrennt ausfüllen', 'Vergleich ansehen'],
    tipp: 'Es sind nicht alle Tests verfügbar. Tests, bei denen eine Person die andere einschätzen würde, bleiben privat.',
  },
  '/app/paar/:coupleId/test/:slug': {
    titel: 'Test ausfüllen',
    zweck: 'Deine Antworten — die andere Person sieht sie erst, wenn sie selbst fertig ist.',
    schritte: ['Fragen beantworten', 'Abschließen'],
  },
  '/app/paar/:coupleId/impulse': {
    titel: 'Impulse',
    zweck: 'Kleine Übungen für zwischendurch — kurz, angeleitet, ohne KI.',
    schritte: ['Einen Impuls auswählen', 'Getrennt antworten', 'Antworten nebeneinander ansehen'],
  },
  '/app/paar/:coupleId/rueckblick': {
    titel: 'Rückblick',
    zweck: 'Wie es über einen Zeitraum lief — Zahlen und ein geschriebenes Bild dazu.',
    schritte: ['Zeitraum wählen', 'Rückblick erzeugen lassen', 'Frühere wiederlesen'],
    tipp: 'Über einen leeren Zeitraum entsteht bewusst kein Text. Ein Rückblick über nichts wäre erfunden.',
  },
  '/app/paar/:coupleId/fortschritt': {
    titel: 'Fortschritt',
    zweck: 'Was ihr zusammen getan habt — gemeinsam gezählt, nicht gegeneinander.',
    schritte: ['Punkte und Meilensteine ansehen'],
    tipp: 'Es gibt keine Rangliste und keinen Gewinner. Am meisten zählt das Einhalten einer Abmachung, nicht das Vielreden.',
  },
  '/app/paar/:coupleId/freigaben': {
    titel: 'Freigaben',
    zweck: 'Ob eine Fachperson in euren Raum sehen darf — und in welche Teile.',
    schritte: ['Eine Freigabe vorschlagen', 'Einer Bitte zustimmen', 'Eine Freigabe beenden'],
    tipp: 'Freigeben braucht euch beide. Beenden kann jeder allein, sofort.',
  },
  '/app/paar/:coupleId/einstellungen': {
    titel: 'Einstellungen des Raums',
    zweck: 'Erinnerungen, Grundregeln — und wie ihr den Raum wieder beendet.',
    schritte: ['Erinnerungen einstellen', 'Raum beenden oder löschen'],
    tipp: 'Beim Löschen verschwinden gemeinsame Verläufe für beide. Sie lassen sich nicht nach Person auftrennen.',
  },
  '/app/paar/sitzung/:sessionId': {
    titel: 'Diese Sitzung',
    zweck: 'Ein laufendes oder abgeschlossenes Gespräch zu zweit.',
    schritte: ['Schreiben, wenn du dran bist', 'Echo zur Moderation rufen', 'Pause machen, wenn es zu viel wird'],
    tipp: 'Der Reiter „Nur für dich" ist privat. Was dort steht, sieht die andere Person nie.',
  },
  '/app/paar/thema/:topicId': {
    titel: 'Dieses Thema',
    zweck: 'Ein Mediationsthema mit beiden Sichten und dem Vorschlag dazu.',
    schritte: ['Deine Sicht schreiben', 'Vorschlag lesen', 'Eine Brücke annehmen oder verwerfen'],
  },

  // ── Fachpersonen ─────────────────────────────────────────────────────────
  // Andere Ansprache als oben: Hier arbeitet jemand beruflich, und die Texte dürfen
  // Fachbegriffe benutzen. Was sie nicht dürfen, ist Sorgfaltspflichten verschweigen —
  // wo eine Grenze verläuft, steht sie im Tipp.
  '/professional': {
    titel: 'Postfach',
    zweck: 'Was seit Ihrem letzten Besuch hereingekommen ist — über alle Klient:innen hinweg.',
    schritte: ['Neue Freigaben und Rückmeldungen sichten', 'Von hier in den jeweiligen Fall springen'],
  },
  '/professional/dashboard': {
    titel: 'Ihre Klient:innen',
    zweck: 'Alle Fälle, die Ihnen freigegeben wurden, mit dem Stand der Zusammenarbeit.',
    schritte: ['Einen Fall öffnen', 'Nach Status filtern', 'Eine neue Klientin einladen'],
    tipp: 'Sie sehen ausschließlich, was die Klientin Ihnen ausdrücklich freigegeben hat — und nur so lange, wie sie es freigegeben lässt.',
  },
  '/professional/cases/:caseId': {
    titel: 'Fall-Arbeitsplatz',
    zweck: 'Alles zu einer Klientin an einem Ort: was sie freigegeben hat und was Sie daraus erarbeiten.',
    schritte: [
      'Übersicht, Fall-FAQ und Verlauf zeigen ihr Material',
      'Fallarbeit bündelt Ihres: Arbeitsmappe, Berichte, Notizen',
      'Zusammenarbeit: Dialoge, Fragebögen, Nachrichten und Ressourcen zuweisen',
      'Echo arbeitet auf dem freigegebenen Material',
    ],
    tipp: 'Die Trennung der Reiter ist die Trennung der Herkunft: links, was von ihr kommt — rechts, was von Ihnen kommt.',
  },
  '/professional/cases/:caseId/echo': {
    titel: 'Echo zum Fall',
    zweck: 'Ein fachliches Gespräch über das freigegebene Material dieser Klientin.',
    schritte: ['Fragen zum Fall stellen', 'Hypothesen durchdenken', 'Ergebnisse in die Arbeitsmappe übernehmen'],
    tipp: 'Echo kennt hier ausschließlich Freigegebenes. Was die Klientin zurückhält, existiert für dieses Gespräch nicht — auch dann nicht, wenn Sie es aus der Sitzung wissen.',
  },
  '/professional/cases/:caseId/reports/:reportId': {
    titel: 'Dieser Bericht',
    zweck: 'Ein erstellter Bericht zum Lesen, Überarbeiten und Weitergeben.',
    schritte: ['Text anpassen', 'Ausdrucken oder speichern'],
    tipp: 'Ein erzeugter Bericht ist ein Entwurf, kein Befund. Die fachliche Verantwortung für das, was darin steht, bleibt bei Ihnen.',
  },
  '/professional/paarraum/:coupleId': {
    titel: 'Paarraum',
    zweck: 'Der gemeinsame Raum eines Paares — so weit beide ihn Ihnen freigegeben haben.',
    schritte: ['Freigegebene Elemente ansehen', 'Mit Echo über das Material sprechen'],
    tipp: 'Freigeben mussten hier beide. Widerrufen kann jeder allein — dann ist der Zugang sofort zu, ohne Vorwarnung.',
  },
  '/professional/couples/:coupleId/echo': {
    titel: 'Echo zur Paar-Analyse',
    zweck: 'Ein allparteiliches Gespräch über die beiden gekoppelten Fälle.',
    schritte: ['Muster im Zusammenspiel besprechen', 'Beide Seiten nebeneinanderlegen'],
    tipp: 'Allparteilich heißt: kein Ergebnis, das einer Seite recht gibt. Das ist Absicht und lässt sich nicht abstellen.',
  },
  '/professional/couples/:coupleId/reports/:reportId': {
    titel: 'Paar-Bericht',
    zweck: 'Ein Bericht über die gekoppelten Fälle beider Personen.',
    schritte: ['Text anpassen', 'Ausdrucken oder speichern'],
  },
  '/professional/templates': {
    titel: 'Ressourcen',
    zweck: 'Ihre wiederverwendbaren Vorlagen: Fragebögen, Materialien, Texte für die Zuweisung.',
    schritte: ['Eine Vorlage anlegen', 'Bestehende bearbeiten', 'Aus dem Fall heraus zuweisen'],
    tipp: 'Was Sie zweimal geschrieben haben, gehört hierher. Die dritte Klientin bekommt es dann mit einem Klick.',
  },
  '/professional/report-templates': {
    titel: 'Berichtsvorlagen',
    zweck: 'Eigene Vorlagen dafür, wie ein Bericht aufgebaut sein soll.',
    schritte: ['Eine Vorlage schreiben', 'Abschnitte und Tonfall festlegen', 'Beim Erstellen eines Berichts auswählen'],
    tipp: 'Eine Vorlage ist eine Anweisung an Echo, kein Formular. Je genauer Sie beschreiben, was Sie erwarten, desto weniger müssen Sie danach umschreiben.',
  },
  '/professional/profil': {
    titel: 'Ihr Verzeichnis-Profil',
    zweck: 'Wie Sie im öffentlichen Fachpersonenverzeichnis erscheinen.',
    schritte: ['Schwerpunkte und Arbeitsweise beschreiben', 'Erreichbarkeit angeben', 'Sichtbarkeit steuern'],
    tipp: 'Menschen suchen hier nicht nach Methoden, sondern nach jemandem, bei dem sie sich sicher fühlen. Schreiben Sie entsprechend.',
  },
  '/professional/settings': {
    titel: 'Einstellungen',
    zweck: 'Wie Echo in Ihren Fällen arbeitet — Ausrichtung, Tonfall, Voreinstellungen.',
    schritte: ['Therapeutischen Ansatz wählen', 'Konto und Abrechnung verwalten'],
    tipp: 'Der gewählte Ansatz verändert, wie Echo formuliert und worauf es achtet — nicht, welche Daten es sieht.',
  },
  '/professional/register': {
    titel: 'Als Fachperson anmelden',
    zweck: 'Ihr Konto zum Fachpersonen-Zugang machen.',
    schritte: ['Berufsgruppe und Qualifikation angeben', 'Auftragsverarbeitungsvertrag abschließen'],
    tipp: 'Ohne den Auftragsverarbeitungsvertrag bleiben die Freigabefunktionen gesperrt. Das ist keine Formalie, sondern die Rechtsgrundlage dafür, dass Sie Fallinhalte überhaupt sehen dürfen.',
  },

  // ── Ausbildungsinstitut ──────────────────────────────────────────────────
  '/institute/dashboard': {
    titel: 'Institut',
    zweck: 'Der Überblick: Kohorte, Kontingente, offene Einreichungen.',
    schritte: ['Sehen, was Aufmerksamkeit braucht', 'In Kohorte, Aufgaben oder Einreichungen abzweigen'],
  },
  '/institute/students': {
    titel: 'Studierende',
    zweck: 'Wer in Ihrer Kohorte ist und wie weit die Einzelnen sind.',
    schritte: ['Studierende einladen', 'Status verfolgen', 'Plätze verwalten'],
    tipp: 'Eine Einladung verbraucht erst dann einen Platz, wenn sie angenommen wird.',
  },
  '/institute/cohort': {
    titel: 'Kohorte im Blick',
    zweck: 'Aggregierter Stand der ganzen Gruppe — wo es hakt, ohne in Einzelne hineinzusehen.',
    schritte: ['Auffälligkeiten erkennen', 'Von hier zu einzelnen Studierenden gehen'],
    tipp: 'Diese Seite zeigt bewusst Summen. Wer die Arbeit einer Person lesen will, geht über ihre Einreichung — das hinterlässt eine Spur und ist gewollt.',
  },
  '/institute/assignments': {
    titel: 'Aufgaben',
    zweck: 'Was die Studierenden bearbeiten sollen: Aufgaben, Reflexionen, Ressourcen.',
    schritte: ['Eine Aufgabe erstellen', 'Der Kohorte oder Einzelnen zuweisen', 'Rückläufe verfolgen'],
  },
  '/institute/assignments/:id': {
    titel: 'Diese Aufgabe',
    zweck: 'Die Aufgabe selbst und was zurückgekommen ist.',
    schritte: ['Aufgabe bearbeiten', 'Eingereichte Antworten lesen', 'Rückmeldung geben'],
  },
  '/institute/submissions': {
    titel: 'Einreichungen',
    zweck: 'Fallarbeiten, die zur Sichtung bereitliegen.',
    schritte: ['Offene Einreichungen öffnen', 'Nach Stand sortieren'],
  },
  '/institute/submissions/:id': {
    titel: 'Diese Einreichung',
    zweck: 'Eine eingereichte Fallarbeit als Momentaufnahme — mit KI-gestützter Auswertung entlang Ihres Rasters.',
    schritte: ['Die Arbeit lesen', 'Auswertung anfordern', 'Bewerten und zurückmelden'],
    tipp: 'Die KI-Auswertung ist ein Vorschlag entlang Ihres Rasters, keine Note. Die Bewertung bleibt Ihre.',
  },
  '/institute/rubrics': {
    titel: 'Bewertungsraster',
    zweck: 'Woran eine Fallarbeit gemessen wird — und die Grundlage, auf der die KI auswertet.',
    schritte: ['Ein Raster anlegen', 'Kriterien und Stufen beschreiben', 'Einer Aufgabe zuordnen'],
    tipp: 'Je konkreter ein Kriterium beschrieben ist, desto brauchbarer die Auswertung. „Zeigt Fallverständnis" ergibt Floskeln, „benennt mindestens zwei alternative Deutungen" ergibt eine Aussage.',
  },
  '/institute/modules': {
    titel: 'Lernmodule',
    zweck: 'Eigene Module erstellen und verwalten — und sehen, was auf dem Marktplatz angeboten wird.',
    schritte: ['Ein Modul anlegen', 'Studierende einschreiben', 'Im Marktplatz stöbern'],
  },
  '/institute/modules/:id': {
    titel: 'Dieses Modul',
    zweck: 'Inhalte, Leitfaden und Lektionen eines Lernmoduls.',
    schritte: ['Lektionen schreiben und ordnen', 'Leitfaden hinterlegen', 'Einschreibung regeln'],
  },
  '/institute/marketplace': {
    titel: 'Marktplatz',
    zweck: 'Lernmodule anderer Institute, die zum Einsatz freigegeben sind.',
    schritte: ['Angebote durchsehen', 'Ein Modul im Detail ansehen'],
  },
  '/institute/marketplace/:id': {
    titel: 'Dieses Angebot',
    zweck: 'Vorschau eines fremden Moduls — Aufbau und Umfang, ohne die Inhalte selbst.',
    schritte: ['Inhaltsverzeichnis prüfen', 'Über eine Übernahme entscheiden'],
  },
  '/institute/examples/new': {
    titel: 'Beispielfall erzeugen',
    zweck: 'Einen erfundenen Fall von der KI erstellen lassen — als Übungsmaterial ohne echte Patienten.',
    schritte: ['Rahmen vorgeben', 'Erzeugung starten und im Hintergrund laufen lassen'],
    tipp: 'Hier entstehen keine echten Personendaten. Jede Fallperson bekommt eine erfundene Kennung, die zu keinem Konto gehört — deshalb stellt sich die Schweigepflicht in diesem Bereich gar nicht.',
  },
  '/institute/examples/:id': {
    titel: 'Dieser Beispielfall',
    zweck: 'Der erzeugte Fall zur Durchsicht, bevor er in die Ausbildung geht.',
    schritte: ['Material prüfen', 'Ablegen oder verwerfen'],
    tipp: 'Lesen Sie ihn einmal ganz, bevor Sie ihn freigeben. Ein erfundener Fall kann fachlich danebenliegen, und in der Ausbildung fällt das später schwer zu korrigieren.',
  },
  '/institute/settings': {
    titel: 'Einstellungen des Instituts',
    zweck: 'Der Haus-Stil: wie Echo mit Ihren Studierenden spricht.',
    schritte: ['Ausrichtung festlegen', 'Konto verwalten'],
    tipp: 'Was Sie hier einstellen, prägt das freie Gespräch der Studierenden. Es ersetzt keine Anleitung durch Sie.',
  },
  '/institute/register': {
    titel: 'Institut anlegen',
    zweck: 'Ihr Konto zum Ausbildungsinstitut machen.',
    schritte: ['Einladungscode eingeben', 'Angaben zum Institut ergänzen'],
  },

  // ── Studierende ──────────────────────────────────────────────────────────
  '/student/dashboard': {
    titel: 'Start',
    zweck: 'Was ansteht: offene Aufgaben, laufende Module, deine Fälle.',
    schritte: ['Aufgaben öffnen', 'An einem Fall weiterarbeiten', 'Ein Modul fortsetzen'],
  },
  '/student/assignments': {
    titel: 'Aufgaben',
    zweck: 'Was dein Institut dir zugewiesen hat — Aufgaben, Reflexionen, Material.',
    schritte: ['Eine Aufgabe öffnen', 'Bearbeiten und einreichen'],
  },
  '/student/modules': {
    titel: 'Deine Module',
    zweck: 'Die Lernmodule, in die du eingeschrieben bist, mit deinem Stand.',
    schritte: ['Ein Modul fortsetzen', 'Fortschritt sehen'],
  },
  '/student/modules/:id': {
    titel: 'Dieses Modul',
    zweck: 'Lektionen lesen und abarbeiten.',
    schritte: ['Lektion für Lektion durchgehen', 'Erledigtes abhaken'],
  },
  '/student/cases/:id': {
    titel: 'Dein Übungsfall',
    zweck: 'Deine eigene Arbeitskopie eines Falls — aufgebaut wie die echte Anwendung.',
    schritte: ['Material sichten', 'Mit Echo arbeiten', 'Muster, Hypothesen und Berichte erarbeiten'],
    tipp: 'Der Fall ist erfunden, das Vorgehen nicht. Was du hier übst, ist genau der Ablauf, den du später mit einer echten Klientin gehst.',
  },
  '/student/cases/:id/echo': {
    titel: 'Echo zum Fall',
    zweck: 'Ein fachliches Gespräch über deinen Übungsfall.',
    schritte: ['Fragen stellen', 'Mehrere Gespräche nebeneinander führen'],
  },
  '/student/cases/:id/scales': {
    titel: 'Muster und Skalen',
    zweck: 'Wie sich die Lage der Fallperson über die Zeit darstellt.',
    schritte: ['Muster ansehen', 'Verlauf der Werte verfolgen'],
    tipp: 'Die Werte sind eine Einschätzung aus dem Material, kein Messergebnis. Übe, sie zu begründen statt sie zu zitieren.',
  },
  '/student/cases/:id/hypotheses': {
    titel: 'Hypothesen',
    zweck: 'Mögliche Erklärungen, geführt durchgesprochen.',
    schritte: ['Einen Dialog beginnen', 'Arbeitshypothesen festhalten'],
    tipp: 'Eine Hypothese, die du nicht verwerfen könntest, ist keine. Halte fest, woran du sie prüfen würdest.',
  },
  '/student/cases/:id/hypotheses/:hypId': {
    titel: 'Hypothesen-Dialog',
    zweck: 'Ein geführtes Gespräch entlang einer Erklärung.',
    schritte: ['Fragen durchgehen', 'Ergebnis behalten oder verwerfen'],
  },
  '/student/cases/:id/notes': {
    titel: 'Notizen',
    zweck: 'Dein Sitzungsverlauf und dauerhafte Notizen zum Fall.',
    schritte: ['Nach jeder Einheit notieren', 'Fallüberblick pflegen'],
    tipp: 'Notieren gehört zum Handwerk, nicht zur Kür. Wer es hier übt, tut es später unter Zeitdruck auch.',
  },
  '/student/cases/:id/reports': {
    titel: 'Berichte',
    zweck: 'Die Berichte, die du zu diesem Fall erstellt hast.',
    schritte: ['Einen Bericht erstellen', 'Frühere wiederlesen'],
  },
  '/student/cases/:id/reports/new': {
    titel: 'Bericht erstellen',
    zweck: 'Aus dem Fallmaterial einen zusammenhängenden Text erzeugen lassen.',
    schritte: ['Art des Berichts wählen', 'Entwurf prüfen und überarbeiten'],
    tipp: 'Nimm den Entwurf auseinander, bevor du ihn übernimmst. Genau daran wird sichtbar, ob du den Fall verstanden hast.',
  },
  '/student/cases/:id/reports/:reportId': {
    titel: 'Dieser Bericht',
    zweck: 'Ein Bericht zum Lesen und Überarbeiten.',
    schritte: ['Text anpassen', 'Für die Einreichung vorbereiten'],
  },
  '/student/cases/:id/review': {
    titel: 'Verlauf und Rückblick',
    zweck: 'Wie sich der Fall über die Zeit entwickelt hat.',
    schritte: ['Entwicklung ansehen', 'Einen Rückblick erzeugen lassen'],
  },
  '/student/cases/:id/couple': {
    titel: 'Paar-Analyse',
    zweck: 'Bei Fällen mit Partnerperson: beide Seiten nebeneinander, allparteilich.',
    schritte: ['Zusammenspiel der Muster ansehen'],
    tipp: 'Allparteilich heißt nicht neutral im Sinne von unbeteiligt, sondern: für beide zuständig. Das ist die schwerste Haltung in der Paararbeit und der Grund, warum man sie übt.',
  },
  '/student/cases/:id/roleplay': {
    titel: 'Rollenspiel',
    zweck: 'Echo spielt die ratsuchende Person — du führst das Gespräch.',
    schritte: ['Ein Gespräch beginnen', 'Formulierungen ausprobieren', 'Danach durchgehen, was gewirkt hat'],
    tipp: 'Du darfst hier danebengreifen. Genau dafür ist es da — und es ist der einzige Ort, an dem es niemanden trifft.',
  },
  '/student/cases/:id/submit': {
    titel: 'Fallarbeit einreichen',
    zweck: 'Deine Arbeit als Momentaufnahme an das Institut senden.',
    schritte: ['Prüfen, was mitgeschickt wird', 'Einreichen'],
    tipp: 'Eingereicht wird ein Abzug vom jetzigen Stand. Was du danach änderst, sieht dein Institut nicht mehr — die Einreichung friert den Moment ein.',
  },
  '/student/register': {
    titel: 'Studierenden-Konto anlegen',
    zweck: 'Mit dem Einladungscode deines Instituts beitreten.',
    schritte: ['Code eingeben', 'Angaben ergänzen'],
  },
}

/** Wie viele Abschnitte eines Musters feste Wörter sind — je mehr, desto genauer passt es. */
function genauigkeit(muster: string): number {
  return muster.split('/').filter(t => t && !t.startsWith(':')).length
}

/**
 * Die Hilfe zum aktuellen Pfad — oder `null`, wenn es für diese Seite (noch) keine gibt.
 *
 * Passen mehrere Muster, gewinnt das genauere. Ohne diese Regel entschiede die
 * Reihenfolge im Verzeichnis darüber, welcher Text erscheint, und das Verschieben eines
 * Eintrags änderte stillschweigend das Verhalten.
 */
export function hilfeFuer(pfad: string): SeitenHilfe | null {
  const treffer = Object.keys(SEITENHILFE)
    .filter(muster => matchPath({ path: muster, end: true }, pfad) !== null)
    .sort((a, b) => genauigkeit(b) - genauigkeit(a))
  return treffer.length ? SEITENHILFE[treffer[0]] : null
}
