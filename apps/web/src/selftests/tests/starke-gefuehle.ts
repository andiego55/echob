import type { SelfTest } from '../types'

/**
 * Starke Gefühle, schnelle Wechsel – dimensionaler Test (concern: hoch = stärker ausgeprägt).
 *
 * **Warum dieser Test und nicht „Habe ich Borderline?".** Für diese Frage gibt es keinen
 * seriösen Selbsttest: Ein Test über die eigene Person wäre Selbstdiagnose, ein Test über das
 * Gegenüber Ferndiagnose. Beides richtet mehr an, als es nützt. Was sich ehrlich erheben
 * lässt, ist etwas anderes und praktisch nützlicher: **wie die eigenen Gefühle verlaufen** –
 * wie schnell sie kommen, wie hoch sie steigen, was in diesem Zustand mit dem Denken und dem
 * Handeln passiert, und was danach geschieht. Darauf hat nur die Person selbst Zugriff.
 *
 * Dieselben Verläufe kommen bei sehr verschiedenen Hintergründen vor – Traumafolgen, ADHS,
 * Depression, Erschöpfung, und schlicht bei Menschen in einer Beziehung, die sie fertigmacht.
 * Der Test sagt deshalb an keiner Stelle, was jemand *hat*.
 *
 * **Die sechste Dimension trägt den Test.** Nicht die Wucht entscheidet über Beziehungen,
 * sondern ob ein Bruch stehen bleibt oder repariert wird. Sie ist deshalb die einzige, die
 * ausdrücklich auch einen zweiten Weg nach oben kennt (siehe Bandtext): Wer nie etwas sagt,
 * hat nichts zu reparieren – und das ist keine Stärke, sondern eine andere Rechnung.
 *
 * safetyVariant 'krise': Die Frage nach eigener Gefährdung ist ein `single` mit ausdrücklichem
 * Nein-Zweig, nie eine Likert-Skala mit flagMin – sonst setzt volle Zustimmung von jemandem,
 * dem das nie passiert, fälschlich den roten Kasten.
 */

const haeufigkeit: { min: number; max: number; labels: [string, string] } = {
  min: 0,
  max: 4,
  labels: ['Nie', 'Sehr oft'],
}

export const starkeGefuehle: SelfTest = {
  slug: 'starke-gefuehle',
  category: 'persoenlichkeit',
  title: 'Starke Gefühle, schnelle Wechsel: wie läuft das bei mir?',
  teaser:
    'Gefühle, die schneller da sind als der Gedanke, und Stunden brauchen, bis sie gehen. Sechs Bereiche, die zeigen, wo bei dir der Spielraum liegt – ohne Diagnose.',
  description:
    'Viele Menschen suchen nach einem Borderline-Test. Den gibt es seriös nicht: Eine Persönlichkeitsdiagnose stellt eine Fachperson in mehreren Gesprächen, niemals eine Website – und über eine andere Person schon gar nicht. Was sich ehrlich anschauen lässt, ist der Verlauf der eigenen Gefühle: wie schnell sie kommen, wie hoch sie steigen, was in diesem Zustand mit dem Denken passiert, wie klein der Abstand zwischen Impuls und Handlung wird, wie stabil dein Bild von dir selbst bleibt – und was nach einem Bruch geschieht. Genau das misst dieser Test in sechs Bereichen. Dieselben Verläufe gibt es bei sehr verschiedenen Hintergründen, deshalb sagt das Ergebnis nichts darüber, was du hast. Es zeigt, wo dein Spielraum liegt. Anschließend kannst du es mit Echo besprechen.',
  duration: '10–15 Min',
  resultMode: 'dimensional',
  polarity: 'concern',
  intro:
    'Vorab drei Dinge. Dieser Test stellt keine Diagnose und kann keine stellen – er beschreibt, wie deine Gefühle verlaufen, nicht wer du bist. Ein hoher Wert bedeutet nicht, dass mit dir etwas nicht stimmt; starke Gefühle sind keine Schwäche, und dieselben Verläufe entstehen aus sehr verschiedenen Gründen, von früher Belastung bis zu einer Beziehung, die dich gerade aufreibt. Und: Antworte für die letzten Monate, nicht für deinen schlimmsten Tag. Niemand außer dir sieht deine Antworten.',
  echo: {
    opening_question:
      'Dein Ergebnis zeigt, in welchem Bereich am meisten Bewegung ist. Magst du eine konkrete Situation der letzten Wochen anschauen – was kam zuerst, was hast du getan, und wie ging es weiter?',
  },
  dimensions: [
    {
      key: 'welle',
      name: 'Wucht und Tempo',
      description: 'Wie schnell ein Gefühl da ist, wie hoch es steigt und wie lange es braucht, bis es wieder geht.',
      explain:
        'Hohe Werte heißen: Gefühle kommen schnell, treffen hart und klingen langsam ab. Das ist eine Aussage über den Verlauf, nicht über die Angemessenheit – und es ist der Teil, der sich am wenigsten willentlich steuern lässt.',
      bands: [
        { min: 0, label: 'Gut gedämpft', tone: 'good', text: 'Deine Gefühle kommen in einem Tempo, mit dem du mithalten kannst. Du hast in den meisten Situationen Zeit zwischen dem, was passiert, und dem, was du fühlst.' },
        { min: 40, label: 'Schnell und laut', tone: 'watch', text: 'Deine Gefühle sind oft schneller da als der Gedanke und brauchen länger als bei anderen, bis sie abklingen. Das ist anstrengend, vor allem für dich selbst. Es sagt nichts über deinen Charakter – und es ist der Bereich, in dem Fertigkeitentraining am direktesten hilft.' },
        { min: 68, label: 'Ohne Regler', tone: 'alert', text: 'Was du beschreibst, klingt danach, dass die Lautstärke aller Gefühle festgestellt ist: sofort ganz oben, sehr hoch, sehr lang. Damit zu leben kostet jeden Tag Kraft, die anderen gar nicht auffällt. Das ist gut behandelbar, und es lohnt sich, dafür Hilfe zu holen.' },
      ],
    },
    {
      key: 'verlassenheit',
      name: 'Angst vor dem Verlassenwerden',
      description: 'Wie empfindlich der Alarm auf Zeichen von Abstand reagiert – eine späte Antwort, ein anderer Tonfall.',
      explain:
        'Hohe Werte heißen: Kleine Signale von Distanz lösen große Angst aus. Typisch ist die paradoxe Richtung – je wichtiger jemand wird, desto empfindlicher der Alarm.',
      bands: [
        { min: 0, label: 'Belastbar', tone: 'good', text: 'Abstand hält deine Sicherheit aus. Eine späte Antwort oder ein stiller Abend bringt dein Vertrauen nicht ins Wanken.' },
        { min: 40, label: 'Empfindlicher Alarm', tone: 'watch', text: 'Kleine Zeichen von Distanz lösen bei dir große Reaktionen aus. Das Bittere daran ist die Richtung: Je wichtiger jemand wird, desto gefährlicher wird er. Deine Angst ist echt, auch wenn die Situation sie nicht hergibt.' },
        { min: 68, label: 'Dauerhafter Alarm', tone: 'alert', text: 'Nähe und Bedrohung liegen bei dir sehr dicht beieinander. Wer so viel Angst vor dem Verlassenwerden trägt, tut oft genau die Dinge, die Menschen auf Abstand bringen – und bestätigt damit die Angst. Diese Schleife lässt sich unterbrechen, aber selten allein.' },
      ],
    },
    {
      key: 'kippen',
      name: 'Wenn das Bild kippt',
      description: 'Ob unter Anspannung nur noch eine Wahrheit übrig bleibt – über andere und über dich selbst.',
      explain:
        'Hohe Werte heißen: In hoher Erregung bricht die Fähigkeit weg, Gutes und Schlechtes gleichzeitig zu halten. Fachlich heißt das Spaltung. Es ist keine Absicht, sondern ein Zusammenbruch der Verarbeitung.',
      bands: [
        { min: 0, label: 'Bleibt zusammen', tone: 'good', text: 'Auch wenn du wütend oder verletzt bist, bleibt dein Bild von anderen zusammengesetzt: Jemand kann dich enttäuschen und trotzdem gut für dich sein.' },
        { min: 40, label: 'Kippt gelegentlich', tone: 'watch', text: 'Unter Druck rutscht dein Bild von Menschen ins Ganz-oder-gar-nicht. Später siehst du es wieder anders – und genau dieser Wechsel ist verwirrend, für dich und für die Leute um dich herum.' },
        { min: 68, label: 'Kippt regelmäßig', tone: 'alert', text: 'In angespannten Momenten gibt es nur eine Wahrheit, und sie fühlt sich nicht wie eine Vereinfachung an, sondern wie eine Erkenntnis. Das ist der Punkt, an dem Argumente nichts mehr ausrichten – und zugleich der, an dem Behandlung ansetzt.' },
      ],
    },
    {
      key: 'abstand',
      name: 'Abstand zwischen Impuls und Handlung',
      description: 'Wie viel Raum zwischen dem Gedanken und dem bleibt, was du dann tust.',
      explain:
        'Hohe Werte heißen: Zwischen Impuls und Handlung liegt wenig. Das ist der Bereich mit dem größten praktischen Spielraum – nicht über Vorsätze, sondern über Zeitgewinn.',
      bands: [
        { min: 0, label: 'Genug Raum', tone: 'good', text: 'Zwischen dem, was du fühlst, und dem, was du tust, liegt genug Platz. Du kannst einen Impuls haben, ohne ihm zu folgen.' },
        { min: 40, label: 'Schmaler Raum', tone: 'watch', text: 'In aufgewühlten Momenten wird der Abstand klein: Nachrichten, Absagen, Sätze, Entscheidungen, die du später nicht mehr verstehst. Das lässt sich üben – nicht mit Vorsätzen, sondern mit Regeln, die vorher gelten.' },
        { min: 68, label: 'Fast kein Raum', tone: 'alert', text: 'Aus einem Gefühl wird bei dir sehr schnell eine Handlung, auch in Bereichen, die schwer zurückzuholen sind. Das ist der Teil, der sich erfahrungsgemäß am schnellsten bessert, wenn jemand Unterstützung bekommt.' },
      ],
    },
    {
      key: 'selbstbild',
      name: 'Selbstbild und Leere',
      description: 'Wie stabil dein Bild von dir bleibt, wenn niemand da ist – und ob ein Grundrauschen von Leere mitläuft.',
      explain:
        'Hohe Werte heißen: Das Selbstbild schwankt mit den Menschen um dich herum, und Alleinsein fühlt sich weniger ruhig als konturlos an. Dazu ein Gefühl von Leere, das unabhängig von schönen Erlebnissen bleibt.',
      bands: [
        { min: 0, label: 'Tragfähig', tone: 'good', text: 'Du weißt in den meisten Lagen, was du willst und wer du bist – auch wenn gerade niemand hinsieht.' },
        { min: 40, label: 'Schwankend', tone: 'watch', text: 'Dein Bild von dir hängt spürbar davon ab, mit wem du gerade zusammen bist. Alleinsein fühlt sich weniger ruhig an als konturlos. Kontinuität lässt sich bauen, aber nicht beschließen – über kleine Dinge, die unabhängig von Menschen bestehen bleiben.' },
        { min: 68, label: 'Ohne festen Boden', tone: 'alert', text: 'Wer bist du, wenn niemand da ist – diese Frage ist für dich keine philosophische. Dazu kommt oft ein Gefühl von Leere, das auch an guten Tagen bleibt. Das gehört zu den Anteilen, die am längsten brauchen, und es ist der Teil, über den am wenigsten gesprochen wird.' },
      ],
    },
    {
      key: 'reparatur',
      name: 'Was nach dem Bruch passiert',
      description: 'Ob ein Riss stehen bleibt oder ob jemand zurückkommt – der Bereich, der für Beziehungen am meisten zählt.',
      explain:
        'Hohe Werte heißen: Nach einem Bruch bleibt der Riss stehen. Wichtig beim Lesen: Ein niedriger Wert kann zwei sehr verschiedene Dinge bedeuten – dass Reparatur stattfindet, oder dass nie etwas ausgesprochen wird, das zu reparieren wäre.',
      bands: [
        { min: 0, label: 'Es gibt einen Weg zurück', tone: 'good', text: 'Nach einem Bruch kommt bei dir jemand zurück, meistens du. Das ist der wichtigste einzelne Schutzfaktor, den eine Beziehung haben kann. Eine Einschränkung dazu: Falls du niedrig liegst, weil bei euch nie etwas ausgesprochen wird, misst dieser Wert etwas anderes als Sicherheit – dann ist die ehrlichere Frage, was alles ungesagt bleibt.' },
        { min: 40, label: 'Bleibt oft liegen', tone: 'watch', text: 'Brüche werden bei dir eher überdauert als geklärt: Am nächsten Morgen ist es vorbei, aber es wurde nie etwas zurückgenommen. Das summiert sich, auch wenn jeder einzelne Streit klein war. Der wirksamste Satz ist kurz und schwer: Was ich gesagt habe, war nicht wahr, und es tut mir leid.' },
        { min: 68, label: 'Bleibt stehen', tone: 'alert', text: 'Nach einer Eskalation kommt bei dir selten jemand zurück – oft, weil die Scham danach größer ist als der Ausbruch selbst und zum Verschwinden drängt statt zum Zurückkommen. Genau hier liegt der größte Hebel, den du hast. Nicht nie mehr auszurasten, sondern danach zurückzukommen.' },
      ],
    },
  ],
  questions: [
    // Wucht und Tempo
    { id: 'sg_w1', type: 'scale', section: 'Wie deine Gefühle verlaufen', dimension: 'welle', text: 'Ein Gefühl ist bei mir da, bevor ich denken kann.' },
    { id: 'sg_w2', type: 'scale', section: 'Wie deine Gefühle verlaufen', dimension: 'welle', text: 'Wenn mich etwas trifft, trifft es mich sofort mit voller Wucht – nicht abgestuft.' },
    { id: 'sg_w3', type: 'scale', section: 'Wie deine Gefühle verlaufen', dimension: 'welle', text: 'Nach einer Aufregung brauche ich Stunden, bis ich wieder unten bin.' },
    { id: 'sg_w4', type: 'scale', section: 'Wie deine Gefühle verlaufen', dimension: 'welle', text: 'An manchen Tagen wechselt meine Stimmung mehrmals grundlegend, ohne dass viel passiert ist.' },
    { id: 'sg_w5', type: 'scale', section: 'Wie deine Gefühle verlaufen', dimension: 'welle', text: 'Ich kann mich beruhigen, wenn ich merke, dass ich hochgehe.', reverse: true },
    // Angst vor dem Verlassenwerden
    { id: 'sg_v1', type: 'scale', section: 'Nähe und Abstand', dimension: 'verlassenheit', text: 'Eine späte Antwort oder ein kurzer Ton reicht, damit ich anfange, an der Beziehung zu zweifeln.' },
    { id: 'sg_v2', type: 'scale', section: 'Nähe und Abstand', dimension: 'verlassenheit', text: 'Je wichtiger mir jemand wird, desto größer wird meine Angst, ihn zu verlieren.' },
    { id: 'sg_v3', type: 'scale', section: 'Nähe und Abstand', dimension: 'verlassenheit', text: 'Ich tue viel dafür, dass jemand nicht geht – auch Dinge, die ich hinterher bereue.' },
    { id: 'sg_v4', type: 'scale', section: 'Nähe und Abstand', dimension: 'verlassenheit', text: 'Es ist schon vorgekommen, dass ich etwas beendet habe, damit die andere Person es nicht beenden kann.' },
    { id: 'sg_v5', type: 'scale', section: 'Nähe und Abstand', dimension: 'verlassenheit', text: 'Wenn jemand Zeit für sich braucht, kann ich das gut aushalten.', reverse: true },
    // Wenn das Bild kippt
    { id: 'sg_k1', type: 'scale', section: 'Wenn es hochgeht', dimension: 'kippen', text: 'Wenn ich verletzt bin, ist die andere Person für mich in dem Moment nur noch schlecht – ohne gute Seiten.' },
    { id: 'sg_k2', type: 'scale', section: 'Wenn es hochgeht', dimension: 'kippen', text: 'Später sehe ich dieselbe Person wieder ganz anders, und ich verstehe meine eigene Sicht von vorher nicht mehr.' },
    { id: 'sg_k3', type: 'scale', section: 'Wenn es hochgeht', dimension: 'kippen', text: 'In aufgewühlten Momenten bin ich mir absolut sicher, wie die andere Person es gemeint hat.' },
    { id: 'sg_k4', type: 'scale', section: 'Wenn es hochgeht', dimension: 'kippen', text: 'Auch über mich selbst denke ich in solchen Momenten in Extremen – großartig oder wertlos.' },
    { id: 'sg_k5', type: 'scale', section: 'Wenn es hochgeht', dimension: 'kippen', text: 'Auch wenn ich wütend bin, kann ich noch daran denken, dass die andere Person es vielleicht anders meinte.', reverse: true },
    // Abstand zwischen Impuls und Handlung
    { id: 'sg_a1', type: 'scale', section: 'Vom Impuls zur Handlung', dimension: 'abstand', scale: haeufigkeit, text: 'Ich schreibe oder sage im Affekt Dinge, die ich am nächsten Tag zurücknehmen möchte.' },
    { id: 'sg_a2', type: 'scale', section: 'Vom Impuls zur Handlung', dimension: 'abstand', scale: haeufigkeit, text: 'Ich treffe in aufgewühlten Momenten Entscheidungen mit Folgen – Kündigung, Trennung, Geld, Kontaktabbruch.' },
    { id: 'sg_a3', type: 'scale', section: 'Vom Impuls zur Handlung', dimension: 'abstand', scale: haeufigkeit, text: 'Ich tue Dinge, die mir schaden, nur damit ein unerträglicher Zustand aufhört.' },
    { id: 'sg_a4', type: 'scale', section: 'Vom Impuls zur Handlung', dimension: 'abstand', text: 'Wenn es in mir hochgeht, schaffe ich es, erst einmal nichts zu tun.', reverse: true },
    {
      id: 'sg_a5',
      type: 'single',
      section: 'Vom Impuls zur Handlung',
      dimension: 'abstand',
      text: 'Wenn die Anspannung ganz oben ist, denke ich daran, mir selbst wehzutun.',
      help: 'Diese Frage ist unangenehm, und sie gehört dazu. Was du hier angibst, sieht niemand außer dir.',
      options: [
        { label: 'Nein, das kenne ich nicht.', value: 0 },
        { label: 'Das war früher mal so, inzwischen nicht mehr.', value: 1 },
        { label: 'Der Gedanke kommt manchmal.', value: 3, flag: 'selbstgefaehrdung' },
        { label: 'Der Gedanke kommt oft – oder ich tue es.', value: 4, flag: 'selbstgefaehrdung' },
      ],
    },
    // Selbstbild und Leere
    { id: 'sg_s1', type: 'scale', section: 'Du selbst', dimension: 'selbstbild', text: 'Wer ich bin, hängt stark davon ab, mit wem ich gerade zusammen bin.' },
    { id: 'sg_s2', type: 'scale', section: 'Du selbst', dimension: 'selbstbild', text: 'Auf die Frage, was ich will, fällt mir zuerst ein, was die anderen wollen.' },
    { id: 'sg_s3', type: 'scale', section: 'Du selbst', dimension: 'selbstbild', text: 'In mir ist eine Leere, die auch dann bleibt, wenn eigentlich alles in Ordnung ist.' },
    { id: 'sg_s4', type: 'scale', section: 'Du selbst', dimension: 'selbstbild', text: 'Allein zu sein fühlt sich für mich weniger ruhig an als konturlos.' },
    { id: 'sg_s5', type: 'scale', section: 'Du selbst', dimension: 'selbstbild', text: 'Ich weiß, was mir wichtig ist, auch wenn gerade niemand da ist.', reverse: true },
    // Was nach dem Bruch passiert
    {
      id: 'sg_r1',
      type: 'single',
      section: 'Nach einem Bruch',
      dimension: 'reparatur',
      text: 'Kommt es vor, dass ich im Streit Dinge sage, die ich hinterher nicht mehr so sehe?',
      options: [
        { label: 'Nein, das kenne ich nicht.', value: 0 },
        { label: 'Selten.', value: 1 },
        { label: 'Immer wieder.', value: 3 },
        { label: 'Fast jedes Mal.', value: 4 },
      ],
    },
    {
      id: 'sg_r2',
      type: 'single',
      section: 'Nach einem Bruch',
      dimension: 'reparatur',
      text: 'Und falls ja: Komme ich von mir aus darauf zurück?',
      help: 'Gemeint ist nicht die große Erklärung, sondern der kurze Satz: Das war nicht wahr, es tut mir leid.',
      options: [
        { label: 'Das kommt bei mir nicht vor.', value: 0 },
        { label: 'Ja, ich komme von selbst zurück und nehme es zurück.', value: 0 },
        { label: 'Meistens erst, wenn die andere Person anfängt.', value: 2 },
        { label: 'Ich entschuldige mich viel, aber über das Gesagte reden wir nicht.', value: 3 },
        { label: 'Nein, es bleibt stehen.', value: 4 },
      ],
    },
    { id: 'sg_r3', type: 'scale', section: 'Nach einem Bruch', dimension: 'reparatur', text: 'Nach einer Eskalation schäme ich mich so sehr, dass ich mich lieber gar nicht mehr melde.' },
    { id: 'sg_r4', type: 'scale', section: 'Nach einem Bruch', dimension: 'reparatur', text: 'Bei uns ist ein Streit vorbei, indem am nächsten Morgen niemand mehr davon anfängt.' },
    { id: 'sg_r5', type: 'scale', section: 'Nach einem Bruch', dimension: 'reparatur', text: 'Ich kann sagen, dass etwas mein Fehler war, ohne mich dabei ganz zu verurteilen.', reverse: true },
    // Freitext
    { id: 'sg_t1', type: 'text', optional: true, section: 'Zum Schluss', text: 'Welche Situation der letzten Wochen geht dir nicht aus dem Kopf?' },
    { id: 'sg_t2', type: 'text', optional: true, section: 'Zum Schluss', text: 'Was hättest du in dieser Situation gebraucht – von dir selbst oder von der anderen Person?' },
    { id: 'sg_t3', type: 'text', optional: true, section: 'Zum Schluss', text: 'Wann warst du zuletzt ruhig, und was war da anders?' },
  ],
  overallBands: [
    { min: 0, label: 'Wenig ausgeprägt', tone: 'good', text: 'Deine Gefühle verlaufen in einem Tempo, mit dem du mithalten kannst, und nach Brüchen gibt es einen Weg zurück. Das heißt nicht, dass es dir gut gehen muss – nur, dass die Bereiche, die dieser Test anschaut, gerade nicht das Problem sind.' },
    { min: 35, label: 'Deutlich spürbar', tone: 'watch', text: 'In mehreren Bereichen zeigt sich ein Muster, das dich Kraft kostet: schnelle, starke Gefühle und wenig Zeit dazwischen. Schau dir an, welcher Bereich oben am stärksten ausschlägt – dort liegt der beste erste Ansatz. Das ist etwas, woran sich arbeiten lässt, und der Bereich nach dem Bruch bringt dabei am schnellsten etwas.' },
    { min: 58, label: 'Stark ausgeprägt', tone: 'watch', text: 'Was du beschreibst, ist ein durchgehendes Muster und keine schlechte Woche. Das bedeutet nicht, dass du eine Diagnose hast – dieselben Verläufe entstehen aus sehr verschiedenen Gründen, und keiner davon lässt sich aus einem Fragebogen ablesen. Es bedeutet, dass eine Abklärung sich lohnt: Für genau diese Muster gibt es Behandlungen, die gut untersucht sind und wirken.' },
    { min: 75, label: 'Sehr stark ausgeprägt', tone: 'alert', text: 'Über fast alle Bereiche hinweg beschreibst du etwas, das dich täglich viel Kraft kostet – und das andere, die es nicht kennen, deutlich unterschätzen. Zwei Dinge dazu. Erstens: Dieser Test sagt nicht, was du hast; das kann nur ein Gespräch mit einer Fachperson klären, und dieses Gespräch ist der nächste sinnvolle Schritt (Terminvermittlung: 116 117). Zweitens, und das wird fast nie gesagt: Der Verlauf ist bei solchen Mustern deutlich besser als ihr Ruf. In Längsschnittstudien geht es der großen Mehrheit der Behandelten nach einigen Jahren so gut, dass die Kriterien nicht mehr erfüllt sind.' },
  ],
  safety: true,
  safetyVariant: 'krise',
  disclaimer:
    'Dieser Test stellt keine Diagnose und ist kein Borderline-Test – eine Persönlichkeitsdiagnose entsteht in mehreren Gesprächen mit einer Fachperson, mit deiner Innenperspektive und über Zeit, niemals über einen Fragebogen im Internet. Dieselben Gefühlsverläufe kommen bei sehr verschiedenen Hintergründen vor, unter anderem bei Traumafolgen, ADHS, Depressionen und in Beziehungen, die dauerhaft belasten. Wenn dich dein Ergebnis beunruhigt, ist der nächste Schritt ein Gespräch: Terminvermittlung 116 117, psychotherapeutische Sprechstunde, oder eine Ambulanz mit Schwerpunkt. Wenn du daran denkst, dir etwas anzutun: Telefonseelsorge 0800 111 0 111 und 0800 111 0 222, rund um die Uhr, kostenlos und anonym. Bei akuter Gefahr: 112.',
}
