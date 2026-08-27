import type { SelfTest } from '../types'

/**
 * Nach dem Vertrauensbruch – dimensionaler Test (concern: hoch = stärkere Belastung).
 *
 * Deckt ALLE Ebenen des Vertrauensbruchs ab, nicht nur Untreue: verschwiegene Bereiche,
 * Trennungsdrohungen, Drohungen mit dem Kontakt zu den Kindern, Schweigen als Mittel.
 *
 * Vier Antwortoptionen setzen kritische Flags, und das ist der eigentliche Zweck der Sicherheitsstufe:
 *
 *   - `kindesentzug` — der Kontakt zum Kind als Druckmittel. Erscheint unabhängig vom
 *     Durchschnitt, weil ein einziges Mal genügt, um jemanden dauerhaft verhandlungsunfähig
 *     zu machen.
 *   - `trennungsdrohung-ohne-reparatur` und `kindesentzug-ohne-reparatur` — die Drohung ist
 *     das eine, das Ausbleiben jeder Wiedergutmachung das andere. Genau diese Unterscheidung
 *     trägt den ganzen Cluster: Ein Satz im Affekt, der bereut wird, ist eine Wunde. Derselbe
 *     Satz ohne Reparatur ist ein Mittel.
 *
 * Perspektive: für die Person, deren Vertrauen gebrochen wurde. Wer selbst gebrochen hat,
 * wird im Intro und im Ergebnis auf `eigener-anteil` verwiesen — dieser Test würde dort
 * falsche Werte liefern.
 */
export const nachDemVertrauensbruch: SelfTest = {
  slug: 'nach-dem-vertrauensbruch',
  category: 'beziehung',
  title: 'Wo stehe ich nach dem Vertrauensbruch?',
  teaser:
    'Untreue, ein verschwiegener Bereich, eine Drohung im Streit, tagelanges Schweigen – sechs Bereiche helfen dir zu sehen, wo du stehst und ob Reparatur überhaupt stattfindet.',
  description:
    'Vertrauensbruch ist mehr als Untreue. Auch eine Trennungsdrohung im Streit, das Drohen mit dem Kontakt zu den Kindern, ein verschwiegener Bereich oder tagelanges Schweigen brechen etwas. Dieser Selbsttest schaut auf sechs Bereiche: deine Grundsicherheit, deine Wachsamkeit, die Vollständigkeit der Wahrheit, die tatsächliche Wiedergutmachung, deine eigene Veränderung und deine Zukunftsfähigkeit. Er entscheidet nichts über deine Beziehung und bewertet niemanden – er ordnet dein Erleben. Das Ergebnis kannst du anschließend mit Echo besprechen.',
  duration: '12–18 Min',
  resultMode: 'dimensional',
  polarity: 'concern',
  safety: true,
  safetyVariant: 'victim',
  intro:
    'Dieser Test ist für die Person gedacht, deren Vertrauen gebrochen wurde. Wenn du selbst derjenige warst, der Vertrauen gebrochen hat, ist der Selbsttest Mein Anteil der passendere – hier würdest du Werte erhalten, die nichts über dich aussagen. Ein Hinweis noch: Du musst nicht beweisen, dass es schlimm genug war. Wenn du dich seither verändert hast, hat etwas Wirkung gehabt – unabhängig davon, wie groß der Anlass von außen wirkt. Niemand außer dir sieht deine Antworten.',
  echo: {
    opening_question:
      'Dein Ergebnis zeigt, wo die Belastung am größten ist. Fällt dir eine konkrete Situation ein, nach der etwas zwischen euch nicht mehr dasselbe war?',
  },
  disclaimer:
    'Dieser Test stellt keine Diagnose und trifft keine Entscheidung über deine Beziehung. Wenn im Streit mit dem Kontakt zu deinen Kindern gedroht wurde, geht es nicht mehr um Beziehungsarbeit – hol dir dann bitte Beratung und gegebenenfalls rechtliche Auskunft, auch wenn du unsicher bist, ob es schlimm genug ist.',
  dimensions: [
    {
      key: 'sicherheit',
      name: 'Grundsicherheit',
      description: 'Wie sicher du dich in dieser Beziehung überhaupt noch fühlst.',
      explain:
        'Vertrauen ist im Kern eine Vorhersage: Ich kann damit rechnen, dass du meine Verletzlichkeit nicht gegen mich verwendest. Hier geht es darum, wie weit diese Vorhersage zerstört ist.',
      bands: [
        { min: 0, label: 'Weitgehend sicher', tone: 'good', text: 'Du kannst dich in dieser Beziehung überwiegend sicher fühlen. Einzelne wunde Stellen kann es trotzdem geben.' },
        { min: 40, label: 'Verunsichert', tone: 'watch', text: 'Der Boden ist nicht mehr selbstverständlich. Du rechnest damit, dass etwas kommen könnte – das kostet Kraft, auch wenn nichts passiert.' },
        { min: 65, label: 'Kein sicherer Boden', tone: 'alert', text: 'Du kannst nicht mehr vorhersagen, womit du rechnen musst. Das ist der Kern eines Vertrauensbruchs, und es ist nichts, was mit gutem Willen allein zurückkommt. Es braucht Verlässlichkeit über Zeit – oder eine Entscheidung.' },
      ],
    },
    {
      key: 'wachsamkeit',
      name: 'Wachsamkeit',
      description: 'Wie sehr du prüfst, kontrollierst und nach Hinweisen suchst.',
      explain:
        'Wachsamkeit ist eine sinnvolle Schutzreaktion, keine Charakterschwäche – und gleichzeitig erschöpfend. Sie hört nicht auf Kommando auf.',
      bands: [
        { min: 0, label: 'Ruhig', tone: 'good', text: 'Du musst nicht nachprüfen, um dich ruhig zu fühlen.' },
        { min: 40, label: 'Angespannt', tone: 'watch', text: 'Du achtest auf Zeichen, prüfst manchmal nach und beruhigst dich dadurch nur kurz. Das ist nachvollziehbar und zehrt.' },
        { min: 65, label: 'Ständig auf Empfang', tone: 'alert', text: 'Ein großer Teil deiner Aufmerksamkeit geht ins Beobachten und Nachprüfen. Das ist Schutz, kein Makel – aber es macht dich zu jemandem, den du selbst vermutlich nicht sein willst. Genau darüber lohnt sich ein Gespräch, mehr noch als über die Tat.' },
      ],
    },
    {
      key: 'wahrheit',
      name: 'Vollständigkeit der Wahrheit',
      description: 'Ob du das Gefühl hast, inzwischen alles zu wissen.',
      explain:
        'Die Wahrheit in Raten ist der häufigste Grund, warum Beziehungen nach einem Vertrauensbruch scheitern – häufiger als die Tat selbst. Jede neue Enthüllung setzt alles zurück auf null.',
      bands: [
        { min: 0, label: 'Auf dem Tisch', tone: 'good', text: 'Du hast den Eindruck, dass alles Wesentliche gesagt wurde. Das ist die Grundlage für alles Weitere.' },
        { min: 40, label: 'Lückenhaft', tone: 'watch', text: 'Du bist dir nicht sicher, ob du alles weißt. Diese Unsicherheit macht jeden Fortschritt vorläufig.' },
        { min: 65, label: 'Immer noch offen', tone: 'alert', text: 'Es kommt weiterhin Neues heraus, oder Antworten gibt es nur auf genaue Nachfragen. Solange das so ist, kann Vertrauen nicht wachsen – nicht weil du nicht wolltest, sondern weil die Grundlage fehlt.' },
      ],
    },
    {
      key: 'reparatur',
      name: 'Fehlende Reparatur',
      description: 'Ob echte Wiedergutmachung stattfindet – oder nur Zusicherungen.',
      explain:
        'Hier bedeutet ein hoher Wert: Es passiert zu wenig. Der Unterschied zwischen einer Wunde und einem Muster liegt nicht in der Schwere der Tat, sondern darin, ob danach etwas geschieht.',
      bands: [
        { min: 0, label: 'Findet statt', tone: 'good', text: 'Dein Gegenüber trägt aktiv dazu bei: hält Zusagen, hält deine Fragen aus, verhält sich über Zeit anders. Das ist die Voraussetzung dafür, dass es besser wird.' },
        { min: 40, label: 'Halbherzig', tone: 'watch', text: 'Es gibt Zusicherungen, aber wenig Verlässliches darunter. Zeit allein heilt hier nichts – es braucht sichtbares Verhalten.' },
        { min: 65, label: 'Bleibt aus', tone: 'alert', text: 'Es gibt keine echte Wiedergutmachung: keine Einsicht, keine Geduld mit deinen Fragen, keine Veränderung im Verhalten. Das ist die wichtigste Angabe dieses Tests. Ohne Reparatur wird ein Vertrauensbruch nicht zur Wunde, sondern zum Muster.' },
      ],
    },
    {
      key: 'selbstverlust',
      name: 'Deine eigene Veränderung',
      description: 'Wie sehr du in dieser Beziehung vorsichtiger und kleiner geworden bist.',
      explain:
        'Oft der aussagekräftigste Bereich überhaupt. Nicht das Ereignis ist der eigentliche Schaden, sondern der Mensch, der du danach in dieser Beziehung geworden bist.',
      bands: [
        { min: 0, label: 'Du bist noch du', tone: 'good', text: 'Du kannst weiterhin sagen, was du denkst, und Themen ansprechen, die unangenehm sind.' },
        { min: 40, label: 'Vorsichtiger geworden', tone: 'watch', text: 'Du wägst ab, was du ansprichst, und lässt manches liegen. Das ist ein leiser Schaden, den viele erst spät bemerken.' },
        { min: 65, label: 'Deutlich kleiner geworden', tone: 'alert', text: 'Du rechnest vor jedem Thema, ob es das wert ist, und schluckst vieles. Wenn du in dieser Beziehung kleiner geworden bist, ist das eine Antwort – unabhängig davon, wie sehr dein Gegenüber sich bemüht.' },
      ],
    },
    {
      key: 'zukunft',
      name: 'Zukunftsfähigkeit',
      description: 'Ob du dir eine gemeinsame Zukunft überhaupt noch vorstellen kannst.',
      explain:
        'Diese Skala misst keine Entscheidung. Sie zeigt, ob innerlich noch Bewegung möglich ist – oder ob du längst nur noch verwaltest.',
      bands: [
        { min: 0, label: 'Vorstellbar', tone: 'good', text: 'Du kannst dir eine gemeinsame Zukunft vorstellen, auch wenn der Weg dorthin schwer ist.' },
        { min: 40, label: 'Unklar', tone: 'watch', text: 'Du schwankst. Das ist nach einem Vertrauensbruch normal und braucht Zeit – aber es lohnt sich, die Ambivalenz nicht auf Dauer stehen zu lassen.' },
        { min: 65, label: 'Kaum vorstellbar', tone: 'alert', text: 'Du bleibst, ohne dir noch etwas vorstellen zu können. Das kostet oft mehr Kraft als eine Entscheidung. Du musst sie heute nicht treffen – aber es könnte hilfreich sein, sie nicht länger zu vermeiden.' },
      ],
    },
  ],
  overallBands: [
    { min: 0, label: 'Auf dem Weg', tone: 'good', text: 'Über die Bereiche hinweg gibt es tragfähigen Boden. Einzelne hohe Werte kannst du trotzdem ernst nehmen – schau, welcher Bereich heraussticht, und fang dort an.' },
    { min: 38, label: 'Deutliche Belastung', tone: 'watch', text: 'In mehreren Bereichen zieht es spürbar an dir. Das heißt nicht, dass es nicht gut ausgehen kann. Es heißt, dass es nicht von allein besser wird: Ohne Veränderung heilt nichts, es wird nur älter.' },
    { min: 60, label: 'Es trägt gerade nicht', tone: 'alert', text: 'Fast alle Bereiche zeigen eine hohe Belastung. Der wichtigste Blick geht jetzt auf die Reparatur: Wenn dort ebenfalls ein hoher Wert steht, fehlt die Grundlage, auf der Vertrauen überhaupt wachsen könnte. Das ist keine Entscheidung für dich – aber es ist eine Information, die du nicht allein tragen musst. Eine Beratungsstelle oder Paarberatung kann helfen, sie einzuordnen.' },
  ],
  questions: [
    // ── Grundsicherheit ────────────────────────────────────────────────────
    { id: 'vb_s1', type: 'scale', section: 'Sicherheit', dimension: 'sicherheit', text: 'Ich kann nicht mehr vorhersagen, womit ich bei meinem Gegenüber rechnen muss.' },
    { id: 'vb_s2', type: 'scale', section: 'Sicherheit', dimension: 'sicherheit', text: 'Ich rechne innerlich damit, dass noch etwas kommt.' },
    { id: 'vb_s3', type: 'scale', section: 'Sicherheit', dimension: 'sicherheit', text: 'Erinnerungen an früher haben für mich einen anderen Sinn bekommen.' },
    { id: 'vb_s4', type: 'scale', section: 'Sicherheit', dimension: 'sicherheit', text: 'Ich zweifle an meiner eigenen Wahrnehmung von damals.' },
    { id: 'vb_s5', type: 'scale', section: 'Sicherheit', dimension: 'sicherheit', text: 'Ich fühle mich in dieser Beziehung grundsätzlich sicher.', reverse: true },
    { id: 'vb_s6', type: 'scale', section: 'Sicherheit', dimension: 'sicherheit', text: 'Es gab einen Bereich in unserem Leben, aus dem ich herausgehalten wurde.' },
    // ── Wachsamkeit ────────────────────────────────────────────────────────
    { id: 'vb_w1', type: 'scale', section: 'Wachsamkeit', dimension: 'wachsamkeit', text: 'Ich achte auf Zeichen: Tonfall, Verspätungen, wie schnell geantwortet wird.' },
    { id: 'vb_w2', type: 'scale', section: 'Wachsamkeit', dimension: 'wachsamkeit', text: 'Ich habe schon nachgeprüft – Nachrichten, Standort, Termine.' },
    { id: 'vb_w3', type: 'scale', section: 'Wachsamkeit', dimension: 'wachsamkeit', text: 'Wenn ich nichts finde, beruhigt mich das nur kurz.' },
    { id: 'vb_w4', type: 'scale', section: 'Wachsamkeit', dimension: 'wachsamkeit', text: 'Ich mag den Menschen nicht, zu dem ich durch dieses Prüfen geworden bin.' },
    { id: 'vb_w5', type: 'scale', section: 'Wachsamkeit', dimension: 'wachsamkeit', text: 'Ich denke tagelang nicht daran.', reverse: true },
    { id: 'vb_w6', type: 'scale', section: 'Wachsamkeit', dimension: 'wachsamkeit', text: 'Kreisende Gedanken halten mich nachts wach.' },
    // ── Wahrheit ───────────────────────────────────────────────────────────
    { id: 'vb_t1', type: 'scale', section: 'Wahrheit', dimension: 'wahrheit', text: 'Ich bin mir nicht sicher, ob ich inzwischen alles weiß.' },
    { id: 'vb_t2', type: 'scale', section: 'Wahrheit', dimension: 'wahrheit', text: 'Es kam nach und nach mehr heraus, nicht alles auf einmal.' },
    { id: 'vb_t3', type: 'scale', section: 'Wahrheit', dimension: 'wahrheit', text: 'Antworten bekomme ich nur, wenn ich genau die richtige Frage stelle.' },
    { id: 'vb_t4', type: 'scale', section: 'Wahrheit', dimension: 'wahrheit', text: 'Ich habe den Eindruck, dass etwas verharmlost wird.' },
    { id: 'vb_t5', type: 'scale', section: 'Wahrheit', dimension: 'wahrheit', text: 'Mein Gegenüber hat von sich aus alles Wesentliche gesagt.', reverse: true },
    { id: 'vb_t6', type: 'scale', section: 'Wahrheit', dimension: 'wahrheit', text: 'Ich fürchte, dass noch etwas ans Licht kommt.' },
    // ── Fehlende Reparatur ─────────────────────────────────────────────────
    { id: 'vb_r1', type: 'scale', section: 'Wiedergutmachung', dimension: 'reparatur', text: 'Meine Fragen erzeugen Genervtheit statt Antworten.' },
    { id: 'vb_r2', type: 'scale', section: 'Wiedergutmachung', dimension: 'reparatur', text: 'Ich höre, dass ich langsam damit abschließen sollte.' },
    { id: 'vb_r3', type: 'scale', section: 'Wiedergutmachung', dimension: 'reparatur', text: 'Es gibt Zusicherungen, aber ich sehe wenig verändertes Verhalten.' },
    { id: 'vb_r4', type: 'scale', section: 'Wiedergutmachung', dimension: 'reparatur', text: 'Mein Gegenüber hält Zusagen im Alltag zuverlässig ein.', reverse: true },
    { id: 'vb_r5', type: 'scale', section: 'Wiedergutmachung', dimension: 'reparatur', text: 'Mein Gegenüber erzählt Dinge von selbst, bevor ich frage.', reverse: true },
    { id: 'vb_r6', type: 'scale', section: 'Wiedergutmachung', dimension: 'reparatur', text: 'Ich habe den Eindruck, mein Gegenüber versteht wirklich, was er angerichtet hat.', reverse: true },
    // ── Drohungen: die anderen Ebenen ──────────────────────────────────────
    // Bewusst `single` mit ausdrücklichem „ist nie passiert"-Zweig statt einer Likert-Skala:
    // Bei einer Skala würde jemand, dem das nie passiert ist, der Aussage „danach kam nie eine
    // Entschuldigung" zustimmen – es gab ja nichts zu entschuldigen – und bekäme fälschlich
    // den roten Sicherheitshinweis. Der Reparatur-Zweig hängt deshalb an der Vorfrage.
    {
      id: 'vb_d1', type: 'single', section: 'Im Streit', dimension: 'sicherheit',
      text: 'Ist in einem Streit schon die Trennung als Druckmittel ausgesprochen worden („Dann geh doch", „Ich halte dich nicht")?',
      help: 'Gemeint ist nicht die ernsthafte, ruhig getroffene Entscheidung, sondern der Satz als Hebel im Streit.',
      options: [
        { label: 'Nein, nie', value: 0 },
        { label: 'Einmal, im Affekt', value: 2 },
        { label: 'Mehrmals', value: 3 },
        { label: 'Regelmäßig – ich rechne im Streit damit', value: 4 },
      ],
      intent: 'Trennungsdrohung als eigene Ebene des Vertrauensbruchs, unabhängig von Untreue.',
    },
    {
      id: 'vb_d2', type: 'single', section: 'Im Streit', dimension: 'reparatur',
      text: 'Falls ja: Wurde das danach von selbst geklärt – also zurückgenommen, ohne dass du darum bitten musstest?',
      options: [
        { label: 'Das ist bei uns nie vorgekommen', value: 0 },
        { label: 'Ja, es wurde von selbst angesprochen und zurückgenommen', value: 0 },
        { label: 'Erst, nachdem ich es angesprochen habe', value: 2 },
        { label: 'Nur oberflächlich („war nicht so gemeint")', value: 3, flag: 'trennungsdrohung-ohne-reparatur' },
        { label: 'Nein, es blieb einfach stehen', value: 4, flag: 'trennungsdrohung-ohne-reparatur' },
      ],
      intent: 'Die entscheidende Unterscheidung des ganzen Themas: Ein Satz im Affekt, der bereut wird, ist eine Wunde. Derselbe Satz ohne Wiedergutmachung ist ein Mittel.',
    },
    {
      id: 'vb_d3', type: 'single', section: 'Im Streit', dimension: 'sicherheit',
      text: 'Ist der Kontakt zu euren Kindern schon einmal als Druckmittel eingesetzt worden (Sorgerecht, Umgang, „dann siehst du sie kaum noch")?',
      options: [
        { label: 'Nein, nie', value: 0 },
        { label: 'Wir haben keine Kinder', value: 0 },
        { label: 'Ja, einmal im Streit', value: 3, flag: 'kindesentzug' },
        { label: 'Ja, mehrmals oder ernsthaft', value: 4, flag: 'kindesentzug' },
      ],
      intent: 'Wird unabhängig vom Durchschnitt ernst genommen – einmal genügt, um jemanden dauerhaft verhandlungsunfähig zu machen.',
    },
    {
      id: 'vb_d4', type: 'single', section: 'Im Streit', dimension: 'reparatur',
      text: 'Falls ja: Wurde das danach aufgelöst?',
      options: [
        { label: 'Das ist bei uns nie vorgekommen', value: 0 },
        { label: 'Ja, es wurde ausdrücklich zurückgenommen', value: 0 },
        { label: 'Nur oberflächlich', value: 2 },
        { label: 'Nein, es wurde nie wieder erwähnt', value: 4, flag: 'kindesentzug-ohne-reparatur' },
      ],
    },
    {
      id: 'vb_d5', type: 'single', section: 'Im Streit', dimension: 'wachsamkeit',
      text: 'Kommt es vor, dass du nach einem Streit tagelang keine Antwort bekommst, obwohl ihr zusammen wohnt?',
      help: 'Gemeint ist nicht die Bitte um eine Pause, sondern die Nicht-Erreichbarkeit ohne Ankündigung und ohne Ende.',
      options: [
        { label: 'Nein', value: 0 },
        { label: 'Es gibt Pausen, aber sie werden angekündigt und enden', value: 1 },
        { label: 'Ja, ein paar Stunden bis zu einem Tag', value: 3 },
        { label: 'Ja, mehrere Tage', value: 4 },
      ],
    },
    { id: 'vb_d6', type: 'scale', section: 'Im Streit', dimension: 'selbstverlust', text: 'Ich überlege vor jedem Thema, ob es den Streit wert wäre.' },
    // ── Deine eigene Veränderung ───────────────────────────────────────────
    { id: 'vb_v1', type: 'scale', section: 'Du selbst', dimension: 'selbstverlust', text: 'Ich spreche Dinge nicht mehr an, die ich früher angesprochen hätte.' },
    { id: 'vb_v2', type: 'scale', section: 'Du selbst', dimension: 'selbstverlust', text: 'Ich bin in dieser Beziehung leiser geworden.' },
    { id: 'vb_v3', type: 'scale', section: 'Du selbst', dimension: 'selbstverlust', text: 'Ich stimme schneller zu, als ich eigentlich will.' },
    { id: 'vb_v4', type: 'scale', section: 'Du selbst', dimension: 'selbstverlust', text: 'Ich kann in dieser Beziehung sagen, was ich denke.', reverse: true },
    { id: 'vb_v5', type: 'scale', section: 'Du selbst', dimension: 'selbstverlust', text: 'Ich schäme mich für meine eigenen Reaktionen seit damals.' },
    // ── Zukunft ────────────────────────────────────────────────────────────
    { id: 'vb_z1', type: 'scale', section: 'Zukunft', dimension: 'zukunft', text: 'Ich kann mir eine gemeinsame Zukunft vorstellen.', reverse: true },
    { id: 'vb_z2', type: 'scale', section: 'Zukunft', dimension: 'zukunft', text: 'Ich bleibe eher aus Gewohnheit oder Angst als aus Überzeugung.' },
    { id: 'vb_z3', type: 'scale', section: 'Zukunft', dimension: 'zukunft', text: 'Ich denke daran zu gehen, tue es aber nicht.' },
    { id: 'vb_z4', type: 'scale', section: 'Zukunft', dimension: 'zukunft', text: 'Wenn ich mir vorstelle, dass es in fünf Jahren genau so ist wie heute, macht mich das ruhig.', reverse: true },
    { id: 'vb_z5', type: 'scale', section: 'Zukunft', dimension: 'zukunft', text: 'Ich habe das Gefühl, das Thema nur noch zu verwalten.' },
    // ── Zum Nachdenken (nicht gewertet) ────────────────────────────────────
    {
      id: 'vb_f1', type: 'text', section: 'Zum Nachdenken', optional: true,
      text: 'Was müsste passieren, damit du dich in dieser Beziehung wieder sicher fühlst?',
      help: 'So konkret wie möglich. Vages lässt sich nicht erfüllen – und Nicht-Erfüllbares bestätigt nur das Misstrauen.',
    },
    {
      id: 'vb_f2', type: 'text', section: 'Zum Nachdenken', optional: true,
      text: 'Was hat sich an dir verändert, seit es passiert ist?',
      help: 'Nicht was du fühlst, sondern was du anders machst.',
    },
    {
      id: 'vb_f3', type: 'text', section: 'Zum Nachdenken', optional: true,
      text: 'Woran würdest du merken, dass Wiedergutmachung wirklich stattfindet?',
      help: 'Wenn dir dazu nichts einfällt, ist auch das eine Antwort – und ein guter Ausgangspunkt für ein Gespräch.',
    },
  ],
}
