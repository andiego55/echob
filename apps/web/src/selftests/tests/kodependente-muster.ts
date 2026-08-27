import type { SelfTest } from '../types'

/**
 * Kodependente Muster – dimensionaler Test (concern: hoch = stärker ausgeprägtes Muster).
 *
 * Sechs Bereiche: Fremdfokus, Zugang zu sich selbst, Grenzen, Retterrolle, Selbstwert über
 * Nützlichkeit, Angst vor Ablehnung.
 *
 * WICHTIG – zwei Dinge sind hier bewusst gesetzt:
 *
 * 1. `safety: true`. Kodependenz ist kein Gefahrenbegriff, aber wer diesen Test macht, ist
 *    überdurchschnittlich gefährdet, sich selbst die Schuld für das Verhalten anderer zu
 *    geben. Zwei Items setzen deshalb das Flag coercive-control: Wer aus ANGST vor der
 *    Reaktion nachgibt oder Rechenschaft ablegen muss, ist nicht in einem Fürsorgemuster,
 *    sondern in etwas anderem. Das soll das Ergebnis unabhängig vom Durchschnitt zeigen.
 *
 * 2. Kein Etikett. Kodependenz steht in keinem Diagnosemanual; der Test misst ein Erleben
 *    und stellt nichts fest.
 */
export const kodependenteMuster: SelfTest = {
  slug: 'kodependente-muster',
  category: 'persoenlichkeit',
  title: 'Kodependente Muster: wie viel Platz habe ich in meinem Leben?',
  teaser:
    'Du weißt genauer, wie es anderen geht, als wie es dir selbst geht? Sechs Bereiche helfen dir zu sehen, wie stark das Muster bei dir ausgeprägt ist – ohne Etikett.',
  description:
    'Dieser Selbsttest schaut auf sechs Bereiche, die für kodependente Muster kennzeichnend sind: die Antenne für andere, den Zugang zu eigenen Bedürfnissen, Grenzen und Neinsagen, die Retterrolle, den Selbstwert über Nützlichkeit und die Angst vor Ablehnung. Kodependenz ist keine anerkannte Diagnose – weder ICD-11 noch DSM-5 kennen sie. Dieser Test stellt deshalb nichts fest, sondern hilft dir, dein eigenes Erleben zu ordnen. Wichtig vorab: Fürsorglichkeit erklärt vielleicht, warum jemand länger bleibt. Sie erklärt niemals, warum jemand anders sich schlecht verhält. Das Ergebnis kannst du anschließend mit Echo besprechen.',
  duration: '12–18 Min',
  resultMode: 'dimensional',
  polarity: 'concern',
  safety: true,
  safetyVariant: 'victim',
  intro:
    'Ein Hinweis vorab, der wichtiger ist als das Ergebnis: Dieser Test sucht nicht nach deinem Anteil an dem, was dir widerfährt. Wer fürsorglich, loyal und anpassungsbereit ist, hat damit nichts verursacht. Es geht ausschließlich darum, wie viel Platz du selbst in deinem Leben hast. Antworte so ehrlich, wie es geht – gerade dort, wo eine Antwort dir unangenehm ist. Niemand außer dir sieht sie.',
  echo: {
    opening_question:
      'Dein Ergebnis zeigt, wo am wenigsten Platz für dich ist. Fällt dir eine Situation aus den letzten Tagen ein, in der du dich übergangen hast, ohne dass es jemand von dir verlangt hätte?',
  },
  disclaimer:
    'Kodependenz ist keine Diagnose, sondern ein Begriff aus der Selbsthilfe- und Ratgeberliteratur. Der Test misst dein Erleben und stellt nichts fest. Wenn du in deiner Beziehung Angst hast, geht es nicht um dein Fürsorgemuster – dann hol dir bitte Unterstützung.',
  dimensions: [
    {
      key: 'fremdfokus',
      name: 'Antenne für andere',
      description: 'Wie stark deine Aufmerksamkeit ständig bei den Stimmungen anderer liegt.',
      explain:
        'Diese Antenne ist eine echte Fähigkeit und oft früh erlernt. Zum Problem wird sie erst, wenn sie sich nicht abschalten lässt und keine zweite für dich selbst daneben existiert.',
      bands: [
        { min: 0, label: 'Beweglich', tone: 'good', text: 'Du nimmst andere wahr, ohne ständig auf Empfang zu sein. Deine Aufmerksamkeit gehört auch dir.' },
        { min: 40, label: 'Oft auf Empfang', tone: 'watch', text: 'Du liest Stimmungen sehr früh und richtest dich häufig danach aus. Das kostet Kraft, die woanders fehlt – auch wenn es sich normal anfühlt.' },
        { min: 65, label: 'Dauerhaft auf Empfang', tone: 'alert', text: 'Deine Aufmerksamkeit liegt fast ständig bei anderen. Du merkst früher, wie es ihnen geht, als wie es dir geht. Diese Fähigkeit hat dir wahrscheinlich einmal geholfen – heute lässt sie dich nicht zur Ruhe kommen.' },
      ],
    },
    {
      key: 'selbstzugang',
      name: 'Zugang zu dir selbst',
      description: 'Wie gut du weißt, was du selbst brauchst und willst.',
      explain:
        'Hier bedeutet ein hoher Wert: Der Zugang fehlt. Nicht aus Bescheidenheit – die Frage nach den eigenen Wünschen ist schlicht unbeantwortet geblieben, oft über Jahre.',
      bands: [
        { min: 0, label: 'Vorhanden', tone: 'good', text: 'Du weißt in der Regel, was du möchtest, und kannst es auch sagen.' },
        { min: 40, label: 'Verschüttet', tone: 'watch', text: 'Auf die Frage, was du willst, musst du oft erst überlegen. Der Zugang ist da, aber verstellt – meistens von der Frage, was gerade gebraucht wird.' },
        { min: 65, label: 'Weitgehend verloren', tone: 'alert', text: 'Was du selbst möchtest, ist dir kaum zugänglich. Das ist keine Charakterfrage, sondern etwas Erlerntes – und es ist der Bereich, an dem sich am meisten ändern lässt. Fang klein an: nicht was will ich vom Leben, sondern was möchte ich heute Abend essen.' },
      ],
    },
    {
      key: 'grenzen',
      name: 'Grenzen und Neinsagen',
      description: 'Wie schwer es dir fällt, abzulehnen und dabei zu bleiben.',
      explain:
        'Entscheidend ist nicht, ob du Nein sagen kannst, sondern ob du es behalten kannst. Viele Menschen sagen ab und nehmen es Stunden später zurück.',
      bands: [
        { min: 0, label: 'Tragfähig', tone: 'good', text: 'Du kannst ablehnen, ohne dass es dich lange beschäftigt.' },
        { min: 40, label: 'Wackelig', tone: 'watch', text: 'Neinsagen kostet dich viel, und manchmal nimmst du es zurück. Danach ärgerst du dich – über dich, nicht über den anderen.' },
        { min: 65, label: 'Kaum vorhanden', tone: 'alert', text: 'Ein Nein hält bei dir selten. Die Schuldgefühle danach sind stärker als der Grund davor. Das ist ein Muster, kein Willensproblem – und es lässt sich üben, aber nicht erzwingen.' },
      ],
    },
    {
      key: 'retten',
      name: 'Retten und Verantwortung',
      description: 'Wie sehr du dich für die Gefühle und Aufgaben anderer zuständig fühlst.',
      explain:
        'Der Kern ist die Verwechslung von zwei Sätzen: Ich fühle mich verantwortlich – und: Ich bin verantwortlich. Der erste stimmt oft, der zweite selten.',
      bands: [
        { min: 0, label: 'Klar getrennt', tone: 'good', text: 'Du kannst mitfühlen, ohne zuständig zu sein. Das ist eine seltene und wertvolle Fähigkeit.' },
        { min: 40, label: 'Verschwommen', tone: 'watch', text: 'Du übernimmst oft mehr, als deine Sache wäre – und merkst es meistens erst hinterher.' },
        { min: 65, label: 'Stark ausgeprägt', tone: 'alert', text: 'Du fühlst dich für die Zustände anderer verantwortlich, auch für ihre Laune und ihre Entscheidungen. Das ist erschöpfend und nimmt deinem Gegenüber zugleich etwas ab, das ihm gehört.' },
      ],
    },
    {
      key: 'nuetzlichkeit',
      name: 'Selbstwert über Nützlichkeit',
      description: 'Wie stark dein Wert davon abhängt, gebraucht zu werden.',
      explain:
        'Der aussagekräftigste Bereich: Nicht ob du gern hilfst, sondern was übrig bliebe, wenn niemand deine Hilfe bräuchte.',
      bands: [
        { min: 0, label: 'Unabhängig', tone: 'good', text: 'Dein Wert hängt nicht daran, gebraucht zu werden. Du darfst da sein, ohne zu leisten.' },
        { min: 40, label: 'Gekoppelt', tone: 'watch', text: 'Gebrauchtwerden tut dir spürbar gut, und Phasen ohne Aufgabe fühlen sich unruhig an. Da lohnt ein zweiter Blick.' },
        { min: 65, label: 'Eng gekoppelt', tone: 'alert', text: 'Ohne eine Aufgabe für andere weißt du kaum, wozu du da bist. Dieser Satz ist unangenehm zu lesen, und dass du ihn wiedererkennst, ist bereits der schwierigste Teil. Er lässt sich verändern, aber selten allein.' },
      ],
    },
    {
      key: 'ablehnungsangst',
      name: 'Angst vor Ablehnung',
      description: 'Wie sehr die Sorge, jemanden zu verlieren, dein Verhalten steuert.',
      explain:
        'Hier wird es wichtig zu unterscheiden: Angst vor Enttäuschung ist etwas anderes als Angst vor der Reaktion. Das zweite gehört nicht in dieses Thema, sondern in ein anderes.',
      bands: [
        { min: 0, label: 'Gering', tone: 'good', text: 'Du kannst dich zeigen, ohne zu fürchten, dadurch jemanden zu verlieren.' },
        { min: 40, label: 'Spürbar', tone: 'watch', text: 'Die Sorge, jemanden zu enttäuschen, beeinflusst regelmäßig, was du sagst und tust.' },
        { min: 65, label: 'Bestimmend', tone: 'alert', text: 'Ein großer Teil deines Verhaltens dient dazu, niemanden zu verlieren. Wenn dabei auch echte Angst vor der Reaktion einer Person eine Rolle spielt, geht es nicht mehr um dein Fürsorgemuster – dann bitte hol dir Unterstützung.' },
      ],
    },
  ],
  overallBands: [
    { min: 0, label: 'Du kommst vor', tone: 'good', text: 'Über die Bereiche hinweg hast du Platz in deinem eigenen Leben. Einzelne hohe Werte kannst du trotzdem ernst nehmen – schau, welcher Bereich heraussticht.' },
    { min: 38, label: 'Du kommst zu kurz', tone: 'watch', text: 'In mehreren Bereichen richtest du dich stark nach anderen aus. Das muss nichts Dramatisches sein, ist aber ein Hinweis, dass dir Raum fehlt, den dir niemand von selbst gibt. Der beste Einstieg ist der Bereich mit dem höchsten Wert – nicht alle auf einmal.' },
    { min: 60, label: 'Du kommst kaum vor', tone: 'alert', text: 'Über fast alle Bereiche hinweg steht dein eigenes Erleben hinten an. Das ist erschöpfend, und es ist nichts, was sich mit einem Vorsatz ändern lässt. Begleitung hilft hier fast immer – nicht weil du es nicht allein könntest, sondern weil das Übergehen der eigenen Bedürfnisse ja gerade der Kern des Musters ist. Und noch einmal: Dass du so bist, hat niemandem das Recht gegeben, dich schlecht zu behandeln.' },
  ],
  questions: [
    // ── Antenne für andere ─────────────────────────────────────────────────
    { id: 'kd_a1', type: 'scale', section: 'Antenne', dimension: 'fremdfokus', text: 'Ich merke sofort, wenn sich die Stimmung im Raum verändert.' },
    { id: 'kd_a2', type: 'scale', section: 'Antenne', dimension: 'fremdfokus', text: 'Ich weiß meistens, was mein Gegenüber braucht, bevor er es sagt.' },
    { id: 'kd_a3', type: 'scale', section: 'Antenne', dimension: 'fremdfokus', text: 'Wenn es jemandem in meiner Nähe schlecht geht, kann ich mich schwer auf etwas anderes konzentrieren.' },
    { id: 'kd_a4', type: 'scale', section: 'Antenne', dimension: 'fremdfokus', text: 'Ich plane Gespräche im Voraus, damit sie gut ausgehen.' },
    { id: 'kd_a5', type: 'scale', section: 'Antenne', dimension: 'fremdfokus', text: 'Ich kann in Gesellschaft entspannen, ohne auf die Stimmung anderer zu achten.', reverse: true },
    { id: 'kd_a6', type: 'scale', section: 'Antenne', dimension: 'fremdfokus', text: 'Ich spüre schon am Tonfall eines Hallos, was gleich kommt.' },
    // ── Zugang zu dir selbst ───────────────────────────────────────────────
    { id: 'kd_s1', type: 'scale', section: 'Du selbst', dimension: 'selbstzugang', text: 'Auf die Frage, was ich möchte, muss ich erst überlegen.' },
    { id: 'kd_s2', type: 'scale', section: 'Du selbst', dimension: 'selbstzugang', text: 'Wenn mich jemand fragt, wie es mir geht, antworte ich fast automatisch mit gut.' },
    { id: 'kd_s3', type: 'scale', section: 'Du selbst', dimension: 'selbstzugang', text: 'Ich merke erst spät, dass ich erschöpft, hungrig oder traurig bin.' },
    { id: 'kd_s4', type: 'scale', section: 'Du selbst', dimension: 'selbstzugang', text: 'Bei gemeinsamen Entscheidungen habe ich oft keine eigene Präferenz.' },
    { id: 'kd_s5', type: 'scale', section: 'Du selbst', dimension: 'selbstzugang', text: 'Ich weiß gut, was mir guttut, und sorge dafür.', reverse: true },
    { id: 'kd_s6', type: 'scale', section: 'Du selbst', dimension: 'selbstzugang', text: 'Wenn ein Abend ganz mir gehört, weiß ich oft nicht, was ich damit anfangen soll.' },
    // ── Grenzen ────────────────────────────────────────────────────────────
    { id: 'kd_g1', type: 'scale', section: 'Grenzen', dimension: 'grenzen', text: 'Ich sage Ja und ärgere mich hinterher darüber.' },
    { id: 'kd_g2', type: 'scale', section: 'Grenzen', dimension: 'grenzen', text: 'Nach einem Nein habe ich Schuldgefühle, obwohl mich niemand beschuldigt.' },
    { id: 'kd_g3', type: 'scale', section: 'Grenzen', dimension: 'grenzen', text: 'Ich habe schon Absagen zurückgenommen, weil ich es nicht aushalten konnte.' },
    { id: 'kd_g4', type: 'scale', section: 'Grenzen', dimension: 'grenzen', text: 'Ich begründe meine Absagen ausführlicher, als nötig wäre.' },
    { id: 'kd_g5', type: 'scale', section: 'Grenzen', dimension: 'grenzen', text: 'Ich kann ablehnen, ohne dass es mich lange beschäftigt.', reverse: true },
    { id: 'kd_g6', type: 'scale', section: 'Grenzen', dimension: 'grenzen', text: 'Ich gebe nach, weil ich Angst vor der Reaktion habe.', flag: 'coercive-control', flagMin: 3, intent: 'Unterscheidet Nachgeben aus Harmoniebedürfnis von Nachgeben aus Angst. Das zweite gehört nicht in dieses Thema.' },
    // ── Retten und Verantwortung ───────────────────────────────────────────
    { id: 'kd_r1', type: 'scale', section: 'Verantwortung', dimension: 'retten', text: 'Ich fühle mich für die Laune von Menschen um mich herum verantwortlich.' },
    { id: 'kd_r2', type: 'scale', section: 'Verantwortung', dimension: 'retten', text: 'Ich erledige Dinge, die eigentlich Aufgabe eines anderen wären.' },
    { id: 'kd_r3', type: 'scale', section: 'Verantwortung', dimension: 'retten', text: 'Ich entschuldige das Verhalten meines Gegenübers vor anderen.' },
    { id: 'kd_r4', type: 'scale', section: 'Verantwortung', dimension: 'retten', text: 'Wenn jemand ein Problem schildert, habe ich sofort eine Lösung im Kopf.' },
    { id: 'kd_r5', type: 'scale', section: 'Verantwortung', dimension: 'retten', text: 'Ich kann jemanden begleiten, ohne sein Problem zu übernehmen.', reverse: true },
    { id: 'kd_r6', type: 'scale', section: 'Verantwortung', dimension: 'retten', text: 'Ich bleibe in Situationen, aus denen ich längst gegangen wäre, weil sonst niemand da wäre.' },
    // ── Selbstwert über Nützlichkeit ───────────────────────────────────────
    { id: 'kd_n1', type: 'scale', section: 'Nützlichkeit', dimension: 'nuetzlichkeit', text: 'Ich fühle mich am wohlsten, wenn ich gebraucht werde.' },
    { id: 'kd_n2', type: 'scale', section: 'Nützlichkeit', dimension: 'nuetzlichkeit', text: 'Wenn gerade keine Krise ist, fühle ich mich seltsam nutzlos.' },
    { id: 'kd_n3', type: 'scale', section: 'Nützlichkeit', dimension: 'nuetzlichkeit', text: 'Ich habe Mühe, Hilfe anzunehmen, ohne mich schlecht zu fühlen.' },
    { id: 'kd_n4', type: 'scale', section: 'Nützlichkeit', dimension: 'nuetzlichkeit', text: 'Wenn es meinem Gegenüber gut geht und er mich weniger braucht, werde ich unruhig.', intent: 'Der unangenehmste Punkt der Retterrolle. Ihn zu bemerken ist der Anfang, nicht der Beweis für etwas Schlechtes.' },
    { id: 'kd_n5', type: 'scale', section: 'Nützlichkeit', dimension: 'nuetzlichkeit', text: 'Ich darf einfach da sein, ohne etwas zu leisten.', reverse: true },
    { id: 'kd_n6', type: 'scale', section: 'Nützlichkeit', dimension: 'nuetzlichkeit', text: 'Ich messe meinen Wert daran, wie viel ich für andere geschafft habe.' },
    // ── Angst vor Ablehnung ────────────────────────────────────────────────
    { id: 'kd_v1', type: 'scale', section: 'Ablehnung', dimension: 'ablehnungsangst', text: 'Ich verschweige meine Meinung, um niemanden zu verärgern.' },
    { id: 'kd_v2', type: 'scale', section: 'Ablehnung', dimension: 'ablehnungsangst', text: 'Ich habe Sorge, dass Menschen sich abwenden, wenn ich unbequem werde.' },
    { id: 'kd_v3', type: 'scale', section: 'Ablehnung', dimension: 'ablehnungsangst', text: 'Nach einem Konflikt melde ich mich als Erster, auch wenn ich nichts falsch gemacht habe.' },
    { id: 'kd_v4', type: 'scale', section: 'Ablehnung', dimension: 'ablehnungsangst', text: 'Ich verändere mich je nachdem, mit wem ich zusammen bin.' },
    { id: 'kd_v5', type: 'scale', section: 'Ablehnung', dimension: 'ablehnungsangst', text: 'Ich kann anderer Meinung sein, ohne mich zu sorgen.', reverse: true },
    { id: 'kd_v6', type: 'scale', section: 'Ablehnung', dimension: 'ablehnungsangst', text: 'Über meine Zeit, mein Geld oder meine Kontakte muss ich Rechenschaft ablegen.', flag: 'coercive-control', flagMin: 3, intent: 'Rechenschaftspflicht ist kein Fürsorgemuster, sondern Kontrolle. Erscheint im Ergebnis unabhängig vom Durchschnitt.' },
    // ── Zum Nachdenken (nicht gewertet) ────────────────────────────────────
    {
      id: 'kd_f1', type: 'text', section: 'Zum Nachdenken', optional: true,
      text: 'Wenn heute Abend niemand etwas von dir wollte – was würdest du gern tun?',
      help: 'Wenn dir spontan nichts einfällt, ist genau das die Antwort. Sie ist nicht peinlich, sondern der Anfang.',
    },
    {
      id: 'kd_f2', type: 'text', section: 'Zum Nachdenken', optional: true,
      text: 'Was hast du zuletzt für jemanden getan, ohne dass er darum gebeten hatte?',
      help: 'Und was hättest du gebraucht, als du es getan hast?',
    },
    {
      id: 'kd_f3', type: 'text', section: 'Zum Nachdenken', optional: true,
      text: 'Wer hat dir als Kind beigebracht, dass es besser ist, keine Umstände zu machen?',
      help: 'Diese Frage geht tief. Lass sie stehen, wenn sie zu nah ist.',
    },
  ],
}
