import type { SelfTest } from '../types'

/**
 * Narzisstische Beziehungsmuster – dimensionaler Test (concern-Polarität: hoch = stärkere Belastung).
 * Misst das ERLEBEN des Nutzers (nicht die Diagnose des Gegenübers): Auf und Ab,
 * Empathielücke, Abwertung & Kontrolle, Selbstverlust, Bindung trotz allem.
 * Streng nicht-diagnostisch, geschlechtsoffen. safety: true + Flags (coercive-control, gewalt).
 */
export const narzisstischeMuster: SelfTest = {
  slug: 'narzisstische-muster',
  category: 'manipulation',
  title: 'Narzisstische Beziehungsmuster: was erlebe ich?',
  teaser:
    'Erst der Himmel, dann die Kälte? Immer du, die oder der sich anpasst? Fünf Bereiche helfen dir, dein Erleben einzuordnen – ohne dein Gegenüber zu diagnostizieren.',
  description:
    'Dieser Selbsttest schaut auf dein eigenes Erleben in fünf Bereichen, die für narzisstische Beziehungsdynamiken typisch sind: das Auf und Ab zwischen Idealisierung und Abwertung, die fehlende Resonanz für deine Gefühle, Abwertung und Kontrolle, den eigenen Selbstverlust und die starke Bindung trotz allem. Er stellt ausdrücklich keine Diagnose – eine narzisstische Persönlichkeitsstörung kann nur eine Fachperson im persönlichen Kontakt feststellen, niemals eine Website. Es geht nicht darum, jemanden zu etikettieren, sondern darum, dein eigenes Erleben ernst zu nehmen. Das Ergebnis kannst du anschließend mit Echo besprechen.',
  duration: '10–15 Min',
  resultMode: 'dimensional',
  polarity: 'concern',
  intro:
    'Wichtig vorab: Dieser Test bewertet nicht dein Gegenüber und stellt keine Diagnose. Er schaut auf dein Erleben und dein Wohlbefinden. Du musst niemandem ein Etikett verpassen, um ernst zu nehmen, dass es dir schlecht geht. Antworte so ehrlich, wie es dir möglich ist; niemand außer dir sieht deine Antworten. Wenn dir eine Frage zu nahegeht, darfst du jederzeit pausieren.',
  echo: {
    opening_question:
      'Dein Ergebnis zeigt, wo die Belastung am größten ist. Welche einzelne Situation aus der letzten Zeit hat dich am meisten an dir selbst zweifeln lassen?',
  },
  dimensions: [
    {
      key: 'idealabwertung',
      name: 'Auf und Ab (Idealisierung & Abwertung)',
      description: 'Wie sehr du zwischen überschwänglicher Wärme und plötzlicher Kälte hin- und hergerissen wirst.',
      bands: [
        { min: 0, label: 'Verlässlich', tone: 'good', text: 'Die Zuwendung in deiner Beziehung ist einigermaßen beständig. Du musst nicht ständig um die guten Phasen bangen oder kämpfen.' },
        { min: 40, label: 'Wechselhaft', tone: 'watch', text: 'Wärme und Kälte wechseln sich spürbar ab, oft ohne klaren Grund. Dieses Auf und Ab zehrt und bindet zugleich – ein ernstzunehmendes Signal.' },
        { min: 65, label: 'Achterbahn', tone: 'alert', text: 'Du wirst zwischen „Du bist alles" und „Du bist nichts" hin- und hergeworfen. Genau diese unberechenbare Belohnung bindet besonders stark und macht das Lösen so schwer. Das verdient einen geschützten Blick von außen.' },
      ],
    },
    {
      key: 'empathie',
      name: 'Fehlende Resonanz',
      description: 'Wie sehr deine Gefühle ins Leere laufen und sich alles um das Gegenüber dreht.',
      bands: [
        { min: 0, label: 'Gesehen', tone: 'good', text: 'Deine Gefühle finden Resonanz. Wenn es dir schlecht geht, ist Platz für dich.' },
        { min: 40, label: 'Oft allein', tone: 'watch', text: 'Immer wieder dreht sich am Ende alles um die Bedürfnisse deines Gegenübers, während deine leer ausgehen. Das ist einsam – und dein Bedürfnis nach Resonanz ist berechtigt.' },
        { min: 65, label: 'Einsam zu zweit', tone: 'alert', text: 'Für deine Gefühle scheint kaum Platz zu sein; der ist immer schon besetzt. Diese fehlende Resonanz zehrt oft mehr als offener Streit. Du bist nicht zu bedürftig – dir fehlt etwas Grundlegendes.' },
      ],
    },
    {
      key: 'entwertung',
      name: 'Abwertung & Kontrolle',
      description: 'Wie oft du kleingemacht wirst und nie genug zu sein scheinst.',
      bands: [
        { min: 0, label: 'Auf Augenhöhe', tone: 'good', text: 'Du wirst grundsätzlich wertgeschätzt. Du musst dich nicht ständig beweisen oder rechtfertigen.' },
        { min: 40, label: 'Nie ganz genug', tone: 'watch', text: 'Es gibt oft den einen Haken, der deine Mühe entwertet, oder Kritik, die am Selbstwert nagt. Du strengst dich viel an für ein Lob, das selten kommt.' },
        { min: 65, label: 'Systematische Abwertung', tone: 'alert', text: 'Egal, was du tust, es scheint nie zu reichen; Abwertung und Kontrolle prägen euren Alltag. Das höhlt den Selbstwert aus und ist ernst zu nehmen – nicht dein Versagen, sondern ein Muster.' },
      ],
    },
    {
      key: 'selbstverlust',
      name: 'Selbstverlust & Anpassung',
      description: 'Wie sehr du dich selbst aufgibst, um die Stimmung zu halten.',
      bands: [
        { min: 0, label: 'Bei dir', tone: 'good', text: 'Du kannst in der Beziehung du selbst sein, deine Bedürfnisse zeigen und Nein sagen, ohne dich zu fürchten.' },
        { min: 40, label: 'Häufiges Anpassen', tone: 'watch', text: 'Du liest ständig die Stimmung, gibst nach und denkst voraus, um Ärger zu vermeiden. Das kostet Kraft – und Stück für Stück ein wenig von dir.' },
        { min: 65, label: 'Ausgeprägter Selbstverlust', tone: 'alert', text: 'Du gehst auf Eierschalen, funktionierst und machst dich klein, um die Stimmung zu halten. Dass kluge, starke Menschen so reagieren, ist Schutz, kein Makel – und ein deutliches Zeichen, gut für dich zu sorgen.' },
      ],
    },
    {
      key: 'bindung',
      name: 'Bindung trotz allem',
      description: 'Wie stark dich die Beziehung hält, obwohl sie dir schadet.',
      bands: [
        { min: 0, label: 'Frei', tone: 'good', text: 'Du fühlst dich nicht gefangen. Du könntest gehen, wenn es dir dauerhaft schlecht ginge.' },
        { min: 40, label: 'Schwer zu lösen', tone: 'watch', text: 'Obwohl es dir oft schlecht geht, fällt Loslassen schwer; die Hoffnung auf die guten Phasen hält dich. Das ist keine Willensschwäche, sondern die Wirkung des Auf und Ab.' },
        { min: 65, label: 'Wie festgeklebt', tone: 'alert', text: 'Du kommst kaum los, obwohl du weißt, dass es dir schadet – der Sog ist stark, das Zurückgeholtwerden auch. Diese Trauma-Bindung ist gut verstehbar und du darfst dir Hilfe holen, um da herauszufinden.' },
      ],
    },
  ],
  overallBands: [
    { min: 0, label: 'Grundsätzlich tragfähig', tone: 'good', text: 'Über die Bereiche hinweg zeigt sich keine durchgehende narzisstische Dynamik. Einzelne schwierige Seiten kann es trotzdem geben – behalte im Blick, was dir guttut.' },
    { min: 40, label: 'Ernstzunehmende Belastung', tone: 'watch', text: 'In mehreren Bereichen zieht es spürbar an dir. Das macht dein Gegenüber nicht automatisch zum „Narzissten" – aber es lohnt sich, genauer hinzusehen, Situationen aufzuschreiben und mit jemandem zu sprechen, dem du vertraust.' },
    { min: 62, label: 'Deutliche Belastung', tone: 'alert', text: 'Vieles deutet auf ein belastendes Muster hin, das dir nicht guttut. Das ernst zu nehmen ist kein Urteil über den anderen Menschen, sondern Fürsorge für dich. Du musst das nicht allein einordnen – eine Vertrauensperson oder Fachstelle kann helfen.' },
  ],
  questions: [
    // Auf und Ab
    { id: 'nz_a1', type: 'scale', section: 'Auf und Ab', dimension: 'idealabwertung', text: 'Der Anfang war überwältigend intensiv – sehr schnell sehr viel Nähe und große Versprechen.' },
    { id: 'nz_a2', type: 'scale', section: 'Auf und Ab', dimension: 'idealabwertung', text: 'Wärme und Kälte wechseln sich ab, oft ohne dass ich weiß, warum.' },
    { id: 'nz_a3', type: 'scale', section: 'Auf und Ab', dimension: 'idealabwertung', text: 'Ich kämpfe darum, die guten Phasen von früher zurückzubekommen.' },
    { id: 'nz_a4', type: 'scale', section: 'Auf und Ab', dimension: 'idealabwertung', text: 'Wenn ich auf Abstand gehe, kommt plötzlich die alte Zuwendung zurück.' },
    { id: 'nz_a5', type: 'scale', section: 'Auf und Ab', dimension: 'idealabwertung', text: 'Die Zuwendung in dieser Beziehung ist verlässlich und beständig.', reverse: true },
    // Fehlende Resonanz
    { id: 'nz_e1', type: 'scale', section: 'Resonanz', dimension: 'empathie', text: 'Wenn ich von etwas erzähle, das mich bewegt, dreht sich das Gespräch schnell um mein Gegenüber.' },
    { id: 'nz_e2', type: 'scale', section: 'Resonanz', dimension: 'empathie', text: 'Wenn es mir schlecht geht, bin ich mit meinen Gefühlen im Grunde allein.' },
    { id: 'nz_e3', type: 'scale', section: 'Resonanz', dimension: 'empathie', text: 'Mein Gegenüber scheint kaum nachzuempfinden, wie es mir geht.' },
    { id: 'nz_e4', type: 'scale', section: 'Resonanz', dimension: 'empathie', text: 'Am Ende tröste eher ich mein Gegenüber, auch wenn es eigentlich um mich ging.' },
    { id: 'nz_e5', type: 'scale', section: 'Resonanz', dimension: 'empathie', text: 'Ich fühle mich von meinem Gegenüber gesehen und emotional beantwortet.', reverse: true },
    // Abwertung & Kontrolle
    { id: 'nz_w1', type: 'scale', section: 'Abwertung & Kontrolle', dimension: 'entwertung', text: 'Egal, wie sehr ich mich anstrenge, es scheint nie ganz zu genügen.' },
    { id: 'nz_w2', type: 'scale', section: 'Abwertung & Kontrolle', dimension: 'entwertung', text: 'Es gibt oft den einen Haken, an dem meine Mühe entwertet wird.' },
    { id: 'nz_w3', type: 'scale', section: 'Abwertung & Kontrolle', dimension: 'entwertung', text: 'Ich werde kleingemacht – mal offen, mal in feinen Spitzen.' },
    { id: 'nz_w4', type: 'scale', section: 'Abwertung & Kontrolle', dimension: 'entwertung', text: 'Über meine Zeit, mein Geld oder meine Kontakte muss ich Rechenschaft ablegen.', flag: 'coercive-control', flagMin: 3 },
    { id: 'nz_w5', type: 'scale', section: 'Abwertung & Kontrolle', dimension: 'entwertung', text: 'Meine Erfolge werden geteilt und mitgefreut.', reverse: true },
    // Selbstverlust
    { id: 'nz_s1', type: 'scale', section: 'Du selbst', dimension: 'selbstverlust', text: 'Ich lese ständig die Stimmung und richte mein Verhalten danach aus.' },
    { id: 'nz_s2', type: 'scale', section: 'Du selbst', dimension: 'selbstverlust', text: 'Ich gehe auf Eierschalen, um ja keine gekränkte oder kalte Reaktion auszulösen.' },
    { id: 'nz_s3', type: 'scale', section: 'Du selbst', dimension: 'selbstverlust', text: 'Ich habe Interessen, Freundschaften oder Seiten von mir aufgegeben, seit ich in dieser Beziehung bin.', flag: 'coercive-control', flagMin: 4 },
    { id: 'nz_s4', type: 'scale', section: 'Du selbst', dimension: 'selbstverlust', text: 'Ich zweifle an meiner eigenen Wahrnehmung, wenn wir uneinig sind.' },
    { id: 'nz_s5', type: 'scale', section: 'Du selbst', dimension: 'selbstverlust', text: 'Ich kann in dieser Beziehung ich selbst sein und meine Bedürfnisse zeigen.', reverse: true },
    // Bindung trotz allem
    { id: 'nz_b1', type: 'scale', section: 'Bindung', dimension: 'bindung', text: 'Obwohl es mir oft schlecht geht, fällt mir das Loslassen sehr schwer.' },
    { id: 'nz_b2', type: 'scale', section: 'Bindung', dimension: 'bindung', text: 'Die Hoffnung auf die guten Phasen hält mich in der Beziehung.' },
    { id: 'nz_b3', type: 'scale', section: 'Bindung', dimension: 'bindung', text: 'Ich habe schon mehrmals versucht, mich zu lösen, und bin doch wieder zurück.' },
    {
      id: 'nz_b4', type: 'single', section: 'Bindung', dimension: 'bindung',
      text: 'Wenn ich ehrlich in mich hineinhöre, fühle ich mich in dieser Beziehung …',
      options: [
        { label: 'sicher und geborgen.', value: 0 },
        { label: 'meistens sicher.', value: 1 },
        { label: 'oft angespannt.', value: 2 },
        { label: 'häufig klein und unsicher.', value: 3 },
        { label: 'immer wieder richtig ängstlich.', value: 4, flag: 'gewalt' },
      ],
    },
    // Freitext
    { id: 'nz_t1', type: 'text', optional: true, section: 'Zum Schluss', text: 'Welche einzelne Situation geht dir gerade nicht aus dem Kopf?' },
    { id: 'nz_t2', type: 'text', optional: true, section: 'Zum Schluss', text: 'Was würdest du einer guten Freundin oder einem guten Freund raten, die oder der dir dasselbe erzählt?' },
    { id: 'nz_t3', type: 'text', optional: true, section: 'Zum Schluss', text: 'Wann und mit wem fühlst du dich frei und ganz du selbst?' },
  ],
  safety: true,
  safetyVariant: 'victim',
  disclaimer:
    'Dieser Test stellt keine Diagnose und bewertet dein Gegenüber nicht – eine narzisstische Persönlichkeitsstörung kann nur eine qualifizierte Fachperson im persönlichen Kontakt feststellen. Er hilft dir, dein eigenes Erleben einzuordnen. Narzisstische Dynamiken und ihre Folgen treffen Menschen jeden Geschlechts. Wenn du dich nicht mehr sicher fühlst, wende dich an Menschen, die verbindlich helfen: Hilfetelefon Gewalt gegen Frauen 116 016, Hilfetelefon Gewalt an Männern 0800 123 9900, Telefonseelsorge 0800 111 0 111. Bei akuter Gefahr: Notruf 110 / 112.',
}
