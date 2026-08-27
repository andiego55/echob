import type { SelfTest } from '../types'

/**
 * Wie Liebe bei mir ankommt – Profiltest (polarity 'positive': hoch = diese Form zählt für dich viel).
 *
 * Bewusst KEIN Nachbau des Fragebogens von Gary Chapman, sondern eine eigene Fassung mit
 * sechs Bereichen. Die sechste – Verlässlichkeit – ist eine Ergänzung: Für viele Menschen ist
 * Beständigkeit das eigentliche Signal von Zuneigung, und sie fehlt im klassischen Modell.
 *
 * Kein Typentest: Es geht nicht darum, eine Liebessprache zu sein, sondern zu sehen, welche
 * Formen bei dir wie stark ankommen. Mehrere hohe Werte sind der Normalfall, kein Widerspruch.
 */
export const wieLiebeBeiMirAnkommt: SelfTest = {
  slug: 'wie-liebe-bei-mir-ankommt',
  category: 'beziehung',
  title: 'Wie Liebe bei mir ankommt',
  teaser:
    'Woran merkst du eigentlich, dass jemand dich gern hat? Sechs Bereiche zeigen dir, in welcher Form Zuneigung bei dir wirklich ankommt – und was du leicht übersiehst.',
  description:
    'Zwei Menschen können sich gleich stark lieben und es so unterschiedlich zeigen, dass beide sich ungeliebt fühlen. Dieser Selbsttest schaut auf sechs Formen, in denen Zuneigung ankommen kann: Worte, ungeteilte Zeit, Handeln, Berührung, Aufmerksamkeiten und Verlässlichkeit. Er ordnet dich keinem Typ zu – die meisten Menschen brauchen mehrere Formen, und was gerade zählt, hängt von der Lebensphase ab. Das Ergebnis ist als Gesprächseinstieg gedacht, nicht als Diagnose. Anschließend kannst du es mit Echo besprechen.',
  duration: '10–15 Min',
  resultMode: 'dimensional',
  polarity: 'positive',
  intro:
    'Antworte danach, wie es sich für dich anfühlt – nicht danach, was vernünftig wäre oder was du eigentlich schätzen solltest. Es gibt hier keine besseren und schlechteren Werte. Wenn dir bei einer Frage mehrere Situationen einfallen, nimm die, die dir zuerst gekommen ist. Niemand außer dir sieht deine Antworten.',
  echo: {
    opening_question:
      'Dein Ergebnis zeigt, in welcher Form Zuneigung bei dir am stärksten ankommt. Fällt dir eine konkrete Situation aus der letzten Zeit ein, in der genau das gefehlt hat?',
  },
  disclaimer:
    'Das Modell der Liebessprachen stammt aus der Paarberatungspraxis von Gary Chapman und ist wissenschaftlich nur schwach belegt. Es taugt als Gesprächshilfe, nicht als Persönlichkeitstest. Dieser Test ordnet dich deshalb bewusst keinem Typ zu.',
  dimensions: [
    {
      key: 'worte',
      name: 'Worte',
      description: 'Wie viel dir gesprochene Anerkennung und Zuspruch bedeuten.',
      explain:
        'Hohe Werte heißen: Du brauchst es ausgesprochen. Gemeintes, das ungesagt bleibt, kommt bei dir kaum an – auch wenn du weißt, dass es da ist.',
      bands: [
        { min: 0, label: 'Eher nebensächlich', tone: 'mid', text: 'Worte sind für dich nicht der entscheidende Kanal. Du liest Zuneigung eher an anderem ab – das ist kein Mangel, sondern eine Information über dich.' },
        { min: 40, label: 'Zählt mit', tone: 'good', text: 'Zuspruch tut dir gut, ist aber nicht das Einzige, worauf du achtest. Ein Satz zur richtigen Zeit trägt dich ein Stück.' },
        { min: 68, label: 'Trägt viel', tone: 'good', text: 'Du brauchst es gesagt. Bleibt es aus, entsteht bei dir ein Zweifel, den keine Geste ganz auffängt. Das ist wichtig zu wissen – für dich und für dein Gegenüber.' },
      ],
    },
    {
      key: 'zeit',
      name: 'Ungeteilte Zeit',
      description: 'Wie viel dir volle, unabgelenkte Aufmerksamkeit bedeutet.',
      explain:
        'Hohe Werte heißen: Nicht die Menge an gemeinsamer Zeit zählt, sondern ihre Qualität. Nebeneinander mit halbem Ohr fühlt sich für dich wie Alleinsein an.',
      bands: [
        { min: 0, label: 'Eher nebensächlich', tone: 'mid', text: 'Du brauchst nicht viel ungeteilte Aufmerksamkeit, um dich verbunden zu fühlen. Nebeneinander reicht dir oft.' },
        { min: 40, label: 'Zählt mit', tone: 'good', text: 'Gemeinsame Zeit tut dir gut, und du merkst, wenn sie über längere Phasen fehlt.' },
        { min: 68, label: 'Trägt viel', tone: 'good', text: 'Zeit ohne Ablenkung ist für dich der deutlichste Beweis von Zuneigung. Ein Abend nebeneinander mit Bildschirmen kann sich für dich einsamer anfühlen als ein Abend allein.' },
      ],
    },
    {
      key: 'tun',
      name: 'Handeln und Entlastung',
      description: 'Wie viel es dir bedeutet, wenn dir jemand etwas abnimmt.',
      explain:
        'Hohe Werte heißen: Du liest Zuneigung an Taten ab. Wer dir etwas abnimmt, bevor du fragen musst, spricht in deiner Währung.',
      bands: [
        { min: 0, label: 'Eher nebensächlich', tone: 'mid', text: 'Praktische Hilfe ist für dich vor allem praktisch. Du liest daraus nicht automatisch Zuneigung.' },
        { min: 40, label: 'Zählt mit', tone: 'good', text: 'Es tut dir gut, wenn dir jemand etwas abnimmt – besonders in Phasen, in denen viel zusammenkommt.' },
        { min: 68, label: 'Trägt viel', tone: 'good', text: 'Für dich ist Handeln die klarste Form von Liebe. Große Worte ohne entsprechende Taten laufen bei dir eher ins Leere.' },
      ],
    },
    {
      key: 'beruehrung',
      name: 'Berührung',
      description: 'Wie viel dir beiläufige körperliche Nähe im Alltag bedeutet.',
      explain:
        'Gemeint ist die Beiläufigkeit, nicht die Sexualität: die Hand im Nacken, das Anlehnen, das Umarmen an der Tür.',
      bands: [
        { min: 0, label: 'Eher nebensächlich', tone: 'mid', text: 'Körperliche Nähe im Alltag ist für dich kein zentraler Kanal. Das kann Veranlagung sein oder mit Erfahrungen zu tun haben – beides ist in Ordnung.' },
        { min: 40, label: 'Zählt mit', tone: 'good', text: 'Berührung tut dir gut und beruhigt dich, ist aber nicht die einzige Form, an der du Zuneigung festmachst.' },
        { min: 68, label: 'Trägt viel', tone: 'good', text: 'Über Berührung kommt Zuneigung bei dir am unmittelbarsten an. Fehlt sie über längere Zeit, fühlst du dich allein, auch wenn jemand im Raum ist.' },
      ],
    },
    {
      key: 'zeichen',
      name: 'Aufmerksamkeiten',
      description: 'Wie viel dir kleine Zeichen bedeuten, dass jemand an dich gedacht hat.',
      explain:
        'Es geht selten um den Gegenstand. Es geht um den Beweis: Du warst in meinen Gedanken, als du nicht da warst.',
      bands: [
        { min: 0, label: 'Eher nebensächlich', tone: 'mid', text: 'Mitgebrachtes und Kleinigkeiten sagen dir wenig. Du liest Zuneigung woanders ab.' },
        { min: 40, label: 'Zählt mit', tone: 'good', text: 'Du freust dich über kleine Zeichen, vor allem wenn sie zeigen, dass jemand zugehört hat.' },
        { min: 68, label: 'Trägt viel', tone: 'good', text: 'Kleine Aufmerksamkeiten treffen dich sehr. Nicht wegen der Sache, sondern wegen des Gedankens dahinter – und ihr Ausbleiben fällt dir entsprechend auf.' },
      ],
    },
    {
      key: 'verlaesslichkeit',
      name: 'Verlässlichkeit',
      description: 'Wie viel dir Beständigkeit und Berechenbarkeit bedeuten.',
      explain:
        'Diese Ergänzung fehlt im klassischen Modell. Für viele Menschen ist das eigentliche Signal von Zuneigung nicht eine Geste, sondern dass man sich verlassen kann.',
      bands: [
        { min: 0, label: 'Eher nebensächlich', tone: 'mid', text: 'Du kommst gut mit Wechselhaftigkeit zurecht und misst Zuneigung nicht an Beständigkeit.' },
        { min: 40, label: 'Zählt mit', tone: 'good', text: 'Verlässlichkeit ist dir wichtig, ohne dass alles planbar sein müsste.' },
        { min: 68, label: 'Trägt viel', tone: 'good', text: 'Für dich ist Verlässlichkeit die Grundlage von allem. Große Gesten wiegen wenig, wenn die Zusagen darunter nicht halten – und ein verlässlicher Alltag sagt dir mehr als jede Überraschung.' },
      ],
    },
  ],
  overallBands: [
    { min: 0, label: 'Wählerisch im Guten', tone: 'mid', text: 'Nur wenige Formen kommen bei dir stark an. Das macht es einfacher, dein Gegenüber zu leiten – und wichtiger, dass du sagst, welche es sind. Wenn dir insgesamt wenig zusagt, lohnt auch die Frage, ob dir das Annehmen von Zuwendung generell schwerfällt.' },
    { min: 45, label: 'Breit aufgestellt', tone: 'good', text: 'Mehrere Formen kommen bei dir an. Das ist ein Vorteil: Es gibt viele Wege zu dir. Schau dir trotzdem an, welche zwei Bereiche oben stehen – dort entsteht die größte Enttäuschung, wenn etwas fehlt.' },
    { min: 70, label: 'Sehr empfänglich', tone: 'good', text: 'Zuneigung kommt bei dir in vielen Formen an, und du brauchst offenbar einiges davon, um dich sicher zu fühlen. Das ist keine Bedürftigkeit, sondern eine Information. Hilfreich wird sie, wenn du sie konkret machen kannst statt sie als Gesamtwunsch zu äußern.' },
  ],
  questions: [
    // ── Worte ──────────────────────────────────────────────────────────────
    { id: 'lb_w1', type: 'scale', section: 'Worte', dimension: 'worte', text: 'Ein ehrlich gemeintes Lob geht mir nach – manchmal tagelang.' },
    { id: 'lb_w2', type: 'scale', section: 'Worte', dimension: 'worte', text: 'Wenn längere Zeit niemand sagt, dass er mich schätzt, fange ich an zu zweifeln.' },
    { id: 'lb_w3', type: 'scale', section: 'Worte', dimension: 'worte', text: 'Ich merke mir Sätze, die jemand über mich gesagt hat, sehr genau.' },
    { id: 'lb_w4', type: 'scale', section: 'Worte', dimension: 'worte', text: 'Eine liebe Nachricht zwischendurch verändert meinen ganzen Tag.' },
    { id: 'lb_w5', type: 'scale', section: 'Worte', dimension: 'worte', text: 'Kritik an mir beschäftigt mich lange, auch wenn sie sachlich war.' },
    { id: 'lb_w6', type: 'scale', section: 'Worte', dimension: 'worte', text: 'Ob jemand es ausspricht oder nicht, macht für mein Gefühl kaum einen Unterschied.', reverse: true },
    // ── Ungeteilte Zeit ────────────────────────────────────────────────────
    { id: 'lb_z1', type: 'scale', section: 'Zeit', dimension: 'zeit', text: 'Ein Gespräch ohne Handy auf dem Tisch bedeutet mir mehr als ein ganzer gemeinsamer Abend nebenbei.' },
    { id: 'lb_z2', type: 'scale', section: 'Zeit', dimension: 'zeit', text: 'Es stört mich spürbar, wenn mein Gegenüber beim Zuhören auf den Bildschirm schaut.' },
    { id: 'lb_z3', type: 'scale', section: 'Zeit', dimension: 'zeit', text: 'Ich sehne mich nach ungestörter Zeit zu zweit, auch ohne besonderes Programm.' },
    { id: 'lb_z4', type: 'scale', section: 'Zeit', dimension: 'zeit', text: 'Wenn wir lange nicht in Ruhe geredet haben, fühle ich mich entfremdet.' },
    { id: 'lb_z5', type: 'scale', section: 'Zeit', dimension: 'zeit', text: 'Absagen von gemeinsamer Zeit treffen mich mehr, als sie sollten.' },
    { id: 'lb_z6', type: 'scale', section: 'Zeit', dimension: 'zeit', text: 'Nebeneinander im selben Raum zu sein, reicht mir meistens völlig.', reverse: true },
    // ── Handeln ────────────────────────────────────────────────────────────
    { id: 'lb_t1', type: 'scale', section: 'Handeln', dimension: 'tun', text: 'Wenn mir jemand ungefragt etwas abnimmt, berührt mich das.' },
    { id: 'lb_t2', type: 'scale', section: 'Handeln', dimension: 'tun', text: 'Ich achte darauf, ob Zusagen in Taten münden.' },
    { id: 'lb_t3', type: 'scale', section: 'Handeln', dimension: 'tun', text: 'Praktische Unterstützung sagt mir mehr als schöne Worte.' },
    { id: 'lb_t4', type: 'scale', section: 'Handeln', dimension: 'tun', text: 'Es ärgert mich, wenn ich um Hilfe bitten muss, die offensichtlich nötig ist.' },
    { id: 'lb_t5', type: 'scale', section: 'Handeln', dimension: 'tun', text: 'Wer mir Arbeit abnimmt, zeigt mir damit, dass ich ihm wichtig bin.' },
    { id: 'lb_t6', type: 'scale', section: 'Handeln', dimension: 'tun', text: 'Ob jemand mir etwas abnimmt, hat für mich nichts mit Zuneigung zu tun.', reverse: true },
    // ── Berührung ──────────────────────────────────────────────────────────
    { id: 'lb_b1', type: 'scale', section: 'Berührung', dimension: 'beruehrung', text: 'Eine beiläufige Berührung im Vorbeigehen beruhigt mich sofort.' },
    { id: 'lb_b2', type: 'scale', section: 'Berührung', dimension: 'beruehrung', text: 'Wenn körperliche Nähe über längere Zeit fehlt, fühle ich mich einsam.' },
    { id: 'lb_b3', type: 'scale', section: 'Berührung', dimension: 'beruehrung', text: 'Ich suche im Alltag von mir aus Körperkontakt.' },
    { id: 'lb_b4', type: 'scale', section: 'Berührung', dimension: 'beruehrung', text: 'Nach einem Streit hilft mir eine Umarmung mehr als eine Erklärung.' },
    { id: 'lb_b5', type: 'scale', section: 'Berührung', dimension: 'beruehrung', text: 'Nebeneinander einzuschlafen bedeutet mir viel.' },
    { id: 'lb_b6', type: 'scale', section: 'Berührung', dimension: 'beruehrung', text: 'Körperliche Nähe brauche ich eher wenig, um mich verbunden zu fühlen.', reverse: true },
    // ── Aufmerksamkeiten ───────────────────────────────────────────────────
    { id: 'lb_g1', type: 'scale', section: 'Aufmerksamkeiten', dimension: 'zeichen', text: 'Es rührt mich, wenn jemand etwas mitbringt, das zeigt, dass er zugehört hat.' },
    { id: 'lb_g2', type: 'scale', section: 'Aufmerksamkeiten', dimension: 'zeichen', text: 'Ich hebe Kleinigkeiten auf, die ich von wichtigen Menschen bekommen habe.' },
    { id: 'lb_g3', type: 'scale', section: 'Aufmerksamkeiten', dimension: 'zeichen', text: 'Ein vergessener Jahrestag trifft mich, auch wenn ich weiß, dass es nichts bedeutet.' },
    { id: 'lb_g4', type: 'scale', section: 'Aufmerksamkeiten', dimension: 'zeichen', text: 'Ich denke mir gern etwas Kleines für andere aus.' },
    { id: 'lb_g5', type: 'scale', section: 'Aufmerksamkeiten', dimension: 'zeichen', text: 'Ein Mitbringsel ohne Anlass sagt mir mehr als ein teures Geschenk zum Fest.' },
    { id: 'lb_g6', type: 'scale', section: 'Aufmerksamkeiten', dimension: 'zeichen', text: 'Geschenke und Mitbringsel sind mir ziemlich gleichgültig.', reverse: true },
    // ── Verlässlichkeit ────────────────────────────────────────────────────
    { id: 'lb_v1', type: 'scale', section: 'Verlässlichkeit', dimension: 'verlaesslichkeit', text: 'Dass ich mich auf jemanden verlassen kann, ist für mich der Kern von Zuneigung.' },
    { id: 'lb_v2', type: 'scale', section: 'Verlässlichkeit', dimension: 'verlaesslichkeit', text: 'Kurzfristige Absagen verunsichern mich stärker, als ich zugebe.' },
    { id: 'lb_v3', type: 'scale', section: 'Verlässlichkeit', dimension: 'verlaesslichkeit', text: 'Ein Mensch, der tut, was er sagt, beruhigt mich tief.' },
    { id: 'lb_v4', type: 'scale', section: 'Verlässlichkeit', dimension: 'verlaesslichkeit', text: 'Wechselhafte Stimmungen bei anderen bringen mich schnell aus dem Gleichgewicht.' },
    { id: 'lb_v5', type: 'scale', section: 'Verlässlichkeit', dimension: 'verlaesslichkeit', text: 'Große Gesten wiegen für mich wenig, wenn der Alltag unzuverlässig ist.' },
    { id: 'lb_v6', type: 'scale', section: 'Verlässlichkeit', dimension: 'verlaesslichkeit', text: 'Spontaneität ist mir wichtiger als Verbindlichkeit.', reverse: true },
    // ── Zum Nachdenken (nicht gewertet) ────────────────────────────────────
    {
      id: 'lb_f1', type: 'text', section: 'Zum Nachdenken', optional: true,
      text: 'Welche Sache hat dein Gegenüber in den letzten Wochen getan, bei der du dich wirklich gemeint gefühlt hast?',
      help: 'Je konkreter, desto brauchbarer – Situation, Tag, was genau passiert ist.',
    },
    {
      id: 'lb_f2', type: 'text', section: 'Zum Nachdenken', optional: true,
      text: 'Welche Situation hat wehgetan, obwohl sie objektiv harmlos war?',
      help: 'Dort sitzt oft ein Bedürfnis, das keine Worte hat.',
    },
    {
      id: 'lb_f3', type: 'text', section: 'Zum Nachdenken', optional: true,
      text: 'In welcher Form zeigst du selbst Zuneigung – und könnte es sein, dass sie so nicht ankommt?',
      help: 'Die meisten Menschen geben in der Form, in der sie selbst gern empfangen.',
    },
  ],
}
