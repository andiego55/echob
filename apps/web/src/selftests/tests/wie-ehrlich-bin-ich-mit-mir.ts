import type { SelfTest } from '../types'

/**
 * Wie ehrlich bin ich mit mir? – Profiltest (polarity 'positive': hoch = mehr Genauigkeit).
 *
 * Sechs Bereiche: introspektive Genauigkeit, Außensicht einholen, Eingeständnisfähigkeit,
 * Widersprüche aushalten, Verletzlichkeit, Freiheit von Abwehrmustern.
 *
 * Der heikelste Zuschnitt des Tests steckt in `eingestaendnis`. Naiv gemessen würde jemand,
 * der reflexhaft ALLE Schuld übernimmt, hier den Höchstwert erreichen – und genau das ist
 * keine Ehrlichkeit, sondern Beschwichtigung. Deshalb enthält die Dimension zwei
 * `reverse`-Items zur Überverantwortung (`se_z4`, `se_z5`). Das Beschwichtigungs-Profil landet
 * damit bei 67 - deshalb beginnt das obere Band erst bei 70, und das mittlere benennt beide
 * Wege dorthin (zu langsam ODER zu viel). Im Browser gegen beide Profile geprüft.
 *
 * Aus demselben Grund gibt es die Leitplanke im Intro und im Gesamtband: Wer ehrlich
 * mitdenkt, ist leichter davon zu überzeugen, dass alles an ihm liegt. Ehrlichkeit mit sich
 * schließt Ehrlichkeit darüber ein, was NICHT deins ist.
 *
 * Gegenstück: `wie-rede-ich-mit-mir`.
 */
export const wieEhrlichBinIchMitMir: SelfTest = {
  slug: 'wie-ehrlich-bin-ich-mit-mir',
  category: 'therapie',
  title: 'Wie ehrlich bin ich mit mir?',
  teaser:
    'Sich selbst zu kennen ist schwerer, als es klingt – und viel Nachdenken macht es nicht automatisch besser. Sechs Bereiche zeigen, wo du genau hinschaust und wo du ausweichst.',
  description:
    'Fast alle halten sich für reflektiert, und für die meisten stimmt das weniger, als sie glauben – das ist keine Schwäche, sondern eine Bauartbedingung: Wir haben keinen direkten Zugang zu unseren eigenen Beweggründen. Dieser Selbsttest schaut auf sechs Bereiche: wie genau du dich beobachtest, ob du dir Rückmeldung von außen holst, ob du etwas eingestehen kannst, wie du mit Widersprüchen umgehst, ob du dich zeigst und wie stark deine Abwehrmuster sind. Er bewertet dich nicht und misst nichts Krankhaftes. Das Ergebnis kannst du anschließend mit Echo besprechen.',
  duration: '10–15 Min',
  resultMode: 'dimensional',
  polarity: 'positive',
  intro:
    'Dieser Test funktioniert nur, wenn du nicht die gute Antwort gibst – und bei diesem Thema weiß fast jeder, welche das wäre. Nimm im Zweifel die Antwort, die dir zuerst gekommen ist. Ein Hinweis, der wichtig ist: Ehrlichkeit mit sich selbst heißt nicht, sich für alles verantwortlich zu machen. Wer bereit ist, bei sich hinzuschauen, lässt sich leichter davon überzeugen, dass alles an ihm liegt. Ehrlich zu sein schließt ein, ehrlich darüber zu sein, was nicht deins ist. Niemand außer dir sieht deine Antworten.',
  echo: {
    opening_question:
      'Dein Ergebnis zeigt, wo du genau hinschaust und wo du ausweichst. Gibt es eine Rückmeldung über dich, die du schon von mehreren Menschen bekommen hast? Magst du sie einmal ernst nehmen, ohne sie zu erklären?',
  },
  disclaimer:
    'Dieser Test stellt keine Diagnose und bewertet dich nicht als Person. Ein niedriger Wert bedeutet nicht Unehrlichkeit – Ausweichen hat fast immer eine Schutzfunktion und sitzt dort, wo Hinsehen teuer wäre. Und ein Hinweis, der in die andere Richtung geht: Wenn in deiner Beziehung jedes Thema bei deinem Anteil endet und nie beim Anteil des anderen, ist das kein Zeichen deiner Reife, sondern ein Muster, das einen eigenen Blick verdient.',
  dimensions: [
    {
      key: 'genauigkeit',
      name: 'Genauigkeit',
      description: 'Ob du dich beobachtest – oder dir Erklärungen baust.',
      explain:
        'Warum-Fragen erzeugen zuverlässig Antworten, auch wenn es keine gibt: Das Gehirn füllt die Lücke mit etwas Plausiblem. Was-Fragen erzeugen Beobachtungen, und die kann man prüfen.',
      bands: [
        { min: 0, label: 'Erklärungen statt Beobachtung', tone: 'alert', text: 'Du hast schnell eine Erklärung für dein Verhalten zur Hand, und sie klingt stimmig. Genau das ist das Problem: Erklärungen, die sofort da sind und einen gut aussehen lassen, sind selten geprüft. Fang mit einer anderen Frage an – nicht warum habe ich das getan, sondern was ist passiert, kurz bevor es losging.' },
        { min: 40, label: 'Manchmal genau', tone: 'watch', text: 'Bei manchen Themen schaust du genau hin, bei anderen greifst du zur fertigen Erzählung. Der Unterschied liegt meist darin, wie viel dich die Antwort kosten würde.' },
        { min: 65, label: 'Genau', tone: 'good', text: 'Du beobachtest dein Verhalten, statt deine Beweggründe zu erraten, und du kennst den Unterschied zwischen einer Einsicht und einer stimmigen Geschichte. Das ist die anspruchsvollste der sechs Fähigkeiten.' },
      ],
    },
    {
      key: 'aussensicht',
      name: 'Außensicht',
      description: 'Ob du dir Rückmeldung holst und ob sie ankommt.',
      explain:
        'Selbsterkenntnis kann nicht allein stattfinden: Andere sehen dein Verhalten, du siehst deine Absicht. Entscheidend ist die Art der Frage – „bin ich schwierig" lässt sich nicht ehrlich beantworten, „wann war ich zuletzt schwer zu ertragen" schon.',
      bands: [
        { min: 0, label: 'Innensicht', tone: 'alert', text: 'Du arbeitest fast nur mit dem, was du selbst über dich weißt. Das lässt einen ganzen Bereich unberührt – nämlich alles, was andere an dir sehen und du nicht. Ein konkreter Anfang: Frag einen Menschen, dem du vertraust, nach einer Situation statt nach einem Urteil.' },
        { min: 40, label: 'Gelegentlich', tone: 'watch', text: 'Du bekommst Rückmeldung mit, wehrst sie aber häufig erst einmal ab. Die brauchbare Zwischenposition heißt: aufheben statt annehmen oder ablehnen. Was einmal kommt, kann Zufall sein. Was dreimal kommt, ist Information.' },
        { min: 65, label: 'Offen nach außen', tone: 'good', text: 'Du holst dir Rückmeldung und kannst sie hören, ohne sofort zu erklären. Das verkleinert den Bereich, an den du allein nicht herankommst – und er ist bei jedem Menschen größer als gedacht.' },
      ],
    },
    {
      key: 'eingestaendnis',
      name: 'Eingeständnis',
      description: 'Ob du etwas zugeben kannst, ohne dabei zu kippen.',
      explain:
        'Zugeben fällt nicht denen am schwersten, denen es egal ist, sondern denen mit dem lautesten inneren Kritiker: Wenn ein Fehler als Urteil über die ganze Person ankommt, muss man ihn abwehren. Gemeint ist hier das genaue Eingeständnis – nicht das reflexhafte Übernehmen aller Schuld.',
      bands: [
        { min: 0, label: 'Schwer zuzugeben', tone: 'alert', text: 'Ein Eingeständnis fühlt sich für dich an wie eine Niederlage, und deshalb kommt zuerst die Erklärung. Prüfe, was du eigentlich befürchtest – meistens ist es Verachtung, und meistens kommt sie nicht. Fang klein an, mit dem Beiläufigen: Stimmt, das habe ich vergessen.' },
        { min: 40, label: 'Noch nicht geradeheraus', tone: 'watch', text: 'Zu diesem Wert führen zwei sehr verschiedene Wege, und es lohnt sich zu wissen, welcher deiner ist. Der eine: Du kannst zugeben, brauchst aber Zeit – oft Tage. Meistens weiß man dabei von Anfang an, dass es stimmt, und verhandelt nur noch mit sich selbst darüber, was es über einen aussagt. Der andere: Du übernimmst zu schnell zu viel, damit Ruhe ist. Das sieht nach Größe aus und ist Beschwichtigung – es beendet das Gespräch, statt etwas zu klären, und der Anteil des anderen bleibt unbesprochen.' },
        { min: 70, label: 'Klar und ohne Aber', tone: 'good', text: 'Du kannst benennen, was dein Anteil war, ohne Bedingung und ohne Gegenrechnung – und ohne mehr zu übernehmen, als deins ist. Beides gehört zusammen: Wer aus Angst vor Streit sofort alles auf sich nimmt, klärt nichts, sondern beendet nur die Auseinandersetzung.' },
      ],
    },
    {
      key: 'widerspruch',
      name: 'Widersprüche aushalten',
      description: 'Ob du zwei Wahrheiten nebeneinander stehen lassen kannst.',
      explain:
        '„Ich wollte gehen und wollte bleiben" ist kein Denkfehler, sondern der Normalzustand. Wer Widersprüche zu früh glättet, verliert die Information, die in ihnen steckt.',
      bands: [
        { min: 0, label: 'Muss aufgelöst werden', tone: 'alert', text: 'Widersprüchliches erträgst du schlecht und entscheidest dich früh für eine Seite. Das schafft Ruhe und kostet Genauigkeit – gerade in Beziehungen sind die wichtigsten Sachverhalte selten eindeutig.' },
        { min: 40, label: 'Unbehaglich', tone: 'watch', text: 'Du kannst Widersprüche eine Weile stehen lassen, drängst aber auf Klärung. Das ist meistens unproblematisch, außer bei Entscheidungen, für die es noch zu früh ist.' },
        { min: 65, label: 'Aushaltbar', tone: 'good', text: 'Du kannst zwei gegenläufige Dinge nebeneinander stehen lassen, ohne dich sofort festlegen zu müssen. Das ist unbequem und die Voraussetzung dafür, komplizierte Lagen richtig zu sehen.' },
      ],
    },
    {
      key: 'verletzlichkeit',
      name: 'Sich zeigen',
      description: 'Ob du etwas von dir zeigst, mit dem du verletzt werden könntest.',
      explain:
        'Verletzlichkeit ist Einsatz, nicht Inhalt. Man kann zwei Stunden über schwere Erfahrungen erzählen und dabei nichts riskieren – der Satz, bei dem die Stimme kippt, ist der verletzliche.',
      bands: [
        { min: 0, label: 'Gut geschützt', tone: 'watch', text: 'Du zeigst wenig von dem, was dich angreifbar machen könnte. Das kann eine gelernte Vorsicht sein – oder eine begründete: Wenn Gezeigtes schon einmal gegen dich verwendet wurde, ist Zurückhaltung eine Schlussfolgerung und keine Blockade. Der Unterschied lohnt sich zu prüfen.' },
        { min: 40, label: 'Dosiert', tone: 'watch', text: 'Du zeigst etwas, hältst aber das Wesentliche zurück. Häufig erzählt man dabei viel und riskiert wenig – die fertige Geschichte kostet nichts mehr.' },
        { min: 65, label: 'Zeigst dich', tone: 'good', text: 'Du kannst etwas sagen, ohne zu wissen, wie es aufgenommen wird. Das ist die Voraussetzung für Nähe – und trotzdem keine Tugend, die immer angebracht ist: Sie braucht ein Gegenüber, das damit umgehen kann.' },
      ],
    },
    {
      key: 'abwehr',
      name: 'Freiheit von Abwehr',
      description: 'Wie stark die üblichen Ausweichbewegungen bei dir greifen.',
      explain:
        'Rationalisieren, intellektualisieren, das Thema wechseln, plötzlich müde werden – Abwehr ist alltäglich und hat eine Schutzfunktion. Ein hoher Wert bedeutet hier: Sie greift seltener.',
      bands: [
        { min: 0, label: 'Greift stark', tone: 'alert', text: 'Die üblichen Ausweichbewegungen sind bei dir gut eingespielt: der schnelle gute Grund, der Fachbegriff, das Ja-aber. Das ist keine Charakterfrage. Abwehr sitzt dort, wo Hinsehen teuer wäre – und sie wird nicht durch Strenge kleiner, sondern dadurch, dass Hinsehen billiger wird.' },
        { min: 40, label: 'Kommt vor', tone: 'watch', text: 'Bei bestimmten Themen weichst du zuverlässig aus. Die Stellen erkennst du an den Begleiterscheinungen: eine Reaktion, die zu groß ist für den Anlass, eine auffällig lange Begründung, plötzliche Müdigkeit.' },
        { min: 65, label: 'Selten', tone: 'good', text: 'Du bemerkst deine eigenen Ausweichbewegungen meistens, während sie passieren. Das ist ungewöhnlich und die eigentliche Fähigkeit hinter allem anderen.' },
      ],
    },
  ],
  overallBands: [
    { min: 0, label: 'Viel Schutz', tone: 'watch', text: 'Über die Bereiche hinweg schaust du eher weg als hin. Das klingt hart und ist keine Anklage: Ausweichen sitzt immer dort, wo Hinsehen etwas kosten würde, und oft war das einmal eine kluge Rechnung. Der wirksamste Hebel ist deshalb nicht mehr Strenge, sondern der Preis: Wer sich für jede Einsicht bestraft, hört auf, Einsichten zu haben. Der andere Test dieses Bereichs – „Wie rede ich mit mir?" – schaut genau darauf.' },
    { min: 40, label: 'Stellenweise genau', tone: 'watch', text: 'In manchen Bereichen schaust du sehr genau hin, in anderen greift die Abwehr zuverlässig. Das ist der Normalfall. Der niedrigste Wert ist der interessanteste – dort liegt vermutlich das Thema, bei dem dich Rückmeldung am schnellsten ärgert.' },
    { min: 65, label: 'Genau mit dir', tone: 'good', text: 'Du siehst dich vergleichsweise klar und kannst Unangenehmes stehen lassen. Zwei Hinweise dazu. Erstens: Diese Fähigkeit trägt nur, solange sie nicht in Selbstverurteilung kippt. Zweitens, und wichtiger: Wer ehrlich mitdenkt, ist leichter davon zu überzeugen, dass alles an ihm liegt. Wenn in deiner Beziehung jedes Thema bei dir endet und nie beim anderen, ist das kein Zeichen deiner Reife.' },
  ],
  questions: [
    // ── Genauigkeit ────────────────────────────────────────────────────────
    { id: 'se_g1', type: 'scale', section: 'Wie du hinschaust', dimension: 'genauigkeit', text: 'Ich habe schnell eine Erklärung dafür, warum ich etwas getan habe.', reverse: true },
    { id: 'se_g2', type: 'scale', section: 'Wie du hinschaust', dimension: 'genauigkeit', text: 'Ich achte darauf, was konkret passiert ist, bevor eine Reaktion in mir losging.' },
    { id: 'se_g3', type: 'scale', section: 'Wie du hinschaust', dimension: 'genauigkeit', text: 'Ich denke viel über mich nach und komme dabei selten irgendwo an.', reverse: true },
    { id: 'se_g4', type: 'scale', section: 'Wie du hinschaust', dimension: 'genauigkeit', text: 'Ich merke, wenn ich mir gerade eine Geschichte zurechtlege, in der ich gut wegkomme.' },
    { id: 'se_g5', type: 'scale', section: 'Wie du hinschaust', dimension: 'genauigkeit', text: 'Ich schaue mir an, was ich tatsächlich tue – nicht nur, was ich über mich denke.' },
    { id: 'se_g6', type: 'scale', section: 'Wie du hinschaust', dimension: 'genauigkeit', text: 'Ich erkenne Wiederholungen in meinem Verhalten erst, wenn andere sie benennen.', reverse: true },
    // ── Außensicht ─────────────────────────────────────────────────────────
    { id: 'se_a1', type: 'scale', section: 'Rückmeldung von außen', dimension: 'aussensicht', text: 'Ich frage Menschen, die mich kennen, konkret nach meinem Verhalten.' },
    { id: 'se_a2', type: 'scale', section: 'Rückmeldung von außen', dimension: 'aussensicht', text: 'Wenn mir jemand etwas über mich sagt, erkläre ich zuerst, warum das so nicht stimmt.', reverse: true },
    { id: 'se_a3', type: 'scale', section: 'Rückmeldung von außen', dimension: 'aussensicht', text: 'Ich kann eine Rückmeldung stehen lassen, ohne sie sofort anzunehmen oder abzulehnen.' },
    { id: 'se_a4', type: 'scale', section: 'Rückmeldung von außen', dimension: 'aussensicht', text: 'Wenn mehrere Menschen mir dasselbe sagen, nehme ich das ernst – auch wenn ich es anders sehe.' },
    { id: 'se_a5', type: 'scale', section: 'Rückmeldung von außen', dimension: 'aussensicht', text: 'Bei Kritik finde ich meistens einen Grund, warum sie mehr über den anderen aussagt.', reverse: true },
    { id: 'se_a6', type: 'scale', section: 'Rückmeldung von außen', dimension: 'aussensicht', text: 'Ich weiß, worauf sich Menschen bei mir verlassen – weil ich sie gefragt habe.' },
    // ── Eingeständnis ──────────────────────────────────────────────────────
    { id: 'se_z1', type: 'scale', section: 'Zugeben', dimension: 'eingestaendnis', text: 'Ich kann sagen, dass etwas mein Fehler war, ohne ein Aber hinterherzuschieben.' },
    { id: 'se_z2', type: 'scale', section: 'Zugeben', dimension: 'eingestaendnis', text: 'Im Streit fällt mir zuerst ein, was der andere auch falsch gemacht hat.', reverse: true },
    { id: 'se_z3', type: 'scale', section: 'Zugeben', dimension: 'eingestaendnis', text: 'Ich weiß oft von Anfang an, dass ein Vorwurf stimmt, und brauche trotzdem Tage bis dahin.', reverse: true },
    {
      id: 'se_z4', type: 'scale', section: 'Zugeben', dimension: 'eingestaendnis',
      text: 'Ich übernehme im Streit schnell die ganze Schuld, damit Ruhe ist.', reverse: true,
      intent: 'Gegengewicht: Reflexhaftes Alles-Übernehmen ist keine Ehrlichkeit, sondern Beschwichtigung – ohne dieses Item würde es hier fälschlich als Stärke gewertet.',
    },
    {
      id: 'se_z5', type: 'scale', section: 'Zugeben', dimension: 'eingestaendnis',
      text: 'Nach einem Konflikt bleibt der Anteil des anderen meistens unbesprochen.', reverse: true,
      intent: 'Zweites Gegengewicht: Wenn jedes Gespräch bei dir endet und nie beim anderen, ist das kein Zeichen von Reife.',
    },
    { id: 'se_z6', type: 'scale', section: 'Zugeben', dimension: 'eingestaendnis', text: 'Wenn ich etwas eingestehe, ändert sich danach auch mein Verhalten.' },
    // ── Widersprüche ───────────────────────────────────────────────────────
    { id: 'se_w1', type: 'scale', section: 'Widersprüche', dimension: 'widerspruch', text: 'Ich kann aushalten, dass zwei gegensätzliche Dinge gleichzeitig auf mich zutreffen.' },
    { id: 'se_w2', type: 'scale', section: 'Widersprüche', dimension: 'widerspruch', text: 'Wenn ich unsicher bin, entscheide ich mich lieber früh als weiter im Ungewissen zu bleiben.', reverse: true },
    { id: 'se_w3', type: 'scale', section: 'Widersprüche', dimension: 'widerspruch', text: 'Ich kann jemanden gleichzeitig lieben und wütend auf ihn sein, ohne dass eins das andere aufhebt.' },
    { id: 'se_w4', type: 'scale', section: 'Widersprüche', dimension: 'widerspruch', text: 'Gemischte Gefühle machen mich unruhig, bis ich weiß, welches das richtige ist.', reverse: true },
    { id: 'se_w5', type: 'scale', section: 'Widersprüche', dimension: 'widerspruch', text: 'Ich kann sagen: Ich weiß es noch nicht – und es dabei belassen.' },
    // ── Sich zeigen ────────────────────────────────────────────────────────
    { id: 'se_v1', type: 'scale', section: 'Dich zeigen', dimension: 'verletzlichkeit', text: 'Ich sage Dinge, bei denen ich nicht weiß, wie sie aufgenommen werden.' },
    { id: 'se_v2', type: 'scale', section: 'Dich zeigen', dimension: 'verletzlichkeit', text: 'Ich erzähle viel von mir, aber das Wesentliche bleibt draußen.', reverse: true },
    { id: 'se_v3', type: 'scale', section: 'Dich zeigen', dimension: 'verletzlichkeit', text: 'Ich kann eine Angst benennen, ohne sie sofort zu erklären oder abzuschwächen.' },
    { id: 'se_v4', type: 'scale', section: 'Dich zeigen', dimension: 'verletzlichkeit', text: 'Wenn es eng wird, wechsle ich ins Sachliche.', reverse: true },
    { id: 'se_v5', type: 'scale', section: 'Dich zeigen', dimension: 'verletzlichkeit', text: 'Es gibt mindestens einen Menschen, der weiß, wie es mir wirklich geht.' },
    // ── Abwehr ─────────────────────────────────────────────────────────────
    { id: 'se_d1', type: 'scale', section: 'Ausweichen', dimension: 'abwehr', text: 'Ich merke, wenn ich anfange, mich zu rechtfertigen.' },
    { id: 'se_d2', type: 'scale', section: 'Ausweichen', dimension: 'abwehr', text: 'Ich erkläre mein Verhalten mit Fachbegriffen, und danach ist das Thema erledigt.', reverse: true },
    { id: 'se_d3', type: 'scale', section: 'Ausweichen', dimension: 'abwehr', text: 'Bei bestimmten Themen werde ich schlagartig müde.', reverse: true },
    { id: 'se_d4', type: 'scale', section: 'Ausweichen', dimension: 'abwehr', text: 'Wenn meine Reaktion größer ist als der Anlass, werde ich neugierig statt abwehrend.' },
    { id: 'se_d5', type: 'scale', section: 'Ausweichen', dimension: 'abwehr', text: 'Ich sage häufig „ja, aber".', reverse: true },
    { id: 'se_d6', type: 'scale', section: 'Ausweichen', dimension: 'abwehr', text: 'Ich bemerke, wenn ich das Thema wechseln will, und bleibe trotzdem.' },
    // ── Zum Nachdenken (nicht gewertet) ────────────────────────────────────
    {
      id: 'se_x1', type: 'text', section: 'Zum Nachdenken', optional: true,
      text: 'Welche Rückmeldung über dich hast du von mehreren Menschen bekommen, die sich nicht kennen?',
      help: 'Auch wenn du sie jedes Mal erklärt hast. Vielleicht gerade dann.',
    },
    {
      id: 'se_x2', type: 'text', section: 'Zum Nachdenken', optional: true,
      text: 'Was weißt du über dich und denkst nicht zu Ende?',
      help: 'Du musst es hier nicht ausformulieren. Es reicht, wenn du bemerkst, ob dir sofort etwas eingefallen ist.',
    },
    {
      id: 'se_x3', type: 'text', section: 'Zum Nachdenken', optional: true,
      text: 'Was in deiner Beziehung ist nicht dein Anteil?',
      help: 'Diese Frage ist Absicht. Wer bei sich hinschaut, verliert sie leicht aus dem Blick.',
    },
  ],
}
