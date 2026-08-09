import type { SelfTest } from '../types'

/**
 * Eifersucht & Vertrauen – dimensionaler Test (concern-Polarität: hoch = mehr Eifersucht/weniger Vertrauen).
 * Fünf Bereiche: Verlustangst, Kontrolle, Vergleich, Misstrauen, retrospektive Eifersucht.
 * Nicht beschämend, ohne Diagnose. Eifersucht kann alte Unsicherheit ODER berechtigte Reaktion sein.
 */
export const eifersuchtVertrauen: SelfTest = {
  slug: 'eifersucht-vertrauen',
  category: 'beziehung',
  title: 'Eifersucht & Vertrauen: Wie sehr bestimmt sie dich?',
  teaser:
    'Ein Blick aufs Handy, ein fremder Name – und in dir kippt etwas. Fünf Bereiche zeigen, wie stark Eifersucht dich gerade steuert.',
  description:
    'Dieser umfassende Selbsttest schaut auf fünf Seiten der Eifersucht: Verlustangst, den Drang zu kontrollieren, den ständigen Vergleich, das Misstrauen und die Eifersucht auf die Vergangenheit deines Gegenübers. Kein Urteil über dich oder deine Beziehung – ein ehrlicher, freundlicher Blick darauf, woher die Eifersucht kommt und wie sehr sie dich gerade steuert. Das Ergebnis kannst du anschließend mit Echo besprechen. Ohne Diagnose.',
  duration: '10–14 Min',
  resultMode: 'dimensional',
  polarity: 'concern',
  intro:
    'Eifersucht ist menschlich – ein Zeichen, dass dir etwas wichtig ist. Schwierig wird sie erst, wenn sie das Steuer übernimmt: wenn du kontrollierst, misstraust und dich selbst dabei klein machst. Dieser Test bewertet nicht dein Gegenüber und stellt keine Diagnose. Er hilft dir zu sehen, in welchen Bereichen die Eifersucht dich am stärksten packt – und dass dahinter fast immer eine verstehbare Angst steht. Antworte ehrlich; niemand außer dir sieht deine Antworten.',
  echo: {
    opening_question:
      'Dein Ergebnis zeigt, in welchen Bereichen die Eifersucht dich am stärksten packt. In welcher Situation war sie zuletzt am heftigsten – und was ging dir in dem Moment durch den Kopf?',
  },
  dimensions: [
    {
      key: 'verlustangst',
      name: 'Verlustangst',
      description: 'Wie sehr die Angst, verlassen zu werden, hinter der Eifersucht steht.',
      bands: [
        { min: 0, label: 'Ruhige Bindung', tone: 'good', text: 'Du fürchtest den Verlust nicht ständig. Nähe fühlt sich für dich grundsätzlich sicher an – auch wenn dein Gegenüber mal Abstand oder eigene Zeit braucht.' },
        { min: 40, label: 'Wache Verlustangst', tone: 'watch', text: 'Der Gedanke, verlassen zu werden, meldet sich schnell und drückt. Diese Angst zu kennen – woher sie kommt, wann sie anspringt – nimmt ihr schon etwas von ihrer Macht.' },
        { min: 65, label: 'Ständige Alarmbereitschaft', tone: 'alert', text: 'Die Angst, verlassen zu werden, ist fast immer da und steuert vieles, was du tust. Das ist zermürbend – für dich und die Beziehung. Diese Angst ist verstehbar und veränderbar; du musst ihr nicht allein ausgeliefert bleiben.' },
      ],
    },
    {
      key: 'kontrolle',
      name: 'Kontrollimpuls',
      description: 'Wie stark du prüfst, nachfragst und dich vergewissern musst.',
      bands: [
        { min: 0, label: 'Du lässt Raum', tone: 'good', text: 'Du musst nicht wissen, wo dein Gegenüber jederzeit ist. Vertrauen heißt für dich, nicht alles kontrollieren zu müssen.' },
        { min: 40, label: 'Der Impuls meldet sich', tone: 'watch', text: 'Manchmal möchtest du nachsehen, nachfragen, dich vergewissern. Der Impuls ist menschlich – wichtig ist, ob du ihm folgst und was das mit euch macht.' },
        { min: 65, label: 'Kontrolle bestimmt mit', tone: 'alert', text: 'Nachsehen, nachfragen, prüfen – Kontrolle nimmt viel Raum ein. Sie beruhigt kurz und nährt langfristig genau die Unsicherheit, die sie stillen soll. Und sie kann eine Beziehung sehr eng machen.' },
      ],
    },
    {
      key: 'vergleich',
      name: 'Vergleich & Bedrohung',
      description: 'Wie schnell du dich mit anderen vergleichst und unterlegen fühlst.',
      bands: [
        { min: 0, label: 'In dir ruhend', tone: 'good', text: 'Andere Menschen im Leben deines Gegenübers bedrohen dich nicht grundlegend. Du misst deinen Wert nicht ständig an anderen.' },
        { min: 40, label: 'Schnell verglichen', tone: 'watch', text: 'Du vergleichst dich rasch mit anderen und fühlst dich dann unterlegen. Dieser Vergleich sagt oft mehr über deinen Selbstwert als über die Realität.' },
        { min: 65, label: 'Ständige Konkurrenz', tone: 'alert', text: 'Fast überall witterst du Konkurrenz und fühlst dich zu wenig. Dieser Dauervergleich zehrt am Selbstwert – und Eifersucht wächst besonders dort, wo du dich selbst klein siehst.' },
      ],
    },
    {
      key: 'misstrauen',
      name: 'Misstrauen',
      description: 'Wie sehr du das Schlimmste annimmst – mit oder ohne Anlass.',
      bands: [
        { min: 0, label: 'Grundvertrauen da', tone: 'good', text: 'Du gehst grundsätzlich vom Guten aus. Ohne konkreten Anlass unterstellst du deinem Gegenüber nichts.' },
        { min: 40, label: 'Zweifel schleichen sich ein', tone: 'watch', text: 'Immer wieder unterstellst du das Schlimmste, auch ohne Beweis. Zu unterscheiden, was Wahrnehmung und was Angst ist, wäre ein wichtiger Schritt.' },
        { min: 65, label: 'Grundmisstrauen', tone: 'alert', text: 'Du rechnest fast durchgängig mit Täuschung und suchst nach Belegen dafür. Dieses Misstrauen kann berechtigt sein – oder eine alte Wunde. Beides verdient einen ehrlichen, ruhigen Blick, statt endloser Beweissuche.' },
      ],
    },
    {
      key: 'retrospektiv',
      name: 'Retrospektive Eifersucht',
      description: 'Wie sehr die früheren Beziehungen deines Gegenübers dich beschäftigen.',
      bands: [
        { min: 0, label: 'Die Vergangenheit ruht', tone: 'good', text: 'Die früheren Beziehungen deines Gegenübers beschäftigen dich nicht groß. Was vor dir war, war vor dir.' },
        { min: 40, label: 'Die Ex im Kopf', tone: 'watch', text: 'Die Vergangenheit deines Gegenübers taucht immer wieder auf und sticht. Diese „retrospektive Eifersucht" ist verbreitet – und sie richtet sich gegen etwas, das niemand ändern kann.' },
        { min: 65, label: 'Gefangen im Davor', tone: 'alert', text: 'Die früheren Partner:innen deines Gegenübers lassen dich kaum los – du fragst, vergleichst, grübelst. Gegen die Vergangenheit lässt sich nicht gewinnen; dieser Kampf kostet nur Kraft. Hier lohnt ein liebevoller Blick auf die eigene Unsicherheit.' },
      ],
    },
  ],
  overallBands: [
    { min: 0, label: 'Vertrauen trägt', tone: 'good', text: 'Eifersucht kennst du – wer nicht –, aber sie bestimmt dich nicht. Dein Grundvertrauen ist stabil, und du gibst der Beziehung Raum zum Atmen. Eine gute Basis; halte sie im Blick.' },
    { min: 40, label: 'Eifersucht meldet sich deutlich', tone: 'watch', text: 'In mehreren Bereichen zieht Eifersucht an dir. Das macht dich nicht zu einem misstrauischen Menschen – aber es lohnt sich, hinzuschauen, woher sie kommt, bevor sie euch beide einengt.' },
    { min: 62, label: 'Eifersucht bestimmt viel', tone: 'alert', text: 'Eifersucht nimmt viel Raum in dir und in der Beziehung ein. Das ist zermürbend – und selten nur Charakter; oft steckt eine alte Angst oder eine reale Erfahrung dahinter. Du darfst das ernst nehmen und dir dafür Unterstützung holen.' },
  ],
  questions: [
    // Verlustangst
    { id: 'ev1', type: 'scale', section: 'Verlustangst', dimension: 'verlustangst', text: 'Ich habe oft Angst, dass mein Gegenüber mich verlassen oder sich in jemand anderen verlieben könnte.' },
    { id: 'ev2', type: 'scale', section: 'Verlustangst', dimension: 'verlustangst', text: 'Wenn mein Gegenüber Zeit für sich oder mit anderen verbringt, werde ich innerlich unruhig.' },
    { id: 'ev3', type: 'scale', section: 'Verlustangst', dimension: 'verlustangst', text: 'Ich brauche viel Rückversicherung, dass ich noch geliebt werde.' },
    { id: 'ev4', type: 'scale', section: 'Verlustangst', dimension: 'verlustangst', text: 'Auch ohne Anlass male ich mir aus, dass die Beziehung enden könnte.' },
    { id: 'ev5', type: 'scale', section: 'Verlustangst', dimension: 'verlustangst', text: 'Ich fühle mich in der Beziehung grundsätzlich sicher und gehalten.', reverse: true },
    {
      id: 'ev6', type: 'single', section: 'Verlustangst', dimension: 'verlustangst',
      text: 'Wenn mein Gegenüber abends allein weggeht …',
      options: [
        { label: 'freue ich mich, dass wir beide eigene Leben haben.', value: 0 },
        { label: 'ist es okay, ein leises Unbehagen bleibt aber.', value: 2 },
        { label: 'kreisen meine Gedanken den ganzen Abend.', value: 3 },
        { label: 'halte ich es kaum aus, bis er/sie wieder da ist.', value: 4 },
      ],
    },
    // Kontrolle
    { id: 'ev7', type: 'scale', section: 'Kontrolle', dimension: 'kontrolle', text: 'Ich möchte wissen, wo mein Gegenüber ist und mit wem.' },
    { id: 'ev8', type: 'scale', section: 'Kontrolle', dimension: 'kontrolle', text: 'Ich habe schon heimlich das Handy, die Nachrichten oder Social Media meines Gegenübers geprüft.' },
    { id: 'ev9', type: 'scale', section: 'Kontrolle', dimension: 'kontrolle', text: 'Ich frage nach, um mich zu vergewissern – manchmal mehrmals.' },
    { id: 'ev10', type: 'scale', section: 'Kontrolle', dimension: 'kontrolle', text: 'Ich achte darauf, wem mein Gegenüber online folgt, likt oder schreibt.' },
    { id: 'ev11', type: 'scale', section: 'Kontrolle', dimension: 'kontrolle', text: 'Ich muss nicht wissen, was mein Gegenüber jederzeit tut, um mich sicher zu fühlen.', reverse: true },
    {
      id: 'ev12', type: 'single', section: 'Kontrolle', dimension: 'kontrolle',
      text: 'Der Gedanke, ins Handy meines Gegenübers zu schauen …',
      options: [
        { label: 'käme mir gar nicht – das ist seine/ihre Sache.', value: 0 },
        { label: 'taucht selten auf, ich tue es aber nicht.', value: 2 },
        { label: 'kommt öfter, manchmal gebe ich nach.', value: 3 },
        { label: 'ist vertraut – ich habe es schon getan.', value: 4 },
      ],
    },
    // Vergleich
    { id: 'ev13', type: 'scale', section: 'Vergleich', dimension: 'vergleich', text: 'Ich vergleiche mich mit anderen, die meinem Gegenüber gefallen könnten, und fühle mich unterlegen.' },
    { id: 'ev14', type: 'scale', section: 'Vergleich', dimension: 'vergleich', text: 'Wenn mein Gegenüber jemanden attraktiv oder interessant findet, fühle ich mich bedroht.' },
    { id: 'ev15', type: 'scale', section: 'Vergleich', dimension: 'vergleich', text: 'Ich frage mich oft, ob ich gut genug bin für mein Gegenüber.' },
    { id: 'ev16', type: 'scale', section: 'Vergleich', dimension: 'vergleich', text: 'In Gesellschaft anderer beobachte ich genau, wem mein Gegenüber Aufmerksamkeit schenkt.' },
    { id: 'ev17', type: 'scale', section: 'Vergleich', dimension: 'vergleich', text: 'Ich ruhe in mir und muss mich nicht ständig mit anderen messen.', reverse: true },
    // Misstrauen
    { id: 'ev18', type: 'scale', section: 'Vertrauen', dimension: 'misstrauen', text: 'Wenn mein Gegenüber später kommt als gesagt, denke ich schnell das Schlimmste.' },
    { id: 'ev19', type: 'scale', section: 'Vertrauen', dimension: 'misstrauen', text: 'Ich habe das Gefühl, mein Gegenüber verheimlicht mir etwas – auch ohne Beweis.' },
    { id: 'ev20', type: 'scale', section: 'Vertrauen', dimension: 'misstrauen', text: 'Ich suche in Erzählungen oder Verhalten nach Widersprüchen und Hinweisen.' },
    { id: 'ev21', type: 'scale', section: 'Vertrauen', dimension: 'misstrauen', text: 'Erklärungen meines Gegenübers beruhigen mich nur kurz, dann kommt der Zweifel zurück.' },
    { id: 'ev22', type: 'scale', section: 'Vertrauen', dimension: 'misstrauen', text: 'Ich vertraue meinem Gegenüber grundsätzlich.', reverse: true },
    {
      id: 'ev23', type: 'single', section: 'Vertrauen', dimension: 'misstrauen',
      text: 'Wenn mein Gegenüber sagt „da war nichts" …',
      options: [
        { label: 'glaube ich das und lasse es gut sein.', value: 0 },
        { label: 'glaube ich es meistens, ein Rest bleibt.', value: 2 },
        { label: 'zweifle ich und denke später wieder daran.', value: 3 },
        { label: 'glaube ich es nicht und suche weiter nach Beweisen.', value: 4 },
      ],
    },
    // Retrospektive Eifersucht
    { id: 'ev24', type: 'scale', section: 'Die Vergangenheit', dimension: 'retrospektiv', text: 'Die früheren Beziehungen meines Gegenübers beschäftigen mich mehr, als mir guttut.' },
    { id: 'ev25', type: 'scale', section: 'Die Vergangenheit', dimension: 'retrospektiv', text: 'Ich vergleiche mich mit den Ex-Partner:innen meines Gegenübers.' },
    { id: 'ev26', type: 'scale', section: 'Die Vergangenheit', dimension: 'retrospektiv', text: 'Ich stelle Fragen über die Vergangenheit meines Gegenübers, obwohl die Antworten mich verletzen.' },
    { id: 'ev27', type: 'scale', section: 'Die Vergangenheit', dimension: 'retrospektiv', text: 'Bilder oder Vorstellungen von meinem Gegenüber mit früheren Partner:innen drängen sich mir auf.' },
    { id: 'ev28', type: 'scale', section: 'Die Vergangenheit', dimension: 'retrospektiv', text: 'Was vor mir war, lässt mich ziemlich unberührt – es ist Vergangenheit.', reverse: true },
    {
      id: 'ev29', type: 'single', section: 'Die Vergangenheit', dimension: 'retrospektiv',
      text: 'Wenn die Rede auf frühere Partner:innen meines Gegenübers kommt …',
      options: [
        { label: 'ist das für mich unproblematisch.', value: 0 },
        { label: 'werde ich leicht unruhig, es geht aber vorbei.', value: 2 },
        { label: 'beschäftigt es mich noch Stunden später.', value: 3 },
        { label: 'kann ich an kaum etwas anderes mehr denken.', value: 4 },
      ],
    },
    { id: 'ev30', type: 'scale', section: 'Die Vergangenheit', dimension: 'retrospektiv', text: 'Ich grüble darüber, ob mein Gegenüber jemanden aus der Vergangenheit noch vermisst.' },
    // Freitext
    { id: 'ev_t1', type: 'text', optional: true, section: 'Zum Schluss', text: 'Wann hast du dich zuletzt eifersüchtig gefühlt? Was genau war der Auslöser?' },
    { id: 'ev_t2', type: 'text', optional: true, section: 'Zum Schluss', text: 'Was befürchtest du, dass passiert, wenn du loslässt und nicht mehr kontrollierst?' },
    { id: 'ev_t3', type: 'text', optional: true, section: 'Zum Schluss', text: 'Woher könntest du die Sicherheit, die du suchst, außer von deinem Gegenüber noch bekommen?' },
  ],
  disclaimer:
    'Dieser Test stellt keine Diagnose und bewertet dein Gegenüber nicht. Eifersucht kann Ausdruck alter Unsicherheit sein – oder eine berechtigte Reaktion auf reales Verhalten. Beides verdient einen ehrlichen, ruhigen Blick statt endloser Beweissuche. Bei anhaltender Belastung kann ein Gespräch mit einer Fachperson entlasten.',
}
