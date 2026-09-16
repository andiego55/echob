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

  // ── Konto ────────────────────────────────────────────────────────────────
  '/app/profile': {
    titel: 'Dein Beziehungsprofil',
    zweck: 'Eine Selbstbeschreibung über mehrere Module — über dich, unabhängig von einem einzelnen Fall.',
    schritte: ['Module nacheinander ausfüllen', 'Zusammenfassung lesen'],
    tipp: 'Das Profil gehört dir, nicht einem Fall. Wenn sich Muster über Beziehungen hinweg wiederholen, zeigt es sich hier.',
  },
  '/app/profile/echo': {
    titel: 'Gespräch zum Profil',
    zweck: 'Über deine Selbstbeschreibung sprechen.',
    schritte: ['Einzelne Module vertiefen'],
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
