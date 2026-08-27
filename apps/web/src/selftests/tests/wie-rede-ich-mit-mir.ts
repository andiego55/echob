import type { SelfTest } from '../types'

/**
 * Wie rede ich mit mir? – Profiltest (polarity 'positive': hoch = mehr Selbstmitgefühl).
 *
 * Sechs Bereiche. Die ersten drei sind Kristin Neffs Bestandteile (Selbstfreundlichkeit,
 * gemeinsames Menschsein, achtsame Distanz), die letzten drei sind Ergänzungen, die im
 * Alltag den Ausschlag geben: Umgang mit Fehlern, eigene Bedürfnisse, Freiheit vom
 * inneren Antreiber. Bewusst KEIN Nachbau der Self-Compassion Scale.
 *
 * Zwei Dinge, die beim Zuschneiden wichtig waren:
 *
 *   1. `polarity: 'positive'` heißt: hoher Wert = ausgeprägter. Kritische Aussagen
 *      ("Ich mache mich fertig") sind deshalb `reverse` codiert.
 *   2. Es gibt KEINEN Sicherheitshinweis über Flags, aber im Disclaimer den Hinweis auf
 *      die Telefonseelsorge – ein niedriger Wert in `fehler` plus `freundlichkeit` kann
 *      auch Ausdruck einer Depression sein, und der Test darf das nicht wegdeuten.
 *
 * Gegenstück: `wie-ehrlich-bin-ich-mit-mir`. Die beiden gehören zusammen – Selbstmitgefühl
 * ohne Ehrlichkeit wird zur Ausrede, Ehrlichkeit ohne Selbstmitgefühl zur Selbstzerfleischung.
 */
export const wieRedeIchMitMir: SelfTest = {
  slug: 'wie-rede-ich-mit-mir',
  category: 'persoenlichkeit',
  title: 'Wie rede ich mit mir?',
  teaser:
    'Der Ton, in dem du mit dir sprichst, wenn etwas schiefgeht – in sechs Bereichen. Kein Werturteil, sondern ein Bild davon, wo du dir Freundlichkeit erlaubst und wo nicht.',
  description:
    'Fast alle finden den Satz einleuchtend, man solle mit sich reden wie mit einem Menschen, den man mag. Fast niemand tut es. Dieser Selbsttest schaut auf sechs Bereiche: den Ton bei Misserfolg, das Gefühl, mit Schwierigkeiten nicht allein zu sein, den Abstand zu schweren Gefühlen, den Umgang mit eigenen Fehlern, das Zulassen eigener Bedürfnisse und die Freiheit von inneren Antreibern. Er misst nichts Krankhaftes und vergibt keine Noten – er zeigt, wo du dir Freundlichkeit erlaubst und wo nicht. Das Ergebnis kannst du anschließend mit Echo besprechen.',
  duration: '10–15 Min',
  resultMode: 'dimensional',
  polarity: 'positive',
  intro:
    'Antworte danach, wie es tatsächlich ist – nicht danach, wie du es gern hättest oder wie man es machen sollte. Das ist bei diesem Thema schwerer als bei anderen, weil fast jeder weiß, welche Antwort die richtige wäre. Ein Hinweis noch: Ein niedriger Wert ist kein Versäumnis. Der Ton, in dem du mit dir sprichst, stammt meistens von jemandem und ist selten eine Entscheidung gewesen. Niemand außer dir sieht deine Antworten.',
  echo: {
    opening_question:
      'Dein Ergebnis zeigt, wo du mit dir am härtesten umgehst. Fällt dir eine Situation aus den letzten Tagen ein, in der diese Stimme laut war? Erzähl mir, was sie wörtlich gesagt hat.',
  },
  disclaimer:
    'Dieser Test stellt keine Diagnose. Wenn du dich dauerhaft wertlos fühlst, wenn dich die Stimme in dir am Alltag hindert oder wenn Gedanken dazukommen, nicht mehr da sein zu wollen, ist das kein Fall für Selbsthilfe – dafür gibt es wirksame Behandlung. Telefonseelsorge: 0800 111 0 111, kostenfrei und rund um die Uhr.',
  dimensions: [
    {
      key: 'freundlichkeit',
      name: 'Selbstfreundlichkeit',
      description: 'Der Ton, in dem du mit dir sprichst, wenn etwas misslingt.',
      explain:
        'Hier geht es nicht um den Inhalt, sondern um den Ton. Der Satz „du hättest früher anfangen sollen" darf stehen bleiben – die Frage ist, warum er klingt wie von jemandem, der dich loswerden will.',
      bands: [
        { min: 0, label: 'Hart im Ton', tone: 'alert', text: 'Wenn etwas schiefgeht, wirst du grob mit dir. Das fühlt sich an wie Ehrlichkeit und ist etwas anderes: Wer sich für jeden Fehler fertigmacht, hat einen starken Anreiz, Fehler nicht mehr zu bemerken. Der erste Schritt ist nicht Milde, sondern Wahrnehmung – hör dir einmal wörtlich zu.' },
        { min: 40, label: 'Schwankend', tone: 'watch', text: 'Manchmal gelingt dir ein anständiger Ton, manchmal nicht. Meistens hängt es am Thema: Es gibt Bereiche, in denen du dir mehr durchgehen lässt als in anderen. Die interessante Frage ist, welche das sind.' },
        { min: 65, label: 'Anständig mit dir', tone: 'good', text: 'Du kannst einen Fehler benennen, ohne dich dabei zu vernichten. Das ist die Grundlage dafür, dass du überhaupt hinschauen kannst – und seltener, als die meisten annehmen.' },
      ],
    },
    {
      key: 'menschsein',
      name: 'Gemeinsames Menschsein',
      description: 'Ob sich Schwierigkeiten wie ein persönlicher Makel anfühlen oder wie Menschsein.',
      explain:
        'Scham erzeugt den Eindruck, ausgerechnet man selbst sei so, während alle anderen ihr Leben im Griff haben. Dieser Eindruck entsteht aus einem schiefen Vergleich: das eigene Innenleben gegen das sichtbare Verhalten anderer.',
      bands: [
        { min: 0, label: 'Sehr allein damit', tone: 'alert', text: 'Wenn es dir schlecht geht, hast du den Eindruck, dass es nur dir so geht. Das ist der einsamste Teil von Scham – und der am leichtesten widerlegbare. Der wirksamste Schritt ist kein Gedanke, sondern ein Satz zu einem anderen Menschen.' },
        { min: 40, label: 'Teils verbunden', tone: 'watch', text: 'Bei manchem weißt du, dass es dazugehört, bei anderem fühlst du dich als Sonderfall. Meist ist es genau das, worüber du mit niemandem sprichst.' },
        { min: 65, label: 'Nicht allein', tone: 'good', text: 'Du kannst Schwierigkeiten als Teil des Menschseins einordnen, ohne sie kleiner zu machen. Das schützt vor der Vereinzelung, die aus jedem Problem ein Urteil macht.' },
      ],
    },
    {
      key: 'achtsamkeit',
      name: 'Achtsame Distanz',
      description: 'Ob du schwere Gefühle sehen kannst, ohne in ihnen zu verschwinden.',
      explain:
        'Der Unterschied zwischen „ich habe gerade ein schweres Gefühl" und „ich bin dieses Gefühl". Nicht wegschieben, nicht ertrinken – beides sind Ausweichbewegungen in verschiedene Richtungen.',
      bands: [
        { min: 0, label: 'Mitgerissen', tone: 'alert', text: 'Schwere Gefühle nehmen dich ganz ein, oder du schiebst sie so weit weg, dass du sie erst spät bemerkst. Beides macht es schwer, etwas zu entscheiden, solange sie da sind. Hilfreich ist oft, den Zustand zu benennen statt ihn zu bewerten.' },
        { min: 40, label: 'Wechselnd', tone: 'watch', text: 'Manchmal gelingt dir der Abstand, manchmal nicht. Das hängt oft weniger am Gefühl als am Schlaf, an der Erschöpfung und daran, ob jemand da ist.' },
        { min: 65, label: 'Mit Abstand', tone: 'good', text: 'Du kannst ein schweres Gefühl bemerken, ohne dass es dich vollständig einnimmt. Das ist die praktischste der drei Grundfähigkeiten – sie entscheidet oft, ob ein Abend kippt oder nicht.' },
      ],
    },
    {
      key: 'fehler',
      name: 'Umgang mit Fehlern',
      description: 'Ob ein Fehler eine Handlung bleibt oder zu einem Urteil über dich wird.',
      explain:
        'Der Unterschied zwischen Schuld („ich habe etwas Schlechtes getan") und Scham („ich bin schlecht"). Er klingt akademisch und entscheidet praktisch alles: Eine Handlung kann man wiedergutmachen, ein Urteil über die Person nicht.',
      bands: [
        { min: 0, label: 'Fehler treffen dich ganz', tone: 'alert', text: 'Ein Fehler ist bei dir nicht eine Sache, die passiert ist, sondern eine Aussage über dich. Das erklärt viel, unter anderem, warum Zugeben so schwer sein kann. Wer nach der Einsicht vernichtet wird, kann sie sich nicht leisten.' },
        { min: 40, label: 'Kommt darauf an', tone: 'watch', text: 'Kleine Fehler kannst du stehen lassen, größere werden schnell grundsätzlich. Die Grenze verläuft meistens dort, wo etwas dein Selbstbild berührt.' },
        { min: 65, label: 'Fehler bleiben Fehler', tone: 'good', text: 'Du kannst einen Fehler benennen, ohne dass er zu einem Urteil über dich wird. Das macht dich handlungsfähig – und, entgegen der verbreiteten Sorge, eher verantwortungsbereiter als nachlässiger.' },
      ],
    },
    {
      key: 'beduerfnisse',
      name: 'Eigene Bedürfnisse',
      description: 'Ob deine Bedürfnisse überhaupt mitzählen – und ob du sie nennst.',
      explain:
        'Selbstliebe zeigt sich fast ausschließlich in Handlungen, nicht in Gefühlen: Sage ich ab, wenn ich erschöpft bin? Nenne ich, was ich brauche, bevor es dringend ist?',
      bands: [
        { min: 0, label: 'Kommen kaum vor', tone: 'alert', text: 'Deine Bedürfnisse tauchen erst auf, wenn nichts mehr geht. Das ist der Punkt, an dem Selbstfürsorge keine Frage der Haltung mehr ist, sondern eine praktische: ein Nein, ein Satz, ein Termin. Warte nicht darauf, dass sich das Gefühl vorher ändert.' },
        { min: 40, label: 'Nachrangig', tone: 'watch', text: 'Du kennst deine Bedürfnisse, stellst sie aber zurück, sobald jemand anderes etwas braucht. Über längere Zeit erzeugt das eine stille Bitterkeit, die keiner zuordnen kann – am wenigsten du selbst.' },
        { min: 65, label: 'Zählen mit', tone: 'good', text: 'Du zählst dich mit. Nicht über andere gestellt, aber auch nicht weggelassen – und das ist der eigentliche Unterschied zwischen Selbstliebe und Egoismus.' },
      ],
    },
    {
      key: 'antreiber',
      name: 'Freiheit vom Antreiber',
      description: 'Ob Ruhe erlaubt ist oder verdient werden muss.',
      explain:
        'Innere Antreiber sind unausgesprochene Regeln – sei perfekt, sei stark, mach es allen recht. In gemäßigter Form sind das brauchbare Haltungen. Zum Problem werden sie, wenn keine Ausnahme vorgesehen ist.',
      bands: [
        { min: 0, label: 'Fest im Griff', tone: 'alert', text: 'Ruhe musst du dir verdienen, Leichtes fühlt sich verdächtig an, und Pausen kommen erst, wenn nichts mehr geht. Das fühlt sich nach Disziplin an und kostet meist mehr, als es einbringt: Wer unter Beobachtung arbeitet, schiebt eher auf, als schneller zu sein.' },
        { min: 40, label: 'Spürbar', tone: 'watch', text: 'Die Regeln sind da, aber nicht allmächtig. Es gibt Bereiche, in denen du dir Nachsicht erlaubst – und es lohnt sich zu schauen, warum ausgerechnet dort.' },
        { min: 65, label: 'Weitgehend frei', tone: 'good', text: 'Du kannst dir Pausen nehmen, ohne sie zu rechtfertigen, und Fehler machen, ohne dass dein Anspruch an dich zusammenbricht. Das heißt nicht, dass dir egal wäre, was du tust.' },
      ],
    },
  ],
  overallBands: [
    { min: 0, label: 'Streng mit dir', tone: 'alert', text: 'Über fast alle Bereiche hinweg gehst du hart mit dir um. Das ist verbreitet und selten eine Entscheidung gewesen – der Ton stammt meistens von jemandem. Fang nicht damit an, freundlicher sein zu wollen. Fang damit an, dir wörtlich zuzuhören: Der erste Schritt ist zu bemerken, dass es eine Stimme ist und nicht die Wirklichkeit. Wenn diese Härte mit anhaltender Erschöpfung oder Hoffnungslosigkeit einhergeht, gehört sie in fachliche Begleitung.' },
    { min: 40, label: 'Gemischt', tone: 'watch', text: 'In manchen Bereichen bist du anständig mit dir, in anderen nicht. Das ist der Normalfall. Schau dir den niedrigsten Wert an – dort liegt meist ein alter Satz, der nie geprüft wurde. Und schau dir den höchsten an: Dort kannst du es offenbar schon, und das ist eine brauchbare Information.' },
    { min: 65, label: 'Anständig mit dir', tone: 'good', text: 'Du kannst mit dir umgehen, ohne dich zu vernichten. Das ist keine Nachlässigkeit, sondern die Voraussetzung dafür, ehrlich hinzuschauen. Der Anschluss lohnt sich: Selbstmitgefühl ohne Ehrlichkeit wird zur Ausrede – dafür gibt es den Test „Wie ehrlich bin ich mit mir?".' },
  ],
  questions: [
    // ── Selbstfreundlichkeit ───────────────────────────────────────────────
    { id: 'sm_f1', type: 'scale', section: 'Wenn etwas schiefgeht', dimension: 'freundlichkeit', text: 'Wenn mir etwas misslingt, mache ich mich innerlich fertig.', reverse: true },
    { id: 'sm_f2', type: 'scale', section: 'Wenn etwas schiefgeht', dimension: 'freundlichkeit', text: 'Ich kann einen Fehler feststellen, ohne dabei grob zu mir zu werden.' },
    { id: 'sm_f3', type: 'scale', section: 'Wenn etwas schiefgeht', dimension: 'freundlichkeit', text: 'Was ich in solchen Momenten zu mir sage, würde ich zu einem Menschen, den ich mag, nie sagen.', reverse: true },
    { id: 'sm_f4', type: 'scale', section: 'Wenn etwas schiefgeht', dimension: 'freundlichkeit', text: 'In schweren Zeiten kann ich mir das geben, was ich brauche.' },
    { id: 'sm_f5', type: 'scale', section: 'Wenn etwas schiefgeht', dimension: 'freundlichkeit', text: 'Der Ton in meinem Kopf erinnert mich an eine bestimmte Person aus meinem Leben.', reverse: true },
    { id: 'sm_f6', type: 'scale', section: 'Wenn etwas schiefgeht', dimension: 'freundlichkeit', text: 'Ich halte Härte gegen mich selbst für nötig, damit ich etwas zustande bringe.', reverse: true },
    // ── Gemeinsames Menschsein ─────────────────────────────────────────────
    { id: 'sm_m1', type: 'scale', section: 'Allein oder nicht', dimension: 'menschsein', text: 'Wenn es mir schlecht geht, habe ich das Gefühl, dass es allen anderen besser geht.', reverse: true },
    { id: 'sm_m2', type: 'scale', section: 'Allein oder nicht', dimension: 'menschsein', text: 'Ich kann mir sagen, dass Schwierigkeiten zum Leben gehören – ohne dass es sich wie eine Floskel anfühlt.' },
    { id: 'sm_m3', type: 'scale', section: 'Allein oder nicht', dimension: 'menschsein', text: 'Bei eigenen Fehlern denke ich: Ausgerechnet ich bin so.', reverse: true },
    { id: 'sm_m4', type: 'scale', section: 'Allein oder nicht', dimension: 'menschsein', text: 'Ich erzähle anderen von Dingen, die mir peinlich sind.' },
    { id: 'sm_m5', type: 'scale', section: 'Allein oder nicht', dimension: 'menschsein', text: 'Wenn ich höre, dass jemand anderes dasselbe Problem hat, erleichtert mich das.' },
    { id: 'sm_m6', type: 'scale', section: 'Allein oder nicht', dimension: 'menschsein', text: 'Ich vergleiche mein Innenleben mit dem, was andere nach außen zeigen.', reverse: true },
    // ── Achtsame Distanz ───────────────────────────────────────────────────
    { id: 'sm_a1', type: 'scale', section: 'Mit schweren Gefühlen', dimension: 'achtsamkeit', text: 'Wenn mich etwas trifft, nimmt es mich vollständig ein.', reverse: true },
    { id: 'sm_a2', type: 'scale', section: 'Mit schweren Gefühlen', dimension: 'achtsamkeit', text: 'Ich kann bemerken, dass ich gerade traurig oder wütend bin, ohne sofort etwas dagegen tun zu müssen.' },
    { id: 'sm_a3', type: 'scale', section: 'Mit schweren Gefühlen', dimension: 'achtsamkeit', text: 'Ich schiebe unangenehme Gefühle weg und merke erst spät, dass sie da waren.', reverse: true },
    { id: 'sm_a4', type: 'scale', section: 'Mit schweren Gefühlen', dimension: 'achtsamkeit', text: 'Aus einer Sache wird bei mir schnell alles: Ein Ärger zieht andere Themen nach sich.', reverse: true },
    { id: 'sm_a5', type: 'scale', section: 'Mit schweren Gefühlen', dimension: 'achtsamkeit', text: 'Ich kann sagen, was gerade in mir los ist, ohne es zu bewerten.' },
    { id: 'sm_a6', type: 'scale', section: 'Mit schweren Gefühlen', dimension: 'achtsamkeit', text: 'Abends gehe ich im Kopf durch, was ich falsch gemacht habe.', reverse: true },
    // ── Umgang mit Fehlern ─────────────────────────────────────────────────
    { id: 'sm_e1', type: 'scale', section: 'Fehler', dimension: 'fehler', text: 'Ein Fehler fühlt sich bei mir an wie eine Aussage darüber, wer ich bin.', reverse: true },
    { id: 'sm_e2', type: 'scale', section: 'Fehler', dimension: 'fehler', text: 'Ich kann sagen, dass etwas mein Fehler war, ohne mich dabei zu verachten.' },
    { id: 'sm_e3', type: 'scale', section: 'Fehler', dimension: 'fehler', text: 'Nach einem Fehler denke ich noch Tage später daran.', reverse: true },
    { id: 'sm_e4', type: 'scale', section: 'Fehler', dimension: 'fehler', text: 'Ich kann etwas wiedergutmachen, ohne mich dafür übermäßig zu entschuldigen.' },
    { id: 'sm_e5', type: 'scale', section: 'Fehler', dimension: 'fehler', text: 'Kritik von anderen trifft mich stärker, als sie gemeint war.', reverse: true },
    { id: 'sm_e6', type: 'scale', section: 'Fehler', dimension: 'fehler', text: 'Ich kann über eigene Missgeschicke lachen.' },
    // ── Eigene Bedürfnisse ─────────────────────────────────────────────────
    { id: 'sm_b1', type: 'scale', section: 'Deine Bedürfnisse', dimension: 'beduerfnisse', text: 'Ich sage ab, wenn mir etwas zu viel ist.' },
    { id: 'sm_b2', type: 'scale', section: 'Deine Bedürfnisse', dimension: 'beduerfnisse', text: 'Ich merke erst am Zusammenklappen, dass ich überlastet war.', reverse: true },
    { id: 'sm_b3', type: 'scale', section: 'Deine Bedürfnisse', dimension: 'beduerfnisse', text: 'Ich nenne, was ich brauche, bevor es dringend wird.' },
    { id: 'sm_b4', type: 'scale', section: 'Deine Bedürfnisse', dimension: 'beduerfnisse', text: 'Ich entschuldige mich für Dinge, für die ich nichts kann.', reverse: true },
    { id: 'sm_b5', type: 'scale', section: 'Deine Bedürfnisse', dimension: 'beduerfnisse', text: 'Wenn mir körperlich etwas fehlt, kümmere ich mich zeitnah darum.' },
    { id: 'sm_b6', type: 'scale', section: 'Deine Bedürfnisse', dimension: 'beduerfnisse', text: 'Meine Wünsche nenne ich nur, wenn ich sicher bin, dass sie niemanden stören.', reverse: true },
    // ── Freiheit vom Antreiber ─────────────────────────────────────────────
    { id: 'sm_t1', type: 'scale', section: 'Anspruch an dich', dimension: 'antreiber', text: 'Ruhe muss ich mir verdienen.', reverse: true },
    { id: 'sm_t2', type: 'scale', section: 'Anspruch an dich', dimension: 'antreiber', text: 'Ich kann etwas abgeben, das nicht perfekt ist.' },
    { id: 'sm_t3', type: 'scale', section: 'Anspruch an dich', dimension: 'antreiber', text: 'Wenn mir etwas leichtfällt, kommt es mir vor, als hätte ich mich nicht genug angestrengt.', reverse: true },
    { id: 'sm_t4', type: 'scale', section: 'Anspruch an dich', dimension: 'antreiber', text: 'Ich kann eine Pause machen, ohne sie zu rechtfertigen.' },
    { id: 'sm_t5', type: 'scale', section: 'Anspruch an dich', dimension: 'antreiber', text: 'Wenn ich jemanden enttäusche, halte ich das kaum aus.', reverse: true },
    { id: 'sm_t6', type: 'scale', section: 'Anspruch an dich', dimension: 'antreiber', text: 'Auch an einem Tag, an dem ich nichts geschafft habe, ist es in Ordnung, dass es mich gibt.' },
    // ── Zum Nachdenken (nicht gewertet) ────────────────────────────────────
    {
      id: 'sm_x1', type: 'text', section: 'Zum Nachdenken', optional: true,
      text: 'Was hast du dir zuletzt gesagt, als dir etwas misslungen ist? Möglichst wörtlich.',
      help: 'Nicht sinngemäß – im Originalton. Der Unterschied ist erstaunlich groß.',
    },
    {
      id: 'sm_x2', type: 'text', section: 'Zum Nachdenken', optional: true,
      text: 'Was hättest du zu einem Menschen gesagt, den du magst, wenn er dir dasselbe erzählt hätte?',
      help: 'Wirklich formulieren, nicht nur denken.',
    },
    {
      id: 'sm_x3', type: 'text', section: 'Zum Nachdenken', optional: true,
      text: 'Wessen Stimme ist das eigentlich?',
      help: 'Wenn dir sofort jemand einfällt, ist das eine Information. Wenn nicht, ist das auch eine.',
    },
  ],
}
